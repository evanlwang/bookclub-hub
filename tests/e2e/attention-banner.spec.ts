// @spec DASH-UI-005, DASH-UI-006, DASH-UI-BANNER-VOTE-001, DASH-UI-BANNER-MEET-001, DASH-UI-BANNER-CTA-VOTE-001, DASH-UI-011
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Dashboard Attention Banner", () => {
  // @spec DASH-UI-005, DASH-UI-BANNER-VOTE-001
  test("shows attention banner when user has not voted in active round", async ({ page }) => {
    // alice has an active voting round in WEDREADS but hasn't voted
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText(/vot/i);
  });

  // @spec DASH-UI-BANNER-CTA-VOTE-001
  test("attention banner CTA links to voting page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });

    await banner.getByRole("link").first().click();
    await expect(page).toHaveURL(`/clubs/${club.id}/vote`);
  });

  // @spec DASH-UI-BANNER-MEET-001
  test("shows meeting awaiting response in banner", async ({ page }) => {
    // alice has a proposed meeting in WEDREADS that she hasn't responded to
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText(/meeting|availability/i);
  });

  // @spec DASH-UI-006
  test("banner header pluralizes based on number of items", async ({ page }) => {
    // Alice has both an unvoted active round AND a proposed meeting awaiting response.
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    const banner = page.getByTestId("attention-banner");
    await expect(banner).toBeVisible({ timeout: 10000 });
    // With both vote AND meeting attention items, header should say "2 things".
    await expect(banner).toContainText(/2 things need your attention/i);
  });
});
