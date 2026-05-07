import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle, getDb } from "./helpers";

// Eve's seeded WEDREADS dune progress: page 309/412 (75%), reading.
// Slider tests don't save anything (purely client-side state), so no DB cleanup needed.
// afterAll restores eve's progress as a safety net in case parallel runs in other files
// cross-pollute via the same eve account.

// @spec PROG-UI-MODAL-SLIDER-001
test.describe("Progress modal page slider", () => {
  test.describe.configure({ mode: "serial" });

  async function restoreEveProgress() {
    const db = getDb();
    const club = await db.club.findUniqueOrThrow({ where: { code: "WEDREADS" } });
    const dune = await db.book.findFirstOrThrow({ where: { title: "Dune" } });
    const eve = await db.user.findUniqueOrThrow({ where: { email: "eve@example.com" } });
    await db.readingProgress.upsert({
      where: { clubId_bookId_userId: { clubId: club.id, bookId: dune.id, userId: eve.id } },
      update: { currentPage: 309, percentage: 75, currentChapter: 15, status: "reading", totalPages: 412 },
      create: {
        clubId: club.id, bookId: dune.id, userId: eve.id,
        currentPage: 309, percentage: 75, currentChapter: 15, status: "reading", totalPages: 412,
      },
    });
  }

  test.afterAll(async () => {
    await restoreEveProgress();
  });

  test("slider initializes to the current page", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();

    const slider = page.getByTestId("page-slider");
    await expect(slider).toBeVisible();
    await expect(slider).toHaveValue("309");
    await expect(slider).toHaveAttribute("max", "412");
  });

  test("changing the page input updates the slider", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("page-input").fill("100");

    await expect(page.getByTestId("page-slider")).toHaveValue("100");
  });

  test("changing the slider updates the page input and the preview bar", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();

    // Playwright supports `fill` on input[type=range] (sets value + fires input event).
    await page.getByTestId("page-slider").fill("206"); // 206/412 = 50%

    await expect(page.getByTestId("page-input")).toHaveValue("206");
    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-percentage", "50");
  });

  test("slider is disabled when status is finished and locked to totalPages", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("status-finished").click();

    const slider = page.getByTestId("page-slider");
    await expect(slider).toBeDisabled();
    await expect(slider).toHaveValue("412");
  });

  test("dragging the slider from 0 auto-bumps status to reading", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("status-not_started").click();
    await expect(page.getByTestId("page-slider")).toHaveValue("0");

    await page.getByTestId("page-slider").fill("42");

    // Status auto-bumped to reading; preview bar reflects it.
    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-status", "reading");
  });
});
