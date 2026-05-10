# Differential audit — VOTE-UI-PRIOR-VOTES-001

**Audit run**: 2026-05-10T22:11:27Z
**Git SHA at audit**: 362921d7bce1b1242a41653fca111668c7114f58
**Runs per direction**: 1
**Model**: Claude (via `claude -p`)
**Classification**: A-ONLY-DRIFT
**Default Action**: reconcile-EARS
**Stripping spot-check**: pass (≪70% overlap)

## EARS (verbatim)

> When a member loads the voting page after having previously submitted votes, the UI SHALL pre-select their prior selections so the displayed state matches what is persisted server-side.

## Code locations

- `src/lib/voting/prior-votes.ts:18–34` — `derivePriorVotes(nominations, userId)` filters the server-returned nomination list by `votes.userId === userId` and returns nomination IDs.

## A-direction — EARS → code (1 run)

**Produced**: `getInitialSelectedBookIds(priorVotes): Set<BookId>` — accepts a pre-filtered `PriorVote[]` shape with `bookId` and returns the set of book IDs. Also offered a `useMemo`-wrapped React hook variant.

**Divergent choices**:
- **Wrong identifier type** — A returned `bookId`s. Real code returns `nominationId`s (which is what `votes.submit` consumes). The EARS phrase "their prior selections" is ambiguous; A picked the more user-visible identifier (book) where the real code picked the API-shaped identifier (nomination).
- **Missing defensive userId filter** — A assumed the input was already pre-filtered by user (the type name `PriorVote[]` implies this). Real code defensively filters `votes.userId === userId` inside the helper, because the server returns *all* members' votes during the `decided` phase even though the helper is only called during voting.

**Sub-decisions invented**: A added a React hook wrapper that the real code doesn't use (the real code is consumed by a server component).

**Diff against real code**: A is a *simpler, less defensive* version. Different return identifier (book vs nomination), different precondition (pre-filtered vs filter-here).

## B-direction — code → EARS (1 run)

**Reconstructed EARS**:

> When retrieving a user's existing nominations for a poll, the system shall return the IDs of all nominations the user has already voted for, treating a missing or null votes collection as no votes.

**Elevated invariants**:
- **Null-votes contract** — B noticed the `n.votes ?? []` guard and elevated it as a requirement ("treat missing/null as no votes"). The real EARS doesn't speak to this.
- B's reconstruction correctly identifies `nominationId` as the returned shape, matching real code.

**Cluster-splits**: None.

**Diff against real EARS**: B's reconstruction is narrower than the real EARS in scope (B describes the pure-helper, not the broader "UI pre-selects" framing), but accurate to what the helper actually does. The pre-selection UX is downstream — the helper just feeds it the IDs.

## Drift findings

- **Identifier ambiguity** ("prior selections" vs "prior nominations") — surfaced by A; severity: **possible-bug**. A reasonable reader of the EARS could ship A's book-ID version; downstream `votes.submit` would reject it because nominationIds are what the contract requires.
- **Defensive userId filter in helper** — surfaced by A (missing it); severity: **latent-refactor-hazard**. Real callers depend on the helper working correctly even when the server returns all-members'-votes in the `decided` phase. Refactoring the helper to assume pre-filtered input would silently break the decided-phase view.
- **Null-votes handling** — surfaced by B; severity: **pure-documentation**. The `n.votes ?? []` guard is a small safety net the EARS could explicitly state.

## Recommended reconciliations

1. **Validate intent with the user**: Is the helper's contract "*derive nomination IDs the caller has voted for, defensively filtering by `userId` and handling null `votes`*"? B's reconstruction says yes; A's omission of these invariants suggests the EARS doesn't surface them clearly.
2. **Check LLD coherence**: `docs/llds/book-selection-and-voting.md` likely doesn't address the helper-vs-API split explicitly; light update may help.
3. **Update EARS**: Replace VOTE-UI-PRIOR-VOTES-001 with — *"When `rounds.get` returns nominations with their server-filtered `votes` arrays, `derivePriorVotes(nominations, userId)` SHALL return the nomination IDs the user has approved (filtered defensively by `userId` in case the caller is in the decided phase), with null/missing `votes` treated as no vote. The voting page initializes its `selected` state from this list so the UI matches the server-persisted vote on page load."*
4. **Update tests**: `tests/unit/voting-persistence.test.ts` already exercises `derivePriorVotes`; verify the defensive `userId` filter and null-votes cases are explicit assertions.
5. **Adjust code**: No change — code already enforces both invariants.

## Notes

This is the most interesting finding in the run: the EARS phrasing "prior selections" is *under-specified* in a way that lets a reasonable implementer (A) pick the wrong identifier shape. The cascade is EARS-only — no code change needed.
