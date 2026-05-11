import type { ClosePreview } from "./close-voting-dialog";

export type Nomination = {
  id: string;
  book: { id: string; title: string; author: string; openLibraryId?: string | null; coverUrl?: string | null };
  nominator: { displayName: string };
  pitch?: string;
  createdAt?: string;
  voteCount?: number;
};

export interface VoteRoundProps {
  clubId: string;
  roundId: string;
  status: string;
  nominations: Nomination[];
  maxApprovals: number;
  myVotes: string[];
  isAdmin: boolean;
  memberCount?: number;
  voterCount?: number;
  closePreview?: ClosePreview | null;
  /** @spec VOTE-UI-VOTE-DEADLINE-001 */
  activeVotingDeadline?: string | null;
}

export function relativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
