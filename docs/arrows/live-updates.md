# Arrow: live-updates

Cross-cutting liveness mechanism — opt-in polling hook, optimistic-mutation conventions, `router.refresh()` policy, invocation budget.

## Status

**MAPPED** — segment created 2026-06-11 with the live-updates plan (`docs/plans/live-updates-plan.md`). Specs authored; implementation pending (Phase 1 of the plan). All LIVE-* specs are active gaps by design — tests-then-code follows.

## References

### HLD
- `docs/high-level-design.md` (Key Design Decisions → "Real-time updates": polling v1, WebSockets/SSE deferred)

### LLD
- `docs/llds/live-updates.md`

### EARS
- `docs/specs/live-specs.md` (LIVE-HOOK-001, LIVE-HOOK-PAUSE-HIDDEN-001, LIVE-HOOK-PAUSE-MUTATING-001, LIVE-HOOK-STALETIME-001, LIVE-HOOK-ENABLED-001, LIVE-UX-GENTLE-001)
- Consumer-side specs live in the consuming segments: `vote-specs.md` (VOTE-API-TURNOUT-001, VOTE-UI-LIVE-POLL-001, VOTE-UI-NOM-LIVE-001, VOTE-UI-OPTIMISTIC-001), `disc-specs.md` (DISC-UI-LIVE-001, DISC-UI-LIST-LIVE-001, DISC-UI-COMMENT-OPTIMISTIC-001, DISC-UI-FETCH-PARALLEL-001), `prog-specs.md` (PROG-DASH-LIVE-001, PROG-UI-OPTIMISTIC-001), `meet-specs.md` (MEET-UI-LIVE-001, MEET-UI-CACHE-SOT-001, MEET-UI-RESPOND-OPTIMISTIC-001), `club-specs.md` (CLUB-API-NAVSTATE-001, CLUB-NAV-BADGE-LIVE-001)

### Tests (planned)
- `tests/unit/hooks/use-live-query.test.tsx` — hook contract (interval firing, pause-while-mutating, enabled gating, staleTime parity)
- Consumer e2e: `tests/e2e/live-*.spec.ts`, `tests/e2e/nav-badge-live.spec.ts` (two-browser-context specs in consuming segments)

### Code (planned)
- `src/lib/hooks/use-live-query.ts` — the shared hook (sole code artifact owned by this segment; consuming surfaces are owned by their feature segments)

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
| live-specs.md | 6 | 0 | 6 | 0 | 0 |

**Summary:** new segment; all specs are pre-implementation gaps per the plan's tests-first sequencing.

## Work Required

### Now (per docs/plans/live-updates-plan.md)
1. Phase 1: hook + `rounds.turnout` + `clubs.navState` procedures, tests first.
2. Phases 2–5: optimistic mutations, nav badges, discussions waterfall, per-surface polling — tracked in the consuming segments' `next` fields.
