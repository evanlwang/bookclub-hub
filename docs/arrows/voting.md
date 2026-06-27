# Arrow: voting

Book selection — nominations, approval voting, rounds, manual selection, tie-breaking.

## Status

**OK** — last audited 2026-06-26 (git SHA `11aba35`). 0 active gaps, 0 divergences, 0 reverse orphans. Nomination pitch field, winner-banner CTAs, voting/nomination deadline pickers + sidebar countdown, and the cron deadline-reminder pipeline are all shipped. This pass reconciled the redesign labels ("+ Nominate", "Now reading" banner, EarGlyph/slip language, ISBN cover fallback) and repointed every spec/LLD ref from the monolithic `vote-round.tsx` to the split `nominating-phase.tsx` / `voting-phase.tsx` / `decided-phase.tsx` (and the decomposed nominate modal). Confirmed `VOTE-API-VISIBILITY-002` matches the PR #15 tally-rank fix (decided nominations sorted so the winner banner matches the top tally).

## References

### HLD
- `docs/high-level-design.md` (book-selection lifecycle, structured-but-not-rigid philosophy)

### LLD
- `docs/llds/book-selection-and-voting.md`

### EARS
- `docs/specs/vote-specs.md` (79 specs — round state machine, approval voting, manual selection, tie-handling, visibility, guards)

### Tests
- `tests/integration/voting-lifecycle.test.ts`
- `tests/integration/vote-persistence.test.ts`
- `tests/integration/books.test.ts`, `tests/integration/books-manual.test.ts` (book metadata used by voting)
- `tests/integration/cron-deadline-reminder.test.ts` (covers VOTE-NOTIFY-003)
- `tests/e2e/vote-persistence.spec.ts`, `tests/e2e/vote-submission.spec.ts`
- `tests/e2e/voting-close.spec.ts`, `tests/e2e/voting-phases.spec.ts`, `tests/e2e/voting-round.spec.ts`, `tests/e2e/voting-sidebar.spec.ts`
- `tests/unit/voting/tally.test.ts` — VOTE-BE-001 (approval-tally invariants)
- `tests/unit/voting-persistence.test.ts` — VOTE-API-VISIBILITY-001, VOTE-UI-PRIOR-VOTES-001/002, VOTE-UI-UPDATE-CONFIRM-001

### Code
- `src/server/routers/rounds.ts` — round lifecycle (nominating → voting → decided)
- `src/server/routers/nominations.ts` — nomination CRUD
- `src/server/routers/votes.ts` — vote submission and visibility guards
- `src/server/routers/selections.ts` — manual selection bypass path
- `src/server/routers/books.ts` — book metadata wrapper (also referenced from `reading-progress`)
- `src/lib/voting/` — approval-vote tally and tie-break logic
- `src/app/api/cron/voting-deadline-reminder/route.ts` — VOTE-NOTIFY-003
- `src/app/clubs/[clubId]/vote/page.tsx` — vote UI shell
- `src/app/clubs/[clubId]/vote/vote-round.tsx` — active-round component
- `src/app/clubs/[clubId]/vote/nominate-modal.tsx` — nomination form

## Architecture

**Purpose:** Replace ad-hoc "who wants to read what?" group-chat decisions with a structured nominate→vote→decide cycle. Approval voting (vote for any subset). The organizer can also manually pick a book, bypassing the round.

**Key Components:**
1. Round state machine — nominating → voting → decided (with cancel/reset paths)
2. Approval-vote tally — `src/lib/voting/` is the densest invariant surface (tie-break is the canonical edge-case generator)
3. Manual selection — sidesteps voting; produces the same `Selection` entity downstream consumers see
4. Visibility guards — non-members can't read votes; vote-during-nominating is rejected; etc.
5. Deadline-reminder cron — `voting-deadline-reminder/route.ts` pings members near close.

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| vote-specs.md | 92 | 88 | 0 | 4 | 0 |

**Summary:** 100% of non-deferred specs implemented (75/75). 4 deferreds: minor polish.

**Spec families:** VOTE-API, VOTE-API-CANCEL-GUARD, VOTE-API-DECIDED-FINISHED, VOTE-API-MANUAL, VOTE-API-MY-VOTES, VOTE-API-NOMDEL, VOTE-API-VISIBILITY, VOTE-API-VOTE-GUARD, VOTE-BE, VOTE-BE-TIE-MANUAL, VOTE-NOTIFY, VOTE-UI, VOTE-UI-PRIOR-VOTES, VOTE-UI-UPDATE-CONFIRM.

## Key Findings

1. **`src/lib/voting/` is the highest-density invariant surface in the project** — tie-breaking and approval-tally rules concentrate here. Primary `/differential-audit` candidate now that the segment is `OK`.
2. **Phase E unlocked the deadline pipeline** — `cron-deadline-reminder/route.ts` was inert until cluster 14 added the deadline-picker UI; reminders now fire 24h before voting close.
3. **Reverse orphans cleaned** — `VOTE-UI-004/007/008/010` were stale annotations from a refactor and were dropped from `vote-round.tsx`'s file header (Phase D).

## Work Required

### Nice to Have
1. Run `/lid-experimental:differential-audit` on 2–4 EARS in `src/lib/voting/` at N=3 — the densest invariant surface in the project, ideal first audit subject.
