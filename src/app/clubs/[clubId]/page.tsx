// @spec DASH-UI-006, DASH-UI-007, DASH-UI-008, DASH-UI-011, DISC-UI-DASH-FEED-AUTOFILTER-001
/* eslint-disable no-restricted-syntax --
 * The fading hairline divider (~137), the attention-banner primary-tint gradient (~149),
 * and the currently-reading hero's paper-cream radial wash (~218) are page-private
 * decorative gradients designed for the dashboard's visual rhythm. They are not
 * reused elsewhere and don't belong in the global token set. DSYS-TOKEN-003
 * exemption documented per DASH-UI-007/008 intent.
 */
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, Badge, BookCover, ProgressBar, ChapterChip, Avatar } from "@/components/ui";
import { VoteIcon, CalendarIcon, ChatIcon, TrendIcon } from "@/components/ui/icons";
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

  // Tally of distinct members who've responded to a proposed meeting — drives
  // the "X of Y responded" line on the meeting card.
  const meetingResponseCount = (() => {
    if (!nextMeeting || nextMeeting.status !== "proposed") return null;
    const responders = new Set<string>();
    for (const slot of nextMeeting.slots ?? []) {
      for (const r of slot.responses ?? []) {
        if (r.userId) responders.add(r.userId);
      }
    }
    return responders.size;
  })();

  // Progress stats
  const percentages = progress.map((p: any) => p.percentage ?? 0).sort((a: number, b: number) => a - b);
  const median = percentages.length > 0 ? percentages[Math.floor(percentages.length / 2)] : 0;
  const finished = progress.filter((p: any) => p.status === "finished").length;
  const reading = progress.filter((p: any) => p.status === "reading").length;

  return (
    <div className="w-full max-w-[1600px]">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.18em] mb-2">
          Club Dashboard
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1
            className="font-[var(--font-display)] text-[clamp(28px,2.6vw,40px)] font-semibold text-ink tracking-tight leading-none"
            data-testid="club-name"
          >
            {club.name}
          </h1>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <CopyClubCode code={club.code} />
        </div>
        <div
          className="mt-5 h-px"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.84 0.01 70) 0%, oklch(0.84 0.01 70 / 0.5) 40%, oklch(0.84 0.01 70 / 0) 100%)",
          }}
        />
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
        <Card className="p-6 sm:p-7 mb-6 relative overflow-hidden">
          {/* Subtle paper-cream wash, top-right vignette */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(120% 80% at 100% 0%, oklch(0.97 0.02 75 / 0.45) 0%, transparent 55%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-7">
            <BookCover
              title={currentBook.book.title}
              author={currentBook.book.author}
              coverUrl={currentBook.book.coverUrl}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.18em] mb-2 flex items-center gap-2">
                <span className="inline-block w-4 h-px bg-ink-3/60" aria-hidden="true" />
                Currently Reading
              </p>
              <h2 className="font-[var(--font-display)] text-[clamp(20px,2vw,28px)] font-semibold text-ink leading-tight tracking-tight mb-1">
                {currentBook.book.title}
              </h2>
              <p className="text-ink-2 text-sm italic mb-4">
                by {currentBook.book.author}
                {currentBook.book.pageCount && (
                  <span className="text-ink-4 not-italic"> · {currentBook.book.pageCount} pages</span>
                )}
              </p>

              {/* Progress stats */}
              {progress.length > 0 && (
                <>
                  <div className="h-px bg-line my-4" aria-hidden="true" />
                  <div className="space-y-4">
                    {/* Labeled stat trio — display numerals, small caps labels */}
                    <div className="flex flex-wrap gap-x-7 gap-y-2">
                      <div>
                        <div className="font-[var(--font-display)] text-2xl font-semibold text-ink leading-none tabular-nums">
                          {median}<span className="text-ink-3 text-lg">%</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-ink-3 mt-1.5">
                          Median
                        </div>
                      </div>
                      <div>
                        <div className="font-[var(--font-display)] text-2xl font-semibold text-ink leading-none tabular-nums">
                          {finished}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-ink-3 mt-1.5">
                          Finished
                        </div>
                      </div>
                      <div>
                        <div className="font-[var(--font-display)] text-2xl font-semibold text-ink leading-none tabular-nums">
                          {reading}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-ink-3 mt-1.5">
                          Reading
                        </div>
                      </div>
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
                </>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-8 mb-6 text-center">
          <p className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.18em] mb-3">
            Currently Reading
          </p>
          <p className="font-[var(--font-display)] text-lg text-ink-2 mb-1 italic">
            No book selected yet
          </p>
          <p className="text-ink-3 text-sm mb-4">Open a voting round to pick your next read.</p>
          <Link
            href={`/clubs/${clubId}/vote`}
            className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
          >
            Start a vote
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Card>
      )}

      {/* Three-up grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Active Vote */}
        <Card className="p-5 flex flex-col transition-all hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-primary-soft text-primary-ink">
              <VoteIcon size={14} />
            </span>
            <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.16em]">
              Active Vote
            </h3>
          </div>
          {activeRound ? (
            <div className="flex flex-col gap-3 flex-1">
              <div>
                <p className="font-[var(--font-display)] text-lg font-semibold text-ink leading-tight capitalize">
                  {activeRound.status === "nominating" ? "Nominations open" : "Voting live"}
                </p>
                <p className="text-xs text-ink-3 mt-1 italic">
                  {activeRound.status === "nominating"
                    ? "Suggest a book for the club"
                    : "Cast up to your approval cap"}
                </p>
              </div>
              <div>
                <Badge
                  tone={activeRound.status === "nominating" ? "accent" : "primary"}
                  dot
                >
                  {activeRound.status}
                </Badge>
              </div>
              <Link
                href={`/clubs/${clubId}/vote`}
                className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                data-testid="nav-vote"
              >
                {activeRound.status === "nominating" ? "Nominate a book" : "Cast my vote"}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              <p className="font-[var(--font-display)] text-lg text-ink-2 italic">No active vote</p>
              <p className="text-xs text-ink-3">Pick the club's next read.</p>
              <Link
                href={`/clubs/${clubId}/vote`}
                className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                data-testid="nav-vote"
              >
                Start a vote
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          )}
        </Card>

        {/* Next Meeting */}
        <Card className="p-5 flex flex-col transition-all hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-accent-soft text-accent-ink">
              <CalendarIcon size={14} />
            </span>
            <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.16em]">
              Next Meeting
            </h3>
          </div>
          {nextMeeting ? (
            <div className="flex flex-col gap-3 flex-1">
              <div>
                <p className="font-[var(--font-display)] text-base font-semibold text-ink leading-tight truncate">
                  {nextMeeting.title}
                </p>
                {nextMeeting.confirmedTime ? (
                  <p className="text-xs text-ink-2 mt-1.5 italic">
                    {new Date(nextMeeting.confirmedTime).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {new Date(nextMeeting.confirmedTime).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                ) : meetingResponseCount != null ? (
                  <p className="text-xs text-ink-2 mt-1.5 italic">
                    {meetingResponseCount} member{meetingResponseCount === 1 ? "" : "s"} responded
                  </p>
                ) : null}
              </div>
              <div>
                <Badge
                  tone={nextMeeting.status === "confirmed" ? "success" : "warning"}
                  dot
                >
                  {nextMeeting.status === "confirmed" ? "Confirmed" : "Awaiting responses"}
                </Badge>
              </div>
              <Link
                href={`/clubs/${clubId}/meetings`}
                className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                data-testid="nav-meetings"
              >
                View meetings
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              <p className="font-[var(--font-display)] text-lg text-ink-2 italic">Nothing scheduled</p>
              <p className="text-xs text-ink-3">Propose a few times that work.</p>
              <Link
                href={`/clubs/${clubId}/meetings`}
                className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                data-testid="nav-meetings"
              >
                Schedule a meeting
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          )}
        </Card>

        {/* Recent Discussions */}
        <Card className="p-5 flex flex-col transition-all hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-bg-sunken text-ink-2">
              <ChatIcon size={14} />
            </span>
            <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.16em]">
              Recent Discussions
            </h3>
          </div>
          {threads.length > 0 ? (
            <ul className="space-y-2.5 flex-1">
              {threads.map((thread: any) => (
                <li
                  key={thread.id}
                  className="flex items-start gap-2 text-sm min-w-0 py-1 border-b border-line/60 last:border-0"
                >
                  {thread.chapterTag && (
                    <span className="shrink-0 mt-0.5">
                      <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                    </span>
                  )}
                  <span className="text-ink truncate min-w-0 flex-1 leading-snug">
                    {thread.body}
                  </span>
                  {thread.commentCount != null && (
                    <span
                      className="flex items-center gap-0.5 text-[11px] text-ink-3 shrink-0 tabular-nums"
                      title={`${thread.commentCount} ${thread.commentCount === 1 ? "comment" : "comments"}`}
                    >
                      <ChatIcon size={10} />
                      {thread.commentCount}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              <p className="font-[var(--font-display)] text-lg text-ink-2 italic">No discussions yet</p>
              <p className="text-xs text-ink-3">Start the first thread.</p>
            </div>
          )}
          <Link
            href={`/clubs/${clubId}/discussions`}
            className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            data-testid="nav-discussions"
          >
            View all
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </Card>
      </div>

      {/* Reading Progress — member roll-call */}
      <Card className="p-5 transition-all hover:border-line-strong">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-bg-sunken text-ink-2">
              <TrendIcon size={14} />
            </span>
            <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.16em]">
              Reading Progress
            </h3>
          </div>
          <Link
            href={`/clubs/${clubId}/progress`}
            data-testid="nav-progress"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            View progress
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
        {progress.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-3">
            {[...progress]
              .sort((a: any, b: any) => (b.percentage ?? 0) - (a.percentage ?? 0))
              .map((p: any) => {
                const pct = Math.min(Math.max(p.percentage ?? 0, 0), 100);
                const name = p.user?.displayName ?? "Member";
                const isFinished = p.status === "finished";
                return (
                  <li key={p.userId} className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm text-ink truncate">{name}</span>
                        {isFinished && (
                          <span className="text-accent-ink" title="Finished" aria-label="Finished">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 12.5l4.5 4.5L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-bg-sunken overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isFinished ? "bg-accent" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-[var(--font-mono)] text-ink-3 tabular-nums shrink-0">
                      {pct}%
                    </span>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="text-ink-3 text-sm italic">
            No one's logged progress yet.
          </p>
        )}
      </Card>
    </div>
  );
}
