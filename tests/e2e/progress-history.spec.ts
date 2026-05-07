import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle, getDb } from "./helpers";

// @spec PROG-UI-BOOK-001, PROG-UI-BOOK-002, PROG-UI-BOOK-005, PROG-UI-BOOK-006, PROG-UI-BOOK-007
test.describe("Progress History Picker", () => {
  test.describe.configure({ mode: "serial" });

  let pastSelectionId: string;

  test.beforeAll(async () => {
    const db = getDb();
    const club = await db.club.findUniqueOrThrow({ where: { code: "WEDREADS" } });
    const leftHand = await db.book.findFirstOrThrow({ where: { title: "The Left Hand of Darkness" } });

    const sel = await db.bookSelection.create({
      data: {
        clubId: club.id,
        bookId: leftHand.id,
        isCurrent: false,
        selectedAt: new Date("2025-12-01"),
        finishedAt: new Date("2026-02-15"),
      },
    });
    pastSelectionId = sel.id;
  });

  test.afterAll(async () => {
    if (pastSelectionId) {
      await getDb().bookSelection.delete({ where: { id: pastSelectionId } }).catch(() => {});
    }
  });

  // @spec PROG-UI-BOOK-001
  test("defaults to the current book's dashboard when no bookId is provided", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/progress`);

    // Dashboard renders directly — no books grid intermediary
    await expect(page.getByTestId("progress-ring")).toBeVisible();
    await expect(page.getByTestId("progress-list")).toBeVisible();
  });

  // @spec PROG-UI-BOOK-005, PROG-UI-BOOK-007
  test("history picker lists current selection first with a Current badge, then past selections", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");
    const leftHand = await getBookByTitle("The Left Hand of Darkness");

    await page.goto(`/clubs/${club.id}/progress`);

    const picker = page.getByTestId("history-picker");
    await expect(picker).toBeVisible();

    const currentItem = page.getByTestId(`history-item-${dune.id}`);
    const pastItem = page.getByTestId(`history-item-${leftHand.id}`);

    await expect(currentItem).toBeVisible();
    await expect(pastItem).toBeVisible();

    // Current selection has the Current badge; past selection does not.
    await expect(currentItem.getByTestId("history-current-badge")).toBeVisible();
    await expect(pastItem.getByTestId("history-current-badge")).toHaveCount(0);

    // Order: current first, past after.
    const items = page.getByTestId(/^history-item-/);
    await expect(items.nth(0)).toHaveAttribute("data-testid", `history-item-${dune.id}`);
    await expect(items.nth(1)).toHaveAttribute("data-testid", `history-item-${leftHand.id}`);
  });

  // @spec PROG-UI-BOOK-008
  test("past entries display a Finished {MMM YYYY} date and current entry does not", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const dune = await getBookByTitle("Dune");
    const leftHand = await getBookByTitle("The Left Hand of Darkness");

    await page.goto(`/clubs/${club.id}/progress`);

    const pastDate = page.getByTestId(`history-finished-date-${leftHand.id}`);
    await expect(pastDate).toBeVisible();
    // Seeded finishedAt is 2026-02-15.
    await expect(pastDate).toHaveText("Finished Feb 2026");

    // Current selection does not show a finished date.
    await expect(page.getByTestId(`history-finished-date-${dune.id}`)).toHaveCount(0);
  });

  // @spec PROG-UI-BOOK-008
  test("past entry without finishedAt falls back to Selected {MMM YYYY}", async ({ page }) => {
    const db = getDb();
    const club = await getClubByCode("WEDREADS");
    const kindred = await db.book.findFirstOrThrow({ where: { title: "Kindred" } });

    const sel = await db.bookSelection.create({
      data: {
        clubId: club.id,
        bookId: kindred.id,
        isCurrent: false,
        selectedAt: new Date("2025-08-10"),
        finishedAt: null,
      },
    });

    try {
      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${club.id}/progress`);

      const fallback = page.getByTestId(`history-finished-date-${kindred.id}`);
      await expect(fallback).toBeVisible();
      await expect(fallback).toHaveText("Selected Aug 2025");
    } finally {
      await db.bookSelection.delete({ where: { id: sel.id } }).catch(() => {});
    }
  });

  // @spec PROG-UI-BOOK-006
  test("clicking a past entry navigates to that book's dashboard", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const leftHand = await getBookByTitle("The Left Hand of Darkness");

    await page.goto(`/clubs/${club.id}/progress`);
    await page.getByTestId(`history-item-${leftHand.id}`).click();

    await expect(page).toHaveURL(new RegExp(`/clubs/${club.id}/progress\\?bookId=${leftHand.id}`));
    // Picker still rendered on the past-book dashboard so navigation back is possible.
    await expect(page.getByTestId("history-picker")).toBeVisible();
  });
});

// @spec PROG-UI-BOOK-001
test.describe("Progress page with no selections", () => {
  let tempClubId: string;

  test.beforeAll(async () => {
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const club = await db.club.create({
      data: {
        name: "Empty Club",
        code: `E${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        createdBy: alice.id,
        memberships: { create: { userId: alice.id, role: "owner" } },
      },
    });
    tempClubId = club.id;
  });

  test.afterAll(async () => {
    if (tempClubId) {
      const db = getDb();
      await db.membership.deleteMany({ where: { clubId: tempClubId } });
      await db.club.delete({ where: { id: tempClubId } }).catch(() => {});
    }
  });

  test("renders an empty state when the club has no book selections", async ({ page }) => {
    await loginAs(page, "alice@example.com");

    await page.goto(`/clubs/${tempClubId}/progress`);

    await expect(page.getByTestId("no-current-book")).toBeVisible();
    await expect(page.getByTestId("progress-ring")).toHaveCount(0);
  });
});
