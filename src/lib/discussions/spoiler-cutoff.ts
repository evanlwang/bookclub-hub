// @spec DISC-LIB-CUTOFF-001, DISC-LIB-CUTOFF-FAILSAFE-001
//
// Picks the maxChapter cutoff that the discussions UI should pass to
// threads.list, based on the viewer's reading progress for the current book.
//
// FAIL-SAFE CONTRACT: returns a non-null number on every call. When the
// viewer has no progress row, or a row without a recorded `currentChapter`,
// we return 0 — meaning "show only chapter-0 / untagged threads." This
// closes the spoiler-leak that occurred when the function returned null
// and the caller treated null as "no filter, show everything."
//
// Callers can still bypass the filter for users who explicitly opt in
// (the "Show all" affordance in the discussions UI).

export type ProgressLike = {
  currentChapter: number | null;
} | null | undefined;

export function deriveSpoilerCutoff(progress: ProgressLike): number {
  if (!progress) return 0;
  if (progress.currentChapter == null) return 0;
  if (progress.currentChapter < 0) return 0;
  return progress.currentChapter;
}
