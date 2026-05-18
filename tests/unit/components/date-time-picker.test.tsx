// @vitest-environment jsdom
// @spec COMP-DATE-TIME-PICKER-001 through COMP-DATE-TIME-PICKER-018, COMP-DATE-TIME-PICKER-A11Y-001..006
// LLD: docs/llds/components-date-time-picker.md

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DateTimePicker, __testing } from "@/components/ui/date-time-picker";

const { buildMonthGrid, sameDay, parseIso, toIso } = __testing;

describe("DateTimePicker — pure helpers (COMP-DATE-TIME-PICKER-002)", () => {
  it("toIso round-trips a Date through the local-ISO contract", () => {
    const d = new Date(2026, 4, 18, 19, 30);
    expect(toIso(d)).toBe("2026-05-18T19:30");
  });
  it("parseIso parses the local-ISO contract", () => {
    const d = parseIso("2026-05-18T19:30");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getHours()).toBe(19);
    expect(d!.getMinutes()).toBe(30);
  });
  it("parseIso returns null for empty / invalid", () => {
    expect(parseIso("")).toBeNull();
    expect(parseIso("not-a-date")).toBeNull();
  });
  it("buildMonthGrid returns 42 cells", () => {
    const grid = buildMonthGrid(new Date(2026, 4, 1));
    expect(grid).toHaveLength(42);
  });
  it("sameDay is true for two dates on the same calendar day", () => {
    expect(sameDay(new Date(2026, 4, 18, 7), new Date(2026, 4, 18, 22))).toBe(true);
    expect(sameDay(new Date(2026, 4, 18), new Date(2026, 4, 19))).toBe(false);
  });
});

describe("DateTimePicker — trigger + popover open/close", () => {
  // @spec COMP-DATE-TIME-PICKER-004
  it("trigger shows placeholder when value is empty", () => {
    render(<DateTimePicker value="" onChange={() => {}} placeholder="Pick" />);
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });

  // @spec COMP-DATE-TIME-PICKER-005
  it("clicking the trigger toggles the popover", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: /choose date and time/i })).toBeInTheDocument();
  });

  // @spec COMP-DATE-TIME-PICKER-006
  it("Escape closes the popover", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // @spec COMP-DATE-TIME-PICKER-007
  it("mousedown outside the wrapper closes the popover", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("DateTimePicker — hidden native input contract (COMP-DATE-TIME-PICKER-003)", () => {
  it("renders a hidden native datetime-local input with the same value + data-testid", () => {
    const { container } = render(
      <DateTimePicker value="2026-05-18T19:00" onChange={() => {}} data-testid="meet-when" />,
    );
    const native = container.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(native).not.toBeNull();
    expect(native.value).toBe("2026-05-18T19:00");
    expect(native.getAttribute("data-testid")).toBe("meet-when");
    expect(native.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("DateTimePicker — time controls", () => {
  // @spec COMP-DATE-TIME-PICKER-012
  it("minute select offers only 00/15/30/45", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="2026-05-18T19:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    const select = screen.getByLabelText("Minute") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["0", "15", "30", "45"]);
  });

  // @spec COMP-DATE-TIME-PICKER-014 — active gap
  it.todo("entering an out-of-range hour (>12 or <1) shows visible inline feedback");
});

describe("DateTimePicker — accessibility", () => {
  // @spec COMP-DATE-TIME-PICKER-A11Y-001
  it("trigger sets aria-haspopup=dialog + aria-expanded", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { expanded: false });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  // @spec COMP-DATE-TIME-PICKER-A11Y-002
  it("popover has role=dialog with aria-label", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Choose date and time");
  });

  // @spec COMP-DATE-TIME-PICKER-A11Y-003
  it("hour input has aria-label='Hour'; minute select has aria-label='Minute'", async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value="2026-05-18T19:00" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    expect(screen.getByLabelText("Minute")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });

  // @spec COMP-DATE-TIME-PICKER-A11Y-005 — active gap
  it.todo(
    "day grid supports arrow keys, Home/End for week, PageUp/PageDown for month",
  );

  // @spec COMP-DATE-TIME-PICKER-A11Y-006
  it("trigger declares focus:border-primary (LLD-documented override)", () => {
    render(<DateTimePicker value="" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { expanded: false });
    expect(trigger.className).toMatch(/focus:border-primary/);
  });
});

describe("DateTimePicker — token discipline (COMP-DATE-TIME-PICKER-018)", () => {
  // @spec COMP-DATE-TIME-PICKER-018 — active gap
  it.todo("popover uses --shadow-lg (no inline literal oklch shadow)");
});
