import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle, getDb } from "./helpers";

// @spec PROG-UI-MODAL-PREVIEW-001
test.describe("Progress modal live preview bar", () => {
  test.describe.configure({ mode: "serial" });

  // Eve's seeded WEDREADS dune progress: page 309/412 (75%), reading.
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

  test("preview bar reflects the initial percentage and status", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();

    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("data-percentage", "75");
    await expect(bar).toHaveAttribute("data-status", "reading");
  });

  test("preview bar updates when the page input changes", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("page-input").fill("206"); // 206/412 = 50%

    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-percentage", "50");
    await expect(bar).toHaveAttribute("data-status", "reading");
  });

  test("preview bar reaches 100% with finished status when Finished is selected", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("status-finished").click();

    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-percentage", "100");
    await expect(bar).toHaveAttribute("data-status", "finished");
  });

  test("preview bar shows 0% with not_started status when Not Started is selected", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("status-not_started").click();

    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-percentage", "0");
    await expect(bar).toHaveAttribute("data-status", "not_started");
  });
});
