// @spec AUTH-UI-001, AUTH-UI-003, AUTH-UI-004, CLUB-UI-001, CLUB-UI-002, CLUB-UI-003, CLUB-API-003, CLUB-API-004, CLUB-API-005, CLUB-BE-001
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller, createAnonymousCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { getEmailCalls, resetEmailCalls } from "@/server/services/email";
import { _resetRateLimits } from "@/lib/auth/rate-limit";

const db = getTestDb();

/** Pull the most recently emailed OTP code out of the recorded email body. */
function lastEmailedCode(): string {
  const calls = getEmailCalls();
  const last = calls[calls.length - 1];
  const m = last?.body.match(/(\d{6})/);
  if (!m) throw new Error("no OTP code in last email");
  return m[1];
}

/** Request an OTP and return the emailed code (auth v2's "Step 1" identity entry). */
async function requestAndReadCode(email: string): Promise<string> {
  await createAnonymousCaller(db).auth.requestOtp({ email });
  return lastEmailedCode();
}

/**
 * Establish an authenticated caller by walking the new email-OTP entry flow.
 * Uses the non-production "000000" dev bypass to mint a session without an inbox.
 */
async function enterAsNewUser(email: string, displayName?: string) {
  const res = await createAnonymousCaller(db).auth.verifyOtp({
    email,
    code: "000000",
    ...(displayName ? { displayName } : {}),
  });
  const caller = await createAuthenticatedCaller(db, res.user);
  return { caller, user: res.user };
}

describe("Join Flow — Integration Tests", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    resetEmailCalls();
    _resetRateLimits();
  });

  describe("Step 1: Identity Entry (auth.requestOtp + auth.verifyOtp)", () => {
    // @spec AUTH-UI-001, AUTH-UI-003
    it("creates new user and session", async () => {
      const code = await requestAndReadCode("newuser@example.com");
      const caller = createAnonymousCaller(db);
      const result = await caller.auth.verifyOtp({
        email: "newuser@example.com",
        code,
        displayName: "New User",
      });

      expect(result.user.email).toBe("newuser@example.com");
      expect(result.user.displayName).toBe("New User");
      expect(result.isNewUser).toBe(true);
      expect(result.sessionId).toBeTruthy();
      expect(result.sessionId.length).toBeGreaterThanOrEqual(64);

      // Verify session created in DB
      const session = await db.session.findUnique({
        where: { id: result.sessionId },
      });
      expect(session).toBeTruthy();
      expect(session?.userId).toBe(result.user.id);
    });

    // @spec AUTH-UI-001
    it("recognizes returning user by normalized email", async () => {
      const caller = createAnonymousCaller(db);

      const code1 = await requestAndReadCode("Test@Example.COM");
      const first = await caller.auth.verifyOtp({
        email: "Test@Example.COM",
        code: code1,
        displayName: "Test User",
      });

      const code2 = await requestAndReadCode("test@example.com");
      const second = await caller.auth.verifyOtp({
        email: "test@example.com",
        code: code2,
        displayName: "Test User Updated",
      });

      expect(second.user.id).toBe(first.user.id);
      expect(second.user.displayName).toBe("Test User Updated");
    });

    // @spec AUTH-UI-001
    it("requires valid email format", async () => {
      const caller = createAnonymousCaller(db);

      await expect(
        caller.auth.verifyOtp({
          email: "invalid-email",
          code: "000000",
          displayName: "User",
        })
      ).rejects.toThrow();
    });

    // @spec AUTH-UI-001
    it("requires non-empty display name", async () => {
      const caller = createAnonymousCaller(db);

      await expect(
        caller.auth.verifyOtp({
          email: "user@example.com",
          code: "000000",
          displayName: "",
        })
      ).rejects.toThrow();
    });

    // @spec AUTH-UI-001
    it("enforces max 100 chars on display name", async () => {
      const caller = createAnonymousCaller(db);

      await expect(
        caller.auth.verifyOtp({
          email: "user@example.com",
          code: "000000",
          displayName: "A".repeat(101),
        })
      ).rejects.toThrow();
    });
  });

  describe("Smart detection — auth.me after entry", () => {
    // @spec AUTH-UI-004
    it("returns 0 clubs for brand-new user (falls through to Step 2)", async () => {
      const { caller } = await enterAsNewUser("brandnew@example.com", "Brand New");
      const me = await caller.auth.me();

      expect(me.clubs).toHaveLength(0);
    });

    // @spec AUTH-UI-004
    it("returns N clubs for returning user with memberships (smart detection redirects)", async () => {
      await seedClubWithMembers(db, wedReads, alice, [], []);

      const { caller } = await enterAsNewUser(alice.email, alice.displayName);
      const me = await caller.auth.me();

      expect(me.clubs.length).toBeGreaterThan(0);
      expect(me.clubs[0]).toMatchObject({ code: "WEDREADS" });
    });

    // @spec AUTH-UI-004
    it("returns multiple clubs for user with several memberships", async () => {
      await seedClubWithMembers(db, wedReads, alice, [], []);
      // Alice creates a second club via the API
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      await aliceCaller.clubs.create({ name: "Alice's Other Club", code: "ALICE2" });

      const me = await aliceCaller.auth.me();
      expect(me.clubs.length).toBe(2);
      const codes = me.clubs.map((c) => c.code).sort();
      expect(codes).toEqual(["ALICE2", "WEDREADS"]);
    });
  });

  describe("Step 3a: Join Branch (clubs.lookup + clubs.join)", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    });

    describe("clubs.lookup — debounced code validation", () => {
      // @spec CLUB-UI-001
      it("returns club name and member count for valid code", async () => {
        const caller = createAnonymousCaller(db);
        const result = await caller.clubs.lookup({ code: "WEDREADS" });

        expect(result.clubName).toBe("Wednesday Night Reads");
        expect(result.memberCount).toBe(3);
      });

      // @spec CLUB-UI-001
      it("works with lowercase code input", async () => {
        const caller = createAnonymousCaller(db);
        const result = await caller.clubs.lookup({ code: "wedreads" });

        expect(result.clubName).toBe("Wednesday Night Reads");
      });

      // @spec CLUB-UI-001
      it("throws NOT_FOUND for invalid code", async () => {
        const caller = createAnonymousCaller(db);

        await expect(
          caller.clubs.lookup({ code: "NONEXISTENT" })
        ).rejects.toThrow("Club not found");
      });

      // @spec CLUB-UI-001
      it("throws NOT_FOUND for archived club", async () => {
        await db.club.update({
          where: { id: wedReads.id },
          data: { status: "archived" },
        });

        const caller = createAnonymousCaller(db);

        await expect(
          caller.clubs.lookup({ code: "WEDREADS" })
        ).rejects.toThrow("Club not found");
      });
    });

    describe("Join requires an authenticated caller", () => {
      // Auth v2 removed the unauthenticated-join-creates-user path entirely.
      // Identity (email OTP → session) is always established first; join then
      // takes only { code }. The old "anonymous join with email/displayName"
      // tests are dropped because that behavior no longer exists.
      // @spec CLUB-API-004
      it("rejects join from an anonymous caller (UNAUTHORIZED)", async () => {
        const caller = createAnonymousCaller(db);

        await expect(
          caller.clubs.join({ code: "WEDREADS" })
        ).rejects.toThrow("UNAUTHORIZED");

        // No membership leaked for a phantom user.
        const count = await db.membership.count({ where: { clubId: wedReads.id } });
        expect(count).toBe(3);
      });
    });

    describe("Complete join journey: authenticated (Step 1 already done)", () => {
      // @spec CLUB-API-003, CLUB-BE-001
      it("allows authenticated user to join club", async () => {
        const caller = await createAuthenticatedCaller(db, dave);

        const result = await caller.clubs.join({ code: "WEDREADS" });

        expect(result.club.id).toBe(wedReads.id);
        expect(result.alreadyMember).toBe(false);
        expect(result.sessionId).toBeNull();

        // Verify membership created
        const membership = await db.membership.findUnique({
          where: {
            clubId_userId: { clubId: wedReads.id, userId: dave.id },
          },
        });
        expect(membership?.role).toBe("member");
      });

      // @spec CLUB-API-005
      it("returns alreadyMember=true if user already in club", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        const result = await caller.clubs.join({ code: "WEDREADS" });

        expect(result.alreadyMember).toBe(true);
      });
    });

    describe("Join branch error cases", () => {
      // @spec CLUB-API-003, CLUB-BE-001
      it("rejects join if club is archived", async () => {
        await db.club.update({
          where: { id: wedReads.id },
          data: { status: "archived" },
        });

        const caller = await createAuthenticatedCaller(db, dave);

        await expect(
          caller.clubs.join({ code: "WEDREADS" })
        ).rejects.toThrow("no longer active");
      });

      // @spec CLUB-API-003
      it("rejects join with an unknown code", async () => {
        const caller = await createAuthenticatedCaller(db, dave);

        await expect(
          caller.clubs.join({ code: "NONEXISTENT" })
        ).rejects.toThrow("Club not found");
      });
    });
  });

  describe("Step 3b: Create Branch (clubs.create)", () => {
    describe("Complete create journey: authenticated user", () => {
      // @spec CLUB-UI-002
      it("creates club with custom code", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        const result = await caller.clubs.create({
          name: "My New Club",
          code: "MYNEW",
        });

        expect(result.club.name).toBe("My New Club");
        expect(result.club.code).toBe("MYNEW");

        // Verify membership: creator is owner
        const membership = await db.membership.findUnique({
          where: {
            clubId_userId: { clubId: result.club.id, userId: alice.id },
          },
        });
        expect(membership?.role).toBe("owner");
      });

      // @spec CLUB-UI-002
      it("derives code from club name when needed", async () => {
        const caller = await createAuthenticatedCaller(db, bob);

        // Simulate pre-derived code from frontend
        const clubName = "Slow Reads";
        const derivedCode = clubName
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "")
          .slice(0, 10) || "CLUB";

        const result = await caller.clubs.create({
          name: clubName,
          code: derivedCode, // "SLOWREADS"
        });

        expect(result.club.code).toBe("SLOWREADS");
      });

      // @spec CLUB-UI-002
      it("normalizes code to uppercase", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        const result = await caller.clubs.create({
          name: "Test Club",
          code: "testclub",
        });

        expect(result.club.code).toBe("TESTCLUB");
      });

      // @spec CLUB-UI-002
      it("stores club description (cadence field)", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        const result = await caller.clubs.create({
          name: "Monthly Readers",
          code: "MONTHLY",
          description: "Voting cadence: monthly",
        });

        expect(result.club.description).toBe("Voting cadence: monthly");
      });
    });

    describe("Create branch error cases", () => {
      // @spec CLUB-UI-002
      it("rejects duplicate code", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        await caller.clubs.create({
          name: "First Club",
          code: "DUPECD",
        });

        await expect(
          caller.clubs.create({
            name: "Second Club",
            code: "DUPECD",
          })
        ).rejects.toThrow("Club code already in use");
      });

      // @spec CLUB-UI-002
      it("blocks reuse of soft-deleted club code (DB unique constraint)", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        const first = await caller.clubs.create({
          name: "Deleted Club",
          code: "DELCODE",
        });
        await caller.clubs.delete({ clubId: first.club.id });

        // DB unique constraint blocks reuse even after soft-delete
        await expect(
          caller.clubs.create({ name: "New Club", code: "DELCODE" })
        ).rejects.toThrow();
      });

      // @spec CLUB-UI-002
      it("validates code format (4-16 chars, alphanumeric)", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        // Too short
        await expect(
          caller.clubs.create({
            name: "Club",
            code: "ABC", // 3 chars
          })
        ).rejects.toThrow();

        // Too long
        await expect(
          caller.clubs.create({
            name: "Club",
            code: "A".repeat(17), // 17 chars
          })
        ).rejects.toThrow();

        // Invalid characters
        await expect(
          caller.clubs.create({
            name: "Club",
            code: "MY-CLUB", // hyphen not allowed
          })
        ).rejects.toThrow();
      });

      // @spec CLUB-UI-002
      it("requires non-empty club name", async () => {
        const caller = await createAuthenticatedCaller(db, alice);

        await expect(
          caller.clubs.create({
            name: "",
            code: "VALID",
          })
        ).rejects.toThrow();
      });

      // @spec CLUB-UI-002, AUTH-UI-003
      it("requires auth (protectedProcedure)", async () => {
        const caller = createAnonymousCaller(db);

        await expect(
          caller.clubs.create({
            name: "My Club",
            code: "MYCLUB",
          })
        ).rejects.toThrow("UNAUTHORIZED");
      });
    });
  });

  describe("Step 4: Success states (post-flow)", () => {
    // @spec CLUB-API-003, CLUB-BE-001
    it("join branch success: user redirects to club with membership", async () => {
      await seedClubWithMembers(db, wedReads, alice, [], []);

      // Step 1: establish identity/session for a brand-new member.
      const { caller, user } = await enterAsNewUser("newmember@example.com", "New Member");

      // Step 3a: authenticated join.
      const joinResult = await caller.clubs.join({ code: "WEDREADS" });
      expect(joinResult.alreadyMember).toBe(false);

      const meResult = await caller.auth.me();
      expect(meResult.clubs).toContainEqual(
        expect.objectContaining({
          name: wedReads.name,
          code: "WEDREADS",
        })
      );

      const membership = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: user.id } },
      });
      expect(membership?.role).toBe("member");
    });

    // @spec CLUB-UI-002, CLUB-UI-003
    it("create branch success: user has owner role in new club", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const createResult = await caller.clubs.create({
        name: "Brand New Club",
        code: "BRNEW",
      });

      // Verify owner role
      const meResult = await caller.auth.me();
      const newClub = meResult.clubs.find(
        (c) => c.id === createResult.club.id
      );
      expect(newClub?.role).toBe("owner");
    });
  });

  describe("Debounced lookup during code entry", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [], []);
    });

    // @spec CLUB-UI-001
    it("shows real-time feedback while typing code", async () => {
      const caller = createAnonymousCaller(db);

      // Simulate user typing "W"
      await expect(
        caller.clubs.lookup({ code: "W" })
      ).rejects.toThrow();

      // Typing "WED"
      await expect(
        caller.clubs.lookup({ code: "WED" })
      ).rejects.toThrow();

      // Complete "WEDREADS"
      const result = await caller.clubs.lookup({ code: "WEDREADS" });
      expect(result.clubName).toBe("Wednesday Night Reads");
    });

    // @spec CLUB-UI-001
    it("handles case insensitivity in lookup", async () => {
      const caller = createAnonymousCaller(db);

      const lowercase = await caller.clubs.lookup({ code: "wedreads" });
      const uppercase = await caller.clubs.lookup({ code: "WEDREADS" });
      const mixed = await caller.clubs.lookup({ code: "WeDrEaDs" });

      expect(lowercase.clubName).toBe(uppercase.clubName);
      expect(uppercase.clubName).toBe(mixed.clubName);
    });
  });

  describe("Code derivation algorithm validation", () => {
    // @spec CLUB-UI-002
    it("handles special characters in club name", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // "The Book Club!" → strip special → "THEBOOKCLUB" → slice(0,10) → "THEBOOKCLU"
      const clubName = "The Book Club!";
      const derivedCode = clubName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 10) || "CLUB";

      const result = await caller.clubs.create({
        name: clubName,
        code: derivedCode,
      });

      expect(result.club.code).toBe("THEBOOKCLU");
    });

    // @spec CLUB-UI-002
    it("applies 10-char max truncation", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // "Oakwood Library Society" → "OAKWOODLIBRARYSOCIETY" → slice(0,10) → "OAKWOODLIB"
      const clubName = "Oakwood Library Society";
      const derivedCode = clubName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 10) || "CLUB";

      const result = await caller.clubs.create({
        name: clubName,
        code: derivedCode,
      });

      expect(result.club.code).toBe("OAKWOODLIB");
      expect(result.club.code.length).toBeLessThanOrEqual(10);
    });

    // @spec CLUB-UI-002
    it("uses CLUB fallback for empty derived code", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // "!!!" with special chars removed becomes empty, fallback to CLUB
      const clubName = "!!!";
      const derivedCode = clubName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 10) || "CLUB";

      const result = await caller.clubs.create({
        name: clubName,
        code: derivedCode,
      });

      expect(result.club.code).toBe("CLUB");
    });
  });

  describe("Session persistence across steps", () => {
    // @spec AUTH-UI-003, CLUB-API-003
    it("session created in Step 1 is usable in Step 3", async () => {
      await seedClubWithMembers(db, wedReads, alice, [], []);

      // Step 1: OTP entry creates user + session.
      const { caller } = await enterAsNewUser("continuinguser@example.com", "Continuing User");

      // Step 2: No API call (path choice)

      // Step 3a: Use the session from Step 1 to join.
      const step3 = await caller.clubs.join({ code: "WEDREADS" });

      expect(step3.alreadyMember).toBe(false);
      expect(step3.club.id).toBe(wedReads.id);
    });
  });
});
