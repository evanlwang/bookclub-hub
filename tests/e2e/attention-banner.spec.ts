// @spec DASH-UI-011
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Dashboard Attention Banner", () => {
  test("shows attention banner when user has not voted in active round", async ({ page }) => {
    // alice has an active voting round in WEDREADS but hasn't voted
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText(/vot/i);
  });

  test("attention banner CTA links to voting page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });

    await banner.getByRole("link").first().click();
    await expect(page).toHaveURL(`/clubs/${club.id}/vote`);
  });

  test("shows meeting awaiting response in banner", async ({ page }) => {
    // alice has a proposed meeting in WEDREADS that she hasn't responded to
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText(/meeting|availability/i);
  });
});
