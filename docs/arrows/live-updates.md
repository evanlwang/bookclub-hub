# Arrow: live-updates

Cross-cutting liveness mechanism — opt-in polling hook, optimistic-mutation conventions, `router.refresh()` policy, invocation budget.

## Status

**OK** — implemented and audited 2026-06-11 (git SHA `b9bfb81`). All 6 LIVE-* specs `[x]`; all consumer-side live/optimistic specs `[x]` across the five feature segments. Verified by 13 unit tests (hook contract, optimistic cache behavior per surface), 10 integration tests (`rounds.turnout`, `clubs.navState`), and 7 cross-member e2e scenarios (`tests/e2e/live-updates.spec.ts`).

## References

### HLD
- `docs/high-level-design.md` (Key Design Decisions → "Real-time updates": polling v1, WebSockets/SSE deferred)

### LLD
- `docs/llds/live-updates.md`

### EARS
- `docs/specs/live-specs.md` (LIVE-HOOK-001, LIVE-HOOK-PAUSE-HIDDEN-001, LIVE-HOOK-PAUSE-MUTATING-001, LIVE-HOOK-STALETIME-001, LIVE-HOOK-ENABLED-001, LIVE-UX-GENTLE-001)
- Consumer-side specs live in the consuming segments: `vote-specs.md` (VOTE-API-TURNOUT-001, VOTE-UI-LIVE-POLL-001, VOTE-UI-NOM-LIVE-001, VOTE-UI-OPTIMISTIC-001), `disc-specs.md` (DISC-UI-LIVE-001, DISC-UI-LIST-LIVE-001, DISC-UI-COMMENT-OPTIMISTIC-001, DISC-UI-FETCH-PARALLEL-001), `prog-specs.md` (PROG-DASH-LIVE-001, PROG-UI-OPTIMISTIC-001), `meet-specs.md` (MEET-UI-LIVE-001, MEET-UI-CACHE-SOT-001, MEET-UI-RESPOND-OPTIMISTIC-001), `club-specs.md` (CLUB-API-NAVSTATE-001, CLUB-NAV-BADGE-LIVE-001)

### Tests
- `tests/unit/hooks/use-live-query.test.tsx` — hook contract (interval firing, pause-while-mutating, enabled gating, staleTime parity, background-pause default pinned)
- `tests/e2e/live-updates.spec.ts` — 7 cross-member scenarios (vote turnout, nominations, thread comments, discussions list, progress rows, meeting responses, nav badge), run with `NEXT_PUBLIC_LIVE_INTERVAL_SCALE=0.15`
- Consumer-side optimistic tests live in their segments: `tests/unit/app/voting-optimistic.test.tsx`, `comment-composer-optimistic.test.tsx`, `progress-optimistic.test.tsx`, `nav-state-badges.test.tsx`, `discussions-no-waterfall.test.tsx`

### Code
- `src/lib/hooks/use-live-query.ts` — the shared hook (owned by this segment)
- `src/lib/hooks/use-nav-state.ts` — nav-badge query wrapper (shared with the clubs segment)
- Consuming surfaces (owned by their feature segments): voting-phase/nominating-phase, thread detail + discussions-content, progress-dashboard + update-modal, meetings-client + respond-meeting, sidebar/mobile nav

## Architecture

**Purpose:** make the UI feel real-time within the HLD's polling-v1 decision — other members' actions appear within a surface-appropriate window (10–60s), the acting user's own mutations paint optimistically, and `router.refresh()` is reserved for rare structural transitions.

**Key components:**
1. `useLiveQueryOptions({ intervalMs, enabled?, pauseWhenMutating? })` — returns React Query v5 options; never a global default.
2. Optimistic-mutation convention — cancel → snapshot → setData / rollback / onSettled invalidate.
3. Interval table + Hobby invocation budget math (LLD) — the argument for never polling under 10s.

**Boundary rule:** this segment owns the mechanism and the LIVE-* specs. Each feature segment owns its own live/optimistic surface specs and cites this LLD. Cascade from changes to the hook contract pauses at each consuming segment per LID cross-segment discipline.

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| live-specs.md | 6 | 6 | 0 | 0 | 0 |

**Summary:** 100% implemented. Consumer-side IDs (16 across vote/disc/prog/meet/club spec files) also all `[x]`.

## Work Required

### Nice to Have
1. After a pilot period, compare actual Vercel invocation counts against the LLD budget table; lengthen intervals or add `enabled` activity gating if usage runs hot.
2. WebSockets/SSE upgrade remains HLD-deferred; the hook call sites are the swap points.
