// @spec DISC-DATA-001

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
