import Link from "next/link";
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import { Card, Badge, BookCover, ProgressBar, Avatar } from "@/components/ui";
import { UpdateProgressButton } from "./update-modal";

// @spec PROG-API-003, PROG-UI-001, PROG-UI-004, PROG-UI-005, PROG-UI-006, PROG-UI-007, PROG-UI-008, PROG-UI-BOOK-001, PROG-UI-BOOK-002, PROG-UI-BOOK-005, PROG-UI-BOOK-006, PROG-UI-BOOK-007
export default async function ProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ bookId?: string }>;
}) {
  const { clubId } = await params;
  const { bookId: requestedBookId } = await searchParams;

  let selections: any[] = [];
  let selectionsError = "";
  try {
    const caller = await getServerCaller();
    selections = await caller.selections.list({ clubId });
  } catch (e: unknown) {
    selectionsError = e instanceof Error ? e.message : "Error loading selections";
  }

  if (selectionsError) {
    return (
      <p data-testid="selections-error" className="text-danger">
        {selectionsError}
      </p>
    );
  }

  const currentSelection = selections.find((s) => s.isCurrent);
  const bookId = requestedBookId ?? currentSelection?.bookId;

  if (!bookId) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight mb-8">
          Reading Progress
        </h1>
        <Card className="p-10 text-center">
          <p data-testid="no-current-book" className="text-ink-3 text-sm">
            No books have been selected yet.
          </p>
        </Card>
      </div>
    );
  }

  const orderedSelections = [
    ...selections.filter((s) => s.isCurrent),
    ...selections.filter((s) => !s.isCurrent),
  ];

  let progress: any[] = [];
  let totalPages = 0;
  let myProgress: any = null;
  let book: any = null;
  let error = "";

  try {
    const caller = await getServerCaller();
    progress = await caller.progress.list({ clubId, bookId });
    myProgress = await caller.progress.me({ clubId, bookId });
    book = await prisma.book.findUnique({ where: { id: bookId } });
    const firstWithPages = progress.find((p: any) => p.totalPages);
    totalPages = firstWithPages?.totalPages ?? book?.pageCount ?? 0;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading progress";
  }

  if (error) {
    return <p data-testid="progress-error" className="text-danger">{error}</p>;
  }

  const sorted = [...progress].sort(
    (a: any, b: any) => (b.percentage ?? 0) - (a.percentage ?? 0)
  );

  const finished = progress.filter((p: any) => p.status === "finished").length;
  const reading = progress.filter((p: any) => p.status === "reading").length;
  const notStarted = progress.filter((p: any) => p.status === "not_started").length;
  const percentages = progress.map((p: any) => p.percentage ?? 0).sort((a: number, b: number) => a - b);
  const median = percentages.length > 0
    ? percentages[Math.floor(percentages.length / 2)]
    : 0;

  const isViewingPast = !!requestedBookId && requestedBookId !== currentSelection?.bookId;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
          Reading Progress
        </h1>
        {!isViewingPast && (
          <UpdateProgressButton
            clubId={clubId}
            bookId={bookId}
            totalPages={totalPages || 412}
            currentProgress={
              myProgress
                ? {
                    currentPage: myProgress.currentPage ?? undefined,
                    percentage: myProgress.percentage ?? undefined,
                    currentChapter: myProgress.currentChapter ?? undefined,
                    status: myProgress.status ?? undefined,
                    updatedAt: myProgress.updatedAt ?? undefined,
                  }
                : undefined
            }
          />
        )}
      </div>

      {orderedSelections.length > 0 && (
        <HistoryPicker
          clubId={clubId}
          selections={orderedSelections}
          activeBookId={bookId}
        />
      )}

      {book && (
        <Card className="p-5 mb-6">
          <div className="flex gap-4 items-center">
            <BookCover
              title={book.title}
              author={book.author}
              variant="teal"
              size="sm"
            />
            <div className="min-w-0">
              <h2 className="font-[var(--font-display)] text-lg font-semibold text-ink truncate">
                {book.title}
              </h2>
              <p className="text-sm text-ink-2">{book.author}</p>
              {book.pageCount && (
                <p className="text-xs text-ink-3 mt-1">{book.pageCount} pages</p>
              )}
              {isViewingPast && (
                <p data-testid="viewing-past-notice" className="text-xs text-ink-3 mt-1 italic">
                  Viewing a past selection — progress shown is live.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {progress.length === 0 ? (
        <Card className="p-10 text-center">
          <p data-testid="no-progress" className="text-ink-3 text-sm">
            No progress tracked yet.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div data-testid="progress-ring" className="relative w-[100px] h-[100px] flex-shrink-0">
                <svg width="100" height="100" className="-rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-sunken, #eee)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke="var(--primary, #2d7a8a)" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - median / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span data-testid="ring-percentage" className="font-[var(--font-display)] text-2xl font-semibold text-ink">
                    {median}%
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <p data-testid="progress-summary" className="text-sm text-ink-2 mb-3">
                  {reading + finished} of {progress.length} reading · median at {median}%
                  {finished > 0 && ` · ${finished} finished`}
                </p>

                <div data-testid="distribution-bar" className="flex rounded-lg overflow-hidden h-3 mb-2 bg-[var(--bg-sunken)]">
                  {finished > 0 && (
                    <div style={{ width: `${(finished / progress.length) * 100}%` }} className="bg-[var(--accent,oklch(0.78_0.13_75))]" />
                  )}
                  {reading > 0 && (
                    <div style={{ width: `${(reading / progress.length) * 100}%` }} className="bg-[var(--primary,oklch(0.42_0.06_195))]" />
                  )}
                  {notStarted > 0 && (
                    <div style={{ width: `${(notStarted / progress.length) * 100}%` }} className="bg-ink-4" />
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span data-testid="legend-finished" className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[var(--accent,oklch(0.78_0.13_75))]" />
                    Finished <strong className="text-ink">{finished}</strong>
                  </span>
                  <span data-testid="legend-reading" className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[var(--primary,oklch(0.42_0.06_195))]" />
                    Reading <strong className="text-ink">{reading}</strong>
                  </span>
                  <span data-testid="legend-not-started" className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-ink-4" />
                    Not started <strong className="text-ink">{notStarted}</strong>
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-[var(--font-display)] text-lg font-semibold text-ink">Where everyone is</h2>
            <span className="text-xs text-ink-3">Sorted by progress</span>
          </div>

          <Card className="divide-y divide-line">
            <ul data-testid="progress-list">
              {sorted.map((p: any, i: number) => (
                <li
                  key={p.userId}
                  data-testid={`progress-${p.userId}`}
                  className="flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-3.5"
                >
                  <Avatar
                    name={p.user?.displayName ?? ""}
                    size="md"
                  />
                  <div className="min-w-0 flex-1 sm:flex-none sm:w-40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-ink truncate">
                        {p.user?.displayName ?? "Member"}
                      </span>
                      {p.status === "finished" && (
                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-accent text-[oklch(0.25_0.04_75)] shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-3 mt-0.5">
                      {p.status === "not_started"
                        ? "Not started yet"
                        : p.status === "finished"
                          ? `Finished · ${p.totalPages ?? p.currentPage ?? ""} pages`
                          : `Page ${p.currentPage ?? 0}${p.currentChapter != null ? ` · ch. ${p.currentChapter}` : ""}`}
                    </p>
                  </div>
                  <div className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1 sm:min-w-0">
                    <ProgressBar
                      percentage={p.percentage ?? 0}
                      status={p.status ?? "not_started"}
                      animate
                      delay={i * 60}
                    />
                  </div>
                  <div className="text-right w-14 ml-auto sm:ml-0">
                    <span className="font-[var(--font-display)] text-lg font-semibold tabular-nums">{p.percentage ?? 0}</span>
                    <span className="text-ink-3 text-sm">%</span>
                  </div>
                  {p.status === "finished" && (
                    <span data-testid="badge-finished"><Badge tone="accent">Done</Badge></span>
                  )}
                  {p.status === "reading" && (
                    <span data-testid="badge-reading"><Badge tone="primary" dot>Reading</Badge></span>
                  )}
                  {p.status === "not_started" && (
                    <span data-testid="badge-not-started"><Badge tone="neutral">Waiting</Badge></span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function formatMonthYear(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function HistoryPicker({
  clubId,
  selections,
  activeBookId,
}: {
  clubId: string;
  selections: any[];
  activeBookId: string;
}) {
  return (
    <div data-testid="history-picker" className="mb-6">
      <p className="text-xs uppercase tracking-wide text-ink-3 mb-2">Book history</p>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {selections.map((s) => {
          const isActive = s.bookId === activeBookId;
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={`/clubs/${clubId}/progress?bookId=${s.bookId}`}
                data-testid={`history-item-${s.bookId}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  isActive
                    ? "border-primary bg-primary-soft text-ink"
                    : "border-line bg-bg hover:bg-bg-soft text-ink-2"
                }`}
              >
                <span className="font-medium truncate max-w-[180px]">{s.book?.title ?? "Untitled"}</span>
                {s.isCurrent && (
                  <span data-testid="history-current-badge">
                    <Badge tone="primary">Current</Badge>
                  </span>
                )}
                {!s.isCurrent && (
                  <span data-testid={`history-finished-date-${s.bookId}`} className="text-xs text-ink-3">
                    {s.finishedAt
                      ? `Finished ${formatMonthYear(s.finishedAt)}`
                      : `Selected ${formatMonthYear(s.selectedAt)}`}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
