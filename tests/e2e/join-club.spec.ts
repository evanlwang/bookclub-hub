// @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, AUTH-UI-PATH-OVERRIDE-001, AUTH-UI-STEP3B-CADENCE-001, CLUB-UI-001, CLUB-UI-002, CLUB-UI-003, CLUB-UI-CODE-LIVE-001
import { test, expect, type Page } from "@playwright/test";
import { restoreSeedMembershipGraph } from "./helpers";

/**
 * E2E tests for the new 4-step join/create entry flow:
 *   Step 1: Identity (email → OTP code + display name → passkey offer)
 *   Step 2: Path choice (join existing OR create new)
 *   Step 3a: Join branch (debounced code lookup → submit)
 *   Step 3b: Create branch (club name → derived code → cadence → submit)
 *   Step 4: Success state (branch-aware)
 *
 * Step 1 establishes the session via email OTP. In non-production the fixed code
 * "000000" always verifies, so E2E never reads an inbox. window.PublicKeyCredential
 * exists in headless Chromium, so the post-verify passkey offer always appears and
 * is always skipped (registering a passkey needs a real authenticator).
 */

const DEV_OTP = "000000";

async function fillIdentity(page: Page, email: string, name: string) {
  await page.locator("#email").fill(email);
  await page.getByTestId("send-code").click();
  await page.locator("#otp").fill(DEV_OTP);
  await page.locator("#name").fill(name);
  await page.getByTestId("verify-code").click();
  // Passkey offer always shows in headless Chromium — skip it to advance.
  await page.getByTestId("skip-passkey").click();
}

async function chooseJoinPath(page: Page) {
  await page.getByText("Join an existing club").click();
}

async function chooseCreatePath(page: Page) {
  await page.getByText("Create a new club").click();
}

test.describe("New Entry Flow — Step 1: Identity", () => {
  // @spec AUTH-UI-001, AUTH-UI-STEP1-EMAIL-001, AUTH-UI-STEP1-OTP-001, AUTH-UI-STEP1-NAME-001
  test("Step 1 starts email-first; code + name appear after requesting a code", async ({ page }) => {
    await page.goto("/join");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.getByTestId("send-code")).toBeVisible();
    // OTP + name fields are not present until a code has been requested.
    await expect(page.locator("#otp")).toHaveCount(0);
    await expect(page.locator("#name")).toHaveCount(0);

    await page.locator("#email").fill("user@example.com");
    await page.getByTestId("send-code").click();
    await expect(page.locator("#otp")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#name")).toBeVisible();
  });

  // @spec AUTH-UI-001, AUTH-UI-STEP1-SENDCODE-001, AUTH-UI-STEP1-VERIFY-001
  test("Send-code gates on a valid email; Verify gates on code + display name", async ({ page }) => {
    await page.goto("/join");
    const sendCode = page.getByTestId("send-code");
    await expect(sendCode).toBeDisabled();

    await page.locator("#email").fill("user@example.com");
    await expect(sendCode).toBeEnabled();
    await sendCode.click();

    const verifyBtn = page.getByTestId("verify-code");
    await expect(verifyBtn).toBeDisabled();

    await page.locator("#otp").fill(DEV_OTP);
    // Display name still empty → still disabled.
    await expect(verifyBtn).toBeDisabled();

    await page.locator("#name").fill("User");
    await expect(verifyBtn).toBeEnabled();
  });

  // @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003
  test("Continue advances to Step 2 (path choice)", async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "newuser@example.com", "New User");

    // Step 2 shows two path cards
    await expect(page.getByText("Join an existing club")).toBeVisible();
    await expect(page.getByText("Create a new club")).toBeVisible();
  });

  // @spec AUTH-UI-001, AUTH-UI-003
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

  // @spec AUTH-UI-002
  test("Selecting Join advances to code-entry step (3a)", async ({ page }) => {
    await chooseJoinPath(page);
    await expect(page.locator("#code")).toBeVisible();
  });

  // @spec AUTH-UI-002
  test("Selecting Create advances to club-name step (3b)", async ({ page }) => {
    await chooseCreatePath(page);
    await expect(page.locator("#club-name")).toBeVisible();
    await expect(page.locator("#club-code")).toBeVisible();
  });
});

test.describe("New Entry Flow — Step 3a: Join branch", () => {
  // The "Submitting join navigates" test adds joiner@example.com to WEDREADS.
  // On the next iteration, smart-detect would auto-redirect joiner past
  // Step 2 and break the beforeEach. Strip throwaway memberships first.
  test.beforeEach(async ({ page }) => {
    await restoreSeedMembershipGraph();
    await page.goto("/join");
    await fillIdentity(page, "joiner@example.com", "Joiner");
    await chooseJoinPath(page);
  });

  // @spec CLUB-UI-001
  test("Debounced lookup shows ClubFoundPanel for valid code", async ({ page }) => {
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("club-found-panel")).toContainText("Wednesday Night Reads");
  });

  // @spec CLUB-UI-001
  test("Join button label includes the club name", async ({ page }) => {
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    const joinBtn = page.getByRole("button", { name: /Join Wednesday Night Reads/i });
    await expect(joinBtn).toBeEnabled();
  });

  // @spec CLUB-UI-001
  test("Submitting join navigates to club page with success", async ({ page }) => {
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();

    // Step 4 success state shows briefly before redirect
    await expect(page.getByText(/Welcome to Wednesday Night Reads/i)).toBeVisible({
      timeout: 10000,
    });
  });

  // @spec CLUB-UI-001, AUTH-UI-004
  test("Existing member sees idempotent join (alreadyMember)", async ({ page }) => {
    // Use Alice who is already in WEDREADS. With smart detection in place,
    // we use ?path=join to bypass the auto-redirect and exercise the join branch.
    await page.goto("/join?path=join");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();
    // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001 — Alice already belongs to WEDREADS,
    // so the join surfaces the idempotent "already in" banner (with an Open-it
    // link) rather than advancing to the Step 4 welcome.
    await expect(page.getByTestId("already-member-banner")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/You're already in Wednesday Night Reads/i)).toBeVisible();
    await expect(page.getByTestId("already-member-link")).toHaveAttribute("href", /\/clubs\//);
  });
});

test.describe("New Entry Flow — Step 3b: Create branch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "creator@example.com", "Creator");
    await chooseCreatePath(page);
  });

  // @spec CLUB-UI-002
  test("Auto-derives invite code from club name", async ({ page }) => {
    await page.locator("#club-name").fill("Slow Reads");
    await expect(page.locator("#club-code")).toHaveValue("SLOWREADS");
  });

  // @spec CLUB-UI-002
  test("Strips special characters from derived code", async ({ page }) => {
    await page.locator("#club-name").fill("The Book Club!");
    await expect(page.locator("#club-code")).toHaveValue("THEBOOKCLU");
  });

  // @spec CLUB-UI-002
  test("Truncates derived code to 10 characters", async ({ page }) => {
    await page.locator("#club-name").fill("Oakwood Library Society");
    const code = await page.locator("#club-code").inputValue();
    expect(code.length).toBeLessThanOrEqual(10);
    expect(code).toBe("OAKWOODLIB");
  });

  // @spec CLUB-UI-002
  test("User can manually edit the derived code", async ({ page }) => {
    await page.locator("#club-name").fill("My Club");
    await expect(page.locator("#club-code")).toHaveValue("MYCLUB");

    await page.locator("#club-code").fill("CUSTOM");
    await expect(page.locator("#club-code")).toHaveValue("CUSTOM");
  });

  // @spec AUTH-UI-002, AUTH-UI-STEP3B-CADENCE-001
  test("Cadence options are available (monthly, six_weeks, flexible)", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Monthly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /6 weeks/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Flexible/i })).toBeVisible();
  });

  // @spec CLUB-UI-CODE-LIVE-001
  test("Live code lookup shows '✓ Available' for unique code", async ({ page }) => {
    const uniqueName = `LiveCheck ${Date.now()}`;
    await page.locator("#club-name").fill(uniqueName);
    const status = page.getByTestId("code-status");
    await expect(status).toHaveAttribute("data-state", "available", { timeout: 5000 });
    await expect(status).toContainText(/Available/i);
  });

  // @spec CLUB-UI-CODE-LIVE-001
  test("Live code lookup shows '✗ Taken' and disables Create when colliding with an existing club", async ({ page }) => {
    // WEDREADS is seeded as an active club — typing it as the desired code MUST fail uniqueness.
    await page.locator("#club-name").fill("Whatever");
    await page.locator("#club-code").fill("WEDREADS");

    const status = page.getByTestId("code-status");
    await expect(status).toHaveAttribute("data-state", "taken", { timeout: 5000 });
    await expect(status).toContainText(/Taken/i);

    const createBtn = page.getByRole("button", { name: /Create club/i });
    await expect(createBtn).toBeDisabled();
  });

  // @spec CLUB-UI-002
  test("Create button disabled until name has at least 3 chars", async ({ page }) => {
    const createBtn = page.getByRole("button", { name: /Create club/i });
    await expect(createBtn).toBeDisabled();

    await page.locator("#club-name").fill("AB");
    await expect(createBtn).toBeDisabled();

    await page.locator("#club-name").fill("ABC");
    await expect(createBtn).toBeEnabled();
  });

  // @spec CLUB-UI-002, CLUB-UI-003
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
  // @spec AUTH-UI-001
  test("Stepper shows 3 steps with the first one active by default", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByTestId("stepper")).toBeVisible();
    await expect(page.getByTestId("step-dot-1")).toHaveAttribute("data-state", "active");
    await expect(page.getByTestId("step-dot-2")).toHaveAttribute("data-state", "inactive");
    await expect(page.getByTestId("step-dot-3")).toHaveAttribute("data-state", "inactive");
    // No 4th dot — step 4 is the success state, shown without a stepper.
    await expect(page.getByTestId("step-dot-4")).toHaveCount(0);
  });

  // @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003
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
    await expect(page.locator("header")).toContainText("Dogear");
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
  // @spec LANDING-UI-001 — the editorial landing has no top nav; the sign-up
  // action is the hero CTA linking to /join.
  test("landing page has navigation to join (Sign up)", async ({ page }) => {
    await page.goto("/");
    const signup = page.getByTestId("hero-signup");
    await expect(signup).toBeVisible();
    await expect(signup).toHaveAttribute("href", "/join");
  });
});

test.describe("New Entry Flow — Smart detection (returning users)", () => {
  // @spec AUTH-UI-004
  test("returning user (alice) routes directly into a club after Step 1", async ({ page }) => {
    await page.goto("/join");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    await page.waitForURL(/\/clubs\/[^/?#]+(\?.*)?$/, { timeout: 10000 });
    await expect(page.getByTestId("club-name")).toBeVisible();
  });

  // @spec AUTH-UI-004, AUTH-UI-002
  test("brand-new email lands on Step 2 (path choice)", async ({ page }) => {
    const uniqueEmail = `solo-${Date.now()}@example.com`;
    await page.goto("/join");
    await fillIdentity(page, uniqueEmail, "Solo User");
    await expect(page.getByText("Join an existing club")).toBeVisible();
    await expect(page.getByText("Create a new club")).toBeVisible();
  });

  // @spec AUTH-UI-004, AUTH-UI-PATH-OVERRIDE-001
  test("?path=create overrides smart detection for existing user", async ({ page }) => {
    await page.goto("/join?path=create");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    // Should be on Step 3b (create branch), NOT redirected to /clubs
    await expect(page.locator("#club-name")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#club-code")).toBeVisible();
  });

  // @spec AUTH-UI-004, AUTH-UI-PATH-OVERRIDE-001
  test("?path=join overrides smart detection for existing user", async ({ page }) => {
    await page.goto("/join?path=join");
    await fillIdentity(page, "alice@example.com", "Alice Chen");
    // Should be on Step 3a (join branch), NOT redirected to /clubs
    await expect(page.locator("#code")).toBeVisible({ timeout: 10000 });
  });

  // @spec AUTH-UI-004
  test("header points returning members at /login", async ({ page }) => {
    await page.goto("/join");
    // The old broken "Sign in" button should be gone — header only carries
    // a "Log in" link to /login.
    await expect(
      page.locator("header").getByRole("button", { name: /^sign in$/i })
    ).toHaveCount(0);
    const loginLink = page.locator("header").getByRole("link", { name: /^log in$/i });
    await expect(loginLink).toHaveAttribute("href", "/login");
  });
});

test.describe("User Journeys — Four Entry Scenarios", () => {
  /**
   * Four canonical journeys through the entry flow, one per user×membership combination:
   *   1. New user (no DB record)        → wants to start a club        → Step 2 → Create
   *   2. New user (no DB record)        → wants to join via invite     → Step 2 → Join
   *   3. Existing user (has clubs)      → just wants their dashboard   → auto-redirect
   *   4. Existing user (no memberships) → edge case from #3 fall-through → Step 2
   * Scenarios 1, 2, and 4 share the same code path (auth.me returns clubs:[]),
   * but the journeys differ in user intent and final destination.
   */

  // @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, CLUB-UI-002, CLUB-UI-003
  test("Scenario 1: New user creates their own brand-new club", async ({ page }) => {
    const ts = Date.now();
    const email = `creator-${ts}@example.com`;
    const clubName = `Creator's Club ${ts}`;

    await page.goto("/join");

    // Step 1 — identity for a brand-new user (email → OTP → name → skip passkey)
    await fillIdentity(page, email, "Brand New Creator");

    // Step 2 — auth.me returns 0 clubs, so the wizard falls through to path choice
    await expect(page.getByText("Join an existing club")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Create a new club")).toBeVisible();
    await page.getByText("Create a new club").click();

    // Step 3b — club name auto-derives a code; pick monthly cadence and submit
    await expect(page.locator("#club-name")).toBeVisible();
    await page.locator("#club-name").fill(clubName);
    await page.getByRole("button", { name: /Monthly/i }).click();
    await page.getByRole("button", { name: /Create club/i }).click();

    // Step 4 — success card with the invite code chip
    await expect(page.getByText(/is live!/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Invite code/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy/i })).toBeVisible();
  });

  // @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, CLUB-UI-001
  test("Scenario 2: New user joins an existing club via invite code", async ({ page }) => {
    const email = `joiner-${Date.now()}@example.com`;

    await page.goto("/join");

    // Step 1 — identity for a brand-new user (email → OTP → name → skip passkey)
    await fillIdentity(page, email, "Brand New Joiner");

    // Step 2 — auth.me returns 0 clubs, wizard falls through to path choice
    await expect(page.getByText("Join an existing club")).toBeVisible({ timeout: 10000 });
    await page.getByText("Join an existing club").click();

    // Step 3a — code input triggers debounced lookup; ClubFoundPanel confirms the match
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("club-found-panel")).toContainText("Wednesday Night Reads");

    // Submit join → Step 4 success
    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();
    await expect(page.getByText(/Welcome to Wednesday Night Reads/i)).toBeVisible({
      timeout: 10000,
    });
  });

  // @spec AUTH-UI-001, AUTH-UI-003, AUTH-UI-004
  test("Scenario 3: Existing user with clubs auto-redirects to dashboard", async ({ page }) => {
    // Alice is a seeded member of WEDREADS — she's the canonical returning user.
    await page.goto("/join");

    await fillIdentity(page, "alice@example.com", "Alice Chen");

    // Smart detection: auth.me finds clubs.length > 0 → router.push(`/clubs/${firstClubId}`)
    // No path-choice cards are ever rendered.
    await page.waitForURL(/\/clubs\/[^/?#]+(\?.*)?$/, { timeout: 10000 });
    await expect(page.getByTestId("club-name")).toBeVisible();
    await expect(page.getByText("Join an existing club")).toHaveCount(0);
  });

  // @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004
  test("Scenario 4 (edge case): Existing user with no memberships sees path choice", async ({
    page,
    request,
  }) => {
    const email = `existing-noclubs-${Date.now()}@example.com`;

    // Pre-create the user via the OTP API (dev bypass code "000000") — their User
    // record exists in the DB, but they have zero memberships (e.g., they verified
    // their email previously but never joined or created a club).
    await request.post("/api/trpc/auth.verifyOtp", {
      data: { email, code: "000000", displayName: "Existing No Clubs" },
    });

    // The browser starts fresh — no session cookie carried in (the API request
    // above used a separate request context).
    await page.goto("/join");

    // Step 1 — same flow as a new user; verifyOtp recognizes the existing record.
    await fillIdentity(page, email, "Existing No Clubs");

    // Smart detection: auth.me returns clubs:[] → fall through to Step 2.
    // The wizard SHALL show the Join/Create choice rather than auto-redirecting.
    await expect(page.getByText("Join an existing club")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Create a new club")).toBeVisible();

    // Crucially, NOT redirected to /clubs.
    await expect(page).not.toHaveURL(/\/clubs(\?.*)?$/);
  });
});
