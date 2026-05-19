// @spec AUTH-API-RATELIMIT-001
import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetRateLimits } from "@/lib/auth/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimits();
  });

  it("allows up to limit calls in the window", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("k", 5, 60_000, t);
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(5 - (i + 1));
    }
  });

  it("rejects the 6th call within the same window", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit("k", 5, 60_000, t);
    }
    const sixth = checkRateLimit("k", 5, 60_000, t + 100);
    expect(sixth.ok).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("starts a fresh window after windowMs elapses", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit("k", 5, 60_000, t);
    }
    // still blocked just before the window expires
    expect(checkRateLimit("k", 5, 60_000, t + 59_999).ok).toBe(false);
    // first call in next window succeeds
    const after = checkRateLimit("k", 5, 60_000, t + 60_000);
    expect(after.ok).toBe(true);
    expect(after.remaining).toBe(4);
  });

  it("isolates buckets by key", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit("a", 5, 60_000, t);
    }
    expect(checkRateLimit("a", 5, 60_000, t).ok).toBe(false);
    // different key is unaffected
    expect(checkRateLimit("b", 5, 60_000, t).ok).toBe(true);
  });

  it("_resetRateLimits clears all buckets", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      checkRateLimit("k", 5, 60_000, t);
    }
    expect(checkRateLimit("k", 5, 60_000, t).ok).toBe(false);
    _resetRateLimits();
    expect(checkRateLimit("k", 5, 60_000, t).ok).toBe(true);
  });
});
