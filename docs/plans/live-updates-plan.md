# Responsive + Real-Time-Feeling UI (Polling v1)

## Context

Dogear's UI is entirely pull-based today: data arrives via RSC fetches on navigation, and updates appear only after the acting user's own mutation (via `utils.invalidate()` + a heavyweight `router.refresh()`) or a tab refocus (30s staleTime + refetchOnWindowFocus in `src/trpc/react.tsx:49-57`). Other members' votes, comments, progress, and RSVPs never appear without a reload. The HLD already decided the v1 approach (docs/high-level-design.md ~line 237): **polling with stale-while-revalidate; WebSockets/SSE deferred** — sanctioned but never implemented. Deployment is Vercel Hobby, so intervals must respect the invocation budget.

Goal: (A) the acting user's own actions feel instant (optimistic updates, kill blocking `router.refresh()`, fix the discussions fetch waterfall), and (B) other members' actions appear within seconds via opt-in polling. Full scope: voting, thread comments, discussions list, progress dashboard, meetings, and nav badges.

Verified stack: `@tanstack/react-query@^5.100.9`, `@trpc/*@^11.17.0`, `next@^16.2.4`, **no superjson transformer** on the tRPC links.

## Architecture decisions

1. **Opt-in polling via a shared hook** `src/lib/hooks/use-live-query.ts` (`liveQueryOptions({ intervalMs, enabled, pauseWhenMutating })`) — no global `refetchInterval` default.
2. **New LID segment `live-updates`**: LLD `docs/llds/live-updates.md`, specs `docs/specs/live-specs.md` (`LIVE-*` prefix), arrow entry in `docs/arrows/index.yaml` (blocks: voting, meetings, discussions, reading-progress, clubs).
3. **One consolidated `clubs.navState` procedure** replaces the three layout RSC reads that currently force `router.refresh()` for badges.
4. **Optimistic mutations** use the v5 recipe: `onMutate: cancel → snapshot → setData`, `onError: rollback`, `onSettled: invalidate`.

### RSC-props → `useQuery initialData` conversion pattern (reused everywhere)

Page stays an RSC and keeps its `getServerCaller()` fetch; the client component switches from rendering props to:

```ts
const query = trpc.X.useQuery(input, {
  initialData: props.initialX,
  ...liveQueryOptions({ intervalMs }),
});
```

Gotchas to handle at every conversion:
- **No superjson** → server caller returns `Date`s, client refetches return ISO strings. Normalize to ISO strings in the RSC before passing props (pattern already at `vote/page.tsx:142-146`).
- v5 treats `initialData` as fresh (correct here — RSC just fetched it). Do NOT pass `initialDataUpdatedAt: 0`.

## Phase 0 — LID cascade (docs first)

- **HLD**: amend the "Real-time updates" decision row — implemented v1 via opt-in client polling; WS/SSE still deferred.
- **New LLD** `docs/llds/live-updates.md`: hook contract, interval table, pause semantics, optimistic conventions, invocation-budget math.
- **LLD updates**: book-selection-and-voting (polled `rounds.turnout`, optimistic submit), discussion-threads (comment polling, optimistic append, waterfall hoist), meeting-scheduling (`meetings.list` query cache becomes source of truth replacing `useState` shadow copy), reading-progress (polled `progress.list`, optimistic own row), club-management (`clubs.navState` badges).
- **New EARS specs**:
  - live-specs.md: `LIVE-HOOK-001` (opt-in per query), `LIVE-HOOK-PAUSE-HIDDEN-001` (pause when tab hidden), `LIVE-HOOK-PAUSE-MUTATING-001` (suspend interval while mutation in flight), `LIVE-UX-GENTLE-001` (background refetch = no skeletons, no layout shift).
  - vote-specs.md: `VOTE-UI-LIVE-POLL-001` (turnout/status within 15s, no reload), `VOTE-UI-OPTIMISTIC-001` (instant turnout/button, rollback on error).
  - disc-specs.md: `DISC-UI-LIVE-001` (comments within 10s, scroll preserved), `DISC-UI-LIST-LIVE-001` (list within 30s), `DISC-UI-COMMENT-OPTIMISTIC-001` (instant append, error removes + preserves draft), `DISC-UI-FETCH-PARALLEL-001` (no client waterfall).
  - prog-specs.md: `PROG-DASH-LIVE-001` (rows within 60s), `PROG-UI-OPTIMISTIC-001` (own row instant; undo contract unchanged).
  - meet-specs.md: `MEET-UI-LIVE-001` (counts within 30s), `MEET-UI-RESPOND-OPTIMISTIC-001` (instant with rollback).
  - club-specs.md: `CLUB-NAV-BADGE-LIVE-001` (badges via client query invalidation + 60s poll, not full-layout refresh).
- **Edit existing specs**: `VOTE-UI-TURNOUT-LIVE-001` / `VOTE-UI-TURNOUT-CHANGE-COUNT-001` (vote-specs.md:96-97) — same requirements, implementation parenthetical changes from `router.refresh()` to the `rounds.turnout` client query.
- Copy this plan into `docs/plans/` on the feature branch (user convention).

*LID stop: user reviews docs cascade before code.*

## Phase 1 — Shared infra (tests first)

- **New** `src/lib/hooks/use-live-query.ts`: `refetchInterval` as a function returning `false` when disabled or `useIsMutating() > 0`; `staleTime: intervalMs` (interval refetches ignore staleTime; focus refetches respect it — this prevents focus+interval double fetches); rely on default `refetchIntervalInBackground: false` for hidden-tab pause.
- **New procedures**:
  - `rounds.turnout` (`src/server/routers/rounds.ts`): `{clubId, roundId} → { voterCount, memberCount, status }` — moves raw-Prisma turnout logic out of `vote/page.tsx:56-66`; `status` lets the page detect close/cancel by an admin.
  - `clubs.navState` (`src/server/routers/clubs.ts`): `{clubId} → { hasActiveVote, hasUnrespondedMeeting, unreadDiscussionCount }` — consolidates `layout.tsx:58-74`.
- **Intervals**: thread detail 10s · voting turnout/nominations 15s · discussions list 30s · meetings list 30s · progress dashboard 60s · nav badges 60s. Budget: worst-case pilot ≈150k invocations/mo vs 1M Hobby cap; `httpBatchLink` coalesces same-tick refetches. Don't go below 10s anywhere.
- **Tests first**: `tests/unit/hooks/use-live-query.test.tsx` (fake timers: fires at interval, pauses while mutating, respects enabled:false, staleTime parity); integration tests for both new procedures incl. member-scoping/403.

## Phase 2 — Optimistic updates (tests first per site)

1. **Vote submit** `voting-phase.tsx:112-136`: move `hasVoted`/`justSubmitted` set into `onMutate` with snapshot; first vote optimistically bumps `utils.rounds.turnout.setData` (only when viewer not yet counted — preserves VOTE-UI-TURNOUT-CHANGE-COUNT-001); rollback in `onError` (existing `setError` UI unchanged); `onSettled` invalidates `rounds.turnout` + `rounds.getClosePreview`. **Delete `router.refresh()` at line 132.**
2. **Comment post** `comment-composer.tsx:33-46`: `onMutate` cancels `threads.get`, snapshots, appends temp comment (`temp-` id, `pending: true` → reduced-opacity style); draft cleared only in `onSuccess` (rollback on error leaves draft → DISC-UI-COMPOSER-DRAFT-PRESERVE-001 upheld for free); `onSettled` invalidates.
3. **Progress save** `update-modal.tsx:178-207`: `onMutate` rewrites viewer's row via `utils.progress.list.setData` + `progress.me.setData`; rollback on error; **remove `router.refresh()` at line 202**; the undo-handler refresh at line 83 is replaced with invalidation after Phase 5. Undo toast snapshot logic untouched.
4. **Meeting availability** `respond-meeting.tsx` + `meetings-client.tsx:128-165`: existing `applyViewerResponses` local-state rewrite becomes `utils.meetings.list.setData` after the Phase 5 migration; trailing `router.refresh()` → `utils.clubs.navState.invalidate()` + `onSettled` invalidate.

## Phase 3 — Nav badges off `router.refresh()`

- `useNavState(clubId, initial)` hook wrapping `trpc.clubs.navState.useQuery` with `initialData` from `layout.tsx` (layout's RSC fetch now calls the consolidated procedure) + 60s poll. `ClubSidebar` / `MobileTabBar` / `MobileClubHeader` switch from badge props to the hook.
- Per call site: delete `voting-phase.tsx:132`; **keep** `router.refresh()` for rare structural transitions (round close/cancel at voting-phase.tsx:144,164; nominating/none/decided phase changes; meeting creation) but add `utils.clubs.navState.invalidate()` alongside; replace it for counter/badge updates (`mark-visited.tsx:15` → navState invalidate; `update-modal.tsx`, `meetings-client.tsx` sites per Phases 2/5). members/settings/club-switcher untouched.
- Encode the rule in the LLD: `router.refresh()` OK for rare structural transitions, banned for counter/badge updates.

## Phase 4 — Discussions waterfall fix

`discussions/page.tsx:40-94` chains selections → progress → threads. Convert the page to an RSC: `Promise.all` on `selections.list` + `progress.me` via `getServerCaller()`, derive `currentBookId` + initial cutoff with existing `deriveSpoilerCutoff` (fail-safe 0 → DISC-LIB-CUTOFF-FAILSAFE-001 preserved), pass to new client `discussions-content.tsx`. Client drops the gating queries; `threads.list` fires on mount. `?bookId` branch reads `searchParams` in the RSC. Existing `loading.tsx` covers the fetch window.

## Phase 5 — Polling per surface (conversion pattern + hook)

1. **Voting**: RSC passes `initialTurnout`; `voting-phase` reads turnout from polled `rounds.turnout` (15s). When polled `status` leaves `"voting"`, fire one ref-guarded `router.refresh()` so user A sees the round close. Nominating phase polls `rounds.get` (15s) so new slips appear.
2. **Thread detail** `discussions/[threadId]/page.tsx:51`: already a client query — add `liveQueryOptions({intervalMs: 10_000})`. Comments append at bottom, stable keys → no scroll jank.
3. **Discussions list**: `threads.list` + 30s (in post-Phase-4 `discussions-content.tsx`).
4. **Progress dashboard**: split member-list/summary into client `progress-dashboard.tsx` with `initialProgress` (dates ISO-stringified), `progress.list` + 60s. Header/book card stay RSC.
5. **Meetings**: replace `useState(initialMeetings)` (`meetings-client.tsx:60`) with polled `meetings.list` query (30s, `initialData`); the four `apply*` helpers become `setData` transforms. Largest refactor — own PR with the 5 existing meetings e2e specs as regression net.

**Freshness UX (LIVE-UX-GENTLE-001, folded into each conversion)**: branch only on `isPending` (never `isFetching`) for polled queries; stable keys; optional one-time `animate-fade-in` on newly-arrived items (track previous ids in a ref). No toasts/badges for other users' actions — matches the cozy-redesign motion restraint.

## Tests

Unit (Vitest): `use-live-query.test.tsx`; optimistic cache tests for comment-composer, voting, progress (assert cache after `onMutate`, rollback on error, draft preservation). Integration: `rounds.turnout`, `clubs.navState` (scoping + 403).

E2E (Playwright, two browser contexts): `live-vote-turnout.spec.ts` (B votes → A's turnout updates without reload — must pass with `router.refresh` removed), `live-comments.spec.ts` (B's comment appears ≤12s, scroll preserved; A's optimistic post visible pre-response via delayed `page.route`; error preserves draft), `live-progress.spec.ts`, `live-meetings.spec.ts`, `nav-badge-live.spec.ts` (B creates thread → A's badge appears without navigation).

## Risks

- **Poll overwrites optimistic state**: mitigated by `cancel()` in `onMutate`, interval `false` while `isMutating > 0`, `onSettled` reconciliation.
- **Hobby invocation cost**: opt-in intervals + hidden-tab pause + batching; lever = lengthen intervals or gate via `enabled` (e.g. only while round active).
- **Date serialization** (no superjson): ISO-stringify in every RSC before props.
- **v5 specifics**: `isPending` not `isLoading`; no `useQuery` `onSuccess`; `refetchInterval` fn signature `(query)`.
- **Router cache staleness** after fewer refreshes: harmless — converted surfaces own their data client-side.

## Verification

1. `npm run typecheck && npm run lint && npm run test` per phase; `npm run test:e2e` after Phases 2/4/5.
2. Manual two-browser check on `npm run dev`: vote/comment/progress/RSVP each visible cross-browser within spec'd interval; DevTools confirms polling pauses on hidden tab and during mutations.
3. Preview deploy: watch Vercel invocation counts for an hour vs the LLD budget table.
4. LID closeout: structural coherence checks (`@spec` annotations on hook, procedures, converted components, and tests; new EARS marked `[x]`), arrow entry added, semantic report.

## Workflow

Feature branch `feature/live-updates` off main; commit per logical batch; land via PR. LID stops after each phase for review (Phases 0–5 map to the six-phase workflow: docs cascade = Phases 1–4 of LID, then tests-first, then code per surface).
