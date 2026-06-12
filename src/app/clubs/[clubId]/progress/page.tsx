import Link from "next/link";
import { getServerCaller } from "@/trpc/server";
import { prisma } from "@/lib/db";
import { Card, Badge, BookCover } from "@/components/ui";
import { UpdateProgressButton } from "./update-modal";
import { ProgressDashboard } from "./progress-dashboard";

// @spec PROG-API-003, PROG-UI-001, PROG-UI-004, PROG-UI-005, PROG-UI-006, PROG-UI-007, PROG-UI-008, PROG-UI-BOOK-001, PROG-UI-BOOK-002, PROG-UI-BOOK-005, PROG-UI-BOOK-006, PROG-UI-BOOK-007, PROG-DASH-UNKNOWN-TOTAL-001, PROG-DASH-LIVE-001
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
      <div className="w-full max-w-[1600px]">
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
  // `totalPages` is null when neither the book nor any member record knows the
  // page count. The modal renders an "Unknown total" branch in that case
  // rather than fabricating a number like the old `|| 412` fallback.
  let totalPages: number | null = null;
  let myProgress: any = null;
  let book: any = null;
  let error = "";

  try {
    const caller = await getServerCaller();
    progress = await caller.progress.list({ clubId, bookId });
    myProgress = await caller.progress.me({ clubId, bookId });
    book = await prisma.book.findUnique({ where: { id: bookId } });
    const firstWithPages = progress.find((p: any) => p.totalPages);
    totalPages = firstWithPages?.totalPages ?? book?.pageCount ?? null;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading progress";
  }

  if (error) {
    return <p data-testid="progress-error" className="text-danger">{error}</p>;
  }

  // ISO-stringify dates before seeding the client query — there is no
  // superjson transformer, so refetched rows carry ISO strings and the
  // initialData must match that shape (docs/llds/live-updates.md).
  const initialProgress = progress.map((p: any) => ({
    ...p,
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  }));

  const isViewingPast = !!requestedBookId && requestedBookId !== currentSelection?.bookId;

  return (
    <div className="w-full max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-[var(--font-display)] text-[26px] font-extrabold text-primary tracking-tight">
            Dog-eared pages
          </h1>
          {book && (
            <p className="font-[var(--font-serif)] italic text-sm text-ink-2 mt-0.5">
              {book.title} · {book.author}
            </p>
          )}
        </div>
        {!isViewingPast && (
          <UpdateProgressButton
            clubId={clubId}
            bookId={bookId}
            totalPages={totalPages}
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
              coverUrl={book.coverUrl}
              isbn={book.isbn}
              size="md"
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

      <ProgressDashboard
        clubId={clubId}
        bookId={bookId}
        initialProgress={initialProgress}
      />
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
