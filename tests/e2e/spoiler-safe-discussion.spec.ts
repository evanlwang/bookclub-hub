// @spec DISC-UI-001, DISC-UI-002, DISC-UI-003, PROG-BE-004
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle } from "./helpers";

test.describe("Spoiler-Safe Discussions", () => {
  test("shows all threads when no chapter filter set", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const book = await getBookByTitle("Dune");

    // Load discussions page — the client-side component fetches threads
    await page.goto(`/clubs/${club.id}/discussions`);

    // Without maxChapter filter, should see all 4 threads from golden dataset
    await expect(page.getByTestId("threads-list")).toBeVisible();
    const items = page.getByTestId("threads-list").locator("li");
    await expect(items).toHaveCount(4);
  });

  test("filters threads by chapter and shows hidden count", async ({
    page,
  }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    // Set max chapter to 5
    await page.getByTestId("max-chapter-input").fill("5");
    // Wait for re-fetch
    await page.waitForTimeout(500);

    // Should see Ch.3, Ch.5, and untagged = 3 threads, Ch.10 hidden
    const items = page.getByTestId("threads-list").locator("li");
    await expect(items).toHaveCount(3);
    await expect(page.getByTestId("hidden-count")).toContainText("1");
  });

  test("show all button reveals hidden threads", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    // Set filter first
    await page.getByTestId("max-chapter-input").fill("3");
    await page.waitForTimeout(500);

    // Click show all
    await page.getByTestId("show-all-btn").click();
    await page.waitForTimeout(500);

    // All threads visible now
    const items = page.getByTestId("threads-list").locator("li");
    await expect(items).toHaveCount(4);
  });

  test("chapter tags displayed on threads", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    await expect(page.getByText("[Chapter 3]")).toBeVisible();
    await expect(page.getByText("[Chapter 5]")).toBeVisible();
    await expect(page.getByText("[Chapter 10]")).toBeVisible();
  });
});
