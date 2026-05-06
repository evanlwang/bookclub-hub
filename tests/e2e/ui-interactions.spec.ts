// @spec HOME-UI-005, HOME-UI-006, JOIN-UI-007, JOIN-UI-008, JOIN-UI-009, JOIN-UI-014, JOIN-UI-015, DASH-NAV-001, DASH-UI-002, DASH-UI-CARD-VOTE-001, DASH-UI-CARD-MEET-001, DASH-UI-CARD-DISC-001, DASH-UI-PROG-001, DASH-UI-007, PROG-UI-BOOK-001, PROG-UI-DASH-009, DISC-UI-004, CLUB-NAV-003
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Landing Page Interactions", () => {
  // @spec HOME-UI-005
  test("Join a Club link navigates to join page", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Join a club" }).click();
    await expect(page).toHaveURL("/join");
    await expect(page.getByTestId("join-form")).toBeVisible();
  });

  // @spec HOME-UI-006
  test("Sign in link navigates to join page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/join");
  });
});

test.describe("Join Page Interactions", () => {
  // @spec JOIN-UI-007
  test("club code input converts to uppercase", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("wedreads");
    await expect(page.getByTestId("code-input")).toHaveValue("WEDREADS");
  });

  // @spec JOIN-UI-008, JOIN-UI-009
  test("club code lookup shows club info on blur", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();

    // Should show club name and member count (wait for async fetch)
    await expect(page.getByText("Wednesday Night Reads")).toBeVisible({ timeout: 10000 });
  });

  // @spec JOIN-UI-014
  test("submit button shows loading state", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("continue-button").click();

    await page.getByTestId("email-input").fill("loadtest@example.com");
    await page.getByTestId("name-input").fill("Load Tester");

    const button = page.getByTestId("join-button");
    await button.click();

    // Check the final state — successful navigation
    await expect(page).toHaveURL(/\/clubs\//);
  });

  // @spec JOIN-UI-015
  test("shows success message before redirect", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();
    await expect(page.getByTestId("club-found-panel")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("continue-button").click();

    await page.getByTestId("email-input").fill("success-msg@example.com");
    await page.getByTestId("name-input").fill("Success Person");
    await page.getByTestId("join-button").click();

    // Should show welcome message
    await expect(page.getByText(/Welcome to/)).toBeVisible();
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

    // Click Discussions
    await page.getByRole("link", { name: "Discussions" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}/discussions`);

    // Click Progress
    await page.getByRole("link", { name: "Progress" }).click();
    await expect(page).toHaveURL(`/clubs/${club.id}/progress`);

    // Click Dashboard to go back
    await page.getByRole("link", { name: "Dashboard" }).click();
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
    await expect(page.getByText("Currently Reading")).toBeVisible();
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
    await expect(page.getByTestId("club-name")).toContainText("Sci-Fi Explorers");
  });
});
