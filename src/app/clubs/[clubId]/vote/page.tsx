import Link from "next/link";
import { getServerCaller } from "@/trpc/server";
import { Card, Badge } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { VoteRound } from "./vote-round";
import { derivePriorVotes } from "@/lib/voting/prior-votes";

export default async function VotePage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let rounds: any[] = [];
  let activeRoundDetail: any = null;
  let myVotes: string[] = [];
  let isAdmin = false;
  let memberCount = 0;
  let voterCount = 0;
  let error = "";

  try {
    const caller = await getServerCaller();
    rounds = await caller.rounds.list({ clubId });

    // Check if user is admin
    const me = await caller.auth.me();
    const myMembership = me.clubs.find((c: any) => c.id === clubId);
    isAdmin = myMembership?.role === "admin" || myMembership?.role === "owner";

    // If there's an active round, fetch details. Otherwise show the most recent
    // decided round so the winner banner renders immediately after a close.
    // @spec VOTE-UI-CLOSE-006
    const activeRound =
      rounds.find(
        (r: any) => r.status === "nominating" || r.status === "voting"
      ) ??
      rounds
        .filter((r: any) => r.status === "decided")
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
    if (activeRound) {
      const detail = await caller.rounds.get({ clubId, roundId: activeRound.id });
      activeRoundDetail = detail.round;

      // @spec VOTE-UI-PRIOR-VOTES-001
      // Pre-load the user's existing votes so the wizard pre-selects what they
      // previously approved. The server already filters `votes` to the calling
      // user during the voting phase (rounds.ts:85-93).
      myVotes = derivePriorVotes(activeRoundDetail.nominations, me.user.id);

      // Get member count and voter turnout for voting phase sidebar
      if (activeRound.status === "voting") {
        const { prisma } = await import("@/lib/db");
        const members = await prisma.membership.count({ where: { clubId } });
        memberCount = members;
        const voters = await prisma.vote.findMany({
          where: { roundId: activeRound.id },
          select: { userId: true },
          distinct: ["userId"],
        });
        voterCount = voters.length;
        // @spec VOTE-UI-CLOSE-LIVE-001
        // The admin close-voting preview now comes from `rounds.getClosePreview`
        // on the client so it refetches on dialog open and after each vote.
        // No server-side snapshot here — it would just go stale.
      }
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading rounds";
  }

  if (error) {
    return <p data-testid="vote-error" className="text-danger">{error}</p>;
  }

  // @spec VOTE-UI-LIST-001 — cancelled rounds are excluded from the history list.
  const visibleRounds = rounds.filter((r: any) => r.status !== "cancelled");

  return (
    <div className="w-full max-w-[1600px]">
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <div className="mb-6">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <h1 className="font-[var(--font-display)] text-[26px] font-extrabold text-primary tracking-tight">
            Recommendation slips
          </h1>
          {activeRoundDetail && (
            activeRoundDetail.status === "voting" ? (
              <Badge solid dot>Voting open</Badge>
            ) : (
              <Badge
                tone={activeRoundDetail.status === "decided" ? "accent" : "primary"}
                dot
              >
                {activeRoundDetail.status === "nominating" ? "Nominating" : "Decided"}
              </Badge>
            )
          )}
        </div>
        <p className="font-[var(--font-serif)] italic text-sm text-ink-2 mt-0.5">
          {activeRoundDetail?.status === "voting"
            ? "Dog-ear your favorites"
            : activeRoundDetail?.status === "decided"
              ? "The club has spoken"
              : activeRoundDetail
                ? "Slip your recommendations in"
                : "Pick the club's next read"}
        </p>
      </div>

      {/* Active round interactive component */}
      {activeRoundDetail && (
        <div className="mb-8">
          <VoteRound
              clubId={clubId}
              roundId={activeRoundDetail.id}
              status={activeRoundDetail.status}
              nominations={(activeRoundDetail.nominations ?? []).map((n: any) => ({
                id: n.id,
                book: n.book,
                nominator: n.nominator,
                pitch: n.pitch,
                createdAt: n.createdAt,
                voteCount: activeRoundDetail.status === "decided" ? n.votes?.length : undefined,
              }))}
              maxApprovals={activeRoundDetail.maxApprovalsPerMember ?? 3}
              myVotes={myVotes}
              isAdmin={isAdmin}
              memberCount={memberCount}
              voterCount={voterCount}
              activeVotingDeadline={
                activeRoundDetail.votingDeadline
                  ? new Date(activeRoundDetail.votingDeadline).toISOString()
                  : null
              }
            />
        </div>
      )}

      {/* @spec VOTE-UI-LIST-001
          Cancelled rounds carry no winner and add noise to the history surface,
          so they're filtered out of the visible list. The empty-state branch
          below uses `visibleRounds.length` so a cancelled-only club renders the
          same empty state as a zero-rounds club. */}
      {/* Admin "Start new round" CTA whenever there is no active or decided
          round to display — covers both the empty club and the cancelled-only
          history case. The decided phase has its own CTA inline (VOTE-UI-DEC-003),
          so this gate is intentionally `!activeRoundDetail`.
          @spec VOTE-UI-NONE-001 */}
      {!activeRoundDetail && isAdmin && (
        <Card className="p-10 text-center mb-8">
          <div className="text-ink-3 mb-2">
            <svg className="mx-auto mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p data-testid="no-active-round" className="text-ink-2 text-sm">
            {visibleRounds.length === 0
              ? "No voting rounds yet — start one below."
              : "No active voting round. Start a new one below."}
          </p>
          <VoteRound
            clubId={clubId}
            roundId=""
            status="none"
            nominations={[]}
            maxApprovals={3}
            myVotes={[]}
            isAdmin={isAdmin}
          />
        </Card>
      )}

      {visibleRounds.length === 0 ? (
        !isAdmin && (
          <Card className="p-10 text-center">
            <p data-testid="no-rounds" className="text-ink-2 text-sm">
              No voting rounds yet. An admin will start the next one.
            </p>
          </Card>
        )
      ) : (
        <ul data-testid="rounds-list" className="space-y-3">
          {visibleRounds.map((round: any) => (
            <li key={round.id} data-testid={`round-${round.id}`}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      tone={round.status === "decided" ? "success" : "neutral"}
                    >
                      <span data-testid="round-status">{round.status}</span>
                    </Badge>
                    {round.winningBook && (
                      <span className="text-sm text-ink font-medium">
                        Winner: {round.winningBook.title}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-3">
                    {new Date(round.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
