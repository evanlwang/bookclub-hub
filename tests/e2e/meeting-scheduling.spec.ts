// @spec MEET-UI-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Meeting Scheduling", () => {
  test("authenticated user sees meetings list", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // Golden dataset has one proposed meeting
    await expect(page.getByTestId("meetings-list")).toBeVisible();
    await expect(page.getByText("Meeting: Dune")).toBeVisible();
  });

  test("empty meetings state shown for club without meetings", async ({
    page,
  }) => {
    await loginAs(page, "bob@example.com");
    const club = await getClubByCode("SCIFI42");

    await page.goto(`/clubs/${club.id}/meetings`);

    await expect(page.getByTestId("no-meetings")).toBeVisible();
  });

  test("non-member cannot view meetings", async ({ page }) => {
    await loginAs(page, "carol@example.com");
    const club = await getClubByCode("SCIFI42");

    await page.goto(`/clubs/${club.id}/meetings`);

    await expect(page.getByTestId("meetings-error")).toBeVisible();
  });
});
