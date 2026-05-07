import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle, getDb } from "./helpers";

// Eve's seeded WEDREADS dune progress: page 309/412 (75%), reading.
// Tests are read-only on the server (no save), so a single afterAll restore is plenty.

// @spec PROG-UI-MODAL-PCT-EDIT-001
test.describe("Progress modal editable percentage input", () => {
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

  test("percentage input initializes to the current computed value", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();

    await expect(page.getByTestId("percentage-input")).toHaveValue("75");
  });

  test("editing the percentage updates the page input, slider, and preview bar", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    // 50% of 412 = 206
    await page.getByTestId("percentage-input").fill("50");

    await expect(page.getByTestId("page-input")).toHaveValue("206");
    await expect(page.getByTestId("page-slider")).toHaveValue("206");
    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-percentage", "50");
  });

  test("percentage input is disabled when status is finished and locked at 100", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("status-finished").click();

    const pct = page.getByTestId("percentage-input");
    await expect(pct).toBeDisabled();
    await expect(pct).toHaveValue("100");
  });

  test("editing percentage from 0 while not_started auto-bumps status to reading", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();
    await page.getByTestId("status-not_started").click();
    await expect(page.getByTestId("percentage-input")).toHaveValue("0");

    await page.getByTestId("percentage-input").fill("25");

    const bar = page.getByTestId("progress-preview-bar");
    await expect(bar).toHaveAttribute("data-status", "reading");
    await expect(bar).toHaveAttribute("data-percentage", "25");
    // 25% of 412 ≈ 103
    await expect(page.getByTestId("page-input")).toHaveValue("103");
  });
});
