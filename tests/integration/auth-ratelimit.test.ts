// @spec AUTH-API-RATELIMIT-001
import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAnonymousCaller } from "@tests/helpers/trpc";
import { resetEmailCalls } from "@/server/services/email";
import { _resetRateLimits } from "@/lib/auth/rate-limit";

const db = getTestDb();

// The limiter allows 5 hits per fixed 60s window, keyed independently per IP
// (`<proc>:ip:<ip>`) and per email (`<proc>:key:<email>`). Auth v2 applies it
// to the email-OTP procedures requestOtp/verifyOtp — there is no passcode gate.

describe("auth rate limiting", () => {
  beforeEach(async () => {
    await resetDb(db);
    resetEmailCalls();
    _resetRateLimits();
  });

  it("throttles auth.requestOtp after 5 attempts from the same IP", async () => {
    const caller = createAnonymousCaller(db, { ip: "203.0.113.5" });

    // Vary the email so only the shared IP bucket accumulates.
    for (let i = 0; i < 5; i++) {
      const res = await caller.auth.requestOtp({ email: `user${i}@example.com` });
      expect(res).toEqual({ ok: true });
    }

    // 6th request from the same IP — throttled regardless of email.
    let err: unknown;
    try {
      await caller.auth.requestOtp({ email: "user5@example.com" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
  });

  it("throttles auth.requestOtp on the email key even when IP is null", async () => {
    const caller = createAnonymousCaller(db, { ip: null });

    // No IP — but the per-email bucket still fills for the same address.
    for (let i = 0; i < 5; i++) {
      const res = await caller.auth.requestOtp({ email: "newbie@example.com" });
      expect(res).toEqual({ ok: true });
    }

    let err: unknown;
    try {
      await caller.auth.requestOtp({ email: "newbie@example.com" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
  });

  it("throttles auth.verifyOtp after 5 attempts from the same IP", async () => {
    const caller = createAnonymousCaller(db, { ip: "198.51.100.7" });

    // Each call uses a wrong, non-bypass code against an address with no live
    // OTP, so it fails UNAUTHORIZED — not rate-limited — for the first 5.
    for (let i = 0; i < 5; i++) {
      await expect(
        caller.auth.verifyOtp({ email: `probe${i}@example.com`, code: "111111", displayName: "P" }),
      ).rejects.toThrow(/invalid or has expired/i);
    }

    // 6th attempt — same IP — gets throttled before the OTP lookup runs.
    let err: unknown;
    try {
      await caller.auth.verifyOtp({ email: "probe5@example.com", code: "111111", displayName: "P" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
  });

  it("throttles auth.verifyOtp on the email key when IP is null", async () => {
    const caller = createAnonymousCaller(db, { ip: null });

    for (let i = 0; i < 5; i++) {
      await expect(
        caller.auth.verifyOtp({ email: "target@example.com", code: "111111", displayName: "T" }),
      ).rejects.toThrow(/invalid or has expired/i);
    }

    let err: unknown;
    try {
      await caller.auth.verifyOtp({ email: "target@example.com", code: "111111", displayName: "T" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
  });
});
