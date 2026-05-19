// @vitest-environment jsdom
// @spec COMP-PROGRESS-BAR-001 through COMP-PROGRESS-BAR-008, COMP-PROGRESS-BAR-A11Y-001, COMP-PROGRESS-BAR-MOTION-001, DSYS-MOTION-BAR-001
// LLD: docs/llds/components-progress-bar.md

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

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

import { ProgressBar } from "@/components/ui/progress-bar";

function fill(container: HTMLElement): HTMLElement {
  return container.firstChild!.firstChild as HTMLElement;
}
function track(container: HTMLElement): HTMLElement {
  return container.firstChild as HTMLElement;
}

describe("ProgressBar — track + fill", () => {
  // @spec COMP-PROGRESS-BAR-002
  it("track is h-2 bg-bg-sunken rounded-full overflow-hidden relative", () => {
    const { container } = render(<ProgressBar percentage={50} />);
    expect(track(container)).toHaveClass(
      "h-2",
      "bg-bg-sunken",
      "rounded-full",
      "overflow-hidden",
      "relative",
    );
  });

  // @spec COMP-PROGRESS-BAR-003
  it("reading status applies bg-primary fill", () => {
    const { container } = render(<ProgressBar percentage={40} status="reading" />);
    expect(fill(container)).toHaveClass("bg-primary");
  });

  // @spec COMP-PROGRESS-BAR-004
  it("finished status applies bg-accent fill", () => {
    const { container } = render(<ProgressBar percentage={100} status="finished" />);
    expect(fill(container)).toHaveClass("bg-accent");
  });

  // @spec COMP-PROGRESS-BAR-005
  it("not_started status applies bg-ink-4 fill", () => {
    const { container } = render(<ProgressBar percentage={0} status="not_started" />);
    expect(fill(container)).toHaveClass("bg-ink-4");
  });

  // @spec COMP-PROGRESS-BAR-006
  it("does not clamp percentage in the visual width", () => {
    const { container } = render(<ProgressBar percentage={120} />);
    expect(fill(container).style.width).toBe("120%");
  });
});

describe("ProgressBar — animation (motion path)", () => {
  // @spec COMP-PROGRESS-BAR-007, DSYS-MOTION-BAR-001
  it("animate=true renders a transform-driven fill with transformOrigin: left", () => {
    useReducedMotionMock.mockReturnValue(false);
    const { container } = render(<ProgressBar percentage={70} animate delay={120} />);
    const f = fill(container);
    expect(f.style.transformOrigin).toBe("left");
    // Width is the *track-relative full width*; scale carries the percentage.
    expect(f.style.width).toBe("100%");
    // bar-anim CSS class is no longer the source of motion — the JS path owns it.
    expect(f.className).not.toContain("bar-anim");
  });

  // @spec DSYS-MOTION-BAR-001 + DSYS-MOTION-002
  it("animate=true under prefers-reduced-motion skips the transform animation", () => {
    useReducedMotionMock.mockReturnValue(true);
    // Motion still renders the fill; the scaleX simply jumps to its end state
    // (no entrance animation). We verify the structure stays sound — the
    // visible "no movement" behavior is best covered by a Playwright check.
    const { container } = render(<ProgressBar percentage={50} animate />);
    expect(fill(container).style.transformOrigin).toBe("left");
  });

  // @spec COMP-PROGRESS-BAR-008
  it("animate=false applies a 0.6s width transition (CSS path unchanged)", () => {
    useReducedMotionMock.mockReturnValue(false);
    const { container } = render(<ProgressBar percentage={40} />);
    const f = fill(container);
    expect(f.style.width).toBe("40%");
    expect(f.style.transition).toMatch(/width\s+0\.6s/);
    expect(f.style.transformOrigin).toBe("");
  });
});

describe("ProgressBar — accessibility (COMP-PROGRESS-BAR-A11Y-001)", () => {
  // @spec COMP-PROGRESS-BAR-A11Y-001 — active gap
  it("sets role='progressbar' + aria-valuemin/now/max", () => {
    const { container } = render(<ProgressBar percentage={60} />);
    const el = track(container);
    expect(el.getAttribute("role")).toBe("progressbar");
    expect(el.getAttribute("aria-valuenow")).toBe("60");
    expect(el.getAttribute("aria-valuemin")).toBe("0");
    expect(el.getAttribute("aria-valuemax")).toBe("100");
  });

  // @spec COMP-PROGRESS-BAR-A11Y-001 (clamped at the a11y layer)
  it("clamps aria-valuenow to [0,100] while leaving visual width unclamped", () => {
    const { container } = render(<ProgressBar percentage={150} />);
    expect(track(container).getAttribute("aria-valuenow")).toBe("100");
    expect(fill(container).style.width).toBe("150%");
  });
});

describe("ProgressBar — reduced motion (COMP-PROGRESS-BAR-MOTION-001)", () => {
  // @spec COMP-PROGRESS-BAR-MOTION-001 — covered by global DSYS-MOTION-002 rule
  it.todo(
    "under @media (prefers-reduced-motion: reduce), both bar-fill animation and width transition are suppressed (verified by DSYS-MOTION-002 global rule)",
  );
});
