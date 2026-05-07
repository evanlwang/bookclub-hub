import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle, getDb } from "./helpers";

// Eve's seeded WEDREADS dune progress: page 309, chapter 15, reading.
// Tests mutate eve's progress and revert in afterEach to keep state stable
// across this file and any parallel runs in other files.

// @spec PROG-UI-MODAL-TOAST-001, PROG-UI-MODAL-UNDO-001
test.describe("Progress save toast + undo", () => {
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

  test.afterEach(async () => {
    await restoreEveProgress();
  });

  // @spec PROG-UI-MODAL-TOAST-001
  test("save closes the modal and shows a toast with the saved page + Undo", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("page-input").fill("350");
    await page.getByTestId("save-progress-btn").click();

    // Modal closes, toast appears.
    await expect(page.getByTestId("progress-modal")).toHaveCount(0);
    const toast = page.getByTestId("progress-saved-toast");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Progress saved");
    await expect(toast).toContainText("page 350");
    await expect(page.getByTestId("progress-undo-btn")).toBeVisible();
  });

  // @spec PROG-UI-MODAL-UNDO-001
  test("undo restores previous progress, reopens modal pre-filled, and refreshes the dashboard", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("page-input").fill("350");
    await page.getByTestId("save-progress-btn").click();

    // Click Undo before the toast auto-dismisses.
    await page.getByTestId("progress-undo-btn").click();

    // Toast goes away, modal re-opens with the previous page (309).
    await expect(page.getByTestId("progress-saved-toast")).toHaveCount(0);
    await expect(page.getByTestId("progress-modal")).toBeVisible();
    await expect(page.getByTestId("page-input")).toHaveValue("309");

    // Close modal; dashboard should reflect 309 (eve's row), not 350.
    await page.getByRole("button", { name: "Cancel" }).click();
    const eveRow = page.locator('[data-testid^="progress-"]').filter({ hasText: "Eve" }).first();
    await expect(eveRow).toContainText("Page 309");
  });

  // @spec PROG-UI-MODAL-TOAST-001
  test("toast auto-dismisses after 4 seconds", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("page-input").fill("355");
    await page.getByTestId("save-progress-btn").click();

    await expect(page.getByTestId("progress-saved-toast")).toBeVisible();
    // Allow 4s + small buffer for the auto-dismiss.
    await expect(page.getByTestId("progress-saved-toast")).toHaveCount(0, { timeout: 6000 });
  });
});
