# Plan: Adopt the tRPC react-query client

## Context

The project's biggest type-safety gap is that every client component re-implements its own data-fetching wrapper around `fetch("/api/trpc/...")`, hand-rolling `encodeURIComponent(JSON.stringify(...))` for inputs and `data.result?.data` extraction for outputs. The result types are `any` end-to-end, the loading/error state machinery is repeated 43 times, and bugs like the recent `Invalid UUID for roundId` regression survive past code review because there's no compile-time check that the input shape matches the router.

The fix is one of the smallest big-leverage changes available: replace the raw fetches with the typed `@trpc/react-query` hooks that the rest of the stack is already wired for.

**State of the world (verified 2026-05-10):**
- `@trpc/react-query@^11.17.0` is **already** in `package.json` — no new dependency.
- `@tanstack/react-query@^5.100.9` is there too.
- `TRPCProvider` in `src/trpc/react.tsx` mounts `QueryClientProvider` but **does not wire `createTRPCReact<AppRouter>()`** — so the bridge isn't actually exposed.
- A vanilla typed client lives at `src/trpc/client.ts` (`createTRPCClient<AppRouter>`) — works for promise-based callers but not for hooks.
- 23 client files contain 43 raw `fetch("/api/trpc/...")` invocations.

## Target state

Every client component reads + mutates server state via typed hooks:

```tsx
const { data, isLoading, error } = trpc.threads.list.useQuery({ clubId, bookId, sort });
const update = trpc.threads.update.useMutation({
  onSuccess: () => utils.threads.list.invalidate({ clubId, bookId }),
});
```

End-to-end inference, automatic cache + invalidation, no `any`, no `encodeURIComponent(JSON.stringify(...))`, no `setLoading/setError/setData` boilerplate.

---

## Phase 0 — Prep (≈45 min)

Single PR. Lands the plumbing without changing a single call site.

1. **Create `src/trpc/react-hooks.ts`** (new file):
   ```ts
   import { createTRPCReact } from "@trpc/react-query";
   import type { AppRouter } from "@/server/routers/_app";
   export const trpc = createTRPCReact<AppRouter>();
   ```
   Note: the existing vanilla client at `src/trpc/client.ts` keeps its name `trpc` for the few server-rendered places (Server Actions, etc.) — rename to `trpcVanilla` there to avoid collision, OR keep both names by exporting from different modules. The hooks file is what client components will import.

2. **Rewrite `src/trpc/react.tsx`** to mount the bridge:
   ```tsx
   "use client";
   import { useState } from "react";
   import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
   import { httpBatchLink } from "@trpc/client";
   import superjson from "superjson"; // only if the server uses it; check _app.ts
   import { trpc } from "./react-hooks";

   export function TRPCProvider({ children }: { children: React.ReactNode }) {
     const [queryClient] = useState(() => new QueryClient({
       defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
     }));
     const [client] = useState(() => trpc.createClient({
       links: [httpBatchLink({ url: "/api/trpc" })],
     }));
     return (
       <trpc.Provider client={client} queryClient={queryClient}>
         <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
       </trpc.Provider>
     );
   }
   ```

3. **Sanity check** — add a single throwaway hook usage in any leaf component (e.g., `mark-visited.tsx`), confirm it compiles and runs, then revert. Don't migrate anything else in this PR.

4. **Add a lint rule** to forbid new `fetch("/api/trpc/...")` patterns going forward (deferred to Phase 6 cleanup if too noisy to enable mid-migration).

**Exit criteria:** typecheck clean, `npm run dev` boots, existing app behavior unchanged.

---

## Phase 1 — Discussions (≈4h)

Six files. Self-contained, lots of repetition — good first real migration to establish the recipe.

| File | Calls | Notes |
|---|---|---|
| `discussions/mark-visited.tsx` | 1 mutation | Smallest possible — `clubs.markDiscussionsVisited` fire-and-forget. Start here. |
| `discussions/page.tsx` | 3 queries | `selections.list`, `progress.me`, `threads.list`. The sequential dependency (current-book → progress → threads) becomes `useQuery({ enabled: !!previous })`. |
| `discussions/create-thread.tsx` | 1 mutation | `threads.create`. `onSuccess` invalidates `threads.list`. |
| `discussions/comment-composer.tsx` | 1 mutation | `comments.create`. |
| `discussions/[threadId]/page.tsx` | 5 calls (1 query, 4 mutations) | `auth.me` + `threads.get` queries, `threads.delete` + `threads.update` (×2) + `comments.delete` mutations. |
| `discussions/[threadId]/comment-item.tsx` | 2 mutations | `comments.update`, `comments.delete`. |

**Recipe** (apply per file):

1. Replace fetch with hook.
2. Replace `loading`/`error` state with `isPending`/`error` from the hook.
3. Replace `router.refresh()` with `utils.x.invalidate({...})` UNLESS the surrounding layout depends on a server-component refetch (then keep both).
4. Preserve every `data-testid` and every `@spec` annotation verbatim.
5. Run typecheck + the segment's e2e tests after each file.

**Watch out:**
- The `progress.me` call gates `threads.list` — use `useQuery`'s `enabled` flag rather than a manual `useEffect` cascade.
- `mark-visited.tsx` calls `router.refresh()` after the mutation to clear the unread badge in the sidebar layout. Keep the refresh; ALSO invalidate `clubs.unreadDiscussionCounts` so a future client-side reader sees the cleared state.
- `[threadId]/page.tsx` uses `auth.me` to gate edit/delete affordances. This same call appears in many other pages — defer the auth-context unification to Phase 5 below.

---

## Phase 2 — Meetings (≈5h)

Five files; ~6 fetch sites. Includes the optimistic-update patterns in `meetings-client.tsx` (already done by hand) — preserve those exact semantics when migrating.

| File | Calls | Notes |
|---|---|---|
| `meetings/respond-meeting.tsx` | 1 mutation | `meetings.submitAvailability`. The page already does optimistic local-state updates AFTER the mutation succeeds — convert to `useMutation`'s `onSuccess`. |
| `meetings/create-meeting.tsx` | 1 mutation | `meetings.create`. After success, the parent does `applyCreatedMeeting`; keep that callback contract. |
| `meetings/admin-confirm.tsx` | 1 mutation | `meetings.confirm`. |
| `meetings/cancel-meeting-button.tsx` | 1 mutation | `meetings.cancel`. |
| `meetings/edit-meeting-button.tsx` | 1 mutation | `meetings.update`. |

The parent `meetings-client.tsx` uses local `setState` for optimistic updates (`applyConfirmedSlot`, `applyCancelledMeeting`, `applyMeetingUpdate`, `applyViewerResponses`). Keep that pattern — these are imperative updates the mutations trigger via callbacks. The migration only changes how the mutation itself is fired.

---

## Phase 3 — Voting (≈6h, the biggest single phase)

Seven files; ~15 fetch sites. Densest interaction — the round lifecycle UI has the most mutations.

| File | Calls | Notes |
|---|---|---|
| `vote/nominate-modal.tsx` | 4 (1 query, 3 mutations) | `books.search`, `books.createManual`, `nominations.create` (×2 in the search vs manual paths). Already partially robust against `roundId=""` — preserve the guard. |
| `vote/nominating-phase.tsx` | 2 mutations | `nominations.delete`, `rounds.advance`. |
| `vote/voting-phase.tsx` | 3 (1 mutation + 2 admin) | `votes.submit`, `rounds.advance` (close), `rounds.cancel`. |
| `vote/decided-phase.tsx` | 1 mutation | `rounds.create` (start new round). |
| `vote/none-phase.tsx` | 1 mutation | `rounds.create` (first round). |

**Critical:** the voting-phase code uses `router.refresh()` after `votes.submit` so the voter-turnout sidebar re-fetches from the server component (per `VOTE-UI-TURNOUT-LIVE-001`). The migration must keep `router.refresh()` here — invalidating client cache alone doesn't reload the RSC. (Pattern: `useMutation({ onSuccess: () => { utils.rounds.get.invalidate(); router.refresh(); } })`.)

---

## Phase 4 — Settings + Clubs (≈3h)

| File | Calls | Notes |
|---|---|---|
| `settings/settings-form.tsx` | 2 mutations | `clubs.update`, `clubs.delete`. Includes a `window.location.href = "/"` redirect after delete — preserve. |
| `sidebar.tsx` | 1 mutation | `auth.logout`. Already in a `try/catch` with `router.push("/")` after. |
| `components/club/club-switcher-modal.tsx` | 2 (1 query, 1 mutation) | `clubs.lookup` (debounced), `clubs.join`. The debounce pattern is currently a `useRef` timer + manual `fetch` — convert to `useQuery({ enabled: code.length >= 4 })` where the input changes throttle naturally via React state, or wrap in `useDebouncedValue` if a debounce hook helper makes sense. |
| `clubs/[clubId]/members/members-client.tsx` | 1 mutation | `clubs.members.*` (one of the role mutations). |

---

## Phase 5 — Auth + Join wizard (≈6h, most stateful)

Save for last. The join page is a multi-step state machine where the migration interacts with the wizard step transitions.

| File | Calls | Notes |
|---|---|---|
| `app/login/page.tsx` | calls | `auth.startPasskeyLogin`/`auth.finishPasskeyLogin` (passkey-first), `auth.requestOtp`/`auth.verifyOtp` (OTP fallback), `auth.me`. |
| `app/join/page.tsx` | calls | `auth.requestOtp`/`auth.verifyOtp`, `auth.me`, `clubs.lookup` (live debounced), `clubs.lookup` (validation), `clubs.join`, `clubs.create`. The current debounced live-uniqueness check uses an explicit AbortController — `useQuery` does this automatically by cancelling on input change. |

**Shared `auth.me` hook.** Multiple pages call `auth.me`. Extract a `useViewer()` wrapper in `src/lib/auth/use-viewer.ts`:

```ts
export function useViewer(clubId?: string) {
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const membership = me.data?.clubs.find((c) => c.id === clubId);
  return {
    viewerId: me.data?.user.id ?? null,
    viewerRole: membership?.role ?? null,
    isAdmin: membership?.role === "admin" || membership?.role === "owner",
    isLoading: me.isPending,
  };
}
```

Then `[threadId]/page.tsx`, `comment-item.tsx`, settings page, and others all share one cached request.

---

## Phase 6 — Cleanup + lint rule (≈1h)

1. **Delete** `src/trpc/client.ts` if no server-side caller still uses it (most callers should be on `getServerCaller` from `src/trpc/server.ts`).
2. **Enable** an ESLint rule (or add a custom rule via `no-restricted-syntax`) banning `fetch(/\/api\/trpc/)` so regressions can't slip in:
   ```js
   { selector: "CallExpression[callee.name='fetch'][arguments.0.value=/\\/api\\/trpc\\//]", message: "Use trpc hooks from @/trpc/react-hooks instead of raw fetch." }
   ```
3. **Update** `CLAUDE.md` to declare the convention: client components MUST use `trpc.x.y.useQuery/useMutation`; raw fetch to `/api/trpc/*` is forbidden.
4. **Sweep** for now-unused imports (`encodeURIComponent`-only patterns, `useEffect`s that only existed to fire a fetch).

---

## Critical design decisions

1. **Refetch after mutation = `router.refresh()` OR `utils.invalidate()` OR both.** Pick per call site:
   - Layout-level state (sidebar's `unreadDiscussionCounts`, voter-turnout in server-rendered vote/page.tsx, etc.) — **must** `router.refresh()` because the data is fetched by a server component on every render.
   - Client-only state (a thread's own comment list inside the thread detail page) — `utils.x.invalidate()` is enough.
   - Both, when in doubt; the cost is one extra round-trip.

2. **`auth.me` is shared across pages** — extract a `useViewer()` hook (Phase 5) so the call is cached once globally. Today each page refetches it.

3. **Optimistic updates** — defer. The current pattern of `setMeetings(prev => prev.map(...))` after mutation success works fine. Optimistic-update via `onMutate` + rollback is a follow-on improvement, not part of this migration.

4. **Server-component data fetching** stays exactly as-is. `getServerCaller()` already gives full type inference for RSC; this plan only touches *client* component fetches.

5. **superjson** — check whether the server router uses it. If yes, the `httpBatchLink` config needs `transformer: superjson` (and the type import too). If no, skip. Inspect `src/server/routers/_app.ts` and `src/server/trpc.ts` in Phase 0.

6. **Test selectors** — every migration preserves `data-testid` attributes verbatim. The existing e2e suite is the regression backstop; do not change markup-visible identifiers.

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Mass rewrite drops an edge case | Per-file migration with typecheck + targeted e2e after each commit |
| `router.refresh()` semantics differ slightly under hooks | Keep `router.refresh()` calls where RSC re-render is load-bearing (see decision #1); audit during each phase |
| Pre-existing test flakiness (eve-state races) masks regressions | Run failing tests at `--workers=1` to distinguish flakes from real regressions; document known-flaky tests |
| AbortController behavior change in debounced lookups | `useQuery` cancels in-flight requests when input changes; verify the join-page live-code-lookup still doesn't spam the server during fast typing |
| `superjson` transformer mismatch between client + server | Verify Phase 0 against the real server router; both ends must use the same transformer or none |
| Mid-migration, a page uses both old + new patterns | Acceptable for the duration of a phase; each phase commits one domain so the codebase is internally consistent |

---

## Verification per phase

```bash
npm run typecheck                # must pass after every file migration
npm run test:unit                # quick safety net
npx playwright test tests/e2e/{domain}-*.spec.ts --workers=1
                                 # serial run to distinguish flake from regression
```

Full sweep at end of each phase:
```bash
make dev-down && npm run test && npx playwright test
```

---

## Effort estimate

| Phase | Files | Hours |
|---|---|---|
| 0 Prep | 2 | 0.75 |
| 1 Discussions | 6 | 4 |
| 2 Meetings | 5 | 5 |
| 3 Voting | 5 | 6 |
| 4 Settings + Clubs | 4 | 3 |
| 5 Auth + Join | 2 | 6 |
| 6 Cleanup | — | 1 |
| **Total** | **24 files** | **≈25–30h** |

The work is mostly mechanical per call site (~10–15 min per fetch when the pattern is well-established) plus design judgement on the `router.refresh()` vs `invalidate()` decisions and the join wizard's state-machine interactions.

---

## Critical files

- `package.json` — verify `@trpc/react-query` (already present)
- `src/trpc/react.tsx` — Phase 0 rewrite
- `src/trpc/react-hooks.ts` — Phase 0 new file
- `src/trpc/client.ts` — Phase 6 delete (or keep if any server-side caller depends)
- `src/server/routers/_app.ts` — read to confirm superjson presence
- `src/server/trpc.ts` — read to confirm transformer config
- `CLAUDE.md` — Phase 6 update with the new convention

Files to migrate (23 total):
```
src/app/clubs/[clubId]/discussions/{mark-visited,page,create-thread,comment-composer,[threadId]/page,[threadId]/comment-item}.tsx
src/app/clubs/[clubId]/meetings/{respond-meeting,create-meeting,admin-confirm,cancel-meeting-button,edit-meeting-button}.tsx
src/app/clubs/[clubId]/vote/{nominate-modal,nominating-phase,voting-phase,decided-phase,none-phase}.tsx
src/app/clubs/[clubId]/settings/settings-form.tsx
src/app/clubs/[clubId]/sidebar.tsx
src/app/clubs/[clubId]/members/members-client.tsx
src/app/clubs/[clubId]/progress/update-modal.tsx
src/components/club/club-switcher-modal.tsx
src/app/{join,login}/page.tsx
```

---

## What this plan is not

- **Not a full RSC migration.** The data-loading split between RSC (server-side `getServerCaller`) and client hooks stays as-is. Only client-component fetches are in scope.
- **Not adding optimistic UI.** The current "imperative `setState` after mutation success" pattern continues to work; optimistic UI via `onMutate` + rollback is a follow-on.
- **Not changing the underlying tRPC procedures.** No router files are touched. Inputs, outputs, and authorization rules stay identical.
- **Not adopting `@tanstack/react-query`'s suspense API.** Possible later; out of scope.
