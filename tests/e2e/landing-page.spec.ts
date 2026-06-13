// @spec HOME-UI-015, HOME-UI-016, HOME-UI-005, HOME-UI-006, HOME-UI-CTA-PRIMARY-001,
//        HOME-UI-CTA-SECONDARY-001, HOME-UI-CARD-001, HOME-UI-CARD-002, HOME-UI-CARD-003,
//        HOME-UI-CARD-004, HOME-UI-ANNOT-001, HOME-UI-TERMS-001, HOME-UI-PLATE-001,
//        HOME-UI-018, HOME-A11Y-001, HOME-A11Y-002, HOME-A11Y-004, LANDING-UI-001
import { test, expect } from "@playwright/test";

test.describe("Landing Page — Masthead & a11y", () => {
  // @spec HOME-UI-015
  test("renders the masthead with the DOGEAR wordmark and EST. 2026", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/^Dogear$/i)).toBeVisible();
    await expect(page.getByText("EST. 2026")).toBeVisible();
  });

  // @spec HOME-A11Y-001, HOME-A11Y-002
  test("skip-nav link is first focusable and points to #main-content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveText("Skip to content");
    await expect(focused).toHaveAttribute("href", "#main-content");
    await expect(page.locator("#main-content")).toBeVisible();
  });
});

test.describe("Landing Page — Hero & CTAs", () => {
  // @spec HOME-UI-016
  test("renders the serif hero with the italic emphasis phrase", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toContainText("A small, private library for");
    await expect(h1.locator("em")).toContainText("the people you read with.");
  });

  // @spec HOME-UI-016
  test("renders the subhead", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Choose the next book together/i)).toBeVisible();
  });

  // @spec HOME-UI-005, HOME-UI-CTA-PRIMARY-001, LANDING-UI-001
  test("primary CTA 'Get your library card' navigates to /join", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByTestId("hero-signup");
    await expect(cta).toContainText(/get your library card/i);
    await expect(cta).toHaveAttribute("href", "/join");
    await cta.click();
    await expect(page).toHaveURL("/join");
  });

  // @spec HOME-UI-006, HOME-UI-CTA-SECONDARY-001, LANDING-UI-001
  test("'Log in' link navigates to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/already a member\?/i)).toBeVisible();
    const login = page.getByTestId("hero-login");
    await expect(login).toContainText(/^log in$/i);
    await expect(login).toHaveAttribute("href", "/login");
    await login.click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Landing Page — Borrower's card", () => {
  // @spec HOME-UI-CARD-001
  test("renders the card header trio", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("DOGEAR LENDING LIBRARY")).toBeVisible();
    await expect(page.getByText("Borrower's Card")).toBeVisible();
    await expect(page.getByText("CAT. 813.54")).toBeVisible();
  });

  // @spec HOME-UI-CARD-002
  test("renders the three checkout rows", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Choose the next read")).toBeVisible();
    await expect(page.getByText("Stay a chapter ahead")).toBeVisible();
    await expect(page.getByText("Meet without the maybe")).toBeVisible();
    // gloss spot-check
    await expect(page.getByText(/Tallies stay sealed until the reveal/i)).toBeVisible();
  });

  // @spec HOME-UI-CARD-003
  test("renders the three rotated due-date stamps", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("APR 02")).toBeVisible();
    await expect(page.getByText("APR 16")).toBeVisible();
    await expect(page.getByText("MAY 07")).toBeVisible();
  });

  // @spec HOME-UI-CARD-004, HOME-A11Y-004
  test("dog-ear corner fold is decorative (aria-hidden)", async ({ page }) => {
    await page.goto("/");
    const fold = page.getByTestId("card-dogear");
    await expect(fold).toBeAttached();
    await expect(fold).toHaveAttribute("aria-hidden", "true");
  });

  // @spec HOME-UI-ANNOT-001
  test("renders the dog-ear metaphor annotation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/here'?s where I stopped/i)).toBeVisible();
  });
});

test.describe("Landing Page — Conditions & bookplate", () => {
  // @spec HOME-UI-TERMS-001
  test("conditions of membership lists the three numbered promises", async ({ page }) => {
    await page.goto("/");
    const terms = page.getByTestId("privacy-banner");
    await expect(terms).toBeVisible();
    await expect(terms).toHaveAttribute("aria-label", "Conditions of membership");
    await expect(terms).toContainText("01");
    await expect(terms).toContainText("02");
    await expect(terms).toContainText("03");
    await expect(terms).toContainText(/email and a name/i);
    await expect(terms).toContainText(/no passwords/i);
    await expect(terms).toContainText(/no ads/i);
  });

  // @spec HOME-UI-PLATE-001
  test("ends with the Ex Libris bookplate", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/EX LIBRIS/i)).toBeVisible();
    await expect(page.getByText("For people who finish the book.")).toBeVisible();
  });
});

test.describe("Landing Page — Layout", () => {
  // @spec HOME-UI-018
  test("renders a centered editorial column constrained on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const column = page.getByTestId("landing-column");
    await expect(column).toBeVisible();
    const box = (await column.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(640);
    // horizontally centered within the 1280px viewport (±2px)
    const center = box.x + box.width / 2;
    expect(Math.abs(center - 640)).toBeLessThanOrEqual(2);
  });
});
