// @spec HOME-UI-001 through HOME-UI-011, HOME-A11Y-001 through HOME-A11Y-004
import { test, expect } from "@playwright/test";

test.describe("Landing Page — Navigation", () => {
  test("renders top nav with logo wordmark and primary actions", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("nav").getByText("BookClub Hub")).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: /^log in$/i })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: /^sign up$/i })).toBeVisible();
  });

  test("nav 'Sign up' navigates to /join", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: /^sign up$/i }).click();
    await expect(page).toHaveURL("/join");
  });

  test("nav 'Log in' navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: /^log in$/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("skip-nav link is first focusable and points to #main-content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toHaveText("Skip to content");
    await expect(focused).toHaveAttribute("href", "#main-content");
    await expect(page.locator("#main-content")).toBeVisible();
  });
});

test.describe("Landing Page — Hero", () => {
  test("renders hero heading with 'finally' emphasized", async ({ page }) => {
    await page.goto("/");

    const h1 = page.locator("h1");
    await expect(h1).toContainText("Your book club");
    await expect(h1.locator("em")).toContainText("finally");
  });

  test("renders eyebrow pill 'Spoiler-safe by default'", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Spoiler-safe by default")).toBeVisible();
  });

  test("renders social proof with reader and club counts", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/2,400\+/)).toBeVisible();
    await expect(page.getByText(/340/)).toBeVisible();
  });

  test("hero CTA 'Sign up' navigates to /join", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-signup").click();
    await expect(page).toHaveURL("/join");
  });

  test("hero CTA 'Log in' navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-login").click();
    await expect(page).toHaveURL("/login");
  });

  test("decorative collage has aria-hidden", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    // The collage div contains BookCover and cards — check it exists with aria-hidden
    const collage = page.locator('section div[aria-hidden="true"].relative');
    await expect(collage).toBeAttached();
  });
});

test.describe("Landing Page — Features", () => {
  test("renders three feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Approval voting")).toBeVisible();
    await expect(page.getByText("Meeting scheduling")).toBeVisible();
    await expect(page.getByText("Spoiler-safe threads")).toBeVisible();
  });
});

// @spec HOME-UI-PRIVACY-CALLOUT-001
test.describe("Landing Page — Privacy callout", () => {
  test("privacy banner is visible with all three claims and an aria-label", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page.getByTestId("privacy-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("aria-label", "Privacy guarantees");
    await expect(banner).toContainText(/no personal data/i);
    await expect(banner).toContainText(/email and display name/i);
    await expect(banner).toContainText(/no ads/i);
  });
});

test.describe("Landing Page — Footer", () => {
  test("renders footer with tagline", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toContainText("For people who finish the book.");
    // Privacy/Terms/Changelog links removed until they have real destinations.
  });
});

test.describe("Landing Page — Visual", () => {
  test("main element has paper background gradient", async ({ page }) => {
    await page.goto("/");
    const bg = await page
      .locator("main#main-content")
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain("radial-gradient");
  });
});
