// @spec MEET-UI-CREATE-001, MEET-UI-CREATE-002, MEET-UI-CREATE-VAL-001, MEET-UI-PROP-002, MEET-UI-RESP-001, MEET-UI-RESP-SAVE-001, MEET-UI-RESP-CONFIRM-001, MEET-API-001, MEET-API-003
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";
import { getDb } from "./helpers";

test.describe("Meeting Create and Respond", () => {
  // @spec MEET-UI-CREATE-001
  test("Propose Meeting button opens form", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    await page.getByTestId("propose-meeting-btn").click();
    await expect(page.getByTestId("create-meeting-form")).toBeVisible();
    await expect(page.getByTestId("meeting-title-input")).toBeVisible();
  });

  // @spec MEET-UI-CREATE-002, MEET-DATA-001
  test("form starts with 2 time slots", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);
    await page.getByTestId("propose-meeting-btn").click();

    await expect(page.getByTestId("slot-row-0")).toBeVisible();
    await expect(page.getByTestId("slot-row-1")).toBeVisible();
  });

  // @spec MEET-UI-CREATE-002
  test("can add and remove time slots", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);
    await page.getByTestId("propose-meeting-btn").click();

    // Add a third slot
    await page.getByTestId("add-slot-btn").click();
    await expect(page.getByTestId("slot-row-2")).toBeVisible();

    // Remove the third slot
    await page.getByTestId("remove-slot-2").click();
    await expect(page.getByTestId("slot-row-2")).not.toBeVisible();
  });

  // @spec MEET-UI-CREATE-VAL-001
  test("submitting meeting without valid slots shows validation error", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);
    await page.getByTestId("propose-meeting-btn").click();
    await page.getByTestId("meeting-title-input").fill("Test Meeting");

    // Submit without filling time slots
    await page.getByTestId("submit-meeting-btn").click();

    // Should show validation error
    await expect(page.getByTestId("meeting-error")).toBeVisible();
    await expect(page.getByTestId("meeting-error")).toContainText("time slots");
  });

  // @spec MEET-UI-PROP-002
  test("clicking proposed meeting shows respond UI", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // Click the first proposed meeting to expand
    const meetingToggle = page.locator("[data-testid^='meeting-toggle-']").first();
    await meetingToggle.click();

    await expect(page.getByTestId("respond-meeting")).toBeVisible();
  });

  // @spec MEET-UI-RESP-001, MEET-UI-RESP-SAVE-001, MEET-UI-RESP-CONFIRM-001, MEET-API-003
  test("saving availability shows confirmation", async ({ page }) => {
    await loginAs(page, "dave@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // Expand a proposed meeting
    const meetingToggle = page.locator("[data-testid^='meeting-toggle-']").first();
    await meetingToggle.click();

    await expect(page.getByTestId("respond-meeting")).toBeVisible();

    // Select availability for first slot
    const availableBtn = page.locator("[data-testid$='-available']").first();
    await availableBtn.click();

    await page.getByTestId("save-availability-btn").click();

    await expect(page.getByTestId("availability-saved")).toBeVisible({ timeout: 10000 });
  });
});
