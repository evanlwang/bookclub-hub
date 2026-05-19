// @spec DISC-DATA-001, DISC-DATA-CHAPTER-BOUNDS-001

/**
 * Parse a chapter tag string into a numeric chapter number.
 * Returns null if the tag is unparseable (e.g., "Epilogue", "Pages 1-50").
 *
 * Recognized patterns:
 * - "Chapter 5" / "chapter 5" → 5
 * - "Ch. 12" / "Ch 12" → 12
 * - "Part 2" / "part 2" → 2
 */
export function parseChapterTag(tag: string | null | undefined): number | null {
  if (!tag || !tag.trim()) return null;

  const normalized = tag.trim().toLowerCase();

  // Match "chapter N", "ch. N", "ch N"
  const chapterMatch = normalized.match(/^(?:chapter\s+|ch\.?\s*)(\d+)$/);
  if (chapterMatch) {
    return parseInt(chapterMatch[1], 10);
  }

  // Match "part N"
  const partMatch = normalized.match(/^part\s+(\d+)$/);
  if (partMatch) {
    return parseInt(partMatch[1], 10);
  }

  return null;
}

export type ValidateChapterTagResult =
  | { ok: true; chapterNumber: number | null }
  | { ok: false; reason: string };

/**
 * Validate a chapter tag against an optional upper bound (the book's known
 * chapter count). Used by the threads router to reject tags like
 * "Chapter 999" on a 20-chapter book.
 *
 * Semantics:
 * - Unparseable tags (Epilogue, Prologue, free-form text) always pass with
 *   `chapterNumber: null`. They're treated as "general" and surface to every
 *   reader regardless of progress, per `DISC-BE-001`.
 * - Empty/null/undefined tags pass with `chapterNumber: null`.
 * - When `maxChapter` is null/undefined/0/negative, no upper bound is enforced.
 *   This is the current production state — books only carry `pageCount`, not
 *   a chapter count — so validation is permissive by default. See
 *   `DISC-DATA-CHAPTER-BOUNDS-001` for the wire-up plan.
 * - When `maxChapter` is a positive integer and the tag parses to a number
 *   greater than `maxChapter`, the tag is rejected with a human-readable
 *   reason that names the upper bound.
 *
 * @spec DISC-DATA-CHAPTER-BOUNDS-001
 */
export function validateChapterTag(
  tag: string | null | undefined,
  maxChapter: number | null | undefined,
): ValidateChapterTagResult {
  const chapterNumber = parseChapterTag(tag);
  if (chapterNumber === null) {
    return { ok: true, chapterNumber: null };
  }
  if (!maxChapter || maxChapter <= 0) {
    return { ok: true, chapterNumber };
  }
  if (chapterNumber > maxChapter) {
    return {
      ok: false,
      reason: `Chapter ${chapterNumber} is beyond this book's ${maxChapter} chapters.`,
    };
  }
  return { ok: true, chapterNumber };
}
