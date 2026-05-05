// @spec AUTH-BE-001, AUTH-BE-002
import { describe, it, expect } from "vitest";
import {
  generateSessionId,
  isSessionExpired,
  computeNewExpiry,
} from "@/lib/auth/session";

describe("generateSessionId", () => {
  it("generates a string of 64+ characters", () => {
    const id = generateSessionId();
    expect(id.length).toBeGreaterThanOrEqual(64);
  });

  it("generates hex characters only", () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique IDs on successive calls", () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
  });
});

describe("isSessionExpired", () => {
  it("returns true for past dates", () => {
    const pastDate = new Date("2020-01-01");
    expect(isSessionExpired(pastDate)).toBe(true);
  });

  it("returns false for future dates", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(isSessionExpired(futureDate)).toBe(false);
  });
});

describe("computeNewExpiry", () => {
  it("returns a date approximately 30 days in the future", () => {
    const before = new Date();
    const expiry = computeNewExpiry();
    const after = new Date();

    const minExpected = new Date(before);
    minExpected.setDate(minExpected.getDate() + 29);
    const maxExpected = new Date(after);
    maxExpected.setDate(maxExpected.getDate() + 31);

    expect(expiry.getTime()).toBeGreaterThan(minExpected.getTime());
    expect(expiry.getTime()).toBeLessThan(maxExpected.getTime());
  });
});
