// @spec DASH-UI-006, DASH-UI-007, DASH-UI-008
import { getServerCaller } from "@/trpc/server";
import Link from "next/link";
import { Card, Badge, BookCover, ProgressBar, AvatarStack, ChapterChip, Avatar } from "@/components/ui";

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

  try {
    const caller = await getServerCaller();
    const result = await caller.clubs.get({ clubId });
    club = result.club;
    currentBook = result.currentBook;

    const rounds = await caller.rounds.list({ clubId });
    activeRound = rounds.find(
      (r: any) => r.status === "nominating" || r.status === "voting"
    );

    meetings = await caller.meetings.list({ clubId });

    if (currentBook?.book?.id) {
      const threadResult = await caller.threads.list({
        clubId,
        bookId: currentBook.book.id,
      });
      threads = threadResult.threads?.slice(0, 3) ?? [];

      progress = await caller.progress.list({ clubId, bookId: currentBook.book.id });
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
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-[var(--font-display)] text-3xl font-semibold text-ink tracking-tight"
          data-testid="club-name"
        >
          {club.name}
        </h1>
        <p className="text-ink-3 text-sm mt-1" data-testid="club-code">
          Code: <span className="font-[var(--font-mono)]">{club.code}</span>
        </p>
      </div>

      {/* Currently Reading hero */}
      {currentBook?.book ? (
        <Card className="p-6 mb-6">
          <div className="flex gap-6">
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
                  <div className="flex items-center gap-4 text-xs text-ink-2">
                    <span className="font-[var(--font-display)] text-lg font-semibold text-ink">{median}%</span>
                    <span>median</span>
                    <span className="text-ink-4">·</span>
                    <span>{finished} finished</span>
                    <span className="text-ink-4">·</span>
                    <span>{reading} reading</span>
                  </div>

                  {/* Progress bar with member tick-marks */}
                  <div className="relative">
                    <ProgressBar percentage={median} status="reading" animate />
                    <div className="relative h-6 mt-1">
                      {progress.slice(0, 8).map((p: any) => (
                        <div
                          key={p.userId}
                          className="absolute -translate-x-1/2"
                          style={{ left: `${Math.min(p.percentage ?? 0, 100)}%` }}
                        >
                          <Avatar name={p.user?.displayName ?? ""} size="sm" />
                        </div>
                      ))}
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
                <li key={thread.id} className="flex items-center gap-2 text-sm">
                  {thread.chapterTag && (
                    <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                  )}
                  <span className="text-ink font-medium truncate">
                    {thread.title}
                  </span>
                  {thread.commentCount != null && (
                    <span className="text-[11px] text-ink-3 ml-auto shrink-0">{thread.commentCount}</span>
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
