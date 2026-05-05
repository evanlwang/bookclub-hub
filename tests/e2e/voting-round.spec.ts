// @spec VOTE-UI-001, VOTE-UI-002
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Voting Round", () => {
  test("authenticated user sees voting rounds page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);

    // The golden dataset has at least one decided round
    await expect(page.getByTestId("rounds-list")).toBeVisible();
    await expect(page.getByTestId("round-status").first()).toBeVisible();
  });

  test("unauthenticated user gets error on voting page", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${club.id}/vote`);

    await expect(page.getByTestId("vote-error")).toBeVisible();
  });

  test("member of different club gets access error", async ({ page }) => {
    // Carol is only in WEDREADS, not SCIFI42
    await loginAs(page, "carol@example.com");
    const otherClub = await getClubByCode("SCIFI42");

    await page.goto(`/clubs/${otherClub.id}/vote`);

    await expect(page.getByTestId("vote-error")).toBeVisible();
  });
});
