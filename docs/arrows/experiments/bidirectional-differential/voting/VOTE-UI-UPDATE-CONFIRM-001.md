# Differential audit — VOTE-UI-UPDATE-CONFIRM-001

**Audit run**: 2026-05-10T22:11:27Z
**Git SHA at audit**: 362921d7bce1b1242a41653fca111668c7114f58
**Runs per direction**: 1
**Model**: Claude (via `claude -p`)
**Classification**: BD-COHERENT
**Default Action**: acknowledged-coherent
**Stripping spot-check**: pass (≪70% overlap — string literals are shared because the EARS quotes them verbatim and the code is just a 4-line string-table; this is the EARS's natural shape, not a stripping leak)

## EARS (verbatim)

> Distinct success messages — "✓ Your votes have been recorded" on first submit, "✓ Your votes have been updated" on subsequent submits.

## Code locations

- `src/lib/voting/prior-votes.ts:47–54` — `successMessage(isUpdate): string`. Returns the "updated" copy when `isUpdate === true`, else "recorded".

## A-direction — EARS → code (1 run)

**Produced**: `voteConfirmationMessage(isFirstSubmit): string` returning the same two strings, with the boolean polarity inverted (A uses `isFirstSubmit`, real code uses `isUpdate`).

**Divergent choices**: Polarity of the boolean parameter (`isFirstSubmit` vs `isUpdate`). Same strings on the same conditions — semantically equivalent.

**Sub-decisions invented**: None.

**Diff against real code**: Function-naming + parameter-polarity differ. Output behavior is identical: same string on the same condition.

## B-direction — code → EARS (1 run)

**Reconstructed EARS**:

> When a member submits their book votes, the system shall display a confirmation message that distinguishes between a first-time submission ("recorded") and an update to a prior submission ("updated").

**Elevated invariants**: None beyond what the real EARS states.

**Cluster-splits**: None.

**Diff against real EARS**: B captured the requirement faithfully. Phrasing differs (B uses an event-triggered "When a member submits" form vs the real EARS's terser declarative form) but the behavior described is identical.

## Drift findings

- **None** — coherent across both directions.

## Recommended reconciliations

- **Leave as-is**: This is a string-table EARS. The code IS the EARS, modulo a 2-character boolean-name polarity choice. No drift to reconcile.

## Notes

This was the protocol's cleanest "trivial coherence" case. The shared string literals between EARS and code triggered consideration of a stripping-rule failure, but the spot-check passed — the literal strings are intrinsic to the EARS (a user-facing copy spec), not leaked vocabulary. Stripping the strings would defeat the audit's purpose.
