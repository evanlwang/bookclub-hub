// @spec MEET-UI-CREATE-001, MEET-UI-CREATE-002, MEET-UI-CREATE-003, MEET-UI-CREATE-VAL-001, MEET-UI-PROP-002, MEET-UI-PROP-PROGRESS-001, MEET-UI-RESP-001, MEET-UI-RESP-SAVE-001, MEET-UI-RESP-CONFIRM-001, MEET-API-001, MEET-API-003
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

  // @spec MEET-UI-CREATE-003
  test("newly proposed meeting appears in the list without manual reload", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    const uniqueTitle = `Refresh Probe ${Date.now()}`;

    await page.getByTestId("propose-meeting-btn").click();
    await page.getByTestId("meeting-title-input").fill(uniqueTitle);

    // Pick two near-future slots — `datetime-local` is naive-local; pad past the
    // input's `min` (current minute) so validation won't reject them.
    const slot = (offsetMs: number) => {
      const d = new Date(Date.now() + offsetMs);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    await page.getByTestId("slot-time-0").fill(slot(2 * 24 * 60 * 60 * 1000));
    await page.getByTestId("slot-time-1").fill(slot(3 * 24 * 60 * 60 * 1000));

    await page.getByTestId("submit-meeting-btn").click();

    // The proposer (Alice, admin) must see the new meeting in the list
    // without reloading the page.
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });
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
  test("selecting availability auto-saves and shows confirmation", async ({ page }) => {
    await loginAs(page, "dave@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // Expand a proposed meeting
    const meetingToggle = page.locator("[data-testid^='meeting-toggle-']").first();
    await meetingToggle.click();

    await expect(page.getByTestId("respond-meeting")).toBeVisible();

    // Selecting availability for a slot is enough — saves automatically.
    const availableBtn = page.locator("[data-testid$='-available']").first();
    await availableBtn.click();

    await expect(page.getByTestId("availability-saved")).toBeVisible({ timeout: 10000 });
  });

  // @spec MEET-UI-PROP-PROGRESS-001
  test("proposed meeting row renders a response-progress bar with valid percentage", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    const meetingToggle = page.locator("[data-testid^='meeting-toggle-']").first();
    const meetingId = (await meetingToggle.getAttribute("data-testid"))?.replace("meeting-toggle-", "");
    expect(meetingId).toBeTruthy();

    const progressBar = page.getByTestId(`response-progress-${meetingId}`);
    await expect(progressBar).toBeVisible();

    const pctRaw = await progressBar.getAttribute("data-percentage");
    const pct = Number(pctRaw);
    expect(Number.isFinite(pct)).toBe(true);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);

    // Tone reflects fill — partial responses get amber, complete gets green.
    const tone = await progressBar.getAttribute("data-tone");
    expect(tone === "amber" || tone === "green").toBe(true);
    if (pct === 100) expect(tone).toBe("green");
  });

  // @spec MEET-UI-RESP-CONFIRM-001
  test("responded count updates live after a response is saved", async ({ page }) => {
    // Eve has not yet responded to any meeting in seed data.
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    const meetingCard = page.locator("[data-testid^='meeting-toggle-']").first();
    const responseLabel = meetingCard.locator("text=/\\d+ responded/");
    const before = (await responseLabel.textContent()) ?? "";
    const beforeCount = Number(before.match(/(\d+) responded/)?.[1] ?? "0");

    await meetingCard.click();
    await page.locator("[data-testid$='-available']").first().click();
    await expect(page.getByTestId("availability-saved")).toBeVisible({ timeout: 10000 });

    await expect(responseLabel).toHaveText(
      new RegExp(`${beforeCount + 1} responded`)
    );
  });
});
