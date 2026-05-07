// @spec VOTE-UI-NOM-001, VOTE-UI-NOM-003, VOTE-UI-NOM-COUNT-001, VOTE-API-002
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import { getDb } from "./helpers";

/**
 * Uses SCIFI42 club (bob=owner) to avoid interference with vote-submission tests
 * which use WEDREADS.
 */
test.describe("Voting Phase Enhancements", () => {
  test.describe.configure({ mode: "serial" });

  let roundId: string;
  let clubId: string;

  test.afterAll(async () => {
    const db = getDb();
    if (roundId) {
      await db.vote.deleteMany({ where: { nomination: { roundId } } });
      await db.nomination.deleteMany({ where: { roundId } });
      await db.votingRound.delete({ where: { id: roundId } }).catch(() => {});
    }
  });

  // @spec VOTE-UI-NOM-001, VOTE-UI-NOM-003
  test("nominating phase shows cards with pitch, nominator, and advance button", async ({ page }) => {
    const db = getDb();
    const club = await db.club.findUniqueOrThrow({ where: { code: "SCIFI42" } });
    clubId = club.id;
    const bob = await db.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const books = await db.book.findMany({ take: 2 });

    // Create nominating round in SCIFI42 (bob is owner)
    const round = await db.votingRound.create({
      data: { clubId: club.id, status: "nominating", createdBy: bob.id },
    });
    roundId = round.id;

    await db.nomination.createMany({
      data: books.map((b) => ({
        roundId: round.id,
        bookId: b.id,
        nominatedBy: bob.id,
        pitch: `I think ${b.title} would be great for our club.`,
      })),
    });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${club.id}/vote`);

    await expect(page.getByTestId("nominating-phase")).toBeVisible();
    // Nomination cards with book titles
    await expect(page.getByText(books[0].title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(books[1].title, { exact: true }).first()).toBeVisible();
    // Nominator name
    await expect(page.getByText("Bob Martinez").first()).toBeVisible();
    // Admin sees advance button
    await expect(page.getByTestId("advance-round-btn")).toBeVisible();
    await expect(page.getByTestId("advance-round-btn")).toContainText("Advance to Voting");
  });

  // @spec VOTE-UI-NOM-003, VOTE-API-002
  test("advance button moves round to voting phase", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);

    await expect(page.getByTestId("nominating-phase")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("advance-round-btn").click();
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });
  });

  // @spec VOTE-UI-NOMMODAL-001, VOTE-UI-NOMMODAL-003, VOTE-UI-NOMMODAL-004, VOTE-UI-NOMMODAL-005, VOTE-API-005, VOTE-API-MANUAL-001
  test("manual book entry fallback adds a nomination", async ({ page }) => {
    const db = getDb();

    // Reset round to nominating for this test
    await db.votingRound.update({
      where: { id: roundId },
      data: { status: "nominating" },
    });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);

    await expect(page.getByTestId("nominating-phase")).toBeVisible({ timeout: 10000 });

    // Open NominateModal via "Search & nominate"
    await page.getByTestId("search-and-nominate-btn").click();

    // Manual entry is always visible below search — type a no-results query
    // just to confirm the empty-state hint renders, then fill the form.
    const ghostQuery = `__nope_${Date.now()}__`;
    await page.locator('input[placeholder*="Search by title" i]').fill(ghostQuery);
    await expect(page.getByText(/no matches for/i)).toBeVisible({ timeout: 10000 });

    const uniqueTitle = `E2E Manual Book ${Date.now()}`;
    await page.locator('input[placeholder*="Midnight Library"]').fill(uniqueTitle);
    await page.locator('input[placeholder*="Matt Haig"]').fill("Test Author");
    await page.locator('input[placeholder="304"]').fill("250");

    await page.getByRole("button", { name: /add & nominate/i }).click();

    // Modal closes; new nomination appears in the list
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    // Cleanup the manually-created book + its nomination
    const book = await db.book.findFirst({ where: { title: uniqueTitle } });
    if (book) {
      await db.nomination.deleteMany({ where: { bookId: book.id } });
      await db.book.delete({ where: { id: book.id } }).catch(() => {});
    }
  });

  // @spec VOTE-UI-NOM-003
  test("non-admin does not see advance button", async ({ page }) => {
    const db = getDb();
    // Reset round to nominating for this test
    await db.votingRound.update({
      where: { id: roundId },
      data: { status: "nominating" },
    });

    // dave is a regular member in SCIFI42
    await loginAs(page, "dave@example.com");
    await page.goto(`/clubs/${clubId}/vote`);

    await expect(page.getByTestId("nominating-phase")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("advance-round-btn")).not.toBeVisible();
  });
});
