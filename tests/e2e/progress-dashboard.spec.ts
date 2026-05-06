// @spec PROG-UI-DASH-003, PROG-UI-DASH-006, PROG-UI-DASH-007, PROG-UI-DASH-009, PROG-UI-DASH-011
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle } from "./helpers";

test.describe("Progress Dashboard Enhancements", () => {
  // @spec PROG-UI-DASH-003
  test("shows progress ring with median percentage", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const book = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${book.id}`);

    await expect(page.getByTestId("progress-ring")).toBeVisible();
    await expect(page.getByTestId("ring-percentage")).toBeVisible();
  });

  // @spec PROG-UI-DASH-006, PROG-UI-DASH-007
  test("shows distribution bar with legend", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const book = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${book.id}`);

    await expect(page.getByTestId("distribution-bar")).toBeVisible();
    await expect(page.getByTestId("legend-finished")).toBeVisible();
    await expect(page.getByTestId("legend-reading")).toBeVisible();
    await expect(page.getByTestId("legend-not-started")).toBeVisible();
  });

  // @spec PROG-UI-DASH-011
  test("shows status badges on member rows", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const book = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${book.id}`);

    // Carol is finished - should show "Done" badge
    await expect(page.getByTestId("badge-finished")).toBeVisible();
    // Alice is reading - should show "Reading" badge
    await expect(page.getByTestId("badge-reading").first()).toBeVisible();
    // Frank hasn't started - should show "Waiting" badge
    await expect(page.getByTestId("badge-not-started")).toBeVisible();
  });

  // @spec PROG-UI-DASH-009
  test("shows summary stats text", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const book = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${book.id}`);

    await expect(page.getByTestId("progress-summary")).toBeVisible();
    // Should contain reading/finished counts
    await expect(page.getByTestId("progress-summary")).toContainText("reading");
  });
});
