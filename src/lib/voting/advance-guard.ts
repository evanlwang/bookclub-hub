// @spec VOTE-API-ADVANCE-MINNOMS-001
/**
 * Pure preconditions for advancing a voting round, extracted so it can be
 * unit-tested without spinning up the DB.
 *
 * Today this only owns the nominating→voting transition guard: the UI
 * (`vote-round.tsx`) already disables "Advance to Voting" below 2 nominations
 * per VOTE-UI-NOM-003. This server-side check defends the same invariant
 * against direct API callers and stale clients.
 */

export type AdvanceGuardResult =
  | { ok: true }
  | { ok: false; reason: string };

export function canAdvanceFromNominating(
  status: string,
  nominationCount: number
): AdvanceGuardResult {
  if (status !== "nominating") {
    // Other transitions are governed by their own rules in the router.
    return { ok: true };
  }
  if (nominationCount < 2) {
    return {
      ok: false,
      reason: "Need at least 2 nominations to advance to voting",
    };
  }
  return { ok: true };
}
