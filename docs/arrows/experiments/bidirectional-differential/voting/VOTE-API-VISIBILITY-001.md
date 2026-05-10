# Differential audit — VOTE-API-VISIBILITY-001

**Audit run**: 2026-05-10T22:11:27Z
**Git SHA at audit**: 362921d7bce1b1242a41653fca111668c7114f58
**Runs per direction**: 1
**Model**: Claude (via `claude -p`)
**Classification**: BD-COHERENT
**Default Action**: acknowledged-coherent
**Stripping spot-check**: pass (≪70% overlap)

## EARS (verbatim)

> `rounds.get` SHALL hide vote counts and other members' votes while the round is in "nominating" or "voting" status; only the calling user's own votes are returned.

## Code locations

- `src/server/routers/rounds.ts:68–96` — `rounds.get` handler. Filters `votes` to `userId === ctx.user.id` and sets `voteCount: undefined` whenever `round.status !== "decided"`.

## A-direction — EARS → code (1 run)

**Produced**: A `protectedProcedure`-based tRPC handler. Filters `votes` to the calling user when `status === "nominating"` or `"voting"`; returns the round unmodified otherwise.

**Divergent choices**: A omitted the `voteCount: undefined` defensive-omission (it just doesn't include the field at all in the filtered case). Behavior is equivalent — consumers see no aggregate count either way.

**Sub-decisions invented**: None.

**Diff against real code**: Semantically equivalent. A's positive-list check (`status in {nominating, voting}`) vs real code's negation (`status !== "decided"`) is a stylistic difference. Both correctly partition the state space because the four-status enum is `nominating | voting | decided | cancelled` and the EARS only distinguishes decided from non-decided.

## B-direction — code → EARS (1 run)

**Reconstructed EARS**:

> While a voting round's status is not "decided", the system shall, when returning the round, expose to each member only their own votes on each nomination and omit aggregate vote counts, revealing all votes and counts only once the round is decided.

**Elevated invariants**: B framed the requirement as the "not decided" complement rather than the "nominating or voting" enumeration — semantically identical given the four-state lifecycle. No invariants beyond the real EARS.

**Cluster-splits**: None.

**Diff against real EARS**: B's version says "while not decided" where the real EARS says "while nominating or voting". Both correctly cover the `cancelled` state too (B implicitly, real EARS implicitly — since `cancelled` rounds presumably also hide votes). The two phrasings are equivalent in practice.

## Drift findings

- **None** — the audit is coherent across both directions.

## Recommended reconciliations

- **Leave as-is**: The EARS, code, and reconstructed EARS all describe the same observable behavior. The `voteCount: undefined` vs absent-field difference is a stylistic choice (defensive emission to make the type system explicit).

## Notes

A minor follow-on consideration outside the audit: the EARS lists `"nominating" or "voting"` explicitly, but the code's `!== "decided"` form means `cancelled` rounds also hide votes. If the team wants `cancelled` rounds to surface tallies for post-mortems, both code and EARS would need a deliberate change. Today the behavior is consistent and probably intentional.
