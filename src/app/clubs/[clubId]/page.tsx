// @spec DASH-UI-006, DASH-UI-007, DASH-UI-009, DASH-UI-011, DASH-UI-HERO-PROGRESS-001, DISC-UI-DASH-FEED-AUTOFILTER-001, DASH-UI-BOOKMARK-EDGE-001
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, Badge, BookCover, ChapterChip, Avatar, EarGlyph, DateStamp } from "@/components/ui";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";
import { CopyClubCode } from "./copy-club-code";
import { BookmarkEdge, type EdgeMember } from "./bookmark-edge";

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
  let viewerId = "";
  let myVoteCount: number | null = null;

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
    viewerId = userId;

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
    if (voteCount !== null) {
      hasNotVoted = voteCount === 0;
      myVoteCount = voteCount;
    }

    // Phase 3: spoiler-cut threads + progress, both depend on cutoff/bookId.
    if (bookId) {
      // deriveSpoilerCutoff is fail-safe: returns 0 (hide chapter-tagged
      // threads) when the viewer has no progress recorded — see
      // DISC-LIB-CUTOFF-FAILSAFE-001.
      const cutoff = deriveSpoilerCutoff(myProgress);
      const [threadResult, progressList] = await Promise.all([
        caller.threads.list({
          clubId,
          bookId,
          maxChapter: cutoff,
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
  const notStarted = progress.filter((p: any) => p.status === "not_started").length;

  // BookmarkEdge data — one bookmark per member at their reading depth.
  const edgeMembers: EdgeMember[] = progress.map((p: any) => ({
    userId: p.userId,
    name: p.user?.displayName ?? "Member",
    pct: Math.min(Math.max(p.percentage ?? 0, 0), 100),
    status: (p.status ?? "not_started") as EdgeMember["status"],
    chapter: p.currentChapter ?? null,
    you: p.userId === viewerId,
  }));

  return (
    <div className="w-full max-w-[1600px]">
      {/* Header — desktop only; the mobile club-switcher header carries
          name/code below md. Kept visible at md+ for the club-name testid. */}
      <div className="mb-8 hidden md:block">
        <p className="text-[11px] font-bold font-[var(--font-display)] text-ink-3 uppercase tracking-[0.18em] mb-2">
          Your reading nook
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1
            className="font-[var(--font-display)] text-[clamp(28px,2.6vw,40px)] font-extrabold text-ink tracking-tight leading-none"
            data-testid="club-name"
          >
            {club.name}
          </h1>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <CopyClubCode code={club.code} />
        </div>
        <div className="mt-5 h-px bg-line" />
      </div>

      {/* Attention Banner — amber-tint card with per-item CTA rows */}
      {(hasNotVoted || hasPendingMeeting) && (
        <Card
          data-testid="attention-banner"
          className="p-4 mb-6 bg-warning-soft border-warning/20"
        >
          <p className="font-[var(--font-display)] font-extrabold text-[14.5px] text-warning-ink mb-2.5">
            {hasNotVoted && hasPendingMeeting
              ? "2 things need your attention"
              : "1 thing needs your attention"}
          </p>
          <div className="flex flex-col gap-2">
            {hasNotVoted && (
              <div className="flex items-center justify-between gap-3">
                <span className="font-[var(--font-serif)] text-[14.5px] text-ink">
                  Voting is open — you haven&apos;t voted yet
                </span>
                <Link
                  data-testid="banner-cta-vote"
                  href={`/clubs/${clubId}/vote`}
                  className="inline-flex shrink-0 items-center rounded-full bg-primary px-4 py-1.5 font-[var(--font-display)] text-[13.5px] font-extrabold text-bg shadow-[0_2px_0_var(--color-primary-hover)] hover:bg-primary-hover transition-colors"
                >
                  Cast my vote
                </Link>
              </div>
            )}
            {hasPendingMeeting && (
              /* @spec DASH-UI-BANNER-CTA-MEET-001 */
              <div className="flex items-center justify-between gap-3">
                <span className="font-[var(--font-serif)] text-[14.5px] text-ink">
                  Meeting awaits your availability
                </span>
                <Link
                  data-testid="banner-cta-meet"
                  href={`/clubs/${clubId}/meetings`}
                  className={`inline-flex shrink-0 items-center rounded-full px-4 py-1.5 font-[var(--font-display)] text-[13.5px] font-extrabold transition-colors ${
                    hasNotVoted
                      ? "bg-bg-soft text-primary shadow-[inset_0_0_0_2px_var(--color-primary-soft)] hover:shadow-[inset_0_0_0_2px_var(--color-primary)]"
                      : "bg-primary text-bg shadow-[0_2px_0_var(--color-primary-hover)] hover:bg-primary-hover"
                  }`}
                >
                  Respond to meetings
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Currently Reading hero — bookmark edge replaces the tick overlay
          @spec DASH-UI-BOOKMARK-EDGE-001 */}
      {currentBook?.book ? (
        <Card className="p-5 mb-6 relative">
          <Badge tone="primary" dot>Now reading</Badge>
          <Link
            href={`/clubs/${clubId}/progress`}
            className="flex gap-4 mt-3"
          >
            <BookCover
              title={currentBook.book.title}
              author={currentBook.book.author}
              coverUrl={currentBook.book.coverUrl}
              isbn={currentBook.book.isbn}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-[var(--font-display)] text-[22px] font-extrabold text-ink leading-tight tracking-tight">
                {currentBook.book.title}
              </h2>
              <p className="font-[var(--font-serif)] italic text-ink-2 text-[14.5px]">
                {currentBook.book.author}
                {currentBook.book.pageCount && (
                  <span className="text-ink-4 not-italic"> · {currentBook.book.pageCount} pages</span>
                )}
              </p>
              {progress.length > 0 && (
                <div className="flex gap-5 mt-3">
                  <div>
                    <div className="font-[var(--font-display)] text-[21px] font-extrabold text-primary leading-none tabular-nums">
                      {median}%
                    </div>
                    <div className="font-[var(--font-display)] text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-3 mt-1">
                      Median
                    </div>
                  </div>
                  <div>
                    <div className="font-[var(--font-display)] text-[21px] font-extrabold text-ink leading-none tabular-nums">
                      {finished}
                    </div>
                    <div className="font-[var(--font-display)] text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-3 mt-1">
                      Finished
                    </div>
                  </div>
                  <div>
                    <div className="font-[var(--font-display)] text-[21px] font-extrabold text-ink leading-none tabular-nums">
                      {notStarted}
                    </div>
                    <div className="font-[var(--font-display)] text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-3 mt-1">
                      Not started
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Link>

          {progress.length > 0 && (
            <>
              <div className="mt-2">
                <BookmarkEdge members={edgeMembers} median={median} />
              </div>
              <p className="font-[var(--font-serif)] italic text-center text-[13px] text-ink-3 mt-2 mb-0">
                Tap a bookmark to see who&rsquo;s there
              </p>
            </>
          )}
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

      {/* Preview sections — stacked on mobile, three-up at md */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6">
        {/* Active Vote */}
        <section>
          <h3 className="font-[var(--font-display)] text-[19px] font-extrabold text-ink mb-2.5 px-0.5">
            Active vote
          </h3>
          <Card className="p-4">
            {activeRound ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-[var(--font-display)] text-[15.5px] font-extrabold text-ink">
                    {activeRound.status === "nominating" ? "Nominations open" : "Voting live"}
                  </span>
                  {activeRound.status === "voting" ? (
                    <Badge solid dot>Voting</Badge>
                  ) : (
                    <Badge tone="accent" dot>Nominating</Badge>
                  )}
                </div>
                {activeRound.status === "voting" && myVoteCount != null && (
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      {Array.from({
                        length: activeRound.maxApprovalsPerMember ?? 3,
                      }).map((_, i) => (
                        <EarGlyph key={i} filled={i < (myVoteCount ?? 0)} />
                      ))}
                    </span>
                    <span className="font-[var(--font-display)] text-[12.5px] font-bold text-ink-2">
                      {myVoteCount}/{activeRound.maxApprovalsPerMember ?? 3} picks dog-eared
                    </span>
                  </div>
                )}
                <Link
                  href={`/clubs/${clubId}/vote`}
                  data-testid="nav-vote"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-bg shadow-[0_2px_0_var(--color-primary-hover)] hover:bg-primary-hover transition-colors"
                >
                  {activeRound.status === "nominating" ? "Nominate a book" : "Cast my vote"}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="font-[var(--font-serif)] italic text-[15px] text-ink-2">No active vote</p>
                <p className="font-[var(--font-display)] text-xs font-semibold text-ink-3">Pick the club&apos;s next read.</p>
                <Link
                  href={`/clubs/${clubId}/vote`}
                  data-testid="nav-vote"
                  className="mt-1 inline-flex items-center gap-1.5 font-[var(--font-display)] text-sm font-extrabold text-primary hover:underline"
                >
                  Start a vote →
                </Link>
              </div>
            )}
          </Card>
        </section>

        {/* Next Meeting */}
        <section>
          <h3 className="font-[var(--font-display)] text-[19px] font-extrabold text-ink mb-2.5 px-0.5">
            Next meeting
          </h3>
          <Card className="p-4">
            {nextMeeting ? (
              <Link
                href={`/clubs/${clubId}/meetings`}
                data-testid="nav-meetings"
                className="flex items-center gap-3.5"
              >
                {nextMeeting.confirmedTime ? (
                  <DateStamp date={nextMeeting.confirmedTime} />
                ) : (
                  <div className="w-[58px] shrink-0 -rotate-2 rounded-[12px] border-2 border-dashed border-line-strong py-1.5 text-center text-ink-3">
                    <div className="font-[var(--font-display)] font-extrabold text-2xl leading-none">?</div>
                    <div className="font-[var(--font-mono)] text-[9.5px] font-bold tracking-[0.14em] mt-0.5">TBD</div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-[var(--font-display)] text-[15.5px] font-extrabold text-ink truncate">
                      {nextMeeting.title}
                    </span>
                    <Badge tone={nextMeeting.status === "confirmed" ? "success" : "warning"}>
                      {nextMeeting.status === "confirmed" ? "Confirmed" : "Awaiting responses"}
                    </Badge>
                  </div>
                  {nextMeeting.confirmedTime ? (
                    <p className="font-[var(--font-serif)] text-[13.5px] text-ink-2 mt-1">
                      {new Date(nextMeeting.confirmedTime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {nextMeeting.location ? ` · ${nextMeeting.location}` : ""}
                    </p>
                  ) : meetingResponseCount != null ? (
                    <p className="font-[var(--font-serif)] text-[13.5px] text-ink-2 mt-1">
                      {meetingResponseCount} member{meetingResponseCount === 1 ? "" : "s"} responded
                    </p>
                  ) : null}
                </div>
              </Link>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="font-[var(--font-serif)] italic text-[15px] text-ink-2">Nothing scheduled</p>
                <p className="font-[var(--font-display)] text-xs font-semibold text-ink-3">Propose a few times that work.</p>
                <Link
                  href={`/clubs/${clubId}/meetings`}
                  data-testid="nav-meetings"
                  className="mt-1 inline-flex items-center gap-1.5 font-[var(--font-display)] text-sm font-extrabold text-primary hover:underline"
                >
                  Schedule a meeting →
                </Link>
              </div>
            )}
          </Card>
        </section>

        {/* Margin notes */}
        <section>
          <h3 className="font-[var(--font-display)] text-[19px] font-extrabold text-ink mb-2.5 px-0.5">
            Margin notes
          </h3>
          <Card className="py-1 overflow-hidden flex flex-col">
            {threads.length > 0 ? (
              <ul>
                {threads.map((thread: any, i: number) => (
                  <li
                    key={thread.id}
                    className={`flex items-start gap-2.5 px-4 py-2.5 ${i === 0 ? "" : "border-t border-line"}`}
                  >
                    {thread.chapterTag && (
                      <span className="shrink-0 mt-0.5">
                        <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-[var(--font-serif)] text-[14.5px] leading-snug text-ink line-clamp-2">
                        {thread.body}
                      </p>
                      {thread.author?.displayName && (
                        <p className="font-[var(--font-display)] text-[11.5px] font-semibold text-ink-3 mt-0.5">
                          {thread.author.displayName}
                        </p>
                      )}
                    </div>
                    {thread.commentCount != null && (
                      <span
                        className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 font-[var(--font-display)] text-xs font-extrabold text-primary tabular-nums"
                        title={`${thread.commentCount} ${thread.commentCount === 1 ? "comment" : "comments"}`}
                      >
                        {thread.commentCount}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col gap-1.5 px-4 py-3">
                <p className="font-[var(--font-serif)] italic text-[15px] text-ink-2">No discussions yet</p>
                <p className="font-[var(--font-display)] text-xs font-semibold text-ink-3">Start the first thread.</p>
              </div>
            )}
            <Link
              href={`/clubs/${clubId}/discussions`}
              data-testid="nav-discussions"
              className="px-4 py-2.5 border-t border-line font-[var(--font-display)] text-sm font-extrabold text-primary hover:underline"
            >
              View all →
            </Link>
          </Card>
        </section>
      </div>

      {/* Reading Progress — member roll-call */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-2.5 px-0.5">
          <h3 className="font-[var(--font-display)] text-[19px] font-extrabold text-ink">
            Where everyone is
          </h3>
          <Link
            href={`/clubs/${clubId}/progress`}
            data-testid="nav-progress"
            className="font-[var(--font-display)] text-sm font-extrabold text-primary hover:underline"
          >
            View progress →
          </Link>
        </div>
      <Card className="p-5">
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
          <p className="font-[var(--font-serif)] text-ink-3 text-sm italic">
            No one&apos;s logged progress yet.
          </p>
        )}
      </Card>
      </section>
    </div>
  );
}
