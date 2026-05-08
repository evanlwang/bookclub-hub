# Arrow: voting

Book selection — nominations, approval voting, rounds, manual selection, tie-breaking.

## Status

**PARTIAL** — last audited 2026-05-07 (git SHA `a4049976`). 7 active gaps + 4 divergences + **4 reverse orphans** (VOTE-UI-004/007/008/010 cited in code/tests but not declared in `vote-specs.md`).

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
| vote-specs.md | 79 | 64 | 7 | 4 | 4 |

**Summary:** 64 of 75 non-deferred specs marked implemented (85%). Note from the spec file: divergence here means "built but differs from prior spec text" — likely re-spec, not bug.

**Spec families:** VOTE-API, VOTE-API-CANCEL-GUARD, VOTE-API-DECIDED-FINISHED, VOTE-API-MANUAL, VOTE-API-MY-VOTES, VOTE-API-NOMDEL, VOTE-API-VISIBILITY, VOTE-API-VOTE-GUARD, VOTE-BE, VOTE-BE-TIE-MANUAL, VOTE-NOTIFY, VOTE-UI, VOTE-UI-PRIOR-VOTES, VOTE-UI-UPDATE-CONFIRM.

## Key Findings

1. **`src/lib/voting/` is the highest-density invariant surface in the project** — tie-breaking and approval-tally rules concentrate here. Primary `/differential-audit` candidate.
2. **4 reverse orphans — `VOTE-UI-004`, `VOTE-UI-007`, `VOTE-UI-008`, `VOTE-UI-010`** — cited via `@spec` in code or tests but not declared in `vote-specs.md`. Three resolutions for each: (a) add the spec to `vote-specs.md`, (b) delete the annotation, (c) treat as alias of an existing spec. Surface to user; do not auto-resolve.
3. **Divergence semantics here are softer than elsewhere** — vote-specs explicitly notes `[!]` means "built but differs from prior spec text" (re-spec owed), not necessarily a bug.
4. **Spec-file artifact header is current enough** — phantom paths only in the form of glob aspirations; real coverage lands under `voting-*.spec.ts` family that vote-specs doesn't enumerate.

## Work Required

### Must Fix
1. Resolve 4 reverse orphans (`VOTE-UI-004/007/008/010`).
2. Reconcile 4 `[!]` divergences — for each, decide whether spec or code is authoritative and cascade.

### Should Fix
3. Address 7 `[ ]` active gaps.
4. Update `vote-specs.md` `**Implementing artifacts**` to enumerate the `voting-*.spec.ts` family.

### Nice to Have
5. Run `/differential-audit` on 2–4 voting EARS at N=3 once status reaches AUDITED — voting is the natural first target for the bidirectional differential.
6. Promote PARTIAL → OK.
