// @spec MEET-BE-STATE-001, MEET-BE-RESP-EMPTY-001, MEET-BE-CREATE-DEDUP-001
import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  assertNonEmptyResponses,
  assertMeetingProposed,
  assertUniqueSlotTimes,
} from "@/lib/meetings/validation";

describe("assertNonEmptyResponses", () => {
  // @spec MEET-BE-RESP-EMPTY-001
  it("throws BAD_REQUEST when responses array is empty", () => {
    let caught: unknown;
    try {
      assertNonEmptyResponses([]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe("BAD_REQUEST");
    expect((caught as TRPCError).message).toMatch(/at least one time/i);
  });

  // @spec MEET-BE-RESP-EMPTY-001
  it("accepts at least one response", () => {
    expect(() =>
      assertNonEmptyResponses([{ slotId: "s1", status: "available" }])
    ).not.toThrow();
  });
});

describe("assertMeetingProposed", () => {
  // @spec MEET-BE-STATE-001
  it("accepts a proposed meeting", () => {
    expect(() => assertMeetingProposed("proposed")).not.toThrow();
  });

  // @spec MEET-BE-STATE-001
  it.each(["confirmed", "cancelled", "completed"] as const)(
    "throws BAD_REQUEST for status=%s",
    (status) => {
      let caught: unknown;
      try {
        assertMeetingProposed(status);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(TRPCError);
      expect((caught as TRPCError).code).toBe("BAD_REQUEST");
      expect((caught as TRPCError).message).toMatch(/proposed/i);
    }
  );
});

describe("assertUniqueSlotTimes", () => {
  // @spec MEET-BE-CREATE-DEDUP-001
  it("accepts slots with distinct times", () => {
    expect(() =>
      assertUniqueSlotTimes([
        { time: new Date("2099-05-18T19:00:00Z") },
        { time: new Date("2099-05-19T19:00:00Z") },
      ])
    ).not.toThrow();
  });

  // @spec MEET-BE-CREATE-DEDUP-001
  it("rejects two slots at the same instant (same Date object value)", () => {
    let caught: unknown;
    try {
      assertUniqueSlotTimes([
        { time: new Date("2099-05-18T19:00:00Z") },
        { time: new Date("2099-05-18T19:00:00Z") },
      ]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe("BAD_REQUEST");
    expect((caught as TRPCError).message).toMatch(/duplicate/i);
  });

  // @spec MEET-BE-CREATE-DEDUP-001
  it("treats same instant with different durations as duplicates", () => {
    expect(() =>
      assertUniqueSlotTimes([
        { time: new Date("2099-05-18T19:00:00Z"), durationMinutes: 60 },
        { time: new Date("2099-05-18T19:00:00Z"), durationMinutes: 120 },
      ])
    ).toThrow(TRPCError);
  });

  // @spec MEET-BE-CREATE-DEDUP-001
  it("treats equal ISO strings via different Date constructions as duplicates", () => {
    const a = new Date("2099-05-18T19:00:00.000Z");
    const b = new Date(Date.UTC(2099, 4, 18, 19, 0, 0, 0));
    expect(a.getTime()).toBe(b.getTime());
    expect(() => assertUniqueSlotTimes([{ time: a }, { time: b }])).toThrow(
      TRPCError
    );
  });
});
