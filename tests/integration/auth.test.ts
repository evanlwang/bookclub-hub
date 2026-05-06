// @spec AUTH-API-001, AUTH-API-002, AUTH-API-003, AUTH-API-004, AUTH-API-005, AUTH-API-SIGNIN-001, AUTH-API-LOGOUT-001, AUTH-API-LOGOUT-002, AUTH-BE-001, AUTH-BE-002, AUTH-BE-003
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller, createAnonymousCaller } from "@tests/helpers/trpc";
import { alice, insertUser } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("auth", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  describe("auth.enter", () => {
    it("creates a new user and session for unknown email", async () => {
      const caller = createAnonymousCaller(db);
      const result = await caller.auth.enter({
        email: "newuser@example.com",
        displayName: "New User",
      });

      expect(result.user.email).toBe("newuser@example.com");
      expect(result.user.displayName).toBe("New User");
      expect(result.sessionId).toBeTruthy();
      expect(result.sessionId.length).toBeGreaterThanOrEqual(64);
    });

    it("returns existing user for known email", async () => {
      const caller = createAnonymousCaller(db);

      const first = await caller.auth.enter({
        email: "alice@example.com",
        displayName: "Alice",
      });
      const second = await caller.auth.enter({
        email: "alice@example.com",
        displayName: "Alice",
      });

      expect(second.user.id).toBe(first.user.id);
    });

    it("normalizes email case-insensitively", async () => {
      const caller = createAnonymousCaller(db);

      const first = await caller.auth.enter({
        email: "Alice@Example.COM",
        displayName: "Alice",
      });
      const second = await caller.auth.enter({
        email: "alice@example.com",
        displayName: "Alice",
      });

      expect(second.user.id).toBe(first.user.id);
    });

    it("updates display_name when different", async () => {
      const caller = createAnonymousCaller(db);

      await caller.auth.enter({
        email: "alice@example.com",
        displayName: "Alice",
      });
      const result = await caller.auth.enter({
        email: "alice@example.com",
        displayName: "Alice Chen",
      });

      expect(result.user.displayName).toBe("Alice Chen");
    });
  });

  describe("auth.signIn", () => {
    // @spec AUTH-API-SIGNIN-001
    it("creates a session for an existing user", async () => {
      await insertUser(db, alice);
      const caller = createAnonymousCaller(db);

      const result = await caller.auth.signIn({ email: alice.email });

      expect(result.user.id).toBe(alice.id);
      expect(result.user.email).toBe(alice.email);
      expect(result.sessionId).toBeTruthy();
      expect(result.sessionId.length).toBeGreaterThanOrEqual(64);

      const session = await db.session.findUnique({ where: { id: result.sessionId } });
      expect(session?.userId).toBe(alice.id);
    });

    // @spec AUTH-API-SIGNIN-001
    it("throws NOT_FOUND for an unknown email (does NOT create a user)", async () => {
      const caller = createAnonymousCaller(db);

      await expect(
        caller.auth.signIn({ email: "ghost@example.com" })
      ).rejects.toThrow("No account found");

      const created = await db.user.findUnique({ where: { email: "ghost@example.com" } });
      expect(created).toBeNull();
    });

    // @spec AUTH-API-SIGNIN-001
    it("matches user case-insensitively via normalized email", async () => {
      await insertUser(db, alice);
      const caller = createAnonymousCaller(db);

      const result = await caller.auth.signIn({ email: "ALICE@EXAMPLE.COM" });

      expect(result.user.id).toBe(alice.id);
    });

    // @spec AUTH-API-SIGNIN-001
    it("rejects invalid email format with BAD_REQUEST", async () => {
      const caller = createAnonymousCaller(db);

      await expect(
        caller.auth.signIn({ email: "not-an-email" })
      ).rejects.toThrow();
    });
  });

  describe("auth.me", () => {
    it("returns user data and club list with valid session", async () => {
      await insertUser(db, alice);
      await seedClubWithMembers(db, wedReads, alice, [], []);

      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.auth.me();

      expect(result.user.email).toBe(alice.email);
      expect(result.clubs).toHaveLength(1);
      expect(result.clubs[0].name).toBe(wedReads.name);
    });

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

      // Session should be gone
      const sessions = await db.session.findMany({
        where: { userId: alice.id },
      });
      expect(sessions).toHaveLength(0);
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
      // Still emits the clearing cookie even when no session existed.
      expect(resHeaders.get("set-cookie") ?? "").toMatch(/session_id=;/);
    });
  });
});
