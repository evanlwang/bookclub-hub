// @spec DISC-UI-DETAIL-001, DISC-UI-DETAIL-COMMENT-001, DISC-UI-013, DISC-UI-DETAIL-NESTED-001, DISC-UI-DETAIL-COMPOSER-001, DISC-UI-DETAIL-REPLY-002, DISC-API-005, DISC-DATA-002
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";
import { getDb } from "./helpers";

test.describe("Thread Detail and Comments", () => {
  test.describe.configure({ mode: "serial" });

  test.afterAll(async () => {
    const db = getDb();
    await db.comment.deleteMany({
      where: {
        body: { in: ["This is a test comment from E2E", "Parent comment for reply test", "This is a nested reply"] },
      },
    });
  });

  // @spec DISC-UI-DETAIL-001
  test("thread detail page shows thread content", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    // Get a thread ID from the database
    const db = getDb();
    const thread = await db.discussionThread.findFirst({
      where: { clubId: club.id },
    });

    await page.goto(`/clubs/${club.id}/discussions/${thread!.id}`);

    await expect(page.getByTestId("thread-detail")).toBeVisible();
    // Detail page no longer renders title; body is the post content.
    await expect(page.getByTestId("thread-detail")).toContainText(thread!.body);
  });

  // @spec DISC-UI-DETAIL-COMPOSER-001, DISC-API-005
  test("posting a comment adds it to the list", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    const db = getDb();
    const thread = await db.discussionThread.findFirst({
      where: { clubId: club.id },
    });

    await page.goto(`/clubs/${club.id}/discussions/${thread!.id}`);

    await page.getByTestId("comment-input").fill("This is a test comment from E2E");
    await page.getByTestId("submit-comment-btn").click();

    // Comment should appear
    await expect(page.getByText("This is a test comment from E2E")).toBeVisible({ timeout: 10000 });
  });

  // @spec DISC-UI-013, DISC-UI-DETAIL-NESTED-001, DISC-UI-DETAIL-REPLY-002, DISC-DATA-002
  test("reply button opens reply form and posts nested reply", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    const club = await getClubByCode("WEDREADS");

    const db = getDb();
    const thread = await db.discussionThread.findFirst({
      where: { clubId: club.id },
      include: { comments: true },
    });

    // First add a comment to reply to
    await page.goto(`/clubs/${club.id}/discussions/${thread!.id}`);
    await page.getByTestId("comment-input").fill("Parent comment for reply test");
    await page.getByTestId("submit-comment-btn").click();
    await expect(page.getByText("Parent comment for reply test")).toBeVisible({ timeout: 10000 });

    // Find the reply button for any comment
    const replyBtn = page.locator("[data-testid^='reply-btn-']").first();
    await replyBtn.click();

    // Reply form should appear
    await expect(page.getByTestId("reply-form")).toBeVisible();
    await page.getByTestId("reply-input").fill("This is a nested reply");
    await page.getByTestId("submit-reply-btn").click();

    // Reply should appear
    await expect(page.getByText("This is a nested reply")).toBeVisible({ timeout: 10000 });
  });
});
