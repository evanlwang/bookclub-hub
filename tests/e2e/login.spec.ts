// @spec AUTH-API-SIGNIN-001, AUTH-UI-LOGIN-001, AUTH-UI-LOGIN-002, AUTH-UI-LOGIN-003, LANDING-UI-001
import { test, expect } from "@playwright/test";

/**
 * E2E coverage for the dedicated /login route and the two-CTA landing page.
 *
 * Three login outcomes:
 *   1. Existing user with clubs       → /clubs (smart route home)
 *   2. Existing user with no clubs    → /join?welcome=1 (onboarding bounce)
 *   3. Unknown email                  → /join?welcome=1&email=… (no user record created)
 */

test.describe("Login Page — /login", () => {
  // @spec AUTH-UI-LOGIN-001
  test("renders email-only form with no display-name field", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#name")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^log in$/i })).toBeVisible();
  });

  // @spec AUTH-UI-LOGIN-001
  test("Log in button is disabled until email looks valid", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button", { name: /^log in$/i });
    await expect(btn).toBeDisabled();

    await page.locator("#email").fill("not-an-email");
    await expect(btn).toBeDisabled();

    await page.locator("#email").fill("alice@example.com");
    await expect(btn).toBeEnabled();
  });

  // @spec AUTH-UI-LOGIN-002, AUTH-API-SIGNIN-001
  test("returning user with clubs is routed to /clubs", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("alice@example.com");
    await page.getByRole("button", { name: /^log in$/i }).click();

    await page.waitForURL(/\/clubs(\?.*)?$/, { timeout: 10000 });
    await expect(page.getByTestId("club-list")).toBeVisible();
  });

  // @spec AUTH-UI-LOGIN-003, AUTH-API-SIGNIN-001
  test("unknown email bounces to /join with welcome banner and pre-filled email", async ({
    page,
  }) => {
    const ghostEmail = `ghost-${Date.now()}@example.com`;
    await page.goto("/login");
    await page.locator("#email").fill(ghostEmail);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await page.waitForURL(/\/join\?welcome=1/, { timeout: 10000 });
    await expect(page.getByTestId("welcome-banner")).toBeVisible();
    // Email is carried through so the user doesn't have to retype.
    await expect(page.locator("#email")).toHaveValue(ghostEmail);
  });

  // @spec AUTH-UI-LOGIN-003, AUTH-API-SIGNIN-001
  test("existing user with no clubs is routed to /join with welcome banner", async ({
    page,
    request,
  }) => {
    const email = `existing-noclubs-login-${Date.now()}@example.com`;

    // Pre-create the User record (no memberships) via auth.enter.
    await request.post("/api/trpc/auth.enter", {
      data: { email, displayName: "Existing No Clubs Login" },
    });

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await page.waitForURL(/\/join\?welcome=1/, { timeout: 10000 });
    await expect(page.getByTestId("welcome-banner")).toBeVisible();
  });

  // @spec AUTH-UI-LOGIN-001
  test('"New here? Sign up →" link routes to /join', async ({ page }) => {
    await page.goto("/login");
    const signUpLink = page.locator("header").getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toHaveAttribute("href", "/join");
  });
});

test.describe("Landing Page — Two CTA buttons", () => {
  // @spec LANDING-UI-001
  test("hero shows distinct Sign up and Log in buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-signup")).toBeVisible();
    await expect(page.getByTestId("hero-login")).toBeVisible();
  });

  // @spec LANDING-UI-001
  test("Sign up CTA navigates to /join", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-signup")).toHaveAttribute("href", "/join");
    await page.getByTestId("hero-signup").click();
    await page.waitForURL(/\/join(\?.*)?$/);
  });

  // @spec LANDING-UI-001
  test("Log in CTA navigates to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-login")).toHaveAttribute("href", "/login");
    await page.getByTestId("hero-login").click();
    await page.waitForURL(/\/login(\?.*)?$/);
  });

  // @spec LANDING-UI-001
  test("top nav exposes Log in and Sign up links", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("nav").getByRole("link", { name: /^log in$/i })
    ).toBeVisible();
    await expect(
      page.locator("nav").getByRole("link", { name: /^sign up$/i })
    ).toBeVisible();
  });
});
