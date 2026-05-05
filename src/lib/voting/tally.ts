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
 * Tally approval votes and determine the winner.
 * Winner = highest vote count. Ties broken by earliest nomination (createdAt).
 */
export function tallyVotes(nominations: NominationWithVotes[]): TallyResult {
  if (nominations.length === 0) {
    return { winner: null, rankings: [] };
  }

  const sorted = [...nominations].sort((a, b) => {
    // Primary: highest vote count
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    // Tiebreak: earliest nomination
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return {
    winner: sorted[0],
    rankings: sorted,
  };
}
