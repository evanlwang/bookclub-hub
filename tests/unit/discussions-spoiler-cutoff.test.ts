// @spec DISC-LIB-CUTOFF-001
import { describe, it, expect } from "vitest";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";

describe("deriveSpoilerCutoff (fail-safe)", () => {
  it("returns 0 when the progress row is missing — hides every chapter-tagged thread", () => {
    expect(deriveSpoilerCutoff(null)).toBe(0);
    expect(deriveSpoilerCutoff(undefined)).toBe(0);
  });

  it("returns 0 when currentChapter is not recorded — hides every chapter-tagged thread", () => {
    expect(deriveSpoilerCutoff({ currentChapter: null })).toBe(0);
  });

  it("returns the viewer's currentChapter when set", () => {
    expect(deriveSpoilerCutoff({ currentChapter: 6 })).toBe(6);
    expect(deriveSpoilerCutoff({ currentChapter: 0 })).toBe(0);
  });

  it("clamps negative chapters to 0 (defense against bad data)", () => {
    expect(deriveSpoilerCutoff({ currentChapter: -3 })).toBe(0);
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

// Mirror the threads-router filter shape so we exercise the contract end-to-end
// without hitting the DB. If `deriveSpoilerCutoff` ever regresses to returning
// null again, this test will surface the spoiler-leak immediately.
type Thread = { id: string; chapterNumber: number | null };
function filterThreadsByCutoff(threads: Thread[], maxChapter: number | undefined) {
  if (maxChapter === undefined) return threads;
  return threads.filter(
    (t) => t.chapterNumber === null || t.chapterNumber <= maxChapter,
  );
}

describe("threads filter contract (no-progress viewer)", () => {
  const threads: Thread[] = [
    { id: "general", chapterNumber: null },
    { id: "ch1", chapterNumber: 1 },
    { id: "ch5", chapterNumber: 5 },
    { id: "ch12", chapterNumber: 12 },
  ];

  it("hides every chapter-tagged thread for a no-progress viewer (cutoff=0)", () => {
    const cutoff = deriveSpoilerCutoff(null);
    const maxChapter = cutoff ?? undefined;
    const visible = filterThreadsByCutoff(threads, maxChapter);
    expect(visible.map((t) => t.id)).toEqual(["general"]);
  });

  it("hides every chapter-tagged thread when progress has no currentChapter", () => {
    const cutoff = deriveSpoilerCutoff({ currentChapter: null });
    const maxChapter = cutoff ?? undefined;
    const visible = filterThreadsByCutoff(threads, maxChapter);
    expect(visible.map((t) => t.id)).toEqual(["general"]);
  });

  it("shows threads at or below currentChapter when progress is recorded", () => {
    const cutoff = deriveSpoilerCutoff({ currentChapter: 5 });
    const maxChapter = cutoff ?? undefined;
    const visible = filterThreadsByCutoff(threads, maxChapter);
    expect(visible.map((t) => t.id)).toEqual(["general", "ch1", "ch5"]);
  });
});
