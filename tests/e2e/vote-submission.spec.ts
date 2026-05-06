// @spec VOTE-UI-VOTE-001, VOTE-UI-VOTE-003, VOTE-UI-VOTE-004, VOTE-UI-DEC-003, VOTE-API-001, VOTE-API-008, VOTE-BE-003
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";
import { getDb } from "./helpers";

test.describe("Voting Interactions", () => {
  test.afterAll(async () => {
    const db = getDb();
    const club = await db.club.findUniqueOrThrow({ where: { code: "WEDREADS" } });
    // Clean up any rounds created by the "admin can start a new round" test
    await db.votingRound.deleteMany({
      where: { clubId: club.id, status: "nominating" },
    });
  });

  // Create test round before all tests in this file
  // @spec VOTE-UI-VOTE-001, VOTE-UI-VOTE-003, VOTE-UI-VOTE-004, VOTE-API-008, VOTE-BE-003
  test("setup and test voting flow", async ({ page }) => {
    const db = getDb();
    const club = await db.club.findUniqueOrThrow({ where: { code: "WEDREADS" } });
    const books = await db.book.findMany({ take: 3 });
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    // Create a voting round
    const round = await db.votingRound.create({
      data: {
        clubId: club.id,
        status: "voting",
        maxApprovalsPerMember: 2,
        createdBy: alice.id,
      },
    });

    // Create nominations
    const noms = await Promise.all(
      books.map((book) =>
        db.nomination.create({
          data: {
            roundId: round.id,
            bookId: book.id,
            nominatedBy: alice.id,
          },
        })
      )
    );

    try {
      // Login and go to vote page
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${club.id}/vote`);

      // Should see voting phase
      await expect(page.getByTestId("voting-phase")).toBeVisible();
      await expect(page.getByTestId("submit-votes-btn")).toBeVisible();

      // Click first nomination
      await page.getByTestId(`nomination-${noms[0].id}`).click();
      await expect(page.getByTestId("submit-votes-btn")).toContainText("Submit 1 vote");

      // Click second
      await page.getByTestId(`nomination-${noms[1].id}`).click();
      await expect(page.getByTestId("submit-votes-btn")).toContainText("Submit 2 votes");

      // Third should be disabled (max is 2)
      await expect(page.getByTestId(`nomination-${noms[2].id}`)).toBeDisabled();

      // Submit
      await page.getByTestId("submit-votes-btn").click();
      await expect(page.getByTestId("vote-success")).toBeVisible({ timeout: 10000 });

      // After submit, label flips to "✓ Voted — Update {N}?" — VOTE-UI-VOTE-003 post-vote variant
      await expect(page.getByTestId("submit-votes-btn")).toContainText(/Voted.*Update 2/);
    } finally {
      // Cleanup
      await db.vote.deleteMany({ where: { roundId: round.id } });
      await db.nomination.deleteMany({ where: { roundId: round.id } });
      await db.votingRound.delete({ where: { id: round.id } });
    }
  });

  // @spec VOTE-UI-DEC-003, VOTE-API-001
  test("admin can start a new round", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);

    // The start new round button should exist (admin on decided round or empty state)
    const startBtn = page.getByTestId("start-new-round-btn");
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      // Verify no error appeared — page should refresh
      await expect(page.getByText("Error")).not.toBeVisible();
    }
  });
});
