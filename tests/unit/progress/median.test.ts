// @spec PROG-DASH-MEDIAN-001
import { describe, it, expect } from "vitest";
import { medianOfReading } from "@/lib/progress/median";

describe("medianOfReading", () => {
  it("returns 0 when no records exist", () => {
    expect(medianOfReading([])).toBe(0);
  });

  it("returns 0 when every member is not_started", () => {
    const records = [
      { percentage: 0, status: "not_started" },
      { percentage: 0, status: "not_started" },
    ];
    expect(medianOfReading(records)).toBe(0);
  });

  it("excludes not_started members from the median", () => {
    // If we included not_started zeros, median across [0,0,40,80,100] = 40.
    // Excluding them, median across [40,80,100] = 80.
    const records = [
      { percentage: 0, status: "not_started" },
      { percentage: 0, status: "not_started" },
      { percentage: 40, status: "reading" },
      { percentage: 80, status: "reading" },
      { percentage: 100, status: "finished" },
    ];
    expect(medianOfReading(records)).toBe(80);
  });

  it("averages the two middle values for an even count", () => {
    const records = [
      { percentage: 20, status: "reading" },
      { percentage: 40, status: "reading" },
      { percentage: 60, status: "reading" },
      { percentage: 80, status: "reading" },
    ];
    // median of [20,40,60,80] = (40+60)/2 = 50
    expect(medianOfReading(records)).toBe(50);
  });

  it("counts finished members in the median", () => {
    const records = [
      { percentage: 50, status: "reading" },
      { percentage: 100, status: "finished" },
    ];
    // (50 + 100) / 2 = 75
    expect(medianOfReading(records)).toBe(75);
  });

  it("returns the single value when only one reader exists", () => {
    const records = [
      { percentage: 0, status: "not_started" },
      { percentage: 33, status: "reading" },
    ];
    expect(medianOfReading(records)).toBe(33);
  });
});
