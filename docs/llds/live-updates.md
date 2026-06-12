# Live Updates (Polling + Optimistic UI)

## Context and Design Philosophy

Dogear is a collaborative app — votes, comments, availability responses, and progress updates arrive from other members while a page is open. The HLD decided real-time delivery for v1 is **polling with stale-while-revalidate** (WebSockets/SSE deferred; see `docs/high-level-design.md` Key Design Decisions → "Real-time updates"). This LLD owns the polling conventions, the shared hook that implements them, and the optimistic-update conventions that make the acting user's own mutations feel instant.

Design philosophy: **calm liveness**. Other members' actions appear within a surface-appropriate window without reloads, layout shift, or attention-grabbing chrome. The acting user's own actions paint immediately and reconcile with the server afterwards. Liveness is opt-in per query — a surface declares its interval; nothing polls by default.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Hook Contract — `useLiveQuery` options

`src/lib/hooks/use-live-query.ts` exports a hook `useLiveQueryOptions({ intervalMs, enabled?, pauseWhenMutating? })` returning React Query v5 query options to spread into any tRPC `useQuery` call:

```ts
const turnout = trpc.rounds.turnout.useQuery(
  { clubId, roundId },
  { initialData, ...useLiveQueryOptions({ intervalMs: 15_000 }) },
);
```

Contract (specs in `docs/specs/live-specs.md`):

- `refetchInterval` is a **function** returning `intervalMs`, or `false` when `enabled === false` or (when `pauseWhenMutating`, default true) any mutation is in flight (`useIsMutating() > 0`). Suspending the interval during mutations prevents a poll dispatched mid-mutation from overwriting optimistic cache state (LIVE-HOOK-PAUSE-MUTATING-001).
- `staleTime: intervalMs` — interval refetches ignore `staleTime` in React Query v5, but focus refetches respect it; setting them equal prevents focus+interval double-fetch storms while keeping the app-wide 30s default for non-live queries.
- `refetchIntervalInBackground` is left at its default (`false`) so polling pauses while the tab is hidden (LIVE-HOOK-PAUSE-HIDDEN-001).
- No global default: polling is opt-in per call site (LIVE-HOOK-001).

## RSC-props → `initialData` conversion pattern

Surfaces that were server-rendered props become client queries seeded by the RSC:

1. The page stays an RSC and keeps its `getServerCaller()` fetch (no loading flash, no extra invocation).
2. Dates are **ISO-stringified in the RSC** before passing as props — there is no superjson transformer on the tRPC links, so client refetches return ISO strings; `initialData` must match that shape or the first poll silently changes value types.
3. The client component calls `trpc.X.useQuery(input, { initialData, ...useLiveQueryOptions(...) })`. v5 treats `initialData` as fresh (correct — the RSC just fetched it); do not pass `initialDataUpdatedAt: 0`.
4. Mutations reconcile via `utils.X.setData` / `utils.X.invalidate`, not `router.refresh()`.

## `router.refresh()` policy

`router.refresh()` re-runs every parent RSC fetch — acceptable for **rare structural transitions** (round phase change, meeting created), banned for **counter/badge updates** (turnout counts, response counts, unread badges, progress rows). Counter/badge data lives in client queries that are invalidated or polled.

## Interval Table & Invocation Budget

| Surface | Query | Interval |
|---|---|---|
| Thread detail (comments) | `threads.get` | 10s |
| Voting page (turnout + round status) | `rounds.turnout` | 15s |
| Voting page nominations (nominating phase) | `rounds.get` | 15s |
| Discussions list | `threads.list` | 30s |
| Meetings list | `meetings.list` | 30s |
| Progress dashboard | `progress.list` | 60s |
| Nav badges | `clubs.navState` | 60s |

**Test-time scaling:** `NEXT_PUBLIC_LIVE_INTERVAL_SCALE` (default 1) multiplies every interval; the Playwright web server sets 0.15 so the cross-member e2e suite (`tests/e2e/live-updates.spec.ts`) observes polls in seconds instead of minutes. Production always runs at scale 1 — the table above is the spec'd cadence.

Budget math (Vercel Hobby ≈ 1M invocations/month): the worst-case single user parked on a thread page generates ~6/min (thread) + 1/min (nav) ≈ 420/hour. A 10-member club with heavy use (~10 user-hours/day on the hottest pages) ≈ 4–5k/day ≈ 150k/month — comfortably inside budget. `httpBatchLink` coalesces same-tick refetches (nav + page query firing together) into one invocation. This math is the argument for never polling below 10s. Mitigation levers if usage grows: lengthen intervals, or gate polling on activity conditions (e.g. `enabled: round.status === "voting"`).

## Optimistic Mutation Convention

All optimistic mutations use the canonical React Query v5 recipe via tRPC `utils`:

```
onMutate:  await utils.X.cancel(input)   // kill in-flight polls for this key
           snapshot = utils.X.getData(input)
           utils.X.setData(input, optimisticNext)
onError:   utils.X.setData(input, snapshot)   // rollback; existing error UI unchanged
onSettled: utils.X.invalidate(input)          // server reconciliation
```

Three defenses against the poll-overwrites-optimistic race: `cancel()` in `onMutate`, the hook's `pauseWhenMutating` interval suspension, and `onSettled` invalidation as final reconciliation.

Optimistic surfaces (specs live in each segment's spec file): vote submit (VOTE-UI-OPTIMISTIC-001), comment post (DISC-UI-COMMENT-OPTIMISTIC-001), progress save (PROG-UI-OPTIMISTIC-001), meeting availability (MEET-UI-RESPOND-OPTIMISTIC-001).

## Freshness UX

Background refetches must be invisible except for the data itself (LIVE-UX-GENTLE-001): branch only on `isPending` (no data yet), never on `isFetching`; stable React keys (ids) so arriving items don't reorder existing DOM; newly-arrived items may use the existing `animate-fade-in` utility once on entry. No toasts or badges announce other members' actions — consistent with the cozy-redesign motion restraint (acting-user feedback only).

## Consumers (cross-segment surface map)

| Segment | What goes live | LLD |
|---|---|---|
| voting | turnout/status poll, nomination poll, optimistic submit | `book-selection-and-voting.md` |
| discussions | comment + list polls, optimistic comment, waterfall hoist | `discussion-threads.md` |
| meetings | meetings.list poll + cache as source of truth | `meeting-scheduling.md` |
| reading-progress | progress.list poll, optimistic own row | `reading-progress.md` |
| clubs | `clubs.navState` consolidated badge query | `club-management.md` |

This segment owns the hook, the interval table, the `router.refresh()` policy, and the LIVE-* specs. Each consuming segment owns its own surface specs (VOTE-UI-LIVE-POLL-001 etc.) and cites this LLD for the mechanism.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Delivery mechanism | Client polling (opt-in intervals) | WebSockets; SSE; Pusher/Ably | HLD v1 decision: simplest to deploy on serverless; no connection infra. Swappable later without data-model changes. |
| Polling default | Opt-in per query | Global `refetchInterval` default | Global would hit every query (modals, search) and waste the Hobby invocation budget for no benefit. |
| Mutation feel | Optimistic cache writes with rollback | Invalidate-and-wait (status quo); blocking spinners | Sub-100ms perceived latency for the acting user; rollback keeps correctness. |
| Badge updates | Consolidated `clubs.navState` client query | Per-badge queries; keep `router.refresh()` | One invocation per poll instead of three; removes full-layout RSC re-renders from hot mutation paths. |
| Poll/optimistic race handling | cancel + pause-while-mutating + onSettled invalidate | Mutation keys filtering; ignore the race | Triple defense is cheap and makes the race practically unobservable. |

## Open Questions

### Deferred

1. **WebSockets/SSE upgrade** when polling volume or latency expectations outgrow v1 (HLD-deferred).
2. **Presence indicators** ("Alice is viewing this thread") — out of scope for calm-liveness v1.
3. **Per-surface activity gating** (`enabled` only while a round is active, etc.) — apply if invocation budget tightens.

## References

- `docs/specs/live-specs.md`
- `docs/high-level-design.md` — Key Design Decisions → "Real-time updates"
- Consuming LLDs: `book-selection-and-voting.md`, `discussion-threads.md`, `meeting-scheduling.md`, `reading-progress.md`, `club-management.md`
