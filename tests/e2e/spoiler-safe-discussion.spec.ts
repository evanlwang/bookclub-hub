// @spec DISC-UI-001, DISC-UI-002, DISC-UI-003, PROG-BE-004
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Spoiler-Safe Discussions", () => {
  test("shows all threads when no chapter filter set", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

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
    // Wait for the initial threads fetch so the list is settled before we
    // change the filter (the auto-progress-cutoff effect fires on mount).
    await expect(page.getByTestId("threads-list")).toBeVisible({ timeout: 10000 });

    // Set max chapter to 5
    await page.getByTestId("max-chapter-input").fill("5");

    // Should see Ch.3, Ch.5, and untagged = 3 threads, Ch.10 hidden.
    // toHaveCount auto-retries, so no manual sleep needed.
    const items = page.getByTestId("threads-list").locator("li");
    await expect(items).toHaveCount(3, { timeout: 10000 });
    await expect(page.getByTestId("hidden-count")).toContainText("1");
  });

  test("show all button reveals hidden threads", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await expect(page.getByTestId("threads-list")).toBeVisible({ timeout: 10000 });

    // Set filter first
    await page.getByTestId("max-chapter-input").fill("3");
    // Wait until show-all becomes available — proves the filter applied.
    await expect(page.getByTestId("show-all-btn")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("show-all-btn").click();

    const items = page.getByTestId("threads-list").locator("li");
    await expect(items).toHaveCount(4, { timeout: 10000 });
  });

  test("chapter tags displayed on threads", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    await expect(page.getByText("Chapter 3")).toBeVisible();
    await expect(page.getByText("Chapter 5")).toBeVisible();
    await expect(page.getByText("Chapter 10")).toBeVisible();
  });
});
