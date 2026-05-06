// @spec VOTE-UI-PRIOR-VOTES-001, VOTE-UI-PRIOR-VOTES-002, VOTE-UI-UPDATE-CONFIRM-001

/**
 * Pure helpers for the voting page's "prior votes" UX. These are extracted
 * from vote-round.tsx so they can be unit-tested without React.
 *
 * The server (`rounds.get`) already filters each nomination's `votes` array
 * to the calling user's votes only during the voting phase. We just have to
 * project that into a flat list of nomination IDs the user previously approved.
 */

type NominationWithVotes = {
  id: string;
  votes?: { userId: string; nominationId: string }[] | null;
};

/**
 * @spec VOTE-UI-PRIOR-VOTES-001
 * Reads the calling user's previously-submitted votes from the server-filtered
 * nominations array. Returns the nomination IDs they approved, in nomination order.
 *
 * The server-side filter (`rounds.ts:85-93`) already restricts `votes` to the
 * caller during the voting phase, but we still filter by userId defensively in
 * case the API contract changes (e.g., during the "decided" phase where every
 * member's votes are returned).
 */
export function derivePriorVotes(
  nominations: NominationWithVotes[],
  userId: string,
): string[] {
  return nominations
    .filter((n) => (n.votes ?? []).some((v) => v.userId === userId))
    .map((n) => n.id);
}

/**
 * @spec VOTE-UI-PRIOR-VOTES-002
 * The submit button shows "Update {N}?" when the user is editing — either
 * because their prior votes pre-loaded from the DB OR because they just
 * submitted in this session.
 */
export function isUpdateMode(priorVotes: string[], justSubmitted: boolean): boolean {
  return priorVotes.length > 0 || justSubmitted;
}

/**
 * @spec VOTE-UI-UPDATE-CONFIRM-001
 * Distinct success copy so the user can tell whether they cast a fresh vote
 * or modified an existing one.
 */
export function successMessage(isUpdate: boolean): string {
  return isUpdate
    ? "✓ Your votes have been updated"
    : "✓ Your votes have been recorded";
}
