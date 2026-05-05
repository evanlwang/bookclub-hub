// @spec DISC-API-001 through DISC-API-007, DISC-DATA-001, DISC-DATA-002, DISC-BE-001 through DISC-BE-003
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";

const db = getTestDb();

describe("discussions", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
  });

  describe("threads", () => {
    it("creates thread with parsed chapter_tag", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { thread } = await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Water discipline",
        body: "The Fremen water discipline...",
        chapterTag: "Chapter 5",
      });

      expect(thread.chapterTag).toBe("Chapter 5");
      expect(thread.chapterNumber).toBe(5);
    });

    it("sets chapterNumber to null for unparseable tags", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { thread } = await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Epilogue thoughts",
        body: "What did you think?",
        chapterTag: "Epilogue",
      });

      expect(thread.chapterNumber).toBeNull();
    });

    it("filters threads by maxChapter", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      // Create threads at various chapters
      await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Ch 3 thread",
        body: "...",
        chapterTag: "Chapter 3",
      });
      await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Ch 10 thread",
        body: "...",
        chapterTag: "Chapter 10",
      });
      await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Untagged thread",
        body: "...",
      });

      const result = await caller.threads.list({
        clubId: wedReads.id,
        bookId: dune.id,
        maxChapter: 5,
      });

      // Should see Ch 3 and untagged, but not Ch 10
      expect(result.threads).toHaveLength(2);
      expect(result.hiddenCount).toBe(1);
    });

    it("untagged threads always shown", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "General discussion",
        body: "...",
      });

      const result = await caller.threads.list({
        clubId: wedReads.id,
        bookId: dune.id,
        maxChapter: 1,
      });

      expect(result.threads).toHaveLength(1);
    });

    it("author can update thread", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { thread } = await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Original",
        body: "...",
      });

      const updated = await caller.threads.update({
        clubId: wedReads.id,
        threadId: thread.id,
        title: "Updated Title",
      });

      expect(updated.thread.title).toBe("Updated Title");
    });

    it("non-author member cannot update", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const carolCaller = await createAuthenticatedCaller(db, carol);

      const { thread } = await aliceCaller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Alice's thread",
        body: "...",
      });

      await expect(
        carolCaller.threads.update({
          clubId: wedReads.id,
          threadId: thread.id,
          title: "Carol tries to edit",
        })
      ).rejects.toThrow("Only the author or an admin");
    });

    it("admin can delete any thread", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      const { thread } = await aliceCaller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "To be deleted",
        body: "...",
      });

      await bobCaller.threads.delete({
        clubId: wedReads.id,
        threadId: thread.id,
      });

      const found = await db.discussionThread.findUnique({
        where: { id: thread.id },
      });
      expect(found).toBeNull();
    });

    it("deleting thread cascades comments", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { thread } = await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Thread with comments",
        body: "...",
      });

      await caller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "A comment",
      });

      await caller.threads.delete({
        clubId: wedReads.id,
        threadId: thread.id,
      });

      const comments = await db.comment.count({
        where: { threadId: thread.id },
      });
      expect(comments).toBe(0);
    });
  });

  describe("comments", () => {
    it("creates nested comment", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      const { thread } = await aliceCaller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Thread",
        body: "...",
      });

      const { comment: parent } = await aliceCaller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Parent comment",
      });

      const { comment: reply } = await bobCaller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Reply to parent",
        parentCommentId: parent.id,
      });

      expect(reply.parentCommentId).toBe(parent.id);
    });

    it("rejects grandchild comment", async () => {
      const caller = await createAuthenticatedCaller(db, alice);

      const { thread } = await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Thread",
        body: "...",
      });

      const { comment: parent } = await caller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Parent",
      });

      const { comment: child } = await caller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Child",
        parentCommentId: parent.id,
      });

      await expect(
        caller.comments.create({
          clubId: wedReads.id,
          threadId: thread.id,
          body: "Grandchild — should fail",
          parentCommentId: child.id,
        })
      ).rejects.toThrow("Cannot reply to a reply");
    });

    it("author can update comment body", async () => {
      const caller = await createAuthenticatedCaller(db, alice);
      const { thread } = await caller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Thread",
        body: "...",
      });

      const { comment } = await caller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Original",
      });

      const updated = await caller.comments.update({
        clubId: wedReads.id,
        commentId: comment.id,
        body: "Edited",
      });

      expect(updated.comment.body).toBe("Edited");
    });

    it("non-author cannot update comment", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      const { thread } = await aliceCaller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Thread",
        body: "...",
      });

      const { comment } = await aliceCaller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Alice's comment",
      });

      await expect(
        bobCaller.comments.update({
          clubId: wedReads.id,
          commentId: comment.id,
          body: "Bob edits",
        })
      ).rejects.toThrow("Only the author can edit");
    });

    it("deleting comment with replies leaves [deleted] placeholder", async () => {
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      const { thread } = await aliceCaller.threads.create({
        clubId: wedReads.id,
        bookId: dune.id,
        title: "Thread",
        body: "...",
      });

      const { comment: parent } = await aliceCaller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Parent to be deleted",
      });

      await bobCaller.comments.create({
        clubId: wedReads.id,
        threadId: thread.id,
        body: "Child reply",
        parentCommentId: parent.id,
      });

      const result = await aliceCaller.comments.delete({
        clubId: wedReads.id,
        commentId: parent.id,
      });

      expect(result.placeholder).toBe(true);

      const updated = await db.comment.findUnique({
        where: { id: parent.id },
      });
      expect(updated?.body).toBe("[deleted]");
    });
  });
});
