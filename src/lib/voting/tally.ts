// @spec VOTE-BE-001

export interface NominationWithVotes {
  id: string;
  bookId: string;
  createdAt: Date;
  voteCount: number;
}

export interface TallyResult {
  winner: NominationWithVotes | null;
  rankings: NominationWithVotes[];
}

/**
 * Canonical ranking order for tallied nominations: highest vote count first,
 * ties broken by earliest nomination (createdAt). Shared so every surface that
 * displays decided standings ranks identically to the winner tallyVotes picks —
 * see rounds.get (VOTE-API-VISIBILITY-002) and the decided-phase UI.
 */
export function compareByTally(
  a: { voteCount?: number | null; createdAt: Date },
  b: { voteCount?: number | null; createdAt: Date }
): number {
  const aVotes = a.voteCount ?? 0;
  const bVotes = b.voteCount ?? 0;
  // Primary: highest vote count
  if (bVotes !== aVotes) return bVotes - aVotes;
  // Tiebreak: earliest nomination
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Tally approval votes and determine the winner.
 * Winner = highest vote count. Ties broken by earliest nomination (createdAt).
 */
export function tallyVotes(nominations: NominationWithVotes[]): TallyResult {
  if (nominations.length === 0) {
    return { winner: null, rankings: [] };
  }

  const sorted = [...nominations].sort(compareByTally);

  return {
    winner: sorted[0],
    rankings: sorted,
  };
}
