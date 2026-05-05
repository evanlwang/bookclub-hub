// @spec VOTE-API-009, VOTE-API-010, VOTE-BE-004, VOTE-BE-005
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, leftHand, insertBook, insertAllBooks } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("books and selections", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertAllBooks(db);
    await seedClubWithMembers(db, wedReads, alice, [bob], []);
  });

  describe("selections.list", () => {
    it("returns history ordered by selectedAt desc", async () => {
      await db.bookSelection.create({
        data: {
          clubId: wedReads.id,
          bookId: leftHand.id,
          isCurrent: false,
          selectedAt: new Date("2026-01-01"),
        },
      });
      await db.bookSelection.create({
        data: {
          clubId: wedReads.id,
          bookId: dune.id,
          isCurrent: true,
          selectedAt: new Date("2026-03-01"),
        },
      });

      const caller = await createAuthenticatedCaller(db, alice);
      const list = await caller.selections.list({ clubId: wedReads.id });

      expect(list).toHaveLength(2);
      expect(list[0].book.title).toBe("Dune"); // most recent first
      expect(list[1].book.title).toBe("The Left Hand of Darkness");
    });
  });

  describe("selections.createDirectPick", () => {
    it("admin can pick book directly without voting round", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const { selection } = await caller.selections.createDirectPick({
        clubId: wedReads.id,
        bookId: dune.id,
      });

      expect(selection.book.title).toBe("Dune");
      expect(selection.isCurrent).toBe(true);
      expect(selection.roundId).toBeNull();
    });

    it("marks previous selection as not current", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      await caller.selections.createDirectPick({
        clubId: wedReads.id,
        bookId: dune.id,
      });
      await caller.selections.createDirectPick({
        clubId: wedReads.id,
        bookId: leftHand.id,
      });

      const selections = await db.bookSelection.findMany({
        where: { clubId: wedReads.id },
        orderBy: { selectedAt: "desc" },
      });

      expect(selections[0].bookId).toBe(leftHand.id);
      expect(selections[0].isCurrent).toBe(true);
      expect(selections[1].bookId).toBe(dune.id);
      expect(selections[1].isCurrent).toBe(false);
    });
  });
});
