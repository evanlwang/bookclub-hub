// @spec PROG-API-001 through PROG-API-004, PROG-DATA-001, PROG-BE-001 through PROG-BE-006, PROG-BE-006-AUTOFINISH
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("progress", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    await seedClubWithMembers(db, wedReads, alice, [], [bob, carol]);
  });

  describe("progress.update (upsert)", () => {
    it("creates record if missing", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        currentPage: 100,
        status: "reading",
      });

      expect(progress.currentPage).toBe(100);
      expect(progress.percentage).toBe(24); // round(100/412*100)
      expect(progress.status).toBe("reading");
    });

    it("updates existing record", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        currentPage: 100,
        status: "reading",
      });

      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        currentPage: 200,
      });

      expect(progress.currentPage).toBe(200);
      expect(progress.percentage).toBe(49); // round(200/412*100)
    });

    it("computes percentage from page", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        currentPage: 187,
      });

      expect(progress.percentage).toBe(45); // round(187/412*100)
    });

    it("computes page from percentage", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        percentage: 50,
      });

      expect(progress.currentPage).toBe(206); // round(0.5*412)
    });

    it("sets 100% and totalPages when finished", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        status: "finished",
      });

      expect(progress.percentage).toBe(100);
      expect(progress.currentPage).toBe(412);
    });

    // @spec PROG-BE-006-AUTOFINISH
    it("auto-promotes status to 'finished' when currentPage reaches totalPages", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        currentPage: 412, // == Dune's totalPages
        status: "reading",
      });

      expect(progress.status).toBe("finished");
      expect(progress.percentage).toBe(100);
      expect(progress.currentPage).toBe(412);
    });

    it("tracks currentChapter separately", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { progress } = await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        currentPage: 100,
        currentChapter: 5,
      });

      expect(progress.currentChapter).toBe(5);
    });
  });

  describe("progress.list", () => {
    it("returns all members' progress", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      await aliceCaller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        percentage: 61,
      });
      await bobCaller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        percentage: 33,
      });

      const list = await aliceCaller.progress.list({
        clubId: wedReads.id,
        bookId: dune.id,
      });

      expect(list).toHaveLength(2);
      // Sorted by percentage desc
      expect(list[0].percentage).toBeGreaterThanOrEqual(list[1].percentage);
    });
  });

  describe("progress.me", () => {
    it("returns own progress", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      await caller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        percentage: 61,
      });

      const me = await caller.progress.me({
        clubId: wedReads.id,
        bookId: dune.id,
      });

      expect(me?.percentage).toBe(61);
    });

    it("returns null when no progress exists", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const me = await caller.progress.me({
        clubId: wedReads.id,
        bookId: dune.id,
      });

      expect(me).toBeNull();
    });
  });

  describe("progress.summary", () => {
    it("returns aggregate stats", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);
      const carolCaller = await createAuthenticatedCaller(db, carol);

      await aliceCaller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        percentage: 60,
        currentChapter: 12,
        status: "reading",
      });
      await bobCaller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        status: "finished",
      });
      await carolCaller.progress.update({
        clubId: wedReads.id,
        bookId: dune.id,
        percentage: 0,
        status: "not_started",
      });

      const summary = await aliceCaller.progress.summary({
        clubId: wedReads.id,
        bookId: dune.id,
      });

      expect(summary.finishedCount).toBe(1);
      expect(summary.readingCount).toBe(1);
      expect(summary.notStartedCount).toBe(1);
      expect(summary.medianPct).toBe(60); // sorted: [0, 60, 100], median is 60
      expect(summary.chapterDistribution[12]).toBe(1);
    });
  });
});
