// @vitest-environment jsdom
// @spec COMP-ICONS-001 through COMP-ICONS-006, COMP-ICONS-LOGO-001
// LLD: docs/llds/components-icons.md

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  BookIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatIcon,
  ClockIcon,
  EditIcon,
  FilterIcon,
  LogoIcon,
  MenuIcon,
  PlusIcon,
  ReplyIcon,
  SearchIcon,
  TrashIcon,
  TrendIcon,
  UserIcon,
  UsersIcon,
  VoteIcon,
  XIcon,
} from "@/components/ui/icons";

const allIcons = [
  BookIcon,
  VoteIcon,
  CalendarIcon,
  ChatIcon,
  TrendIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
  EditIcon,
  TrashIcon,
  ReplyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FilterIcon,
  MenuIcon,
];

describe("Icons — inventory + IconBase shape (COMP-ICONS-001, COMP-ICONS-002)", () => {
  it("the documented 21 icons are all exported", () => {
    expect(allIcons.length).toBe(20); // IconBase shape
    expect(LogoIcon).toBeDefined();
  });

  it.each(allIcons.map((I) => [I.name || "Icon", I] as const))(
    "%s renders an svg with the IconBase shape",
    (_name, Icon) => {
      const { container } = render(<Icon />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg!.getAttribute("fill")).toBe("none");
      expect(svg!.getAttribute("stroke")).toBe("currentColor");
      expect(svg!.getAttribute("stroke-width")).toBe("1.6");
      expect(svg!.getAttribute("aria-hidden")).toBe("true");
    },
  );
});

describe("Icons — size default (COMP-ICONS-003)", () => {
  it("defaults size to 16", () => {
    const { container } = render(<PlusIcon />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("16");
    expect(svg.getAttribute("height")).toBe("16");
  });
  it("honors the size prop", () => {
    const { container } = render(<PlusIcon size={24} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("height")).toBe("24");
  });
});

describe("Icons — accessibility (COMP-ICONS-005)", () => {
  it("all IconBase icons set aria-hidden='true' by default", () => {
    for (const Icon of allIcons) {
      const { container } = render(<Icon />);
      expect(container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

describe("LogoIcon — token bridging (COMP-ICONS-LOGO-001)", () => {
  // @spec COMP-ICONS-LOGO-001
  it("does not inline oklch or hex literals (bridges through tokens)", () => {
    const { container } = render(<LogoIcon />);
    const html = container.querySelector("svg")!.outerHTML;
    expect(html).not.toMatch(/fill="oklch/);
    expect(html).not.toMatch(/stroke="oklch/);
    expect(html).not.toMatch(/fill="#/);
    expect(html).not.toMatch(/stroke="#/);
  });
});

describe("LogoIcon — dog-ear mark (COMP-ICONS-LOGO-002)", () => {
  // @spec COMP-ICONS-LOGO-002
  it("renders the dog-ear mark as token-bridged paths with no clipPath", () => {
    const { container } = render(<LogoIcon />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 64 64");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    const rect = svg.querySelector("rect");
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute("fill")).toBe("var(--color-primary)");
    const html = svg.outerHTML;
    expect(html).toContain("var(--color-bg)");
    expect(html).toContain("var(--color-primary-hover)");
    // no clipPath element (avoids duplicate ids across instances)
    expect(svg.querySelector("clipPath")).toBeNull();
  });
});
