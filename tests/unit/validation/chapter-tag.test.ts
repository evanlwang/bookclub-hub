// @spec DISC-DATA-001, DISC-DATA-CHAPTER-BOUNDS-001
import { describe, it, expect, beforeAll } from "vitest";
import { parseChapterTag } from "@/lib/validation/chapter-tag";

describe("parseChapterTag", () => {
  it('parses "Chapter 5" → 5', () => {
    expect(parseChapterTag("Chapter 5")).toBe(5);
  });

  it('parses "chapter 3" (case insensitive) → 3', () => {
    expect(parseChapterTag("chapter 3")).toBe(3);
  });

  it('parses "Ch. 12" → 12', () => {
    expect(parseChapterTag("Ch. 12")).toBe(12);
  });

  it('parses "Ch 7" → 7', () => {
    expect(parseChapterTag("Ch 7")).toBe(7);
  });

  it('parses "Part 2" → 2', () => {
    expect(parseChapterTag("Part 2")).toBe(2);
  });

  it('parses "part 1" (case insensitive) → 1', () => {
    expect(parseChapterTag("part 1")).toBe(1);
  });

  it('parses "Chapter 100" → 100', () => {
    expect(parseChapterTag("Chapter 100")).toBe(100);
  });

  it('parses "Ch 0" → 0', () => {
    expect(parseChapterTag("Ch 0")).toBe(0);
  });

  it('returns null for "Epilogue"', () => {
    expect(parseChapterTag("Epilogue")).toBeNull();
  });

  it('returns null for "Prologue"', () => {
    expect(parseChapterTag("Prologue")).toBeNull();
  });

  it('returns null for "Pages 1-50"', () => {
    expect(parseChapterTag("Pages 1-50")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseChapterTag("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseChapterTag(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseChapterTag(undefined)).toBeNull();
  });

  it("trims whitespace before parsing", () => {
    expect(parseChapterTag("  Chapter 5  ")).toBe(5);
  });
});

// @spec DISC-DATA-CHAPTER-BOUNDS-001
describe("validateChapterTag (bounds enforcement)", () => {
  // Imported lazily inside the describe so the original parseChapterTag tests
  // above stay untouched if this import shape ever changes.
  let validateChapterTag: typeof import("@/lib/validation/chapter-tag").validateChapterTag;
  beforeAll(async () => {
    ({ validateChapterTag } = await import("@/lib/validation/chapter-tag"));
  });

  it("returns ok for a parseable tag within bounds", () => {
    const result = validateChapterTag("Chapter 5", 20);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.chapterNumber).toBe(5);
  });

  it("returns ok for a parseable tag equal to maxChapter", () => {
    const result = validateChapterTag("Chapter 20", 20);
    expect(result.ok).toBe(true);
  });

  it("rejects a parseable tag above maxChapter", () => {
    const result = validateChapterTag("Chapter 999", 20);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/20/);
  });

  it("accepts any parseable tag when maxChapter is null/undefined", () => {
    expect(validateChapterTag("Chapter 999", null).ok).toBe(true);
    expect(validateChapterTag("Chapter 999", undefined).ok).toBe(true);
    expect(validateChapterTag("Chapter 999", 0).ok).toBe(true);
  });

  it("accepts unparseable tags regardless of bounds (chapterNumber will be null)", () => {
    const result = validateChapterTag("Epilogue", 20);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.chapterNumber).toBeNull();
  });

  it("accepts empty/missing tag", () => {
    expect(validateChapterTag("", 20).ok).toBe(true);
    expect(validateChapterTag(null, 20).ok).toBe(true);
    expect(validateChapterTag(undefined, 20).ok).toBe(true);
  });
});
