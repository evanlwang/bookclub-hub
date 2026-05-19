// @spec PROG-DASH-UPDATED-001
import { describe, it, expect } from "vitest";
import { relativeTimeShort } from "@/lib/progress/relative-time";

const NOW = new Date("2026-05-18T12:00:00Z").getTime();

describe("relativeTimeShort", () => {
  it("returns 'just now' for the same minute", () => {
    expect(relativeTimeShort(new Date(NOW - 30 * 1000), NOW)).toBe("just now");
  });

  it("returns 'Nm ago' for minutes", () => {
    expect(relativeTimeShort(new Date(NOW - 5 * 60 * 1000), NOW)).toBe("5m ago");
  });

  it("returns 'Nh ago' for hours", () => {
    expect(relativeTimeShort(new Date(NOW - 3 * 60 * 60 * 1000), NOW)).toBe(
      "3h ago"
    );
  });

  it("returns 'Nd ago' for days", () => {
    expect(
      relativeTimeShort(new Date(NOW - 4 * 24 * 60 * 60 * 1000), NOW)
    ).toBe("4d ago");
  });

  it("returns 'Nw ago' for weeks", () => {
    expect(
      relativeTimeShort(new Date(NOW - 21 * 24 * 60 * 60 * 1000), NOW)
    ).toBe("3w ago");
  });

  it("accepts ISO strings", () => {
    const iso = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTimeShort(iso, NOW)).toBe("2d ago");
  });
});
