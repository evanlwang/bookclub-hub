import { getServerCaller } from "@/trpc/server";
import { Card, Badge, ProgressBar, Avatar } from "@/components/ui";
import { UpdateProgressButton } from "./update-modal";

export default async function ProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ bookId?: string }>;
}) {
  const { clubId } = await params;
  const { bookId } = await searchParams;

  if (!bookId) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight mb-8">
          Reading Progress
        </h1>
        <Card className="p-10 text-center">
          <p data-testid="no-book" className="text-ink-3 text-sm">
            Select a book to view progress.
          </p>
        </Card>
      </div>
    );
  }

  let progress: any[] = [];
  let totalPages = 0;
  let myProgress: any = null;
  let error = "";

  try {
    const caller = await getServerCaller();
    progress = await caller.progress.list({ clubId, bookId });
    myProgress = await caller.progress.me({ clubId, bookId });
    // Get book page count from the first progress entry or default
    const firstWithPages = progress.find((p: any) => p.totalPages);
    totalPages = firstWithPages?.totalPages ?? 0;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Error loading progress";
  }

  if (error) {
    return <p data-testid="progress-error" className="text-danger">{error}</p>;
  }

  const sorted = [...progress].sort(
    (a: any, b: any) => (b.percentage ?? 0) - (a.percentage ?? 0)
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
          Reading Progress
        </h1>
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
                }
              : undefined
          }
        />
      </div>

      {progress.length === 0 ? (
        <Card className="p-10 text-center">
          <p data-testid="no-progress" className="text-ink-3 text-sm">
            No progress tracked yet.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          <ul data-testid="progress-list">
            {sorted.map((p: any, i: number) => (
              <li
                key={p.userId}
                data-testid={`progress-${p.userId}`}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <Avatar
                  name={p.user?.displayName ?? ""}
                  size="sm"
                />
                <span className="text-sm font-medium text-ink w-28 truncate">
                  {p.user?.displayName ?? "Member"}
                </span>
                <div className="flex-1">
                  <ProgressBar
                    percentage={p.percentage ?? 0}
                    status={p.status ?? "not_started"}
                    animate
                    delay={i * 60}
                  />
                </div>
                <span className="text-xs text-ink-2 font-[var(--font-mono)] w-10 text-right tabular-nums">
                  {p.percentage ?? 0}%
                </span>
                {p.status === "finished" && (
                  <Badge tone="accent">Done</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
