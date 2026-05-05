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

  test("advance button moves round to voting phase", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);

    await expect(page.getByTestId("nominating-phase")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("advance-round-btn").click();
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });
  });

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
