"use client";

import { NonePhase } from "./none-phase";
import { NominatingPhase } from "./nominating-phase";
import { VotingPhase } from "./voting-phase";
import { DecidedPhase } from "./decided-phase";
import type { VoteRoundProps } from "./vote-round-types";

export type { Nomination, VoteRoundProps } from "./vote-round-types";

export function VoteRound({
  clubId,
  roundId,
  status,
  nominations,
  maxApprovals,
  myVotes,
  isAdmin,
  memberCount = 0,
  voterCount = 0,
  closePreview = null,
  activeVotingDeadline = null,
}: VoteRoundProps) {
  if (status === "none") {
    return <NonePhase clubId={clubId} isAdmin={isAdmin} />;
  }

  if (status === "voting") {
    return (
      <VotingPhase
        clubId={clubId}
        roundId={roundId}
        nominations={nominations}
        maxApprovals={maxApprovals}
        myVotes={myVotes}
        isAdmin={isAdmin}
        memberCount={memberCount}
        voterCount={voterCount}
        closePreview={closePreview ?? null}
        activeVotingDeadline={activeVotingDeadline ?? null}
      />
    );
  }

  if (status === "decided") {
    return (
      <DecidedPhase
        clubId={clubId}
        nominations={nominations}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <NominatingPhase
      clubId={clubId}
      roundId={roundId}
      nominations={nominations}
      isAdmin={isAdmin}
    />
  );
}
