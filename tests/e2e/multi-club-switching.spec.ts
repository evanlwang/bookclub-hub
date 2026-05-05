// @spec CLUB-NAV-001, CLUB-UI-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Multi-Club Switching", () => {
  test("user in multiple clubs sees all clubs listed", async ({ page }) => {
    // Alice is in both WEDREADS and SCIFI42
    await loginAs(page, "alice@example.com");

    await page.goto("/clubs");

    await expect(page.getByTestId("club-list")).toBeVisible();
    await expect(page.getByText("Wednesday Night Reads")).toBeVisible();
    await expect(page.getByText("Sci-Fi Explorers")).toBeVisible();
  });

  test("clicking a club navigates to its dashboard", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto("/clubs");
    await page.getByText("Wednesday Night Reads").click();

    await expect(page).toHaveURL(`/clubs/${club.id}`);
    await expect(page.getByTestId("club-name")).toContainText(
      "Wednesday Night Reads"
    );
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

  test("unauthenticated user sees auth error on clubs page", async ({
    page,
  }) => {
    await page.goto("/clubs");

    await expect(page.getByTestId("auth-error")).toBeVisible();
  });
});
