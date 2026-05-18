// @vitest-environment jsdom
// @spec COMP-AVATAR-001 through COMP-AVATAR-008, COMP-AVATAR-IMG-001, COMP-AVATAR-TOKEN-001, COMP-AVATAR-A11Y-001
// LLD: docs/llds/components-avatar.md

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/components/ui/avatar";

describe("Avatar — API & sizes", () => {
  // @spec COMP-AVATAR-001, COMP-AVATAR-002
  it("defaults to size=md (w-8 h-8)", () => {
    render(<Avatar name="Alice" />);
    const el = screen.getByText("A");
    expect(el).toHaveClass("w-8", "h-8");
    expect(el).toHaveClass("rounded-full");
  });

  // @spec COMP-AVATAR-002
  it.each([
    ["sm", "w-6", "h-6"],
    ["md", "w-8", "h-8"],
    ["lg", "w-11", "h-11"],
    ["xl", "w-16", "h-16"],
  ] as const)("size=%s applies %s %s", (size, w, h) => {
    render(<Avatar name="Bob" size={size} />);
    expect(screen.getByText("B")).toHaveClass(w, h);
  });
});

describe("Avatar — initials", () => {
  // @spec COMP-AVATAR-003
  it("takes up to 2 uppercase initials from the first two whitespace-split words", () => {
    render(<Avatar name="marisol ortega" />);
    expect(screen.getByText("MO")).toBeInTheDocument();
  });

  it("falls back to 1 initial when name is a single word", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  // @spec COMP-AVATAR-004
  it("renders '?' when name is empty", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

describe("Avatar — photo path", () => {
  // @spec COMP-AVATAR-005
  it("renders an <img> with src + alt=name when src is provided", () => {
    render(<Avatar name="Eve" src="https://example.com/eve.jpg" />);
    const img = screen.getByRole("img", { name: "Eve" });
    expect(img).toHaveAttribute("src", "https://example.com/eve.jpg");
    expect(img).toHaveAttribute("alt", "Eve");
  });

  // @spec COMP-AVATAR-IMG-001 — active gap
  it.todo("falls back to initials when img onError fires");
});

describe("Avatar — palette determinism", () => {
  // @spec COMP-AVATAR-006
  it("renders the same name in the same palette across mounts", () => {
    const { container: c1 } = render(<Avatar name="Carol Park" />);
    const { container: c2 } = render(<Avatar name="Carol Park" />);
    const s1 = c1.firstChild as HTMLElement;
    const s2 = c2.firstChild as HTMLElement;
    expect(s1.style.background).toBe(s2.style.background);
    expect(s1.style.color).toBe(s2.style.color);
  });
});

describe("Avatar — token discipline (COMP-AVATAR-TOKEN-001)", () => {
  // @spec COMP-AVATAR-TOKEN-001 — active gap
  it("applies chip-palette tokens (not hard-coded oklch literals) for the initials circle background", () => {
    const { container } = render(<Avatar name="Alice" />);
    const el = container.firstChild as HTMLElement;
    // After the fix, the inline style should reference --color-chip-{n}, not a literal oklch().
    expect(el.style.background).toMatch(/var\(--color-chip-[1-5]\)/);
    expect(el.style.color).toMatch(/var\(--color-chip-[1-5]-ink\)/);
  });
});

describe("Avatar — decorative opt-in (COMP-AVATAR-008, COMP-AVATAR-A11Y-001)", () => {
  // @spec COMP-AVATAR-008, COMP-AVATAR-A11Y-001 — active gap (prop doesn't exist)
  it("decorative=true sets aria-hidden on container and alt='' on the photo", () => {
    // @ts-expect-error — `decorative` does not exist on AvatarProps yet (active gap).
    const { container } = render(<Avatar name="Eve" src="x.jpg" decorative />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper.querySelector("img")).toHaveAttribute("alt", "");
  });
});
