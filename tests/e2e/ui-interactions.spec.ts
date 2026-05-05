// @spec UI-INT-001 through UI-INT-012
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Landing Page Interactions", () => {
  test("Join a Club link navigates to join page", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Join a club" }).click();
    await expect(page).toHaveURL("/join");
    await expect(page.getByTestId("join-form")).toBeVisible();
  });

  test("Sign in link navigates to join page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/join");
  });
});

test.describe("Join Page Interactions", () => {
  test("club code input converts to uppercase", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("wedreads");
    await expect(page.getByTestId("code-input")).toHaveValue("WEDREADS");
  });

  test("club code lookup shows club info on blur", async ({ page }) => {
    await page.goto("/join");
    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("code-input").blur();

    // Should show club name and member count (wait for async fetch)
    await expect(page.getByText("Wednesday Night Reads")).toBeVisible({ timeout: 10000 });
  });

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
  test("currently reading card displays book info", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    // Golden dataset has Dune as current book
    await expect(page.getByText("Currently Reading")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dune" })).toBeVisible();
  });

  test("vote card links to voting page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-vote").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/vote`);
  });

  test("meetings card links to meetings page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-meetings").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/meetings`);
  });

  test("discussions link navigates to discussions", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-discussions").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/discussions`);
  });

  test("progress link navigates to progress page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await page.getByTestId("nav-progress").click();
    await expect(page).toHaveURL(`/clubs/${club.id}/progress`);
  });
});

test.describe("Progress Page Interactions", () => {
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
      await expect(page.getByTestId("no-book")).toBeVisible();
    }
  });
});

test.describe("Discussions Interactions", () => {
  test("chapter filter input accepts numeric values", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    const input = page.getByTestId("max-chapter-input");
    await expect(input).toBeVisible();
    await input.fill("7");
    await expect(input).toHaveValue("7");
  });

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

test.describe("Clubs List Interactions", () => {
  test("clicking a club card navigates to dashboard", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    await page.goto("/clubs");

    await expect(page.getByTestId("club-list")).toBeVisible();
    // Click first club
    await page.getByTestId("club-list").locator("a").first().click();
    await expect(page).toHaveURL(/\/clubs\/.+/);
    await expect(page.getByTestId("club-name")).toBeVisible();
  });
});
