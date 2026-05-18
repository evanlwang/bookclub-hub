// @vitest-environment jsdom
// @spec COMP-AVATAR-STACK-001 through COMP-AVATAR-STACK-005
// LLD: docs/llds/components-avatar-stack.md

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvatarStack } from "@/components/ui/avatar-stack";

describe("AvatarStack — layout", () => {
  // @spec COMP-AVATAR-STACK-002
  it("renders all names when names.length <= max", () => {
    render(<AvatarStack names={["Alice", "Bob", "Carol"]} max={5} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  // @spec COMP-AVATAR-STACK-002
  it("renders +N chip when names.length exceeds max", () => {
    render(<AvatarStack names={["A", "B", "C", "D", "E", "F", "G"]} max={5} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  // @spec COMP-AVATAR-STACK-003
  it("applies marginLeft: -6 to every avatar after the first", () => {
    const { container } = render(<AvatarStack names={["A", "B", "C"]} />);
    const wrappers = container.firstChild!.childNodes;
    expect((wrappers[0] as HTMLElement).style.marginLeft).toBe("0px");
    expect((wrappers[1] as HTMLElement).style.marginLeft).toBe("-6px");
    expect((wrappers[2] as HTMLElement).style.marginLeft).toBe("-6px");
  });

  // @spec COMP-AVATAR-STACK-004
  it("wraps every avatar in a border-2 border-bg ring", () => {
    const { container } = render(<AvatarStack names={["A", "B"]} />);
    const first = container.firstChild!.firstChild as HTMLElement;
    expect(first).toHaveClass("border-2", "border-bg", "rounded-full");
  });

  // @spec COMP-AVATAR-STACK-005
  it("+N chip applies bg-bg-sunken + text-ink-3 with border-bg ring", () => {
    render(<AvatarStack names={["A", "B", "C", "D", "E", "F"]} max={5} />);
    const chip = screen.getByText("+1");
    expect(chip).toHaveClass("bg-bg-sunken", "text-ink-3", "border-2", "border-bg");
  });

  // @spec COMP-AVATAR-STACK-005
  it("+N chip size matches the avatar size (sm → 24px, md → 32px)", () => {
    const { rerender } = render(
      <AvatarStack size="sm" names={["A", "B", "C", "D", "E", "F"]} max={5} />,
    );
    expect(screen.getByText("+1")).toHaveClass("w-6", "h-6");
    rerender(<AvatarStack size="md" names={["A", "B", "C", "D", "E", "F"]} max={5} />);
    expect(screen.getByText("+1")).toHaveClass("w-8", "h-8");
  });
});
