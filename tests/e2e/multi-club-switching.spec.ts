// @spec CLUB-NAV-001, CLUB-UI-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Multi-Club Switching", () => {
  test("user in multiple clubs sees the sidebar switcher with all clubs", async ({ page }) => {
    // Alice is in both WEDREADS and SCIFI42
    await loginAs(page, "alice@example.com");
    const wedReads = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${wedReads.id}`);
    await page.getByTestId("sidebar-club-switcher").click();

    // Scope to the switcher dropdown — "Wednesday Night Reads" also appears
    // in the switcher button label and the dashboard h1, blowing up strict-mode.
    const dropdown = page.getByRole("listbox");
    await expect(dropdown.getByText("Wednesday Night Reads")).toBeVisible();
    await expect(dropdown.getByText("Sci-Fi Explorers")).toBeVisible();
  });

  test("clicking another club in the switcher navigates to its dashboard", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const wedReads = await getClubByCode("WEDREADS");
    const sciFi = await getClubByCode("SCIFI42");

    await page.goto(`/clubs/${wedReads.id}`);
    await page.getByTestId("sidebar-club-switcher").click();
    await page.getByRole("link", { name: /Sci-Fi Explorers/i }).click();

    await expect(page).toHaveURL(`/clubs/${sciFi.id}`);
    await expect(page.getByTestId("club-name")).toContainText("Sci-Fi Explorers");
  });

  test("club dashboard shows navigation to all sections", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await expect(page.getByTestId("nav-vote")).toBeVisible();
    await expect(page.getByTestId("nav-meetings")).toBeVisible();
    await expect(page.getByTestId("nav-discussions")).toBeVisible();
    await expect(page.getByTestId("nav-progress")).toBeVisible();
  });

  test("user only in one club cannot access another", async ({ page }) => {
    // Carol is only in WEDREADS
    await loginAs(page, "carol@example.com");
    const otherClub = await getClubByCode("SCIFI42");

    await page.goto(`/clubs/${otherClub.id}`);

    await expect(page.getByTestId("club-error")).toBeVisible();
  });

  test("user in only one club has no switcher (just the club name)", async ({ page }) => {
    // Carol is only in WEDREADS
    await loginAs(page, "carol@example.com");
    const wedReads = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${wedReads.id}`);

    await expect(page.getByTestId("sidebar-club-switcher")).toHaveCount(0);
  });
});
