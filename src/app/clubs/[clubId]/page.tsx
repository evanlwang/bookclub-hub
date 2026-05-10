// @spec DASH-UI-006, DASH-UI-007, DASH-UI-008, DASH-UI-011, DISC-UI-DASH-FEED-AUTOFILTER-001
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, Badge, BookCover, ProgressBar, AvatarStack, ChapterChip, Avatar } from "@/components/ui";
import { VoteIcon, CalendarIcon } from "@/components/ui/icons";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";
import { CopyClubCode } from "./copy-club-code";

export default async function ClubDashboard({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  let club: any = null;
  let currentBook: any = null;
  let activeRound: any = null;
  let meetings: any[] = [];
  let threads: any[] = [];
  let progress: any[] = [];
  let error = "";
  let hasNotVoted = false;
  let hasPendingMeeting = false;

  try {
    const caller = await getServerCaller();

    // Phase 1: independent fetches kicked off in parallel.
    const [clubResult, rounds, meetingsResult, me] = await Promise.all([
      caller.clubs.get({ clubId }),
      caller.rounds.list({ clubId }),
      caller.meetings.list({ clubId }),
      caller.auth.me(),
    ]);
    club = clubResult.club;
    currentBook = clubResult.currentBook;
    meetings = meetingsResult;
    activeRound = rounds.find(
      (r: any) => r.status === "nominating" || r.status === "voting"
    );
    const userId = me.user.id;

    // Pending-meeting flag is derived server-side now (viewerHasResponded).
    hasPendingMeeting = meetings.some(
      (m: any) => m.status === "proposed" && !m.viewerHasResponded
    );

    // Phase 2: things that depend on Phase 1 results — parallelize what we can.
    const bookId = currentBook?.book?.id;
    const [voteCount, myProgress] = await Promise.all([
      activeRound?.status === "voting"
        ? prisma.vote.count({
            where: { roundId: activeRound.id, userId },
          })
        : Promise.resolve(null),
      // @spec DISC-UI-DASH-FEED-AUTOFILTER-001 — fetch viewer progress so the
      // recent-discussions feed never leaks spoilers above the viewer's chapter.
      bookId ? caller.progress.me({ clubId, bookId }) : Promise.resolve(null),
    ]);
    if (voteCount !== null) hasNotVoted = voteCount === 0;

    // Phase 3: spoiler-cut threads + progress, both depend on cutoff/bookId.
    if (bookId) {
      const cutoff = deriveSpoilerCutoff(myProgress);
      const [threadResult, progressList] = await Promise.all([
        caller.threads.list({
          clubId,
          bookId,
          ...(cutoff != null ? { maxChapter: cutoff } : {}),
        }),
        caller.progress.list({ clubId, bookId }),
      ]);
      threads = threadResult.threads?.slice(0, 3) ?? [];
      progress = progressList;
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading club";
  }

  if (error || !club) {
    return (
      <div>
        <p data-testid="club-error" className="text-danger">
          {error}
        </p>
      </div>
    );
  }

  const nextMeeting = meetings.find(
    (m: any) => m.status === "proposed" || m.status === "confirmed"
  );

  // Progress stats
  const percentages = progress.map((p: any) => p.percentage ?? 0).sort((a: number, b: number) => a - b);
  const median = percentages.length > 0 ? percentages[Math.floor(percentages.length / 2)] : 0;
  const finished = progress.filter((p: any) => p.status === "finished").length;
  const reading = progress.filter((p: any) => p.status === "reading").length;

  return (
    <div className="w-full max-w-[1600px]">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-[var(--font-display)] text-3xl font-semibold text-ink tracking-tight"
          data-testid="club-name"
        >
          {club.name}
        </h1>
        <CopyClubCode code={club.code} />
      </div>

      {/* Attention Banner */}
      {(hasNotVoted || hasPendingMeeting) && (
        <Card
          data-testid="attention-banner"
          className="p-5 mb-6 border-primary/30"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.96 0.02 195 / 0.4), oklch(0.98 0.005 195 / 0.2))",
          }}
        >
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:gap-4 sm:items-center">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-ink mb-1">
                {hasNotVoted && hasPendingMeeting
                  ? "2 things need your attention"
                  : "1 thing needs your attention"}
              </p>
              <ul className="space-y-0.5">
                {hasNotVoted && (
                  <li className="text-xs text-ink-2 flex items-center gap-1.5">
                    <VoteIcon size={12} className="text-primary shrink-0" />
                    Voting is open — you haven&apos;t voted yet
                  </li>
                )}
                {hasPendingMeeting && (
                  <li className="text-xs text-ink-2 flex items-center gap-1.5">
                    <CalendarIcon size={12} className="text-accent-ink shrink-0" />
                    Meeting awaits your availability
                  </li>
                )}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {hasNotVoted && (
                <Link
                  data-testid="banner-cta-vote"
                  href={`/clubs/${clubId}/vote`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] bg-primary text-bg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Cast my vote
                </Link>
              )}
              {hasPendingMeeting && (
                /* @spec DASH-UI-BANNER-CTA-MEET-001 */
                <Link
                  data-testid="banner-cta-meet"
                  href={`/clubs/${clubId}/meetings`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-opacity ${
                    hasNotVoted
                      ? "border border-line-strong text-ink hover:bg-bg-soft"
                      : "bg-primary text-bg hover:opacity-90"
                  }`}
                >
                  Respond to meetings
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Currently Reading hero */}
      {currentBook?.book ? (
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <BookCover
              title={currentBook.book.title}
              author={currentBook.book.author}
              variant="teal"
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-1">
                Currently Reading
              </p>
              <h2 className="font-[var(--font-display)] text-xl font-semibold text-ink mb-1">
                {currentBook.book.title}
              </h2>
              <p className="text-ink-2 text-sm mb-4">
                {currentBook.book.author}
              </p>

              {/* Progress stats */}
              {progress.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
                    <span className="font-[var(--font-display)] text-lg font-semibold text-ink">{median}%</span>
                    <span>median</span>
                    <span className="text-ink-4">·</span>
                    <span>{finished} finished</span>
                    <span className="text-ink-4">·</span>
                    <span>{reading} reading</span>
                  </div>

                  {/* Progress bar with member tick-marks + below-row avatars
                      @spec DASH-UI-HERO-TICKS-001, DASH-UI-HERO-TOOLTIP-001 */}
                  <div className="relative">
                    <div className="relative">
                      <ProgressBar percentage={median} status="reading" animate />
                      <div className="absolute inset-0 pointer-events-none">
                        {progress.map((p: any) => {
                          const pct = Math.min(Math.max(p.percentage ?? 0, 0), 100);
                          const name = p.user?.displayName ?? "Member";
                          const chapter =
                            p.currentChapter != null
                              ? `Ch. ${p.currentChapter}`
                              : `${pct}%`;
                          return (
                            <button
                              key={`tick-${p.userId}`}
                              type="button"
                              data-testid={`hero-tick-${p.userId}`}
                              data-percentage={pct}
                              title={`${name} — ${chapter}`}
                              aria-label={`${name} — ${chapter}`}
                              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-ink/60 hover:bg-ink hover:w-1.5 hover:h-4 transition-all pointer-events-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              style={{ left: `${pct}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="relative h-6 mt-1">
                      {progress.slice(0, 8).map((p: any) => {
                        const pct = Math.min(Math.max(p.percentage ?? 0, 0), 100);
                        const name = p.user?.displayName ?? "Member";
                        const chapter =
                          p.currentChapter != null
                            ? `Ch. ${p.currentChapter}`
                            : `${pct}%`;
                        return (
                          <div
                            key={p.userId}
                            className="absolute -translate-x-1/2"
                            style={{ left: `${pct}%` }}
                            title={`${name} — ${chapter}`}
                          >
                            <Avatar name={name} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!progress.length && currentBook.book.pageCount && (
                <p className="text-ink-3 text-xs">
                  {currentBook.book.pageCount} pages
                </p>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 mb-6 text-center">
          <p className="text-ink-3 text-sm mb-3">No book selected yet</p>
          <Link
            href={`/clubs/${clubId}/vote`}
            className="text-primary text-sm font-medium hover:underline"
          >
            Start a vote
          </Link>
        </Card>
      )}

      {/* Three-up grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Active Vote */}
        <Card className="p-5">
          <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-3">
            Active Vote
          </h3>
          {activeRound ? (
            <div>
              <Badge
                tone={activeRound.status === "nominating" ? "accent" : "primary"}
                dot
              >
                {activeRound.status}
              </Badge>
              <Link
                href={`/clubs/${clubId}/vote`}
                className="block mt-3 text-sm text-primary font-medium hover:underline"
                data-testid="nav-vote"
              >
                Cast my vote
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-ink-3 text-sm">No active vote</p>
              <Link
                href={`/clubs/${clubId}/vote`}
                className="block mt-2 text-sm text-primary font-medium hover:underline"
                data-testid="nav-vote"
              >
                Start a vote
              </Link>
            </div>
          )}
        </Card>

        {/* Next Meeting */}
        <Card className="p-5">
          <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-3">
            Next Meeting
          </h3>
          {nextMeeting ? (
            <div>
              <p className="text-sm font-medium text-ink mb-1">{nextMeeting.title}</p>
              <Badge
                tone={
                  nextMeeting.status === "confirmed" ? "success" : "warning"
                }
                dot
              >
                {nextMeeting.status === "confirmed"
                  ? "Confirmed"
                  : "Awaiting responses"}
              </Badge>
              {nextMeeting.confirmedTime && (
                <p className="text-xs text-ink-2 mt-2">
                  {new Date(nextMeeting.confirmedTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              )}
              <Link
                href={`/clubs/${clubId}/meetings`}
                className="block mt-3 text-sm text-primary font-medium hover:underline"
                data-testid="nav-meetings"
              >
                View meetings
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-ink-3 text-sm">No meetings scheduled</p>
              <Link
                href={`/clubs/${clubId}/meetings`}
                className="block mt-2 text-sm text-primary font-medium hover:underline"
                data-testid="nav-meetings"
              >
                Schedule a meeting
              </Link>
            </div>
          )}
        </Card>

        {/* Recent Discussions */}
        <Card className="p-5">
          <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-3">
            Recent Discussions
          </h3>
          {threads.length > 0 ? (
            <ul className="space-y-2.5">
              {threads.map((thread: any) => (
                <li key={thread.id} className="flex items-center gap-2 text-sm min-w-0">
                  {thread.chapterTag && (
                    <span className="shrink-0">
                      <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                    </span>
                  )}
                  <span className="text-ink truncate min-w-0 flex-1">
                    {thread.body}
                  </span>
                  {thread.commentCount != null && (
                    <span className="text-[11px] text-ink-3 shrink-0">{thread.commentCount}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-3 text-sm">No discussions yet</p>
          )}
          <Link
            href={`/clubs/${clubId}/discussions`}
            className="block mt-3 text-sm text-primary font-medium hover:underline"
            data-testid="nav-discussions"
          >
            View all
          </Link>
        </Card>
      </div>

      {/* Progress link */}
      <Card className="p-5">
        <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-3">
          Reading Progress
        </h3>
        <Link
          href={`/clubs/${clubId}/progress`}
          data-testid="nav-progress"
          className="text-sm text-primary font-medium hover:underline"
        >
          View progress
        </Link>
      </Card>
    </div>
  );
}
