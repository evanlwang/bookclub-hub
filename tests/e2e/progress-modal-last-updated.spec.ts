import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle, getDb } from "./helpers";

// @spec PROG-UI-MODAL-TIMESTAMP-001
test.describe("Progress modal Last updated timestamp", () => {
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

  test("modal shows Last updated for users with an existing progress record", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");

    await page.goto(`/clubs/${club.id}/progress?bookId=${dune.id}`);
    await page.getByTestId("update-progress-btn").click();

    const lastUpdated = page.getByTestId("last-updated");
    await expect(lastUpdated).toBeVisible();
    await expect(lastUpdated).toContainText("Last updated");
    // The seeded record's updatedAt is the current year — assert that loosely.
    await expect(lastUpdated).toContainText(/202\d/);
    // en-US format includes AM or PM.
    await expect(lastUpdated).toContainText(/AM|PM/);
  });

  test("modal hides Last updated for first-time updates (no prior record)", async ({ page }) => {
    // Create a fresh user with no progress on a fresh club + book.
    const db = getDb();
    const ts = Date.now();
    const code = `T${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const fresh = await db.user.create({
      data: {
        email: `fresh-${ts}@example.com`,
        displayName: "Fresh Reader",
      },
    });
    const club = await db.club.create({
      data: { name: "Fresh Club", code, createdBy: fresh.id },
    });
    await db.membership.create({
      data: { clubId: club.id, userId: fresh.id, role: "owner" },
    });
    const book = await db.book.create({
      data: { title: `Fresh Book ${ts}`, author: "Test Author", pageCount: 200 },
    });
    await db.bookSelection.create({
      data: { clubId: club.id, bookId: book.id, isCurrent: true, selectedAt: new Date() },
    });

    try {
      await loginAs(page, fresh.email);
      await page.goto(`/clubs/${club.id}/progress?bookId=${book.id}`);
      await page.getByTestId("update-progress-btn").click();

      await expect(page.getByTestId("progress-modal")).toBeVisible();
      await expect(page.getByTestId("last-updated")).toHaveCount(0);
    } finally {
      // Cleanup
      await db.bookSelection.deleteMany({ where: { clubId: club.id } });
      await db.membership.deleteMany({ where: { clubId: club.id } });
      await db.club.delete({ where: { id: club.id } });
      await db.book.delete({ where: { id: book.id } });
      await db.session.deleteMany({ where: { userId: fresh.id } });
      await db.user.delete({ where: { id: fresh.id } });
    }
  });
});
