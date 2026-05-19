// @spec VOTE-API-CLOSE-PREVIEW-001
/**
 * Pure projection from raw nomination tallies → the admin-only "Close voting"
 * preview payload. Shared between the tRPC `rounds.getClosePreview` procedure
 * and any consumer that needs the same ranking semantics (used to live in
 * `vote/page.tsx` as a request-time snapshot — see VOTE-UI-CLOSE-LIVE-001 for
 * why that moved client-side).
 *
 * Ranking matches `tallyVotes` (VOTE-BE-001): highest votes wins, ties broken
 * by earliest nomination timestamp.
 */

export interface CloseNominationInput {
  id: string;
  title: string;
  author: string;
  voteCount: number;
  createdAt: Date;
}

export interface ClosePreviewPayload {
  top3: Array<{ id: string; title: string; author: string; voteCount: number }>;
  totalVotes: number;
  /** How many nominations are tied at the leading vote count (1 = clear winner). */
  tiedAtTop: number;
}

export function computeClosePreview(
  nominations: CloseNominationInput[]
): ClosePreviewPayload {
  const ranked = [...nominations].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const top = ranked[0];
  const tiedAtTop = top
    ? ranked.filter((r) => r.voteCount === top.voteCount).length
    : 0;
  const totalVotes = ranked.reduce((sum, r) => sum + r.voteCount, 0);

  return {
    top3: ranked.slice(0, 3).map(({ id, title, author, voteCount }) => ({
      id,
      title,
      author,
      voteCount,
    })),
    totalVotes,
    tiedAtTop,
  };
}
