// @spec AUTH-API-RATELIMIT-001
import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAnonymousCaller } from "@tests/helpers/trpc";
import { alice, insertUser } from "@tests/fixtures/users";
import { _resetRateLimits } from "@/lib/auth/rate-limit";

const db = getTestDb();

describe("auth rate limiting", () => {
  beforeEach(async () => {
    await resetDb(db);
    _resetRateLimits();
  });

  it("throttles auth.signIn after 5 wrong-passcode attempts from the same IP", async () => {
    await insertUser(db, alice);
    const prev = process.env.PILOT_PASSCODE;
    process.env.PILOT_PASSCODE = "the-real-one";
    try {
      const caller = createAnonymousCaller(db, { ip: "203.0.113.5" });

      // 5 wrong-passcode attempts: each should fail with UNAUTHORIZED, not rate-limit.
      for (let i = 0; i < 5; i++) {
        await expect(
          caller.auth.signIn({ email: alice.email, passcode: "wrong" }),
        ).rejects.toThrow(/wrong passcode/i);
      }

      // 6th attempt — same IP, same email — gets throttled.
      let err: unknown;
      try {
        await caller.auth.signIn({ email: alice.email, passcode: "wrong" });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    } finally {
      process.env.PILOT_PASSCODE = prev;
    }
  });

  it("throttles auth.enter on email key even when IP is null", async () => {
    const prev = process.env.PILOT_PASSCODE;
    process.env.PILOT_PASSCODE = "the-real-one";
    try {
      const caller = createAnonymousCaller(db, { ip: null });

      for (let i = 0; i < 5; i++) {
        await expect(
          caller.auth.enter({
            email: "newbie@example.com",
            displayName: "Newbie",
            passcode: "wrong",
          }),
        ).rejects.toThrow();
      }

      let err: unknown;
      try {
        await caller.auth.enter({
          email: "newbie@example.com",
          displayName: "Newbie",
          passcode: "wrong",
        });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    } finally {
      process.env.PILOT_PASSCODE = prev;
    }
  });

  it("skips IP key when ctx.ip is null but still throttles by email", async () => {
    await insertUser(db, alice);
    const prev = process.env.PILOT_PASSCODE;
    process.env.PILOT_PASSCODE = "the-real-one";
    try {
      // No IP — but email bucket still fills.
      const caller = createAnonymousCaller(db, { ip: null });
      for (let i = 0; i < 5; i++) {
        await expect(
          caller.auth.signIn({ email: alice.email, passcode: "wrong" }),
        ).rejects.toThrow(/wrong passcode/i);
      }
      let err: unknown;
      try {
        await caller.auth.signIn({ email: alice.email, passcode: "wrong" });
      } catch (e) {
        err = e;
      }
      expect((err as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    } finally {
      process.env.PILOT_PASSCODE = prev;
    }
  });
});
