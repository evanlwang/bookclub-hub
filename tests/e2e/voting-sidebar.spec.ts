// @spec VOTE-UI-009
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Voting Sidebar", () => {
  test("voting phase shows sidebar with approval dots and turnout", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });

    // Sidebar should be visible
    const sidebar = page.getByTestId("vote-sidebar");
    await expect(sidebar).toBeVisible();

    // Approval dots section
    await expect(sidebar.getByTestId("approval-dots")).toBeVisible();
    // Max approvals is 2, so there should be 2 dot elements
    const dots = sidebar.getByTestId("approval-dot");
    await expect(dots).toHaveCount(2);

    // Voter turnout section
    await expect(sidebar.getByTestId("voter-turnout")).toBeVisible();
    await expect(sidebar.getByTestId("voter-turnout")).toContainText("voted");

    // Tallies hidden message
    await expect(sidebar.getByText(/tallies hidden/i)).toBeVisible();
  });

  test("inline approval pill shows picks count", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });

    // Inline approval pill
    const pill = page.getByTestId("approval-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Picks");
    // Initially 0 selected out of max 2
    await expect(pill).toContainText("0/2");
  });

  test("approval dots fill as nominations are selected", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });

    // Click first nomination
    const firstNom = page.getByTestId(/^nomination-/).first();
    await firstNom.click();

    // Pill should update to 1/2
    await expect(page.getByTestId("approval-pill")).toContainText("1/2");

    // One dot should be filled (data-filled="true")
    const filledDots = page.getByTestId("vote-sidebar").locator('[data-testid="approval-dot"][data-filled="true"]');
    await expect(filledDots).toHaveCount(1);
  });
});
