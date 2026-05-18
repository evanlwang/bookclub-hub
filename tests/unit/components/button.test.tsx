// @vitest-environment jsdom
// @spec COMP-BUTTON-001 through COMP-BUTTON-021, COMP-BUTTON-A11Y-001..003, COMP-BUTTON-MOTION-001
// LLD: docs/llds/components-button.md

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Button } from "@/components/ui/button";

describe("Button — API defaults", () => {
  // @spec COMP-BUTTON-001, COMP-BUTTON-002
  it("defaults to variant=secondary, size=md", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    // secondary variant has bg-bg + line-strong border
    expect(btn).toHaveClass("bg-bg", "border-line-strong");
    // md size: h-[38px]
    expect(btn).toHaveClass("h-[38px]");
  });

  // @spec COMP-BUTTON-003 — active gap
  it("defaults the underlying button type to 'button' (not browser default 'submit')", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  // @spec COMP-BUTTON-004
  it("applies --radius-md, font-weight 500, and gap-2 regardless of variant", () => {
    render(<Button variant="primary">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("rounded-[var(--radius-md)]", "font-medium", "gap-2");
  });
});

describe("Button — variant × default state", () => {
  // @spec COMP-BUTTON-005
  it("primary applies bg-primary + text-bg", () => {
    render(<Button variant="primary">P</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary", "text-bg");
  });

  // @spec COMP-BUTTON-006
  it("primary declares hover:bg-primary-hover", () => {
    render(<Button variant="primary">P</Button>);
    expect(screen.getByRole("button").className).toMatch(/hover:bg-primary-hover/);
  });

  // @spec COMP-BUTTON-007
  it("secondary applies bg-bg + text-ink + border-line-strong", () => {
    render(<Button variant="secondary">S</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-bg", "text-ink", "border-line-strong");
  });

  // @spec COMP-BUTTON-008
  it("secondary declares hover:bg-bg-soft + hover:border-ink-4", () => {
    render(<Button variant="secondary">S</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/hover:bg-bg-soft/);
    expect(cls).toMatch(/hover:border-ink-4/);
  });

  // @spec COMP-BUTTON-009
  it("ghost applies bg-transparent + text-ink-2", () => {
    render(<Button variant="ghost">G</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-transparent", "text-ink-2");
  });

  // @spec COMP-BUTTON-010
  it("ghost declares hover:bg-bg-sunken + hover:text-ink", () => {
    render(<Button variant="ghost">G</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toMatch(/hover:bg-bg-sunken/);
    expect(cls).toMatch(/hover:text-ink/);
  });

  // @spec COMP-BUTTON-011
  it("danger applies bg-danger + text-white", () => {
    render(<Button variant="danger">D</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-danger", "text-white");
  });

  // @spec COMP-BUTTON-012 — active gap (currently uses filter:brightness)
  it("danger hover transitions to bg-danger-hover (intent)", () => {
    render(<Button variant="danger">D</Button>);
    expect(screen.getByRole("button").className).toMatch(/hover:bg-danger-hover/);
  });

  // @spec COMP-BUTTON-013
  it("accent applies bg-accent + text-ink", () => {
    render(<Button variant="accent">A</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent", "text-ink");
  });

  // @spec COMP-BUTTON-014 — active gap
  it("accent hover transitions to bg-accent-hover (intent)", () => {
    render(<Button variant="accent">A</Button>);
    expect(screen.getByRole("button").className).toMatch(/hover:bg-accent-hover/);
  });
});

describe("Button — size matrix", () => {
  // @spec COMP-BUTTON-015
  it("sm renders h-[30px], px-3 py-1.5, text-[13px]", () => {
    render(<Button size="sm">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-[30px]", "px-3", "py-1.5", "text-[13px]");
  });
  // @spec COMP-BUTTON-016
  it("md renders h-[38px], px-4 py-2, text-sm", () => {
    render(<Button size="md">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-[38px]", "px-4", "py-2", "text-sm");
  });
  // @spec COMP-BUTTON-017
  it("lg renders h-[46px], px-5 py-2.5, text-[15px]", () => {
    render(<Button size="lg">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-[46px]", "px-5", "py-2.5", "text-[15px]");
  });
});

describe("Button — state behavior", () => {
  // @spec COMP-BUTTON-018
  it("disabled sets native disabled + cursor-not-allowed", () => {
    render(<Button disabled>x</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/disabled:cursor-not-allowed/);
  });

  // @spec COMP-BUTTON-019
  it("loading renders a spinner in the icon slot AND sets disabled", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg.animate-spin")).not.toBeNull();
  });

  // @spec COMP-BUTTON-020
  it("loading + iconRight keeps iconRight rendered", () => {
    const RightIcon = () => <span data-testid="rightie">→</span>;
    render(
      <Button loading iconRight={<RightIcon />}>Save</Button>,
    );
    expect(screen.getByTestId("rightie")).toBeInTheDocument();
  });

  // @spec COMP-BUTTON-021
  it("loading keeps children visible (width-stable)", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Save");
  });

  // @spec COMP-BUTTON-019 (regardless-of-icon clause)
  it("loading renders the spinner even when no icon prop is provided", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button").querySelector("svg.animate-spin")).not.toBeNull();
  });
});

describe("Button — accessibility", () => {
  // @spec COMP-BUTTON-A11Y-001 — active gap
  it("sets aria-busy='true' while loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  // @spec COMP-BUTTON-A11Y-002 — active gap
  it("sets aria-disabled='true' while disabled", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  // @spec COMP-BUTTON-A11Y-003
  it("does not declare per-variant focus classes (inherits global :focus-visible)", () => {
    render(<Button variant="primary">P</Button>);
    // No `focus:` Tailwind classes should appear on the button.
    expect(screen.getByRole("button").className).not.toMatch(/\bfocus:/);
  });
});

describe("Button — interactivity", () => {
  it("disabled button does not fire onClick", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button disabled onClick={() => clicks++}>x</Button>);
    await user.click(screen.getByRole("button"));
    expect(clicks).toBe(0);
  });
});
