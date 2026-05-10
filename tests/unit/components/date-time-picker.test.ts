// @spec MEET-UI-CREATE-002
import { describe, it, expect } from "vitest";
import { __testing } from "@/components/ui/date-time-picker";

const { buildMonthGrid, sameDay, toIso, parseIso } = __testing;

describe("date-time-picker utilities", () => {
  describe("buildMonthGrid", () => {
    it("always returns a 6×7 grid of 42 days", () => {
      const grid = buildMonthGrid(new Date(2026, 4, 1)); // May 2026
      expect(grid).toHaveLength(42);
    });

    it("starts on the Sunday on or before the first of the month", () => {
      // May 1 2026 is a Friday → grid should start the prior Sunday (Apr 26).
      const grid = buildMonthGrid(new Date(2026, 4, 1));
      expect(grid[0].getMonth()).toBe(3); // April
      expect(grid[0].getDate()).toBe(26);
      expect(grid[0].getDay()).toBe(0); // Sunday
    });

    it("contains every day of the target month exactly once", () => {
      const grid = buildMonthGrid(new Date(2026, 4, 1));
      const mayDays = grid.filter((d) => d.getMonth() === 4).map((d) => d.getDate());
      // May 2026 has 31 days
      expect(mayDays).toHaveLength(31);
      expect(new Set(mayDays).size).toBe(31);
    });

    it("handles February (28 days, non-leap) without gaps", () => {
      const grid = buildMonthGrid(new Date(2026, 1, 1)); // Feb 2026
      const febDays = grid.filter((d) => d.getMonth() === 1);
      expect(febDays).toHaveLength(28);
    });
  });

  describe("sameDay", () => {
    it("returns true for two dates on the same calendar day even at different times", () => {
      expect(
        sameDay(new Date(2026, 4, 17, 9, 0), new Date(2026, 4, 17, 23, 59))
      ).toBe(true);
    });

    it("returns false for adjacent days", () => {
      expect(
        sameDay(new Date(2026, 4, 17, 23, 59), new Date(2026, 4, 18, 0, 0))
      ).toBe(false);
    });
  });

  describe("toIso ↔ parseIso", () => {
    it("round-trips a local datetime to the YYYY-MM-DDTHH:MM contract", () => {
      const d = new Date(2026, 4, 17, 19, 30);
      const iso = toIso(d);
      expect(iso).toBe("2026-05-17T19:30");
      const parsed = parseIso(iso);
      expect(parsed).toBeInstanceOf(Date);
      expect(sameDay(parsed!, d)).toBe(true);
      expect(parsed!.getHours()).toBe(19);
      expect(parsed!.getMinutes()).toBe(30);
    });

    it("parseIso returns null for empty input", () => {
      expect(parseIso("")).toBeNull();
    });
  });
});
