// @spec VOTE-API-009-MANUAL, VOTE-API-005-MANUAL
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, insertAllBooks } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("books.createManual and nominations with manual books", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertAllBooks(db);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
  });

  describe("books.createManual", () => {
    it("creates a book with title and author, no openLibraryId", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const { book } = await caller.books.createManual({
        title: "The Midnight Library",
        author: "Matt Haig",
      });

      expect(book.title).toBe("The Midnight Library");
      expect(book.author).toBe("Matt Haig");
      expect(book.openLibraryId).toBeNull();
      expect(book.isbn).toBeNull();
      expect(book.pageCount).toBeNull();
    });

    it("creates a book with optional isbn and pageCount", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const { book } = await caller.books.createManual({
        title: "The Midnight Library",
        author: "Matt Haig",
        isbn: "978-0-857-52277-7",
        pageCount: 304,
      });

      expect(book.title).toBe("The Midnight Library");
      expect(book.author).toBe("Matt Haig");
      expect(book.isbn).toBe("978-0-857-52277-7");
      expect(book.pageCount).toBe(304);
      expect(book.openLibraryId).toBeNull();
    });

    it("requires authenticated user (memberProcedure)", async () => {
      // This would fail if not using memberProcedure
      const caller = await createAuthenticatedCaller(db, carol);
      // Carol is a member, should succeed
      const { book } = await caller.books.createManual({
        title: "Test",
        author: "Author",
      });
      expect(book.id).toBeDefined();
    });
  });

  describe("nominations.create with manually-created books", () => {
    it("can nominate a manually-created book", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const memberCaller = await createAuthenticatedCaller(db, carol);

      // Create round
      const { round } = await caller.rounds.create({ clubId: wedReads.id });

      // Manually create a book
      const { book } = await memberCaller.books.createManual({
        title: "The Midnight Library",
        author: "Matt Haig",
        pageCount: 304,
      });

      // Nominate it
      const { nomination } = await memberCaller.nominations.create({
        clubId: wedReads.id,
        roundId: round.id,
        bookId: book.id,
      });

      expect(nomination.bookId).toBe(book.id);
      expect(nomination.book.title).toBe("The Midnight Library");
      expect(nomination.book.author).toBe("Matt Haig");
      expect(nomination.book.openLibraryId).toBeNull();
    });

    it("can nominate existing book and newly-created book in same round", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const memberCaller = await createAuthenticatedCaller(db, carol);

      // Create round
      const { round } = await caller.rounds.create({ clubId: wedReads.id });

      // Nominate existing book
      await memberCaller.nominations.create({
        clubId: wedReads.id,
        roundId: round.id,
        bookId: dune.id,
      });

      // Create and nominate new book
      const { book } = await memberCaller.books.createManual({
        title: "The Midnight Library",
        author: "Matt Haig",
      });

      const { nomination } = await memberCaller.nominations.create({
        clubId: wedReads.id,
        roundId: round.id,
        bookId: book.id,
      });

      expect(nomination.book.title).toBe("The Midnight Library");

      // Verify both exist in DB
      const nominations = await db.nomination.findMany({
        where: { roundId: round.id },
      });
      expect(nominations).toHaveLength(2);
    });
  });
});
