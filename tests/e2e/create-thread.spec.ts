import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";
import { getDb } from "./helpers";

test.describe("Create Discussion Thread", () => {
  test.afterAll(async () => {
    const db = getDb();
    await db.discussionThread.deleteMany({
      where: { title: { in: ["E2E Test Thread", "Tagged Thread Test"] } },
    });
  });

  test("New Thread button opens form", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    await page.getByTestId("new-thread-btn").click();
    await expect(page.getByTestId("create-thread-form")).toBeVisible();
    await expect(page.getByTestId("thread-title-input")).toBeVisible();
    await expect(page.getByTestId("thread-body-input")).toBeVisible();
  });

  test("submitting thread adds it to the list", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    // Count initial threads
    await expect(page.getByTestId("threads-list")).toBeVisible();
    const initialCount = await page.getByTestId("threads-list").locator("li").count();

    await page.getByTestId("new-thread-btn").click();
    await page.getByTestId("thread-title-input").fill("E2E Test Thread");
    await page.getByTestId("thread-body-input").fill("This is a test thread body");
    await page.getByTestId("submit-thread-btn").click();

    // Form should close and new thread should appear in the list
    await expect(page.getByTestId("create-thread-form")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("E2E Test Thread")).toBeVisible({ timeout: 10000 });
  });

  test("chapter tag shows preview badge", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await page.getByTestId("new-thread-btn").click();

    await page.getByTestId("thread-chapter-input").fill("Chapter 7");
    await expect(page.getByTestId("chapter-tag-preview")).toBeVisible();
    await expect(page.getByTestId("chapter-tag-preview")).toContainText("[Chapter 7]");
  });

  test("thread with chapter tag appears in list with tag", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await page.getByTestId("new-thread-btn").click();

    await page.getByTestId("thread-title-input").fill("Tagged Thread Test");
    await page.getByTestId("thread-body-input").fill("Body content");
    await page.getByTestId("thread-chapter-input").fill("Chapter 8");
    await page.getByTestId("submit-thread-btn").click();

    await expect(page.getByTestId("create-thread-form")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Tagged Thread Test")).toBeVisible();
    await expect(page.getByText("[Chapter 8]")).toBeVisible();
  });
});
