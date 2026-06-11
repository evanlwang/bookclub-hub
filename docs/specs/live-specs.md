# Live Updates Specs

**LLD**: docs/llds/live-updates.md
**Implementing artifacts**:
- Hook: `src/lib/hooks/use-live-query.ts`
- Tests: `tests/unit/hooks/use-live-query.test.tsx`

Status markers: `[x]` implemented · `[ ]` gap (not yet built) · `[D]` deferred · `[!]` divergence

Surface-specific live/optimistic specs live in each consuming segment's spec file (VOTE-UI-LIVE-POLL-001, DISC-UI-LIVE-001, PROG-DASH-LIVE-001, MEET-UI-LIVE-001, CLUB-NAV-BADGE-LIVE-001, and the *-OPTIMISTIC-001 family). This file owns the shared mechanism.

---

## Polling Hook

- `[x]` **LIVE-HOOK-001**: Polling SHALL be opt-in per query via the `useLiveQueryOptions({ intervalMs, ... })` hook; the app SHALL NOT set a global `refetchInterval` default on the QueryClient.
- `[x]` **LIVE-HOOK-PAUSE-HIDDEN-001**: WHILE the browser tab is hidden, interval polling SHALL pause (React Query default `refetchIntervalInBackground: false`; this spec pins that default — the hook SHALL NOT override it to `true`).
- `[x]` **LIVE-HOOK-PAUSE-MUTATING-001**: WHILE any mutation is in flight (`useIsMutating() > 0`), the hook's `refetchInterval` function SHALL return `false` (when `pauseWhenMutating` is enabled, the default), so an interval refetch cannot overwrite optimistic cache state mid-mutation.
- `[x]` **LIVE-HOOK-STALETIME-001**: The hook SHALL set `staleTime` equal to `intervalMs` so window-focus refetches do not stack on top of interval refetches for live queries.
- `[x]` **LIVE-HOOK-ENABLED-001**: WHEN the caller passes `enabled: false`, the hook SHALL return `refetchInterval` resolving to `false` (no polling) without affecting the query's own fetch-on-mount behavior.

## Freshness UX

- `[ ]` **LIVE-UX-GENTLE-001**: Background interval refetches SHALL NOT render loading skeletons, spinners, or cause layout shift on any live surface — components branch on `isPending` (no data yet), never on `isFetching`; arriving data swaps in place under stable React keys.
