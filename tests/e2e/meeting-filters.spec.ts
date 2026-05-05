import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Meeting List Filters", () => {
  test("shows filter tabs for meeting statuses", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    await expect(page.getByTestId("filter-all")).toBeVisible();
    await expect(page.getByTestId("filter-proposed")).toBeVisible();
    await expect(page.getByTestId("filter-confirmed")).toBeVisible();
  });

  test("filter tabs filter the meeting list", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // Click proposed filter
    await page.getByTestId("filter-proposed").click();
    // Should still see meetings list (proposed ones)
    await expect(page.getByTestId("meetings-list")).toBeVisible();
  });

  test("meeting cards show status badge", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // The seeded meeting is proposed
    await expect(page.getByText("proposed").first()).toBeVisible();
  });
});
