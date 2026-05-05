// @spec CLUB-API-009, CLUB-BE-002
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller, createAnonymousCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads, sciFiExplorers } from "@tests/fixtures/clubs";
import { dune, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("security", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    // Alice owns club 1, Carol is member of club 1 only
    await seedClubWithMembers(db, wedReads, alice, [], [carol]);
    // Bob owns club 2, Dave is member of club 2 only
    await seedClubWithMembers(db, sciFiExplorers, bob, [], [dave]);
  });

  describe("cross-club isolation", () => {
    it("member of club 1 cannot access club 2 data", async () => {
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await expect(
        carolCaller.clubs.get({ clubId: sciFiExplorers.id })
      ).rejects.toThrow("Not a club member");
    });

    it("member of club 1 cannot list club 2 threads", async () => {
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await expect(
        carolCaller.threads.list({
          clubId: sciFiExplorers.id,
          bookId: dune.id,
        })
      ).rejects.toThrow("Not a club member");
    });

    it("member of club 1 cannot update progress in club 2", async () => {
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await expect(
        carolCaller.progress.update({
          clubId: sciFiExplorers.id,
          bookId: dune.id,
          percentage: 50,
        })
      ).rejects.toThrow("Not a club member");
    });

    it("member of club 1 cannot create meeting in club 2", async () => {
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await expect(
        carolCaller.meetings.create({
          clubId: sciFiExplorers.id,
          slots: [
            { time: new Date("2026-05-18T19:00:00Z") },
            { time: new Date("2026-05-20T20:00:00Z") },
          ],
        })
      ).rejects.toThrow("Admin or owner role required");
    });
  });

  describe("session validation", () => {
    it("anonymous caller gets UNAUTHORIZED on protected routes", async () => {
      const caller = createAnonymousCaller(db);

      await expect(caller.auth.me()).rejects.toThrow("UNAUTHORIZED");
      await expect(caller.clubs.list()).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("role-based access", () => {
    it("member cannot create voting round", async () => {
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await expect(
        carolCaller.rounds.create({ clubId: wedReads.id })
      ).rejects.toThrow("Admin or owner role required");
    });

    it("member cannot delete club", async () => {
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await expect(
        carolCaller.clubs.delete({ clubId: wedReads.id })
      ).rejects.toThrow("Only the owner can delete");
    });
  });
});
