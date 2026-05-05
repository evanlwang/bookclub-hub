// @spec HOME-UI-001 through HOME-UI-011, HOME-A11Y-001 through HOME-A11Y-004
import { test, expect } from "@playwright/test";

test.describe("Landing Page — Navigation", () => {
  test("renders top nav with logo wordmark and nav items", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("nav").getByText("BookClub Hub")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(page.getByRole("link", { name: "About" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(
      page.locator("nav").getByRole("link", { name: "Join a club" })
    ).toBeVisible();
  });

  test("nav 'Join a club' navigates to /join", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Join a club" }).click();
    await expect(page).toHaveURL("/join");
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

  test("hero CTA 'Join a club' navigates to /join", async ({ page }) => {
    await page.goto("/");
    // Get the hero CTA (not the nav one)
    await page.locator("section").getByRole("link", { name: "Join a club" }).click();
    await expect(page).toHaveURL("/join");
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

test.describe("Landing Page — Footer", () => {
  test("renders footer with tagline and links", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toContainText("For people who finish the book.");
    await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Changelog" })).toBeVisible();
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
