// @spec AUTH-OTP-VERIFY-001, AUTH-UI-LOGIN-001, AUTH-UI-LOGIN-002, AUTH-UI-LOGIN-003, LANDING-UI-001
import { test, expect } from "@playwright/test";

/**
 * E2E coverage for the dedicated /login route and the two-CTA landing page.
 *
 * Login is passkey-first with an email one-time-code (OTP) fallback. In
 * non-production the fixed code "000000" always verifies for any email, so E2E
 * signs in via the OTP path without reading an inbox. (The passkey button needs
 * a real authenticator and is never clicked here.)
 *
 * Three login outcomes:
 *   1. Existing user with clubs       → /clubs/<firstClubId> (jump straight into a club)
 *   2. Existing user with no clubs    → /join?welcome=1 (onboarding bounce)
 *   3. Unknown email                  → /join?welcome=1&email=… (new user → onboard)
 */

const DEV_OTP = "000000";

test.describe("Login Page — /login", () => {
  // @spec AUTH-UI-LOGIN-001
  test("renders passkey + email-code controls with no display-name field", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("passkey-login")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.getByTestId("send-code")).toBeVisible();
    // The code field only appears after requesting a code.
    await expect(page.locator("#otp")).toHaveCount(0);
    await expect(page.locator("#name")).toHaveCount(0);
  });

  // @spec AUTH-UI-LOGIN-001, AUTH-UI-LOGIN-EMAIL-HINT-001
  test("'Email me a code' is disabled until the email looks valid", async ({ page }) => {
    await page.goto("/login");
    const sendCode = page.getByTestId("send-code");
    await expect(sendCode).toBeDisabled();

    await page.locator("#email").fill("not-an-email");
    await expect(sendCode).toBeDisabled();
    await expect(page.getByTestId("email-format-error")).toBeVisible();

    await page.locator("#email").fill("alice@example.com");
    await expect(page.getByTestId("email-format-error")).toHaveCount(0);
    await expect(sendCode).toBeEnabled();
  });

  // @spec AUTH-UI-LOGIN-001
  test("requesting a code reveals the OTP entry field", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("alice@example.com");
    await page.getByTestId("send-code").click();
    await expect(page.locator("#otp")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("verify-code")).toBeVisible();
  });

  // @spec AUTH-UI-LOGIN-002, AUTH-OTP-VERIFY-001
  test("returning user with clubs is dropped into a club dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("alice@example.com");
    await page.getByTestId("send-code").click();
    await page.locator("#otp").fill(DEV_OTP);
    await page.getByTestId("verify-code").click();

    await page.waitForURL(/\/clubs\/[^/?#]+(\?.*)?$/, { timeout: 10000 });
    await expect(page.getByTestId("club-name")).toBeVisible();
  });

  // @spec AUTH-UI-LOGIN-003, AUTH-OTP-VERIFY-001
  test("unknown email bounces to /join with welcome banner and pre-filled email", async ({
    page,
  }) => {
    const ghostEmail = `ghost-${Date.now()}@example.com`;
    await page.goto("/login");
    await page.locator("#email").fill(ghostEmail);
    await page.getByTestId("send-code").click();
    await page.locator("#otp").fill(DEV_OTP);
    await page.getByTestId("verify-code").click();

    await page.waitForURL(/\/join\?welcome=1/, { timeout: 10000 });
    await expect(page.getByTestId("welcome-banner")).toBeVisible();
    // Email is carried through so the user doesn't have to retype.
    await expect(page.locator("#email")).toHaveValue(ghostEmail);
  });

  // @spec AUTH-UI-LOGIN-003, AUTH-OTP-VERIFY-001
  test("existing user with no clubs is routed to /join with welcome banner", async ({
    page,
    request,
  }) => {
    const email = `existing-noclubs-login-${Date.now()}@example.com`;

    // Pre-create the User record (no memberships) via the OTP API + dev bypass,
    // so the UI login below exercises the existing-user-with-no-clubs branch
    // (isNewUser === false, clubs === []), not the brand-new-user path.
    await request.post("/api/trpc/auth.verifyOtp", {
      data: { email, code: DEV_OTP, displayName: "Existing No Clubs Login" },
    });

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.getByTestId("send-code").click();
    await page.locator("#otp").fill(DEV_OTP);
    await page.getByTestId("verify-code").click();

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
  test("landing exposes both actions (no top nav in the editorial redesign)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-signup")).toContainText(/get your library card/i);
    await expect(page.getByTestId("hero-login")).toContainText(/^log in$/i);
  });
});
