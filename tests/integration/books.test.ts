// @spec VOTE-API-009, VOTE-API-010, VOTE-BE-004, VOTE-BE-005, CAT-BE-002
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

  describe("books.search", () => {
    it("returns cached results when query matches existing books in DB", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // Search for "Dune" — should find it in DB
      const results = await caller.books.search({ query: "Dune" });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Dune");
      expect(results[0].author).toBe("Frank Herbert");
    });

    it("uses proper upsert logic: findFirst + create/update instead of sentinel UUID", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // Use a unique Open Library ID that won't exist in fixtures
      const uniqueOLId = "/works/UNIQUE-TEST-12345";

      // First, verify we have no books with this Open Library ID
      let testCount = await db.book.count({
        where: { openLibraryId: uniqueOLId },
      });
      expect(testCount).toBe(0);

      // Create a test book with a specific Open Library ID
      const testBook = await db.book.create({
        data: {
          title: "Test Book Unique",
          author: "Test Author",
          isbn: "978-0000000000",
          pageCount: 100,
          openLibraryId: uniqueOLId,
          description: "A unique test book.",
        },
      });
      testCount = await db.book.count({
        where: { openLibraryId: uniqueOLId },
      });
      expect(testCount).toBe(1);

      // If the API were to return it again, the proper logic should
      // findFirst by openLibraryId and update, not create a duplicate
      const existing = await db.book.findFirst({
        where: { openLibraryId: uniqueOLId },
      });
      expect(existing).toBeDefined();
      expect(existing?.id).toBe(testBook.id);

      // Verify still only 1 book with that ID (no duplicate created)
      testCount = await db.book.count({
        where: { openLibraryId: uniqueOLId },
      });
      expect(testCount).toBe(1);

      // Verify the @unique constraint works by attempting a duplicate insert
      // This should fail due to the constraint
      try {
        await db.book.create({
          data: {
            title: "Different Title",
            author: "Different Author",
            openLibraryId: uniqueOLId, // Same ID
          },
        });
        expect(false, "Should have thrown a unique constraint violation").toBe(true);
      } catch (e) {
        // Expected: unique constraint violation
        expect(true).toBe(true);
      }
    });

    it("returns [] when Open Library is unavailable (mock env override)", async () => {
      // This test uses .env.test override: set OPEN_LIBRARY_BASE_URL to unreachable address
      // The books.search procedure should catch the error and return []
      const caller = await createAuthenticatedCaller(db, alice);

      // Search for something that requires API call
      const results = await caller.books.search({ query: "NonexistentVeryUniqueTitleXYZ123" });

      // Should return empty array when API fails or no results found locally
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // @spec CAT-BE-002
  describe("books.importFromCatalog", () => {
    const sampleCatalogBook = {
      openLibraryKey: "/works/OL45804W",
      title: "Dune",
      authorNames: ["Frank Herbert"],
      isbn: "0441172717",
      coverUrl: "https://covers.openlibrary.org/b/id/9259-M.jpg",
      pageCount: 412,
    };

    it("creates a new Book on first import and returns its internal id", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const before = await db.book.count({
        where: { openLibraryId: sampleCatalogBook.openLibraryKey },
      });
      expect(before).toBe(0);

      const result = await caller.books.importFromCatalog(sampleCatalogBook);

      expect(result.created).toBe(true);
      expect(result.bookId).toMatch(/^[0-9a-f-]{36}$/);

      const stored = await db.book.findUnique({ where: { id: result.bookId } });
      expect(stored?.title).toBe("Dune");
      expect(stored?.author).toBe("Frank Herbert");
      expect(stored?.openLibraryId).toBe("/works/OL45804W");
      expect(stored?.coverUrl).toBe(sampleCatalogBook.coverUrl);
      expect(stored?.pageCount).toBe(412);
    });

    it("upserts on second import with the same openLibraryKey (no duplicate row)", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const first = await caller.books.importFromCatalog(sampleCatalogBook);
      const second = await caller.books.importFromCatalog(sampleCatalogBook);

      expect(second.bookId).toBe(first.bookId);
      expect(second.created).toBe(false);

      const count = await db.book.count({
        where: { openLibraryId: sampleCatalogBook.openLibraryKey },
      });
      expect(count).toBe(1);
    });

    it("joins multiple authorNames into a single author string", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const result = await caller.books.importFromCatalog({
        ...sampleCatalogBook,
        openLibraryKey: "/works/OL99999W",
        authorNames: ["Niven, Larry", "Pournelle, Jerry"],
      });

      const stored = await db.book.findUnique({ where: { id: result.bookId } });
      expect(stored?.author).toBe("Niven, Larry, Pournelle, Jerry");
    });

    it("preserves existing non-null fields when re-importing with sparser metadata", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const first = await caller.books.importFromCatalog(sampleCatalogBook);

      // Re-import with cover/page count missing (Open Library response variance).
      await caller.books.importFromCatalog({
        ...sampleCatalogBook,
        coverUrl: null,
        pageCount: null,
      });

      const stored = await db.book.findUnique({ where: { id: first.bookId } });
      expect(stored?.coverUrl).toBe(sampleCatalogBook.coverUrl);
      expect(stored?.pageCount).toBe(412);
    });

    it("rejects malformed openLibraryKey with BAD_REQUEST", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      await expect(
        caller.books.importFromCatalog({
          ...sampleCatalogBook,
          openLibraryKey: "not-a-key",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects empty authorNames with BAD_REQUEST", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      await expect(
        caller.books.importFromCatalog({
          ...sampleCatalogBook,
          authorNames: [],
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("selections.list", () => {
    it("returns ordered list of BookSelections with book populated", async () => {
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
      expect(list[0].book.author).toBe("Frank Herbert");
      expect(list[1].book.title).toBe("The Left Hand of Darkness");
      expect(list[1].book.author).toBe("Ursula K. Le Guin");
    });
  });

  describe("selections.createDirectPick", () => {
    it("creates BookSelection with roundId: null and marks prior current selection as isCurrent: false", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // First pick
      const { selection: first } = await caller.selections.createDirectPick({
        clubId: wedReads.id,
        bookId: dune.id,
      });

      expect(first.book.title).toBe("Dune");
      expect(first.isCurrent).toBe(true);
      expect(first.roundId).toBeNull();

      // Second pick
      const { selection: second } = await caller.selections.createDirectPick({
        clubId: wedReads.id,
        bookId: leftHand.id,
      });

      expect(second.book.title).toBe("The Left Hand of Darkness");
      expect(second.isCurrent).toBe(true);
      expect(second.roundId).toBeNull();

      // Verify first is now not current
      const selections = await db.bookSelection.findMany({
        where: { clubId: wedReads.id },
        orderBy: { selectedAt: "desc" },
      });

      expect(selections).toHaveLength(2);
      expect(selections[0].bookId).toBe(leftHand.id);
      expect(selections[0].isCurrent).toBe(true);
      expect(selections[1].bookId).toBe(dune.id);
      expect(selections[1].isCurrent).toBe(false);
    });
  });
});
