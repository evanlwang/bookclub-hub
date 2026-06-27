// @spec AUTH-API-001, AUTH-API-002, AUTH-API-004, AUTH-API-005, AUTH-API-LOGOUT-001, AUTH-API-LOGOUT-002, AUTH-BE-SESSION-001, AUTH-BE-003
// @spec AUTH-OTP-REQUEST-001, AUTH-OTP-REQUEST-ENUM-001, AUTH-OTP-VERIFY-001, AUTH-OTP-SINGLE-USE-001, AUTH-OTP-EXPIRY-001, AUTH-OTP-ATTEMPTS-001, AUTH-OTP-LATEST-001
// @spec AUTH-PASSKEY-LIST-001, AUTH-PASSKEY-REVOKE-001, AUTH-PASSKEY-UNKNOWN-001, AUTH-PASSKEY-CHALLENGE-001, AUTH-RECOVERY-001, AUTH-RECOVERY-002
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { _resetRateLimits } from "@/lib/auth/rate-limit";
import { getEmailCalls, resetEmailCalls } from "@/server/services/email";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "@tests/helpers/trpc";
import { alice, bob, insertUser } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

/** Pull the most recently emailed OTP code out of the recorded email body. */
function lastEmailedCode(): string {
  const calls = getEmailCalls();
  const last = calls[calls.length - 1];
  const m = last?.body.match(/(\d{6})/);
  if (!m) throw new Error("no OTP code in last email");
  return m[1];
}

async function requestAndReadCode(email: string): Promise<string> {
  const caller = createAnonymousCaller(db);
  await caller.auth.requestOtp({ email });
  return lastEmailedCode();
}

describe("auth (OTP + passkeys)", () => {
  beforeEach(async () => {
    await resetDb(db);
    resetEmailCalls();
    _resetRateLimits();
  });

  describe("auth.requestOtp", () => {
    // @spec AUTH-OTP-REQUEST-001
    it("emails a 6-digit code and stores only its hash", async () => {
      const caller = createAnonymousCaller(db);
      const res = await caller.auth.requestOtp({ email: "new@example.com" });
      expect(res).toEqual({ ok: true });

      const code = lastEmailedCode();
      expect(code).toMatch(/^\d{6}$/);

      const otp = await db.emailOtp.findFirst({ where: { email: "new@example.com" } });
      expect(otp).toBeTruthy();
      expect(otp?.codeHash).not.toContain(code); // raw code never stored
    });

    // @spec AUTH-OTP-REQUEST-ENUM-001
    it("returns the same shape whether or not the email has an account", async () => {
      await insertUser(db, alice);
      const caller = createAnonymousCaller(db);
      const known = await caller.auth.requestOtp({ email: alice.email });
      const unknown = await caller.auth.requestOtp({ email: "stranger@example.com" });
      expect(known).toEqual(unknown);
    });

    // @spec AUTH-OTP-LATEST-001
    it("supersedes a prior unconsumed code for the same email", async () => {
      const caller = createAnonymousCaller(db);
      await caller.auth.requestOtp({ email: "x@example.com" });
      const firstCode = lastEmailedCode();
      await caller.auth.requestOtp({ email: "x@example.com" });

      // First code no longer verifies; only the latest does.
      await expect(
        caller.auth.verifyOtp({ email: "x@example.com", code: firstCode, displayName: "X" }),
      ).rejects.toThrow(/invalid or has expired/i);
      const latest = lastEmailedCode();
      const ok = await caller.auth.verifyOtp({ email: "x@example.com", code: latest, displayName: "X" });
      expect(ok.user.email).toBe("x@example.com");
    });
  });

  describe("auth.verifyOtp", () => {
    // @spec AUTH-API-001, AUTH-BE-SESSION-001
    it("creates a new user + session on first verify (isNewUser true)", async () => {
      const code = await requestAndReadCode("first@example.com");
      const caller = createAnonymousCaller(db);
      const res = await caller.auth.verifyOtp({
        email: "first@example.com",
        code,
        displayName: "First User",
      });
      expect(res.isNewUser).toBe(true);
      expect(res.user.displayName).toBe("First User");
      expect(res.sessionId.length).toBeGreaterThanOrEqual(64);
      const session = await db.session.findUnique({ where: { id: res.sessionId } });
      expect(session?.userId).toBe(res.user.id);
    });

    // @spec AUTH-API-001
    it("derives a provisional display name from the email local-part when none given", async () => {
      const code = await requestAndReadCode("marisol@example.com");
      const caller = createAnonymousCaller(db);
      const res = await caller.auth.verifyOtp({ email: "marisol@example.com", code });
      expect(res.isNewUser).toBe(true);
      expect(res.user.displayName).toBe("marisol");
    });

    // @spec AUTH-API-002
    it("matches an existing user and updates the display name when changed", async () => {
      await insertUser(db, alice);
      const code = await requestAndReadCode(alice.email);
      const caller = createAnonymousCaller(db);
      const res = await caller.auth.verifyOtp({
        email: alice.email,
        code,
        displayName: "Alice Chen",
      });
      expect(res.isNewUser).toBe(false);
      expect(res.user.id).toBe(alice.id);
      expect(res.user.displayName).toBe("Alice Chen");
    });

    it("matches case-insensitively via normalized email", async () => {
      const code = await requestAndReadCode("casey@example.com");
      const caller = createAnonymousCaller(db);
      const res = await caller.auth.verifyOtp({ email: "CASEY@EXAMPLE.COM", code, displayName: "Casey" });
      expect(res.user.email).toBe("casey@example.com");
    });

    // @spec AUTH-OTP-VERIFY-001, AUTH-RECOVERY-001
    it("rejects a wrong code and creates no user/session", async () => {
      await requestAndReadCode("nope@example.com");
      const caller = createAnonymousCaller(db);
      await expect(
        caller.auth.verifyOtp({ email: "nope@example.com", code: "999999", displayName: "Nope" }),
      ).rejects.toThrow(/invalid or has expired/i);
      expect(await db.user.findUnique({ where: { email: "nope@example.com" } })).toBeNull();
      expect(await db.session.count()).toBe(0);
    });

    // @spec AUTH-OTP-SINGLE-USE-001
    it("rejects reuse of an already-consumed code", async () => {
      const code = await requestAndReadCode("once@example.com");
      const caller = createAnonymousCaller(db);
      await caller.auth.verifyOtp({ email: "once@example.com", code, displayName: "Once" });
      await expect(
        caller.auth.verifyOtp({ email: "once@example.com", code, displayName: "Once" }),
      ).rejects.toThrow(/invalid or has expired/i);
    });

    // @spec AUTH-OTP-EXPIRY-001
    it("rejects an expired code", async () => {
      const code = await requestAndReadCode("stale@example.com");
      await db.emailOtp.updateMany({
        where: { email: "stale@example.com" },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const caller = createAnonymousCaller(db);
      await expect(
        caller.auth.verifyOtp({ email: "stale@example.com", code, displayName: "Stale" }),
      ).rejects.toThrow(/invalid or has expired/i);
    });

    // @spec AUTH-OTP-ATTEMPTS-001
    it("locks the code after the attempt cap, even if the right code is then presented", async () => {
      const code = await requestAndReadCode("brute@example.com");
      const caller = createAnonymousCaller(db);
      for (let i = 0; i < 5; i++) {
        _resetRateLimits(); // isolate the per-code attempt cap from the per-minute IP/email limiter
        await expect(
          caller.auth.verifyOtp({ email: "brute@example.com", code: "000001", displayName: "B" }),
        ).rejects.toThrow();
      }
      _resetRateLimits();
      await expect(
        caller.auth.verifyOtp({ email: "brute@example.com", code, displayName: "B" }),
      ).rejects.toThrow(/invalid or has expired/i);
    });

    it("accepts the non-production dev bypass code", async () => {
      // NODE_ENV is "test" under vitest, so the 000000 bypass is active.
      const caller = createAnonymousCaller(db);
      const res = await caller.auth.verifyOtp({
        email: "devbypass@example.com",
        code: "000000",
        displayName: "Dev Bypass",
      });
      expect(res.user.email).toBe("devbypass@example.com");
    });
  });

  describe("passkeys", () => {
    // @spec AUTH-PASSKEY-CHALLENGE-001
    it("startPasskeyRegistration returns options and persists a register challenge", async () => {
      await insertUser(db, alice);
      const caller = await createAuthenticatedCaller(db, alice);
      const { options } = await caller.auth.startPasskeyRegistration();
      expect(options.challenge).toBeTruthy();
      const row = await db.webAuthnChallenge.findFirst({
        where: { userId: alice.id, type: "register" },
      });
      expect(row?.challenge).toBe(options.challenge);
    });

    // @spec AUTH-PASSKEY-LOGIN-001
    it("startPasskeyLogin scopes allowCredentials to a known email and persists a login challenge", async () => {
      await insertUser(db, alice);
      await db.credential.create({
        data: {
          userId: alice.id,
          credentialId: "cred-abc",
          publicKey: Buffer.from([1, 2, 3]),
          counter: 0,
          transports: ["internal"],
          deviceName: "Alice Laptop",
        },
      });
      const caller = createAnonymousCaller(db);
      const { options } = await caller.auth.startPasskeyLogin({ email: alice.email });
      expect(options.allowCredentials?.[0]?.id).toBe("cred-abc");
      const row = await db.webAuthnChallenge.findFirst({ where: { type: "login" } });
      expect(row?.challenge).toBe(options.challenge);
    });

    it("startPasskeyLogin for an unknown email yields a discoverable (empty allow-list) challenge", async () => {
      const caller = createAnonymousCaller(db);
      const { options } = await caller.auth.startPasskeyLogin({ email: "ghost@example.com" });
      expect(options.allowCredentials ?? []).toHaveLength(0);
    });

    // @spec AUTH-PASSKEY-UNKNOWN-001
    it("finishPasskeyLogin rejects an assertion for an unknown credential", async () => {
      const caller = createAnonymousCaller(db);
      await expect(
        caller.auth.finishPasskeyLogin({
          assertion: { id: "unknown-cred", response: { clientDataJSON: "" } },
        }),
      ).rejects.toThrow(/unknown passkey/i);
    });

    // @spec AUTH-PASSKEY-LIST-001
    it("listCredentials returns the caller's passkeys", async () => {
      await insertUser(db, alice);
      await db.credential.create({
        data: {
          userId: alice.id,
          credentialId: "cred-1",
          publicKey: Buffer.from([9]),
          counter: 3,
          transports: [],
          deviceName: "Phone",
        },
      });
      const caller = await createAuthenticatedCaller(db, alice);
      const { credentials } = await caller.auth.listCredentials();
      expect(credentials).toHaveLength(1);
      expect(credentials[0].deviceName).toBe("Phone");
    });

    // @spec AUTH-PASSKEY-REVOKE-001, AUTH-RECOVERY-002
    it("revokeCredential deletes the caller's own passkey (last one allowed)", async () => {
      await insertUser(db, alice);
      const cred = await db.credential.create({
        data: {
          userId: alice.id,
          credentialId: "cred-only",
          publicKey: Buffer.from([1]),
          counter: 0,
          transports: [],
          deviceName: "Only",
        },
      });
      const caller = await createAuthenticatedCaller(db, alice);
      const res = await caller.auth.revokeCredential({ id: cred.id });
      expect(res).toEqual({ ok: true });
      expect(await db.credential.count({ where: { userId: alice.id } })).toBe(0);
    });

    // @spec AUTH-PASSKEY-REVOKE-001
    it("revokeCredential cannot delete another user's passkey", async () => {
      await insertUser(db, alice);
      await insertUser(db, bob);
      const bobCred = await db.credential.create({
        data: {
          userId: bob.id,
          credentialId: "bob-cred",
          publicKey: Buffer.from([2]),
          counter: 0,
          transports: [],
          deviceName: "Bob Phone",
        },
      });
      const caller = await createAuthenticatedCaller(db, alice);
      await expect(caller.auth.revokeCredential({ id: bobCred.id })).rejects.toThrow(/not found/i);
      expect(await db.credential.findUnique({ where: { id: bobCred.id } })).toBeTruthy();
    });
  });

  describe("auth.me", () => {
    // @spec AUTH-API-004
    it("returns user data and club list with valid session", async () => {
      await insertUser(db, alice);
      await seedClubWithMembers(db, wedReads, alice, [], []);
      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.auth.me();
      expect(result.user.email).toBe(alice.email);
      expect(result.clubs).toHaveLength(1);
      expect(result.clubs[0].name).toBe(wedReads.name);
    });

    // @spec AUTH-API-005
    it("throws UNAUTHORIZED without session", async () => {
      const caller = createAnonymousCaller(db);
      await expect(caller.auth.me()).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("auth.logout", () => {
    it("destroys the session", async () => {
      await insertUser(db, alice);
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.auth.logout();
      expect(await db.session.findMany({ where: { userId: alice.id } })).toHaveLength(0);
    });

    // @spec AUTH-API-LOGOUT-001
    it("emits a clearing Set-Cookie header for session_id", async () => {
      await insertUser(db, alice);
      const resHeaders = new Headers();
      const caller = await createAuthenticatedCaller(db, alice, { resHeaders });
      await caller.auth.logout();
      const setCookie = resHeaders.get("set-cookie") ?? "";
      expect(setCookie).toMatch(/session_id=;/);
      expect(setCookie.toLowerCase()).toMatch(/max-age=0/);
      expect(setCookie).toMatch(/Path=\//);
    });

    // @spec AUTH-API-LOGOUT-002
    it("is idempotent — anonymous caller (no session) returns success", async () => {
      const resHeaders = new Headers();
      const caller = createAnonymousCaller(db, { resHeaders });
      const result = await caller.auth.logout();
      expect(result).toEqual({ success: true });
      expect(resHeaders.get("set-cookie") ?? "").toMatch(/session_id=;/);
    });
  });
});
