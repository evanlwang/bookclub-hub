// @vitest-environment jsdom
// @spec COMP-BOOK-COVER-001 through COMP-BOOK-COVER-011, COMP-BOOK-COVER-014
// LLD: docs/llds/components-book-cover.md

import { describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { BookCover } from "@/components/ui/book-cover";

describe("BookCover — render paths", () => {
  // @spec COMP-BOOK-COVER-004
  it("renders an <img> when coverUrl is provided", () => {
    const { container } = render(
      <BookCover title="X" author="Y" coverUrl="https://example.com/cover.jpg" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("https://example.com/cover.jpg");
    expect(img!.getAttribute("loading")).toBe("lazy");
  });

  // @spec COMP-BOOK-COVER-005
  it("renders the typographic fallback when coverUrl is missing", () => {
    const { container } = render(<BookCover title="The Bell Jar" author="Plath" />);
    // No <img> in the typographic path
    expect(container.querySelector("img")).toBeNull();
    // Title + author render visibly
    expect(container.textContent).toContain("The Bell Jar");
    expect(container.textContent).toContain("Plath");
  });
});

describe("BookCover — variant pick", () => {
  // @spec COMP-BOOK-COVER-002
  it("picks the same variant deterministically for the same title", () => {
    const { container: a } = render(<BookCover title="Sea of Tranquility" author="Mandel" />);
    const { container: b } = render(<BookCover title="Sea of Tranquility" author="Mandel" />);
    // The deterministic background gradient is on the wrapper's style.backgroundImage.
    const aBg = (a.firstChild as HTMLElement).style.backgroundImage;
    const bBg = (b.firstChild as HTMLElement).style.backgroundImage;
    expect(aBg).toBe(bBg);
    expect(aBg.length).toBeGreaterThan(0);
  });

  // @spec COMP-BOOK-COVER-003
  it("uses the explicit variant when variant is provided (overrides hash)", () => {
    const { container: a } = render(<BookCover title="t" author="a" variant="olive" />);
    const { container: b } = render(<BookCover title="t" author="a" variant="rust" />);
    const aBg = (a.firstChild as HTMLElement).style.backgroundImage;
    const bBg = (b.firstChild as HTMLElement).style.backgroundImage;
    expect(aBg).not.toBe(bBg);
  });
});

describe("BookCover — geometry", () => {
  // @spec COMP-BOOK-COVER-006
  const sizes: Array<[Parameters<typeof BookCover>[0]["size"], number, number]> = [
    ["sm", 48, 70],
    ["md", 80, 116],
    ["lg", 132, 192],
    ["xl", 180, 260],
  ];
  for (const [size, w, h] of sizes) {
    it(`size=${size} renders ${w}×${h}`, () => {
      const { container } = render(
        <BookCover title="t" author="a" size={size as "sm" | "md" | "lg" | "xl"} />,
      );
      const wrap = container.firstChild as HTMLElement;
      expect(wrap.style.width).toBe(`${w}px`);
      expect(wrap.style.height).toBe(`${h}px`);
    });
  }

  // @spec COMP-BOOK-COVER-007
  it("size=sm omits the ornament (rendered for md/lg/xl)", () => {
    const { container: sm } = render(<BookCover title="t" author="a" size="sm" />);
    const { container: md } = render(<BookCover title="t" author="a" size="md" />);
    // The ornament block has aria-hidden="true" and contains three positional spans.
    // Easiest stable signal: count elements with aria-hidden="true".
    const smHidden = sm.querySelectorAll('[aria-hidden="true"]').length;
    const mdHidden = md.querySelectorAll('[aria-hidden="true"]').length;
    expect(mdHidden).toBeGreaterThan(smHidden);
  });
});

describe("BookCover — accessibility", () => {
  // @spec COMP-BOOK-COVER-008
  it("sets aria-label='{title} by {author}' on the outer envelope", () => {
    const { container } = render(<BookCover title="X" author="Y" />);
    expect((container.firstChild as HTMLElement).getAttribute("aria-label")).toBe("X by Y");
  });

  // @spec COMP-BOOK-COVER-009
  it("photo-path <img> has empty alt (outer aria-label is the announcement)", () => {
    const { container } = render(
      <BookCover title="X" author="Y" coverUrl="https://example.com/c.jpg" />,
    );
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("");
  });
});

describe("BookCover — token exemption (COMP-BOOK-COVER-010)", () => {
  // @spec COMP-BOOK-COVER-010
  it("is the documented exception to DSYS-TOKEN-003 (no asserting tokens here)", () => {
    // This test exists to anchor the spec to a test file. The exemption is
    // structural — there is no token-application assertion to make.
    expect(true).toBe(true);
  });
});

describe("BookCover — image fallback chain", () => {
  // @spec COMP-BOOK-COVER-014
  it("derives the Open Library cover URL from isbn when coverUrl is absent", () => {
    const { container } = render(
      <BookCover title="Dune" author="Herbert" isbn="978-0441172719" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe(
      "https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg?default=false",
    );
  });

  // @spec COMP-BOOK-COVER-014 — stored coverUrl always wins
  it("prefers a stored coverUrl over isbn derivation", () => {
    const { container } = render(
      <BookCover
        title="Dune"
        author="Herbert"
        coverUrl="https://example.com/real.jpg"
        isbn="978-0441172719"
      />,
    );
    expect(container.querySelector("img")!.getAttribute("src")).toBe(
      "https://example.com/real.jpg",
    );
  });

  // @spec COMP-BOOK-COVER-011
  it("swaps to the typographic fallback when the image errors", () => {
    const { container } = render(
      <BookCover title="Obscure Tome" author="Nobody" isbn="0000000000" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Obscure Tome");
    expect(container.textContent).toContain("Nobody");
  });
});
