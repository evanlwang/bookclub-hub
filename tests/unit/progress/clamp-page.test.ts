// @spec PROG-API-VALID-001, PROG-UI-MODAL-PAGE-CLAMP-001
import { describe, it, expect } from "vitest";
import { clampPage } from "@/lib/progress/clamp-page";

describe("clampPage", () => {
  it("clamps values above totalPages to totalPages", () => {
    expect(clampPage(500, 412)).toBe(412);
  });

  it("clamps negative values to 0", () => {
    expect(clampPage(-3, 412)).toBe(0);
  });

  it("accepts values inside the range unchanged", () => {
    expect(clampPage(187, 412)).toBe(187);
  });

  it("accepts the boundary values 0 and totalPages", () => {
    expect(clampPage(0, 412)).toBe(0);
    expect(clampPage(412, 412)).toBe(412);
  });

  it("when totalPages is null, returns max(0, value)", () => {
    expect(clampPage(500, null)).toBe(500);
    expect(clampPage(-3, null)).toBe(0);
  });

  it("coerces NaN to 0", () => {
    expect(clampPage(Number.NaN, 412)).toBe(0);
    expect(clampPage(Number.NaN, null)).toBe(0);
  });

  it("floors non-integer input", () => {
    expect(clampPage(187.9, 412)).toBe(187);
  });
});
