// @spec DISC-UI-COMPOSE-MISMATCH-001
// Detect cases where a thread body mentions a chapter HIGHER than the chosen
// chapter tag — that's the canonical spoiler-leak shape (member reading along
// chapter 5 sees a thread tagged "Chapter 5" but the body discusses chapter 12).
//
// The detector is intentionally simple: it looks for "chapter N" / "ch. N" /
// "ch N" mentions, takes the largest, and compares against the largest number
// extracted from the tag. False positives are preferable to false negatives —
// surfacing a warning the user can dismiss is cheaper than leaking a spoiler.

const CHAPTER_MENTION_RE = /\b(?:chapter|ch\.?)\s*(\d+)\b/gi;

function maxChapterIn(text: string): number | null {
  let max: number | null = null;
  for (const match of text.matchAll(CHAPTER_MENTION_RE)) {
    const n = parseInt(match[1], 10);
    if (Number.isFinite(n) && (max == null || n > max)) max = n;
  }
  return max;
}

export interface ChapterMismatch {
  /** True when body mentions a higher chapter than the tag's chapter. */
  mismatch: boolean;
  /** Largest chapter mentioned in body. Null when no mention. */
  bodyChapter: number | null;
  /** Largest chapter mentioned in tag. Null when tag has no chapter number. */
  tagChapter: number | null;
}

/**
 * Compare a thread body to its chapter tag.
 * @spec DISC-UI-COMPOSE-MISMATCH-001
 */
export function detectChapterMismatch(
  body: string,
  chapterTag: string,
): ChapterMismatch {
  const bodyChapter = maxChapterIn(body);
  const tagChapter = maxChapterIn(chapterTag);
  const mismatch =
    bodyChapter != null && tagChapter != null && bodyChapter > tagChapter;
  return { mismatch, bodyChapter, tagChapter };
}
