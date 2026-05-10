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
  let closePreview: {
    top3: Array<{ id: string; title: string; author: string; voteCount: number }>;
    totalVotes: number;
    tiedAtTop: number;
  } | null = null;
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

        // @spec VOTE-UI-CLOSE-003, VOTE-UI-CLOSE-005, VOTE-UI-CLOSE-007
        // Admin-only peek at standings for the close-voting confirmation dialog.
        // Tallies remain hidden in the rest of the UI per VOTE-UI-001.
        if (isAdmin) {
          const noms = await prisma.nomination.findMany({
            where: { roundId: activeRound.id },
            include: { book: true, _count: { select: { votes: true } } },
          });
          const ranked = noms
            .map((n) => ({
              id: n.id,
              title: n.book.title,
              author: n.book.author,
              voteCount: n._count.votes,
              createdAt: n.createdAt.getTime(),
            }))
            .sort((a, b) => {
              if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
              return a.createdAt - b.createdAt;
            });
          const top = ranked[0];
          const tiedAtTop = top
            ? ranked.filter((r) => r.voteCount === top.voteCount).length
            : 0;
          const totalVotes = ranked.reduce((s, r) => s + r.voteCount, 0);
          closePreview = {
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
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
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
              closePreview={closePreview}
              activeVotingDeadline={
                activeRoundDetail.votingDeadline
                  ? new Date(activeRoundDetail.votingDeadline).toISOString()
                  : null
              }
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
            {isAdmin
              ? "No voting rounds yet — start one below."
              : "No voting rounds yet. An admin will start the next one."}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
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
