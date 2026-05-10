// @spec CLUB-API-001 through CLUB-API-009, CLUB-BE-001 through CLUB-BE-006, CLUB-DATA-001 through CLUB-DATA-003
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller, createAnonymousCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, insertUser, insertAllUsers } from "@tests/fixtures/users";
import { wedReads, sciFiExplorers } from "@tests/fixtures/clubs";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("clubs", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
  });

  describe("clubs.create", () => {
    it("creates club and assigns owner membership", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.clubs.create({
        name: "My Club",
        code: "MYCLUB",
      });

      expect(result.club.name).toBe("My Club");
      expect(result.club.code).toBe("MYCLUB");

      const membership = await db.membership.findUnique({
        where: { clubId_userId: { clubId: result.club.id, userId: alice.id } },
      });
      expect(membership?.role).toBe("owner");
    });

    it("throws CONFLICT for duplicate active code", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.clubs.create({ name: "Club A", code: "DUPECD" });

      await expect(
        caller.clubs.create({ name: "Club B", code: "DUPECD" })
      ).rejects.toThrow("Club code already in use");
    });

    it("normalizes code to uppercase", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.clubs.create({
        name: "My Club",
        code: "myclub",
      });
      expect(result.club.code).toBe("MYCLUB");
    });

    // @spec AUTH-UI-STEP3B-CADENCE-DATA-001, JOIN-UI-CREATE-CADENCE-001
    it("defaults votingCadence to 'monthly' when not provided", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.clubs.create({
        name: "Default Cadence Club",
        code: "DEFCAD",
      });
      const club = await db.club.findUniqueOrThrow({ where: { id: result.club.id } });
      expect(club.votingCadence).toBe("monthly");
    });

    // @spec AUTH-UI-STEP3B-CADENCE-DATA-001, JOIN-UI-CREATE-CADENCE-001
    it("persists provided cadence to typed votingCadence field (not description)", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.clubs.create({
        name: "Six Weeks Club",
        code: "SIXWK",
        cadence: "six_weeks",
      });
      const club = await db.club.findUniqueOrThrow({ where: { id: result.club.id } });
      expect(club.votingCadence).toBe("six_weeks");
      // Description must NOT be mis-used as a cadence carrier any more.
      expect(club.description ?? "").not.toMatch(/voting cadence/i);
    });

    // @spec AUTH-UI-STEP3B-CADENCE-DATA-001
    it("rejects an unknown cadence value", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await expect(
        caller.clubs.create({
          name: "Bad Cadence",
          code: "BADCAD",
          // @ts-expect-error — testing runtime validation rejection
          cadence: "weekly",
        })
      ).rejects.toThrow();
    });
  });

  describe("clubs.join", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [], []);
    });

    it("creates member membership for valid code", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      const result = await caller.clubs.join({ code: "WEDREADS" });

      expect(result.club.name).toBe(wedReads.name);
      expect(result.alreadyMember).toBe(false);
    });

    it("returns existing club for already-member (idempotent)", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const result = await caller.clubs.join({ code: "WEDREADS" });

      expect(result.alreadyMember).toBe(true);
    });

    it("throws NOT_FOUND for invalid code", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      await expect(
        caller.clubs.join({ code: "NONEXIST" })
      ).rejects.toThrow("Club not found");
    });

    it("creates user+session for unauthenticated join", async () => {
      const caller = createAnonymousCaller(db);
      const result = await caller.clubs.join({
        code: "WEDREADS",
        email: "newperson@example.com",
        displayName: "New Person",
      });

      expect(result.club.name).toBe(wedReads.name);
      expect(result.sessionId).toBeTruthy();

      const user = await db.user.findUnique({
        where: { email: "newperson@example.com" },
      });
      expect(user).toBeTruthy();
    });

    it("throws FORBIDDEN for archived club", async () => {
      await db.club.update({
        where: { id: wedReads.id },
        data: { status: "archived" },
      });

      const caller = await createAuthenticatedCaller(db, bob);
      await expect(
        caller.clubs.join({ code: "WEDREADS" })
      ).rejects.toThrow("no longer active");
    });
  });

  describe("clubs.lookup", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    });

    it("returns name and member count", async () => {
      const caller = createAnonymousCaller(db);
      const result = await caller.clubs.lookup({ code: "WEDREADS" });

      expect(result.clubName).toBe(wedReads.name);
      expect(result.memberCount).toBe(3);
    });

    it("throws NOT_FOUND for invalid code", async () => {
      const caller = createAnonymousCaller(db);
      await expect(
        caller.clubs.lookup({ code: "NOPE" })
      ).rejects.toThrow("Club not found");
    });
  });

  describe("clubs.get (authorization)", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [], [bob]);
    });

    it("allows member access", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      const result = await caller.clubs.get({ clubId: wedReads.id });
      expect(result.club.name).toBe(wedReads.name);
    });

    it("throws FORBIDDEN for non-member", async () => {
      const caller = await createAuthenticatedCaller(db, carol);
      await expect(
        caller.clubs.get({ clubId: wedReads.id })
      ).rejects.toThrow("Not a club member");
    });
  });

  describe("clubs.update", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    });

    it("admin can update", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      const result = await caller.clubs.update({
        clubId: wedReads.id,
        name: "New Name",
      });
      expect(result.club.name).toBe("New Name");
    });

    it("member cannot update", async () => {
      const caller = await createAuthenticatedCaller(db, carol);
      await expect(
        caller.clubs.update({ clubId: wedReads.id, name: "Nope" })
      ).rejects.toThrow("Admin or owner role required");
    });
  });

  describe("clubs.delete", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [bob], []);
    });

    it("owner can soft-delete", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.clubs.delete({ clubId: wedReads.id });

      const club = await db.club.findUnique({ where: { id: wedReads.id } });
      expect(club?.status).toBe("deleted");
      expect(club?.deletedAt).toBeTruthy();
    });

    it("admin cannot delete", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      await expect(
        caller.clubs.delete({ clubId: wedReads.id })
      ).rejects.toThrow("Only the owner can delete");
    });
  });

  describe("clubs.members.updateRole", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [], [bob]);
    });

    it("owner can promote member to admin", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.clubs.members.updateRole({
        clubId: wedReads.id,
        userId: bob.id,
        role: "admin",
      });

      const membership = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: bob.id } },
      });
      expect(membership?.role).toBe("admin");
    });

    it("non-owner cannot change roles", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      await expect(
        caller.clubs.members.updateRole({
          clubId: wedReads.id,
          userId: bob.id,
          role: "admin",
        })
      ).rejects.toThrow("Only the owner can change roles");
    });
  });

  // @spec CLUB-API-OWNERSHIP-001, CLUB-DATA-003
  describe("clubs.members.transferOwnership", () => {
    beforeEach(async () => {
      // alice=owner, bob=admin, carol=member
      await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    });

    it("atomically demotes owner and promotes admin", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.clubs.members.transferOwnership({
        clubId: wedReads.id,
        newOwnerUserId: bob.id,
      });

      const aliceM = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: alice.id } },
      });
      const bobM = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: bob.id } },
      });
      expect(aliceM?.role).toBe("admin");
      expect(bobM?.role).toBe("owner");

      // Exactly one owner.
      const owners = await db.membership.findMany({
        where: { clubId: wedReads.id, role: "owner" },
      });
      expect(owners).toHaveLength(1);
    });

    it("rejects transfer to a non-admin (member target)", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await expect(
        caller.clubs.members.transferOwnership({
          clubId: wedReads.id,
          newOwnerUserId: carol.id,
        })
      ).rejects.toThrow("must already be an admin");
    });

    it("rejects transfer to self", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await expect(
        caller.clubs.members.transferOwnership({
          clubId: wedReads.id,
          newOwnerUserId: alice.id,
        })
      ).rejects.toThrow("Cannot transfer ownership to yourself");
    });

    it("rejects transfer by a non-owner caller", async () => {
      // bob is admin, attempts to transfer to carol (member)
      const caller = await createAuthenticatedCaller(db, bob);
      await expect(
        caller.clubs.members.transferOwnership({
          clubId: wedReads.id,
          newOwnerUserId: carol.id,
        })
      ).rejects.toThrow("Only the owner can transfer ownership");
    });
  });

  // @spec CLUB-BE-LEAVE-001, CLUB-BE-003
  describe("clubs.leave", () => {
    beforeEach(async () => {
      await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    });

    it("non-owner can leave", async () => {
      const caller = await createAuthenticatedCaller(db, carol);
      await caller.clubs.leave({ clubId: wedReads.id });

      const m = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: carol.id } },
      });
      expect(m).toBeNull();
    });

    it("admin can leave", async () => {
      const caller = await createAuthenticatedCaller(db, bob);
      await caller.clubs.leave({ clubId: wedReads.id });

      const m = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: bob.id } },
      });
      expect(m).toBeNull();
    });

    it("owner is blocked from leaving without transferring", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await expect(
        caller.clubs.leave({ clubId: wedReads.id })
      ).rejects.toThrow("Transfer ownership before leaving");

      const m = await db.membership.findUnique({
        where: { clubId_userId: { clubId: wedReads.id, userId: alice.id } },
      });
      expect(m?.role).toBe("owner");
    });

    it("non-member cannot leave (NOT_FOUND)", async () => {
      // Remove carol first
      await db.membership.delete({
        where: { clubId_userId: { clubId: wedReads.id, userId: carol.id } },
      });
      const caller = await createAuthenticatedCaller(db, carol);
      await expect(
        caller.clubs.leave({ clubId: wedReads.id })
      ).rejects.toThrow("not a member");
    });
  });
});
