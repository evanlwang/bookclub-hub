// @spec DISC-UI-COMMENT-CONTROLS-001, DISC-UI-COMMENT-EDIT-001,
//        DISC-UI-COMMENT-DELETE-001, DISC-UI-COMMENT-DELETED-001,
//        DISC-UI-COMMENT-EDITED-001, DISC-API-006, DISC-API-007
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getDb } from "./helpers";

const TAG = "[E2E-edit-delete]";

async function setupThreadWithSeedComment(opts: {
  clubId: string;
  authorId: string;
  body: string;
}): Promise<{ threadId: string; commentId: string }> {
  const db = getDb();
  const book = await db.book.findFirstOrThrow();
  const thread = await db.discussionThread.create({
    data: {
      clubId: opts.clubId,
      bookId: book.id,
      authorId: opts.authorId,
      title: `${TAG} Edit/delete fixture`,
      body: "Setup body for edit/delete E2E.",
    },
  });
  const comment = await db.comment.create({
    data: {
      threadId: thread.id,
      authorId: opts.authorId,
      body: opts.body,
    },
  });
  return { threadId: thread.id, commentId: comment.id };
}

test.describe("Comment edit/delete", () => {
  // Tag-based cleanup keeps reruns idempotent without serial mode.
  test.afterAll(async () => {
    const db = getDb();
    await db.discussionThread.deleteMany({
      where: { title: { contains: TAG } },
    });
    await db.comment.deleteMany({
      where: { body: { contains: TAG } },
    });
  });

  // @spec DISC-UI-COMMENT-EDIT-001, DISC-UI-COMMENT-EDITED-001
  test("author can edit their own comment and sees the (edited) indicator", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const { threadId, commentId } = await setupThreadWithSeedComment({
      clubId: club.id,
      authorId: alice.id,
      body: `${TAG} original comment`,
    });

    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${club.id}/discussions/${threadId}`);

    // Edit affordance is visible to the author.
    await page.getByTestId(`comment-edit-btn-${commentId}`).click();

    const editInput = page.getByTestId(`comment-edit-input-${commentId}`);
    await expect(editInput).toBeVisible();
    await editInput.fill(`${TAG} edited comment text`);
    await page.getByTestId(`comment-edit-save-${commentId}`).click();

    // Body updated, (edited) appears next to timestamp.
    await expect(page.getByTestId(`comment-body-${commentId}`)).toContainText(
      "edited comment text"
    );
    await expect(page.getByTestId(`comment-edited-${commentId}`)).toBeVisible();
  });

  // @spec DISC-UI-COMMENT-DELETE-001 — author deletes their own comment with no replies
  test("author deletes own comment with no replies — row disappears", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const { threadId, commentId } = await setupThreadWithSeedComment({
      clubId: club.id,
      authorId: alice.id,
      body: `${TAG} delete me`,
    });

    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${club.id}/discussions/${threadId}`);

    await expect(page.getByTestId(`comment-${commentId}`)).toBeVisible();

    await page.getByTestId(`comment-delete-btn-${commentId}`).click();
    await expect(page.getByTestId(`comment-confirm-delete-${commentId}`)).toBeVisible();

    await page.getByTestId(`comment-confirm-yes-${commentId}`).click();

    // Row is gone (hard-deleted, no replies → no placeholder).
    await expect(page.getByTestId(`comment-${commentId}`)).toHaveCount(0);

    // DB is consistent.
    const remaining = await db.comment.findUnique({ where: { id: commentId } });
    expect(remaining).toBeNull();
  });

  // @spec DISC-UI-COMMENT-DELETED-001, DISC-API-007 — admin deletes member comment with replies → "[deleted]"
  test("admin deleting a member's comment-with-replies leaves a [deleted] placeholder", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    const db = getDb();
    const eve = await db.user.findUniqueOrThrow({ where: { email: "eve@example.com" } });
    const carol = await db.user.findUniqueOrThrow({ where: { email: "carol@example.com" } });
    const { threadId, commentId } = await setupThreadWithSeedComment({
      clubId: club.id,
      authorId: eve.id,
      body: `${TAG} parent comment by member`,
    });
    // A reply by another member so the delete must placeholder, not hard-delete.
    await db.comment.create({
      data: {
        threadId,
        authorId: carol.id,
        parentCommentId: commentId,
        body: `${TAG} reply preserves the parent`,
      },
    });

    // Carol is admin of WEDREADS — can delete others' comments.
    await loginAs(page, "carol@example.com");
    await page.goto(`/clubs/${club.id}/discussions/${threadId}`);

    await page.getByTestId(`comment-delete-btn-${commentId}`).click();
    await page.getByTestId(`comment-confirm-yes-${commentId}`).click();

    // Body becomes "[deleted]" placeholder; affordance row is gone.
    const body = page.getByTestId(`comment-body-${commentId}`);
    await expect(body).toContainText("[deleted]");
    await expect(page.getByTestId(`comment-edit-btn-${commentId}`)).toHaveCount(0);
    await expect(page.getByTestId(`comment-delete-btn-${commentId}`)).toHaveCount(0);

    // DB still has the row but with placeholder body.
    const remaining = await db.comment.findUniqueOrThrow({ where: { id: commentId } });
    expect(remaining.body).toBe("[deleted]");
  });

  // @spec DISC-UI-COMMENT-CONTROLS-001 — non-author non-admin sees no edit/delete
  test("a member sees no Edit/Delete on another member's comment", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const { threadId, commentId } = await setupThreadWithSeedComment({
      clubId: club.id,
      authorId: alice.id,
      body: `${TAG} alice's comment, eve viewing`,
    });

    // Eve is a plain member of WEDREADS — neither author nor admin.
    await loginAs(page, "eve@example.com");
    await page.goto(`/clubs/${club.id}/discussions/${threadId}`);

    await expect(page.getByTestId(`comment-${commentId}`)).toBeVisible();
    await expect(page.getByTestId(`comment-edit-btn-${commentId}`)).toHaveCount(0);
    await expect(page.getByTestId(`comment-delete-btn-${commentId}`)).toHaveCount(0);
    // Reply remains available — DISC-UI-COMMENT-CONTROLS-001 doesn't gate it.
    await expect(page.getByTestId(`reply-btn-${commentId}`)).toBeVisible();
  });
});
