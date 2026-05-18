// @vitest-environment jsdom
// @spec COMP-CHAPTER-CHIP-001 through COMP-CHAPTER-CHIP-006
// LLD: docs/llds/components-chapter-chip.md

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChapterChip } from "@/components/ui/chapter-chip";

function bgIndex(el: HTMLElement): number | null {
  const m = el.style.background.match(/var\(--color-chip-(\d)\)/);
  return m ? Number(m[1]) : null;
}

describe("ChapterChip — color picker", () => {
  // @spec COMP-CHAPTER-CHIP-002
  it.each([
    [1, 1],
    [2, 2],
    [5, 5],
    [6, 1], // wraps
    [10, 5],
    [11, 1],
  ])("chapter=%i picks chip-%i", (chapter, expected) => {
    render(<ChapterChip tag={`Ch. ${chapter}`} chapter={chapter} />);
    expect(bgIndex(screen.getByText(`Ch. ${chapter}`))).toBe(expected);
  });

  // @spec COMP-CHAPTER-CHIP-003
  it("chapter=null falls through to tag-hash pick (returns 1..5)", () => {
    render(<ChapterChip tag="Epilogue" chapter={null} />);
    const idx = bgIndex(screen.getByText("Epilogue"));
    expect(idx).not.toBeNull();
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(5);
  });

  // @spec COMP-CHAPTER-CHIP-003 — active gap (chapter=0 currently produces invalid index 0)
  it.each([0, -3, 2.5, NaN])(
    "chapter=%s falls through to tag-hash pick (active gap — current code mis-routes)",
    (chapter) => {
      render(<ChapterChip tag="x" chapter={chapter as number} />);
      const idx = bgIndex(screen.getByText("x"));
      expect(idx).not.toBeNull();
      expect(idx).toBeGreaterThanOrEqual(1);
      expect(idx).toBeLessThanOrEqual(5);
    },
  );

  // @spec COMP-CHAPTER-CHIP-003 (determinism)
  it("the same tag always picks the same color when chapter is null", () => {
    const { container: a } = render(<ChapterChip tag="Epilogue" chapter={null} />);
    const { container: b } = render(<ChapterChip tag="Epilogue" chapter={null} />);
    expect((a.firstChild as HTMLElement).style.background).toBe(
      (b.firstChild as HTMLElement).style.background,
    );
  });
});

describe("ChapterChip — token application (COMP-CHAPTER-CHIP-004)", () => {
  // @spec COMP-CHAPTER-CHIP-004
  it("references --color-chip-{idx} via inline style (documented dynamic-token exemption)", () => {
    render(<ChapterChip tag="Ch. 1" chapter={1} />);
    const el = screen.getByText("Ch. 1");
    expect(el.style.background).toBe("var(--color-chip-1)");
    expect(el.style.color).toBe("var(--color-chip-1-ink)");
  });
});

describe("ChapterChip — shape (COMP-CHAPTER-CHIP-005)", () => {
  // @spec COMP-CHAPTER-CHIP-005
  it("renders inline-flex monospace 11px medium with --radius-sm + px-2 py-0.5", () => {
    render(<ChapterChip tag="x" chapter={1} />);
    const el = screen.getByText("x");
    expect(el).toHaveClass(
      "inline-flex",
      "items-center",
      "rounded-[var(--radius-sm)]",
      "font-[var(--font-mono)]",
      "text-[11px]",
      "font-medium",
      "px-2",
      "py-0.5",
    );
  });
});

describe("ChapterChip — accessibility (COMP-CHAPTER-CHIP-006)", () => {
  // @spec COMP-CHAPTER-CHIP-006
  it("conveys meaning via text content only (no aria-label, no role)", () => {
    render(<ChapterChip tag="Ch. 5-8" chapter={2} />);
    const el = screen.getByText("Ch. 5-8");
    expect(el.getAttribute("aria-label")).toBeNull();
    expect(el.getAttribute("role")).toBeNull();
  });
});
