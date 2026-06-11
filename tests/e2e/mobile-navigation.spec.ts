// @spec NAV-MOBILE-001, NAV-MOBILE-002, NAV-MOBILE-004, NAV-MOBILE-005, DENSITY-MEET-001, DENSITY-MEMBER-001, DENSITY-VOTE-001
import { test, expect, type Page } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

const IPHONE = { width: 390, height: 844 };

// The Next.js dev-tools overlay (<nextjs-portal>) sits in the bottom corner —
// exactly over the tab bar — and intercepts taps in dev mode only. It does not
// exist in production builds. Disarm its pointer interception for the test.
async function disarmDevOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: "nextjs-portal{pointer-events:none!important}",
  });
}

async function maxOverflow(page: Page): Promise<number> {
  // Positive => the page scrolls horizontally (bad). 1px tolerance for rounding.
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

test.describe("Mobile navigation (bottom tab bar)", () => {
  test.use({ viewport: IPHONE });

  let clubId: string;

  test.beforeAll(async () => {
    const club = await getClubByCode("WEDREADS");
    clubId = club.id;
  });

  test("tab bar replaces the hidden sidebar and reaches every destination", async ({
    page,
  }) => {
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${clubId}`);
    await disarmDevOverlay(page);

    // Sidebar is hidden on phones; the tab bar carries navigation instead.
    await expect(page.getByTestId("mobile-tab-bar")).toBeVisible();
    await expect(page.locator("aside")).toBeHidden();

    // Primary tabs navigate.
    await page.getByTestId("mobile-tab-voting").click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}/vote`));

    await page.getByTestId("mobile-tab-meetings").click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}/meetings`));

    await page.getByTestId("mobile-tab-discussions").click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}/discussions`));

    await page.getByTestId("mobile-tab-dashboard").click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}$`));
  });

  test("More sheet exposes secondary destinations and sign-out", async ({
    page,
  }) => {
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${clubId}`);
    await disarmDevOverlay(page);

    await page.getByTestId("mobile-tab-more").click();
    const sheet = page.getByTestId("mobile-more-sheet");
    await expect(sheet).toBeVisible();
    // Alice owns WEDREADS, so admin destinations appear.
    await expect(sheet.getByTestId("more-nav-progress")).toBeVisible();
    await expect(sheet.getByTestId("more-nav-members")).toBeVisible();
    await expect(sheet.getByText("Sign out")).toBeVisible();

    await sheet.getByTestId("more-nav-members").click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${clubId}/members`));
  });

  test("no horizontal overflow on the main club pages at 390px", async ({
    page,
  }) => {
    await loginAs(page, "alice@example.com");
    for (const path of [
      "",
      "/vote",
      "/meetings",
      "/discussions",
      "/progress",
      "/members",
    ]) {
      await page.goto(`/clubs/${clubId}${path}`);
      await page.waitForLoadState("networkidle");
      expect(
        await maxOverflow(page),
        `horizontal overflow on ${path || "/dashboard"}`,
      ).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("Desktop keeps the sidebar, hides the tab bar", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sidebar visible, tab bar hidden", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${club.id}`);

    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByTestId("mobile-tab-bar")).toBeHidden();
  });
});
