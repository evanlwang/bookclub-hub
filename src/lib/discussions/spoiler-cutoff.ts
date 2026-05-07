// @spec DISC-LIB-CUTOFF-001
// Picks the maxChapter cutoff that the discussions UI should pass to threads.list,
// based on the viewer's reading progress for the current book. Returns null when
// no progress is recorded — callers treat null as "no spoiler filter".

export type ProgressLike = {
  currentChapter: number | null;
} | null | undefined;

export function deriveSpoilerCutoff(progress: ProgressLike): number | null {
  if (!progress) return null;
  if (progress.currentChapter == null) return null;
  return progress.currentChapter;
}
