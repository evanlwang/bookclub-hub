import { getServerCaller } from "@/trpc/server";
import { Card, Badge } from "@/components/ui";
import { VoteRound } from "./vote-round";

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

    // If there's an active round, fetch details
    const activeRound = rounds.find(
      (r: any) => r.status === "nominating" || r.status === "voting"
    );
    if (activeRound) {
      const detail = await caller.rounds.get({ clubId, roundId: activeRound.id });
      activeRoundDetail = detail.round;

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
      }
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading rounds";
  }

  if (error) {
    return <p data-testid="vote-error" className="text-danger">{error}</p>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
          Voting Rounds
        </h1>
      </div>

      {/* Active round interactive component */}
      {activeRoundDetail && (
        <div className="mb-8">
          <Card className="p-5 border-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <Badge
                tone={activeRoundDetail.status === "nominating" ? "accent" : "primary"}
                dot
              >
                {activeRoundDetail.status}
              </Badge>
              <span className="text-xs text-ink-3">Active Round</span>
            </div>
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
            />
          </Card>
        </div>
      )}

      {rounds.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-ink-3 mb-2">
            <svg className="mx-auto mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p data-testid="no-rounds" className="text-ink-2 text-sm">
            No voting rounds yet.
          </p>
          {isAdmin && (
            <VoteRound
              clubId={clubId}
              roundId=""
              status="none"
              nominations={[]}
              maxApprovals={3}
              myVotes={[]}
              isAdmin={isAdmin}
            />
          )}
        </Card>
      ) : (
        <ul data-testid="rounds-list" className="space-y-3">
          {rounds.map((round: any) => (
            <li key={round.id} data-testid={`round-${round.id}`}>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      tone={
                        round.status === "decided"
                          ? "success"
                          : round.status === "cancelled"
                            ? "danger"
                            : "neutral"
                      }
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
