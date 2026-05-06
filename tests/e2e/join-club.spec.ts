// @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, CLUB-UI-001, CLUB-UI-002, CLUB-UI-003
import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for the new 4-step join/create entry flow:
 *   Step 1: Identity (email + display name)
 *   Step 2: Path choice (join existing OR create new)
 *   Step 3a: Join branch (debounced code lookup → submit)
 *   Step 3b: Create branch (club name → derived code → cadence → submit)
 *   Step 4: Success state (branch-aware)
 */

async function fillIdentity(page: Page, email: string, name: string) {
  await page.locator("#email").fill(email);
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: /continue/i }).click();
}

async function chooseJoinPath(page: Page) {
  await page.getByText("Join an existing club").click();
}

async function chooseCreatePath(page: Page) {
  await page.getByText("Create a new club").click();
}

test.describe("New Entry Flow — Step 1: Identity", () => {
  test("Step 1 renders email + name inputs first", async ({ page }) => {
    await page.goto("/join");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
  });

  test("Continue button is disabled until both fields are filled", async ({ page }) => {
    await page.goto("/join");
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await expect(continueBtn).toBeDisabled();

    await page.locator("#email").fill("user@example.com");
    await expect(continueBtn).toBeDisabled();

    await page.locator("#name").fill("User");
    await expect(continueBtn).toBeEnabled();
  });

  test("Continue advances to Step 2 (path choice)", async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "newuser@example.com", "New User");

    // Step 2 shows two path cards
    await expect(page.getByText("Join an existing club")).toBeVisible();
    await expect(page.getByText("Create a new club")).toBeVisible();
  });

  test("Stepper marks Step 1 as done after continuing", async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "stepper@example.com", "Stepper Test");
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("step-dot-2")).toHaveAttribute("data-state", "active");
  });
});

test.describe("New Entry Flow — Step 2: Path choice", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "pathtest@example.com", "Path Test");
  });

  test("Selecting Join advances to code-entry step (3a)", async ({ page }) => {
    await chooseJoinPath(page);
    await expect(page.locator("#code")).toBeVisible();
  });

  test("Selecting Create advances to club-name step (3b)", async ({ page }) => {
    await chooseCreatePath(page);
    await expect(page.locator("#club-name")).toBeVisible();
    await expect(page.locator("#club-code")).toBeVisible();
  });
});

test.describe("New Entry Flow — Step 3a: Join branch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "joiner@example.com", "Joiner");
    await chooseJoinPath(page);
  });

  test("Debounced lookup shows ClubFoundPanel for valid code", async ({ page }) => {
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("club-found-panel")).toContainText("Wednesday Night Reads");
  });

  test("Join button label includes the club name", async ({ page }) => {
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    const joinBtn = page.getByRole("button", { name: /Join Wednesday Night Reads/i });
    await expect(joinBtn).toBeEnabled();
  });

  test("Submitting join navigates to club page with success", async ({ page }) => {
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();

    // Step 4 success state shows briefly before redirect
    await expect(page.getByText(/Welcome to Wednesday Night Reads/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Existing member sees idempotent join (alreadyMember)", async ({ page }) => {
    // Use Alice who is already in WEDREADS. With smart detection in place,
    // we use ?path=join to bypass the auto-redirect and exercise the join branch.
    await page.goto("/join?path=join");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();
    await expect(page.getByText(/Welcome to Wednesday Night Reads/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("New Entry Flow — Step 3b: Create branch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "creator@example.com", "Creator");
    await chooseCreatePath(page);
  });

  test("Auto-derives invite code from club name", async ({ page }) => {
    await page.locator("#club-name").fill("Slow Reads");
    await expect(page.locator("#club-code")).toHaveValue("SLOWREADS");
  });

  test("Strips special characters from derived code", async ({ page }) => {
    await page.locator("#club-name").fill("The Book Club!");
    await expect(page.locator("#club-code")).toHaveValue("THEBOOKCLU");
  });

  test("Truncates derived code to 10 characters", async ({ page }) => {
    await page.locator("#club-name").fill("Oakwood Library Society");
    const code = await page.locator("#club-code").inputValue();
    expect(code.length).toBeLessThanOrEqual(10);
    expect(code).toBe("OAKWOODLIB");
  });

  test("User can manually edit the derived code", async ({ page }) => {
    await page.locator("#club-name").fill("My Club");
    await expect(page.locator("#club-code")).toHaveValue("MYCLUB");

    await page.locator("#club-code").fill("CUSTOM");
    await expect(page.locator("#club-code")).toHaveValue("CUSTOM");
  });

  test("Cadence options are available (monthly, six_weeks, flexible)", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Monthly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /6 weeks/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Flexible/i })).toBeVisible();
  });

  test("Create button disabled until name has at least 3 chars", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /Create club/i });
    await expect(createBtn).toBeDisabled();

    await page.locator("#club-name").fill("AB");
    await expect(createBtn).toBeDisabled();

    await page.locator("#club-name").fill("ABC");
    await expect(createBtn).toBeEnabled();
  });

  test("Create flow advances to success with prominent invite code", async ({ page }) => {
    const uniqueName = `My Test ${Date.now()}`;
    await page.locator("#club-name").fill(uniqueName);
    await page.getByRole("button", { name: /Monthly/i }).click();
    await page.getByRole("button", { name: /Create club/i }).click();

    // Step 4 success: club is live message with invite code chip
    await expect(page.getByText(/is live!/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Invite code/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy/i })).toBeVisible();
  });
});

test.describe("New Entry Flow — Stepper", () => {
  test("Stepper shows 4 steps with current state", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByTestId("stepper")).toBeVisible();
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "active");
  });

  test("Stepper progresses through join branch steps", async ({ page }) => {
    await page.goto("/join");

    // Step 1 active
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "active");

    await fillIdentity(page, "stepperjoin@example.com", "Stepper Join");
    // Step 2 active, 1 done
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("step-dot-2")).toHaveAttribute("data-state", "active");

    await chooseJoinPath(page);
    // Step 3 active, 1+2 done
    await expect(page.getByTestId("step-dot-2")).toHaveAttribute("data-state", "done");
    await expect(page.getByTestId("step-dot-3")).toHaveAttribute("data-state", "active");
  });
});

test.describe("New Entry Flow — Layout & Accessibility", () => {
  test("renders header with logo and wordmark", async ({ page }) => {
    await page.goto("/join");
    await expect(page.locator("header")).toContainText("BookClub Hub");
  });

  test("all labels with htmlFor reference an existing input id", async ({ page }) => {
    await page.goto("/join");

    const labelsWithFor = await page.locator("label[for]").all();
    for (const label of labelsWithFor) {
      const htmlFor = await label.getAttribute("for");
      if (htmlFor) {
        await expect(page.locator(`#${htmlFor}`)).toBeAttached();
      }
    }
  });

  test("error messages use role=alert for screen readers", async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "errortest@example.com", "Error Test");
    await chooseCreatePath(page);

    // Try to create with a duplicate code
    await page.locator("#club-name").fill("Test");
    await page.locator("#club-code").fill("WEDREADS"); // already exists
    await page.getByRole("button", { name: /Monthly/i }).click();
    await page.getByRole("button", { name: /Create club/i }).click();

    // Server-side error appears with role=alert
    const errorEl = page.locator('[role="alert"]');
    await expect(errorEl).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Landing Page → Join page navigation", () => {
  test("landing page has navigation to join", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("nav").getByRole("link", { name: /join a club/i })
    ).toBeVisible();
  });
});

test.describe("New Entry Flow — Smart detection (returning users)", () => {
  /**
   * @spec AUTH-UI-004: After Step 1, the client calls auth.me to detect
   * existing memberships. Users with clubs auto-redirect to /clubs;
   * users with zero clubs continue to Step 2; ?path=join|create
   * bypasses smart detection entirely.
   */

  test("returning user (alice) routes directly to /clubs after Step 1", async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    await page.waitForURL(/\/clubs(\?.*)?$/, { timeout: 10000 });
    await expect(page.getByTestId("club-list")).toBeVisible();
  });

  test("brand-new email lands on Step 2 (path choice)", async ({ page }) => {
    const uniqueEmail = `solo-${Date.now()}@example.com`;
    await page.goto("/join");
    await fillIdentity(page, uniqueEmail, "Solo User");
    await expect(page.getByText("Join an existing club")).toBeVisible();
    await expect(page.getByText("Create a new club")).toBeVisible();
  });

  test("?path=create overrides smart detection for existing user", async ({ page }) => {
    await page.goto("/join?path=create");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    // Should be on Step 3b (create branch), NOT redirected to /clubs
    await expect(page.locator("#club-name")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#club-code")).toBeVisible();
  });

  test("?path=join overrides smart detection for existing user", async ({ page }) => {
    await page.goto("/join?path=join");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    // Should be on Step 3a (join branch), NOT redirected to /clubs
    await expect(page.locator("#code")).toBeVisible({ timeout: 10000 });
  });

  test("header shows plain copy, not a Sign in button", async ({ page }) => {
    await page.goto("/join");
    // The old broken "Sign in" button should be gone.
    await expect(
      page.locator("header").getByRole("button", { name: /^sign in$/i })
    ).toHaveCount(0);
    await expect(page.locator("header")).toContainText(
      /already a member.*just enter your email above/i
    );
  });
});
