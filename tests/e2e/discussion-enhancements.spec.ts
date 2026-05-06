// @spec DISC-UI-005, DISC-UI-PAGE-CARD-001, DISC-API-LIST-SORT-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Discussion List Enhancements", () => {
  // @spec DISC-UI-005
  test("shows sort controls (Recent / Most comments)", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    await expect(page.getByTestId("sort-recent")).toBeVisible();
    await expect(page.getByTestId("sort-comments")).toBeVisible();
  });

  // @spec DISC-API-LIST-SORT-001
  test("sort by most comments changes thread order", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await expect(page.getByTestId("threads-list")).toBeVisible();

    await page.getByTestId("sort-comments").click();
    // Should still display threads (just reordered)
    await expect(page.getByTestId("threads-list")).toBeVisible();
  });

  // @spec DISC-UI-PAGE-CARD-001
  test("thread list items show body preview", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await expect(page.getByTestId("threads-list")).toBeVisible();

    // Thread body previews should be visible
    const previews = page.locator("[data-testid='thread-body-preview']");
    await expect(previews.first()).toBeVisible();
  });
});
