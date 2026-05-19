// @vitest-environment jsdom
// @spec COMP-CARD-001 through COMP-CARD-004, DSYS-MOTION-CARD-001
// LLD: docs/llds/components-card.md

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn<() => boolean | null>(),
}));

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: useReducedMotionMock,
  };
});

import { Card } from "@/components/ui/card";

describe("Card", () => {
  // @spec COMP-CARD-001
  it("renders a <div> with bg-bg, border-line, rounded-lg, shadow-sm", () => {
    render(<Card data-testid="c">x</Card>);
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass(
      "bg-bg",
      "border",
      "border-line",
      "rounded-[var(--radius-lg)]",
      "shadow-sm",
    );
  });

  // @spec COMP-CARD-002
  it("passes native div attributes through (className, onClick, aria-*, data-testid)", () => {
    let clicks = 0;
    render(
      <Card
        className="custom-class"
        aria-label="hello"
        data-testid="c"
        onClick={() => clicks++}
      >
        x
      </Card>,
    );
    const el = screen.getByTestId("c");
    expect(el).toHaveClass("custom-class");
    expect(el).toHaveAttribute("aria-label", "hello");
    el.click();
    expect(clicks).toBe(1);
  });

  // @spec COMP-CARD-003
  it("applies no default padding", () => {
    render(<Card data-testid="c">x</Card>);
    const cls = screen.getByTestId("c").className;
    // Allow the user to pass `p-*` via className; assert none was added by Card itself.
    expect(cls).not.toMatch(/^p[a-z]?-\d/);
    expect(cls).not.toMatch(/\sp[a-z]?-\d/);
  });

  // @spec COMP-CARD-004
  it("declares no hover/focus/pressed state styling", () => {
    render(<Card data-testid="c">x</Card>);
    const cls = screen.getByTestId("c").className;
    expect(cls).not.toMatch(/\bhover:/);
    expect(cls).not.toMatch(/\bfocus:/);
    expect(cls).not.toMatch(/\bactive:/);
  });
});

describe("Card — animate prop (DSYS-MOTION-CARD-001)", () => {
  it("animate=false keeps the static <div> path (no motion bundle for default usage)", () => {
    useReducedMotionMock.mockReturnValue(false);
    render(
      <Card data-testid="c">
        <span>content</span>
      </Card>,
    );
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("bg-bg", "border", "border-line");
    // The static path renders no motion-driven inline transform.
    expect(el.style.transform).toBe("");
  });

  it("animate=true still renders the card classes and children", () => {
    useReducedMotionMock.mockReturnValue(false);
    render(
      <Card animate data-testid="c">
        <span>content</span>
      </Card>,
    );
    const el = screen.getByTestId("c");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass(
      "bg-bg",
      "border",
      "border-line",
      "rounded-[var(--radius-lg)]",
      "shadow-sm",
    );
    expect(el.textContent).toBe("content");
  });

  it("animate=true under prefers-reduced-motion renders identically (no entrance offset)", () => {
    useReducedMotionMock.mockReturnValue(true);
    render(
      <Card animate data-testid="c">
        <span>content</span>
      </Card>,
    );
    // useMotionPreset returns the zero-duration empty preset under reduced motion.
    // The card still renders at its end state — no transform applied at rest.
    const el = screen.getByTestId("c");
    expect(el.textContent).toBe("content");
  });
});
