// @spec DISC-UI-PAGE-003, DISC-UI-COMPOSE-001, DISC-UI-COMPOSE-SUBMIT-001, DISC-UI-016, DISC-UI-COMPOSE-CHAPTER-REQUIRED-001, DISC-API-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";
import { getDb } from "./helpers";

const TAG = "[E2E-create-thread]";

test.describe("Create Discussion Thread", () => {
  test.afterAll(async () => {
    const db = getDb();
    await db.discussionThread.deleteMany({
      where: { body: { contains: TAG } },
    });
  });

  // @spec DISC-UI-PAGE-003, DISC-UI-COMPOSE-001
  test("New Thread button opens form with body and chapter (no title)", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    await page.getByTestId("new-thread-btn").click();
    await expect(page.getByTestId("create-thread-form")).toBeVisible();
    await expect(page.getByTestId("thread-body-input")).toBeVisible();
    await expect(page.getByTestId("thread-chapter-input")).toBeVisible();
    // Title input has been removed.
    await expect(page.getByTestId("thread-title-input")).toHaveCount(0);
  });

  // @spec DISC-UI-COMPOSE-CHAPTER-REQUIRED-001
  test("submit is disabled until both body and chapter are filled", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await page.getByTestId("new-thread-btn").click();

    const submit = page.getByTestId("submit-thread-btn");
    await expect(submit).toBeDisabled();

    await page.getByTestId("thread-body-input").fill(`${TAG} body only, no chapter yet`);
    await expect(submit).toBeDisabled();

    await page.getByTestId("thread-chapter-input").fill("Chapter 5");
    await expect(submit).toBeEnabled();
  });

  // @spec DISC-UI-COMPOSE-SUBMIT-001, DISC-API-001
  test("submitting thread adds it to the list", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);

    await expect(page.getByTestId("threads-list")).toBeVisible();

    await page.getByTestId("new-thread-btn").click();
    const bodyText = `${TAG} this is a test thread body`;
    await page.getByTestId("thread-body-input").fill(bodyText);
    await page.getByTestId("thread-chapter-input").fill("Chapter 5");
    await page.getByTestId("submit-thread-btn").click();

    // Form closes and the body shows up in the thread list.
    await expect(page.getByTestId("create-thread-form")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(bodyText)).toBeVisible({ timeout: 10000 });
  });

  // @spec DISC-UI-016
  test("chapter tag shows preview badge", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await page.getByTestId("new-thread-btn").click();

    await page.getByTestId("thread-chapter-input").fill("Chapter 7");
    await expect(page.getByTestId("chapter-tag-preview")).toBeVisible();
    await expect(page.getByTestId("chapter-tag-preview")).toContainText("Chapter 7");
  });

  // @spec DISC-UI-016, DISC-UI-PAGE-CARD-001
  test("thread with chapter tag appears in list with tag and body", async ({ page }) => {
    // Bob's seeded WEDREADS Dune progress is chapter 6 — anything above gets
    // hidden by the auto-spoiler filter (DISC-UI-PROGRESS-AUTOFILTER-001), so
    // pick a chapter at or below to verify list rendering.
    await loginAs(page, "bob@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await page.getByTestId("new-thread-btn").click();

    const bodyText = `${TAG} body content for tagged thread`;
    await page.getByTestId("thread-body-input").fill(bodyText);
    await page.getByTestId("thread-chapter-input").fill("Chapter 4");
    await page.getByTestId("submit-thread-btn").click();

    await expect(page.getByTestId("create-thread-form")).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(bodyText)).toBeVisible();
    await expect(page.getByText("Chapter 4")).toBeVisible();
  });
});
