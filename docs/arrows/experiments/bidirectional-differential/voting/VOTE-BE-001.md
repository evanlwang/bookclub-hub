# Differential audit — VOTE-BE-001

**Audit run**: 2026-05-10T22:11:27Z
**Git SHA at audit**: 362921d7bce1b1242a41653fca111668c7114f58
**Runs per direction**: 1
**Model**: Claude (via `claude -p`)
**Classification**: B-ONLY-DRIFT
**Default Action**: reconcile-EARS
**Stripping spot-check**: pass (≪70% overlap)

## EARS (verbatim)

> The winning book SHALL be determined by highest approval count. Ties SHALL be broken by earliest nomination timestamp.

## Code locations

- `src/lib/voting/tally.ts:1–37` — `tallyVotes(nominations)` returns `{ winner, rankings }`. Sort key: `voteCount desc`, then `createdAt asc`.

## A-direction — EARS → code (1 run)

**Produced**: `determineWinner(nominations)` using `Array.reduce` to find the maximum-vote nomination with earliest-`createdAt` tiebreak. Returns a single winner (or null).

**Divergent choices**: Implementation shape differs — `reduce` vs the real code's `sort`-then-take-first. Both are behaviorally equivalent on the winner.

**Sub-decisions invented**: None outside the EARS contract.

**Diff against real code**: A's signature returns only the winner; real code returns `{ winner, rankings }`. The rankings array is a *production-code feature the EARS doesn't require* — used downstream by the close-voting preview UI (`VOTE-UI-CLOSE-*` family).

## B-direction — code → EARS (1 run)

**Reconstructed EARS**:

> When tallying votes for a book-club nomination cycle, the system shall rank nominations by vote count in descending order and return the highest-ranked nomination as the winner, breaking ties in favor of the earliest-created nomination, or return a null winner with an empty ranking if no nominations exist.

**Elevated invariants**:
- **Rankings array** — B captured that the function returns a full ordered ranking, not just the winner. The real EARS is silent on this; the production-code rankings are a load-bearing API used by `close-voting-dialog.tsx`.
- **Empty-input contract** — B explicitly called out the `{ winner: null, rankings: [] }` shape when no nominations exist. The real EARS doesn't address the empty case.

**Cluster-splits**: None.

**Diff against real EARS**: B's reconstruction is a superset of the real EARS. The "highest approval, earliest ties" core matches. The added rankings + empty-input contract are real behaviors the code enforces that the EARS doesn't.

## Drift findings

- **Rankings array is undocumented** — surfaced by B; severity: **latent-refactor-hazard**. A "match the EARS" refactor that drops `rankings` from the return type would silently break the close-voting preview.
- **Empty-input contract is undocumented** — surfaced by B; severity: **pure-documentation**. The code's `{ winner: null, rankings: [] }` is the obvious default but worth stating.

## Recommended reconciliations

1. **Validate intent with the user**: Are the rankings array and the empty-list `null` winner part of the canonical contract callers can rely on, or incidental to the current sort-based implementation? B's reconstruction suggests the former.
2. **Check LLD coherence**: `docs/llds/book-selection-and-voting.md` already mentions ranking as part of the tally; no LLD edit likely needed once the EARS catches up.
3. **Update EARS**: Replace VOTE-BE-001 with something like — *"The system SHALL rank nominations by approval count (descending), tie-breaking by earliest nomination timestamp; the highest-ranked nomination is the winner. When no nominations exist, the winner SHALL be null and the ranking SHALL be empty."*
4. **Update tests**: `tests/unit/voting/tally.test.ts` likely already exercises the empty-list and rankings cases; verify each test cites `VOTE-BE-001` and add coverage if a gap exists.
5. **Adjust code**: No change needed — current behavior matches the proposed broader EARS.

## Notes

The audit caught exactly the kind of drift the protocol is best at: code that's *more invariant-rich* than the EARS. This is a documentation-debt finding, not a bug. The cascade is one-direction (EARS catches up to code).
