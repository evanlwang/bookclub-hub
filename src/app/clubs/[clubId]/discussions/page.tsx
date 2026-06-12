// @spec DISC-UI-FETCH-PARALLEL-001, DISC-UI-PROGRESS-AUTOFILTER-001, DISC-UI-PROGRESS-AUTOFILTER-002
//
// Server component: resolves the current book and the viewer's spoiler
// cutoff in one server pass and seeds the client list component, replacing
// the old client-side selections → progress → threads request waterfall.
import Link from "next/link";
import { getServerCaller } from "@/trpc/server";
import { Card } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";
import { DiscussionsContent } from "./discussions-content";

export default async function DiscussionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ bookId?: string }>;
}) {
  const { clubId } = await params;
  const { bookId: bookIdParam } = await searchParams;

  let currentBookId: string | null = bookIdParam ?? null;
  let initialCutoff = 0;
  let error = "";

  try {
    const caller = await getServerCaller();
    if (!currentBookId) {
      const selections = await caller.selections.list({ clubId });
      currentBookId =
        selections.find((s: { isCurrent: boolean }) => s.isCurrent)?.bookId ??
        null;
    }
    if (currentBookId) {
      // Fail-safe on progress error: cutoff 0 hides every chapter-tagged
      // thread rather than leaking spoilers (DISC-LIB-CUTOFF-FAILSAFE-001).
      try {
        const progress = await caller.progress.me({
          clubId,
          bookId: currentBookId,
        });
        initialCutoff = deriveSpoilerCutoff(progress);
      } catch {
        initialCutoff = 0;
      }
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load current book";
  }

  return (
    <div className="w-full max-w-[1200px]">
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <h1 className="font-[var(--font-display)] text-[26px] font-extrabold text-primary tracking-tight mb-5">
        Margin notes
      </h1>

      {error ? (
        <p data-testid="discussions-error" className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : !currentBookId ? (
        <Card className="p-10 text-center" data-testid="discussions-no-book">
          <p className="text-ink-3 text-sm">
            No book selected yet — discussions open once your club picks its
            next read.
          </p>
        </Card>
      ) : (
        <DiscussionsContent
          clubId={clubId}
          currentBookId={currentBookId}
          initialCutoff={initialCutoff}
        />
      )}
    </div>
  );
}
