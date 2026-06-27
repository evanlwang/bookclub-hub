// @spec HOME-UI-005, HOME-UI-006, JOIN-UI-007, JOIN-UI-008, JOIN-UI-009, JOIN-UI-014, JOIN-UI-015, DASH-NAV-001, DASH-UI-002, DASH-UI-CARD-VOTE-001, DASH-UI-CARD-MEET-001, DASH-UI-CARD-DISC-001, DASH-UI-PROG-001, DASH-UI-007, PROG-UI-BOOK-001, PROG-UI-DASH-009, DISC-UI-004, CLUB-NAV-003
import { test, expect, type Page } from "@playwright/test";
import { loginAs, getClubByCode, getDb } from "./helpers";

test.describe("Landing Page Interactions", () => {
  // @spec HOME-UI-005
  test("primary CTA navigates to join page", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-signup").click();
    await expect(page).toHaveURL("/join");
  });

  // @spec HOME-UI-006
  test("Log in link navigates to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-login").click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Join Page Interactions", () => {
  // Track emails created by these tests so we can delete the throwaway users
  // (and their WEDREADS memberships) afterwards. Without cleanup the seed-
  // shape assertions in members-management.spec.ts inflate over time.
  const createdEmails: string[] = [];

  test.afterAll(async () => {
    if (createdEmails.length === 0) return;
    const db = getDb();
    await db.user.deleteMany({ where: { email: { in: createdEmails } } });
    createdEmails.length = 0;
  });

  // Step 3a (code input) only renders after Step 1 (identity) + Step 2 (path).
  // ?path=join skips the path picker but Step 1 still gates everything.
  async function arriveAtCodeStep(page: Page, email: string) {
    createdEmails.push(email);
    await page.goto("/join?path=join");
    // Step 1 identity via email OTP (dev bypass "000000"); skip the passkey offer.
    await page.locator("#email").fill(email);
    await page.getByTestId("send-code").click();
    await page.locator("#otp").fill("000000");
    await page.locator("#name").fill("Test User");
    await page.getByTestId("verify-code").click();
    await page.getByTestId("skip-passkey").click();
    await expect(page.locator("#code")).toBeVisible({ timeout: 10000 });
  }

  // @spec JOIN-UI-007
  test("club code input converts to uppercase", async ({ page }) => {
    await arriveAtCodeStep(page, `uppercase-${Date.now()}@example.com`);
    await page.locator("#code").fill("wedreads");
    await expect(page.locator("#code")).toHaveValue("WEDREADS");
  });

  // @spec JOIN-UI-008, JOIN-UI-009
  test("club code lookup shows club info", async ({ page }) => {
    await arriveAtCodeStep(page, `lookup-${Date.now()}@example.com`);
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("club-found-panel")).toContainText("Wednesday Night Reads");
  });

  // @spec JOIN-UI-014
  test("submit navigates to the joined club", async ({ page }) => {
    await arriveAtCodeStep(page, `loadtest-${Date.now()}@example.com`);
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();
    await expect(page).toHaveURL(/\/clubs\//, { timeout: 10000 });
  });

  // @spec JOIN-UI-015
  test("shows success message before redirect", async ({ page }) => {
    await arriveAtCodeStep(page, `success-${Date.now()}@example.com`);
    await page.locator("#code").fill("WEDREADS");
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Join Wednesday Night Reads/i }).click();
    await expect(page.getByText(/Welcome to Wednesday Night Reads/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Sidebar Navigation", () => {
  // @spec DASH-NAV-001
  test("sidebar links navigate between sections", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    // Click Voting in sidebar
    await page.getByRole("link", { name: "Voting" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}/vote`);

    // Click Meetings
    await page.getByRole("link", { name: "Meetings" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}/meetings`);

    // Click Notes (the redesign's name for Discussions)
    await page.getByRole("link", { name: "Notes" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}/discussions`);

    // Click Progress
    await page.getByRole("link", { name: "Progress" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}/progress`);

    // Click Nook (the redesign's name for Dashboard) to go back
    await page.getByRole("link", { name: "Nook" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}`);
  });

  // @spec DASH-NAV-001
  test("active nav link is highlighted", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);

    // The Voting link should have primary-soft background (active state)
    const votingLink = page.getByRole("link", { name: "Voting" });
    await expect(votingLink).toHaveClass(/primary-soft/);
  });
});

test.describe("Dashboard Interactions", () => {
  // @spec DASH-UI-007
  test("currently reading card displays book info", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    // Golden dataset has Dune as current book
    await expect(page.getByText(/now reading/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dune" })).toBeVisible();
  });

  // @spec DASH-UI-CARD-VOTE-001
  test("vote card links to voting page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-vote").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/vote`);
  });

  // @spec DASH-UI-CARD-MEET-001
  test("meetings card links to meetings page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-meetings").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/meetings`);
  });

  // @spec DASH-UI-CARD-DISC-001
  test("discussions link navigates to discussions", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-discussions").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/discussions`);
  });

  // @spec DASH-UI-PROG-001
  test("progress link navigates to progress page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-progress").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/progress`);
  });
});

test.describe("Progress Page Interactions", () => {
  // @spec PROG-UI-BOOK-001, PROG-UI-DASH-009
  test("progress bars render with correct percentages", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    // Need to get the book ID for the progress page
    const res = await page.request.get(`/api/trpc/selections.list?input=${encodeURIComponent(JSON.stringify({ clubId: club.id }))}`);
    const data = await res.json();
    const selections = data.result?.data;
    const currentBook = selections?.find((s: any) => s.isCurrent);

    if (currentBook) {
      await page.goto(`/clubs/${club.id}/progress?bookId=${currentBook.bookId}`);
      await expect(page.getByTestId("progress-list")).toBeVisible();
    } else {
      await page.goto(`/clubs/${club.id}/progress`);
      await expect(page.getByTestId("no-current-book")).toBeVisible();
    }
  });
});

test.describe("Discussions Interactions", () => {
  // @spec DISC-UI-004
  test("chapter filter input accepts numeric values", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    const input = page.getByTestId("max-chapter-input");
    await expect(input).toBeVisible();
    await input.fill("7");
    await expect(input).toHaveValue("7");
  });

  // @spec DISC-UI-004
  test("clearing chapter filter shows all threads", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    // Set a filter
    await page.getByTestId("max-chapter-input").fill("3");
    await page.waitForTimeout(500);

    // Clear filter
    await page.getByTestId("max-chapter-input").fill("");
    await page.waitForTimeout(500);

    // All threads should be back
    const items = page.getByTestId("threads-list").locator("li");
    await expect(items).toHaveCount(4);
  });
});

test.describe("Sidebar Club Switcher Interactions", () => {
  // @spec CLUB-NAV-003
  test("opening the switcher and clicking a club navigates to its dashboard", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const wedReads = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${wedReads.id}`);
    await page.getByTestId("sidebar-club-switcher").click();

    await page.getByRole("link", { name: /Sci-Fi Explorers/i }).click();
    await expect(page).toHaveURL(/\/clubs\/.+/);
    // Assert on the rendered h1: in dev, Next can briefly keep the previous
    // page's segment in the DOM while the new one streams, so the bare
    // club-name testid can transiently resolve to two nodes.
    await expect(
      page.getByRole("heading", { level: 1, name: "Sci-Fi Explorers" }),
    ).toBeVisible();
  });
});
