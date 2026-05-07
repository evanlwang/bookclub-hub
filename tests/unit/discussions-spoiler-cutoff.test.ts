// @spec DISC-LIB-CUTOFF-001
import { describe, it, expect } from "vitest";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";

describe("deriveSpoilerCutoff", () => {
  it("returns null when the progress row is missing", () => {
    expect(deriveSpoilerCutoff(null)).toBeNull();
    expect(deriveSpoilerCutoff(undefined)).toBeNull();
  });

  it("returns null when currentChapter is not recorded", () => {
    expect(deriveSpoilerCutoff({ currentChapter: null })).toBeNull();
  });

  it("returns the viewer's currentChapter when set", () => {
    expect(deriveSpoilerCutoff({ currentChapter: 6 })).toBe(6);
    expect(deriveSpoilerCutoff({ currentChapter: 0 })).toBe(0);
  });

  it("ignores extra fields on the progress row", () => {
    expect(
      deriveSpoilerCutoff({
        currentChapter: 12,
        currentPage: 240,
        percentage: 60,
      } as { currentChapter: number | null })
    ).toBe(12);
  });
});
