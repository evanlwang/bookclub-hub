# Differential audit — VOTE-UI-PRIOR-VOTES-002

**Audit run**: 2026-05-10T22:11:27Z
**Git SHA at audit**: 362921d7bce1b1242a41653fca111668c7114f58
**Runs per direction**: 1
**Model**: Claude (via `claude -p`)
**Classification**: B-ONLY-DRIFT
**Default Action**: reconcile-code (annotation-scope) + reconcile-EARS (split sub-EARS)
**Stripping spot-check**: pass (≪70% overlap)

## EARS (verbatim)

> When prior votes are present on page load, the submit button SHALL render in the "✓ Votes saved" state (disabled) and the picks area SHALL show a hint explaining how to modify the vote: "You voted previously — tap a book to add or remove it, then save your changes." Toggling any nomination flips the button to "Save changes" (enabled). Hint test ID: `prior-vote-hint`.

## Code locations

- `src/lib/voting/prior-votes.ts:37–44` — `isUpdateMode(priorVotes, justSubmitted): boolean` predicate.
- `src/app/clubs/[clubId]/vote/vote-round.tsx:230` — inline `@spec` annotation where the actual button/hint rendering happens. (NOT inspected as a stripped input in this audit run — the helper is the standalone code surface.)

## A-direction — EARS → code (1 run)

**Produced**: A full implementation with `PRIOR_VOTE_HINT_TEST_ID`, `PRIOR_VOTE_HINT_TEXT`, `SubmitButtonState` type, `hasPriorVotes`, `getSubmitButtonState(initial, current)` returning `{label, disabled}`. Uses set-equality between initial and current picks to drive the disabled state.

**Divergent choices**:
- **Far richer than the real helper** — A captured the EARS faithfully (test ID constant, exact hint text, button labels, set-equality for "no pending changes"). The real helper is a single boolean predicate that does NONE of those things.
- **The set-equality check** — A's "Votes saved" state requires `initial === current` set equality. Real code uses a different signal (`isUpdateMode = priorVotes.length > 0 || justSubmitted`) — a flag that says "we're in update mode", with the *actual* set-equality + label switching done in `vote-round.tsx` via component state.

**Sub-decisions invented**: A invented the set-equality helper itself (no `setsEqual` exists in real code; the real component uses array comparisons inline).

**Diff against real code**: HUGE. The EARS reasonably maps to ~50 lines of code; the helper is ~7 lines. The `@spec VOTE-UI-PRIOR-VOTES-002` annotation on the helper is over-broad: the helper implements one fragment of the EARS (the "are we in update mode?" predicate), with the rest of the EARS (labels, hint text, test ID, set-equality logic) living in `vote-round.tsx`.

## B-direction — code → EARS (1 run)

**Reconstructed EARS**:

> When a user has previously submitted votes or has just submitted votes in the current session, the system shall treat the ballot as being in edit mode rather than initial-entry mode (note: `justSubmitted` keeps the UI in edit mode immediately after submission even before the persisted `existing` list is refetched, preventing a flicker back to the empty-ballot state).

**Elevated invariants**:
- **No-flicker invariant** — B inferred why `justSubmitted` is a parameter: to prevent the UI from flickering back to "no prior votes" between submit success and the next data refetch. This *is* the design rationale; it's not stated in the real EARS (or anywhere else in the spec set).

**Cluster-splits**: B reconstructed only the predicate-level EARS, not the broader UI-state EARS. This is the right scope for the code shown.

**Diff against real EARS**: B's EARS is much narrower — it describes only the boolean predicate, not the button labels, hint text, or test ID. That's actually accurate to what the helper does; the @spec annotation is over-broad.

## Drift findings

- **Over-broad `@spec` annotation** — surfaced by B; severity: **latent-refactor-hazard**. The current `@spec VOTE-UI-PRIOR-VOTES-002` on `isUpdateMode` claims the helper implements the full EARS. A reader auditing coverage would conclude all of UI-PRIOR-VOTES-002 is exercised by `tests/unit/voting-persistence.test.ts`. In reality only the predicate is; the button labels and hint text are covered (or not) by e2e tests.
- **Implicit no-flicker invariant** — surfaced by B; severity: **pure-documentation**. The `justSubmitted` parameter's reason for existing isn't captured anywhere.

## Recommended reconciliations

1. **Validate intent with the user**: B's reconstructed EARS is the *correct narrowing* for `isUpdateMode`. The broader VOTE-UI-PRIOR-VOTES-002 spans the predicate + the UI rendering. Is the right move (a) split the EARS into two — a predicate EARS and a UI-rendering EARS — and have each annotated at its true site, or (b) keep one EARS but move the `@spec` to the UI render site in `vote-round.tsx`?
2. **Check LLD coherence**: `docs/llds/book-selection-and-voting.md` describes the UX; doesn't need to track the helper-vs-render split.
3. **Update EARS**: Option (a) — split. Proposed:
   - **VOTE-UI-PRIOR-VOTES-002** (revised): *"When prior votes are present OR a vote was just submitted in this session, the system SHALL render the submit button in the '✓ Votes saved' (disabled) state and SHALL show the prior-vote hint ('You voted previously — tap a book to add or remove it, then save your changes.') with `data-testid='prior-vote-hint'`. Toggling any nomination flips the button to 'Save changes' (enabled)."*
   - **VOTE-BE-PRIOR-VOTES-MODE-001** (new): *"`isUpdateMode(priorVotes, justSubmitted)` SHALL return true when the user has either prior persisted votes OR a `justSubmitted` flag set, so the UI can keep the 'update' affordance through a submit-then-refetch round-trip without flickering."*
4. **Update tests**: `tests/unit/voting-persistence.test.ts` already covers the predicate; ensure the e2e voting tests cover the labels/hint visibly.
5. **Adjust code**: Move `@spec VOTE-UI-PRIOR-VOTES-002` from `prior-votes.ts:37` to `vote-round.tsx` near the button render. Add `@spec VOTE-BE-PRIOR-VOTES-MODE-001` to `isUpdateMode`.

## Notes

This is the audit's best find: the `@spec` annotation is *claiming more than the code does*. Future-Claude reading the annotation would assume the helper carries the full label/hint/test-ID contract — and would be wrong. The fix is annotation-scope hygiene plus a small EARS split.
