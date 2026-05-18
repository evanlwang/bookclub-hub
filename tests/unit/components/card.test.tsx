// @vitest-environment jsdom
// @spec COMP-CARD-001 through COMP-CARD-004
// LLD: docs/llds/components-card.md

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
