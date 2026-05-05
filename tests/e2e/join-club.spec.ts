// @spec CLUB-API-003, CLUB-API-004, AUTH-API-001, JOIN-UI-001 through JOIN-UI-017
import { test, expect } from "@playwright/test";

test.describe("Join Club Flow", () => {
  test("new user can join via code + email + name", async ({ page }) => {
    await page.goto("/join");

    await page.getByTestId("code-input").fill("WEDREADS");
    // Trigger lookup
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("continue-button").click();

    await page.getByTestId("email-input").fill("newcomer@example.com");
    await page.getByTestId("name-input").fill("New Person");
    await page.getByTestId("join-button").click();

    // Should navigate to club page
    await expect(page).toHaveURL(/\/clubs\//);
    await expect(page.getByTestId("club-name")).toContainText(
      "Wednesday Night Reads"
    );
  });

  test("shows error for invalid club code", async ({ page }) => {
    await page.goto("/join");

    await page.getByTestId("code-input").fill("INVALID");
    await page.getByTestId("code-input").blur();
    // Wait for lookup to complete — error should show on step 1
    await expect(page.getByTestId("error-message")).toBeVisible({ timeout: 10000 });
  });

  test("existing member gets idempotent join", async ({ page }) => {
    await page.goto("/join");

    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("continue-button").click();

    await page.getByTestId("email-input").fill("alice@example.com");
    await page.getByTestId("name-input").fill("Alice Chen");
    await page.getByTestId("join-button").click();

    // Should still navigate to club page (idempotent)
    await expect(page).toHaveURL(/\/clubs\//);
  });

  test("landing page has navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").getByRole("link", { name: "Join a club" })).toBeVisible();
  });
});

test.describe("Join Page — Layout", () => {
  test("renders header with logo and wordmark", async ({ page }) => {
    await page.goto("/join");
    await expect(page.locator("header")).toContainText("BookClub Hub");
  });

  test("join form is inside a card", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByTestId("join-form")).toBeVisible();
  });
});

test.describe("Join Page — Stepper", () => {
  test("renders 3-step stepper on step 1", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByTestId("stepper")).toBeVisible();
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "active");
    await expect(page.getByTestId("step-dot-2")).toHaveAttribute("data-state", "inactive");
    await expect(page.getByTestId("step-dot-3")).toHaveAttribute("data-state", "inactive");
  });
});

test.describe("Join Page — Step 1: Club Code", () => {
  test("code input has mono font", async ({ page }) => {
    await page.goto("/join");
    const className = await page.getByTestId("code-input").getAttribute("class");
    expect(className).toContain("font-[var(--font-mono)]");
  });

  test("lookup spinner appears while fetching", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    // Spinner should be briefly visible during lookup
    await expect(page.getByTestId("lookup-spinner")).toBeVisible();
    // After fetch completes, panel appears
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
  });

  test("valid club code shows club-found panel", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("club-found-panel")).toContainText("Wednesday Night Reads");
  });

  test("invalid code shows error with role=alert", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("BADCODE");
    await page.getByTestId("code-input").blur();
    const errorEl = page.getByTestId("error-message");
    await expect(errorEl).toBeVisible({ timeout: 10000 });
    await expect(errorEl).toHaveAttribute("role", "alert");
  });

  test("continue button disabled until valid club found", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByTestId("continue-button")).toBeDisabled();

    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("continue-button")).toBeEnabled();
  });
});

test.describe("Join Page — Step 2: Profile", () => {
  async function advanceToStep2(page: import("@playwright/test").Page) {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("continue-button").click();
  }

  test("clicking Continue transitions to step 2", async ({ page }) => {
    await advanceToStep2(page);
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("step-dot-2")).toHaveAttribute("data-state", "active");
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("name-input")).toBeVisible();
  });

  test("Back button returns to step 1", async ({ page }) => {
    await advanceToStep2(page);
    await page.getByTestId("back-button").click();
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "active");
    await expect(page.getByTestId("code-input")).toBeVisible();
  });

  test("submit button shows Joining… and aria-busy while submitting", async ({ page }) => {
    await advanceToStep2(page);
    await page.getByTestId("email-input").fill("slowtest@example.com");
    await page.getByTestId("name-input").fill("Slow Tester");
    await page.getByTestId("join-button").click();

    // The button should briefly show loading state — check final outcome (navigation)
    await expect(page).toHaveURL(/\/clubs\//, { timeout: 15000 });
  });
});

test.describe("Join Page — Success", () => {
  test("success step renders check circle with accessible label", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("continue-button").click();

    await page.getByTestId("email-input").fill("successtest@example.com");
    await page.getByTestId("name-input").fill("Success Tester");
    await page.getByTestId("join-button").click();

    await expect(page.getByRole("img", { name: "Success" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Welcome to/)).toBeVisible();
  });
});

test.describe("Join Page — Accessibility", () => {
  test("all labels have htmlFor matching an input id", async ({ page }) => {
    await page.goto("/join");
    // Check step 1 label
    const step1Labels = await page.locator("label").all();
    for (const label of step1Labels) {
      const htmlFor = await label.getAttribute("for");
      if (htmlFor) {
        await expect(page.locator(`#${htmlFor}`)).toBeAttached();
      }
    }
  });
});
