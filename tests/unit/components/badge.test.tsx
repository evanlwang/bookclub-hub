// @vitest-environment jsdom
// @spec COMP-BADGE-001 through COMP-BADGE-010, COMP-BADGE-A11Y-001
// LLD: docs/llds/components-badge.md

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge — API", () => {
  // @spec COMP-BADGE-001
  it("defaults to tone=neutral", () => {
    render(<Badge>Status</Badge>);
    const el = screen.getByText("Status");
    expect(el).toHaveClass("bg-bg-sunken", "text-ink-2");
  });

  // @spec COMP-BADGE-002
  it("renders an inline span with the shape contract", () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText("x");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass(
      "inline-flex",
      "items-center",
      "gap-1.5",
      "text-xs",
      "font-medium",
      "px-2",
      "py-0.5",
      "rounded-full",
    );
  });

  // @spec COMP-BADGE-003
  it("is non-interactive (no role=button, no focus classes)", () => {
    render(<Badge>x</Badge>);
    const el = screen.getByText("x");
    expect(el.getAttribute("role")).toBeNull();
    expect(el.className).not.toMatch(/\bfocus:/);
  });
});

describe("Badge — tone × token map", () => {
  const cases: Array<[Parameters<typeof Badge>[0]["tone"], string, string]> = [
    // @spec COMP-BADGE-004
    ["neutral", "bg-bg-sunken", "text-ink-2"],
    // @spec COMP-BADGE-005
    ["primary", "bg-primary-soft", "text-primary-ink"],
    // @spec COMP-BADGE-006
    ["accent", "bg-accent-soft", "text-accent-ink"],
    // @spec COMP-BADGE-007
    ["success", "bg-success-soft", "text-success"],
    // @spec COMP-BADGE-008 — active gap (uses literal text-[oklch(...)] today)
    ["warning", "bg-warning-soft", "text-warning-ink"],
    // @spec COMP-BADGE-009
    ["danger", "bg-danger-soft", "text-danger"],
  ];

  for (const [tone, bg, fg] of cases) {
    it(`tone="${tone}" applies ${bg} + ${fg}`, () => {
      render(<Badge tone={tone}>x</Badge>);
      expect(screen.getByText("x")).toHaveClass(bg, fg);
    });
  }
});

describe("Badge — dot indicator", () => {
  // @spec COMP-BADGE-010
  it("renders a leading dot when dot=true", () => {
    render(<Badge dot>Live</Badge>);
    const dot = screen.getByText("Live").firstElementChild;
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass("w-1.5", "h-1.5", "rounded-full", "bg-current");
  });

  it("renders no dot when dot is absent", () => {
    render(<Badge>Quiet</Badge>);
    expect(screen.getByText("Quiet").firstElementChild).toBeNull();
  });
});

describe("Badge — accessibility (COMP-BADGE-A11Y-001)", () => {
  // @spec COMP-BADGE-A11Y-001 — guidance, not enforceable in code today.
  it.todo(
    "lint rule warns when a Badge is the sole label for a status (no surrounding text + no aria-label)",
  );
});
