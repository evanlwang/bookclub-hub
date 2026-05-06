// @spec VOTE-UI-PRIOR-VOTES-001, VOTE-UI-PRIOR-VOTES-002, VOTE-UI-TURNOUT-LIVE-001, VOTE-UI-TURNOUT-CHANGE-COUNT-001, VOTE-UI-UPDATE-CONFIRM-001
import { test, expect } from "@playwright/test";
import { loginAs, getDb } from "./helpers";

// These tests share the WEDREADS club and create their own voting rounds.
// Running them serially avoids cross-contamination from the page's `.find()`
// over multiple active rounds in the same club.
test.describe.configure({ mode: "serial" });

/**
 * E2E coverage for the prior-votes load + live-turnout update behaviors.
 *
 * Scenarios:
 *   1. Returning user with prior votes sees them pre-selected on page load.
 *   2. Submit button reads "✓ Voted — Update N?" from page load (not just post-submit).
 *   3. "You voted previously" hint visible near picks pill.
 *   4. First vote increments turnout count live (no manual reload).
 *   5. Updating a vote keeps turnout count the same.
 *   6. First submit → "recorded" copy. Second submit → "updated" copy.
 */

type Fixture = {
  clubId: string;
  roundId: string;
  noms: { dune: string; leftHand: string; kindred: string };
  cleanup: () => Promise<void>;
};

async function createVotingRoundFixture(): Promise<Fixture> {
  const db = getDb();
  // Use SCIFI42 — the seed has no active voting round there, so we can create
  // our own without colliding with voting-sidebar.spec.ts which depends on
  // the WEDREADS seed round being intact.
  const club = await db.club.findUniqueOrThrow({ where: { code: "SCIFI42" } });
  const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
  const books = await db.book.findMany({ take: 3 });
  if (books.length < 3) throw new Error("Need 3 seeded books for voting fixture");

  const round = await db.votingRound.create({
    data: {
      clubId: club.id,
      status: "voting",
      maxApprovalsPerMember: 3,
      createdBy: alice.id,
    },
  });

  const noms = await Promise.all(
    books.map((book) =>
      db.nomination.create({
        data: { roundId: round.id, bookId: book.id, nominatedBy: alice.id },
      }),
    ),
  );

  return {
    clubId: club.id,
    roundId: round.id,
    noms: { dune: noms[0].id, leftHand: noms[1].id, kindred: noms[2].id },
    cleanup: async () => {
      await db.vote.deleteMany({ where: { roundId: round.id } });
      await db.nomination.deleteMany({ where: { roundId: round.id } });
      await db.bookSelection.deleteMany({ where: { roundId: round.id } });
      await db.votingRound.deleteMany({ where: { id: round.id } });
    },
  };
}

async function castPriorVotes(roundId: string, userEmail: string, nominationIds: string[]) {
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({ where: { email: userEmail } });
  await db.vote.deleteMany({ where: { roundId, userId: user.id } });
  if (nominationIds.length > 0) {
    await db.vote.createMany({
      data: nominationIds.map((nominationId) => ({
        roundId,
        nominationId,
        userId: user.id,
      })),
    });
  }
}

async function readTurnoutCount(page: import("@playwright/test").Page): Promise<number> {
  // Voter turnout card text: "{voterCount}of {memberCount} have voted"
  // (the visual gap between count and "of" is via CSS margin, not whitespace)
  const text = await page.getByTestId("voter-turnout").innerText();
  const match = text.match(/(\d+)\s*of\s+\d+\s+have voted/);
  if (!match) throw new Error(`Could not parse turnout from: ${text}`);
  return parseInt(match[1], 10);
}

test.describe("Vote persistence — prior selections on page load", () => {
  // @spec VOTE-UI-PRIOR-VOTES-001
  test("returning voter sees their prior selections pre-checked", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      // Dave votes for Dune + Kindred via the DB, then loads the page.
      await castPriorVotes(fixture.roundId, "dave@example.com", [
        fixture.noms.dune,
        fixture.noms.kindred,
      ]);
      await loginAs(page, "dave@example.com");

      await page.goto(`/clubs/${fixture.clubId}/vote`);
      await expect(page.getByTestId("voting-phase")).toBeVisible();

      // The picks-pill counter reflects the loaded selections (2/3).
      await expect(page.getByTestId("approval-pill")).toContainText("2/3");
      // Approval dots in the sidebar show two filled.
      const filledDots = page.locator('[data-testid="approval-dot"][data-filled="true"]');
      await expect(filledDots).toHaveCount(2);
    } finally {
      await fixture.cleanup();
    }
  });

  // @spec VOTE-UI-PRIOR-VOTES-001
  test("first-time voter sees no selections pre-checked", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${fixture.clubId}/vote`);
      await expect(page.getByTestId("voting-phase")).toBeVisible();

      await expect(page.getByTestId("approval-pill")).toContainText("0/3");
      const filledDots = page.locator('[data-testid="approval-dot"][data-filled="true"]');
      await expect(filledDots).toHaveCount(0);
    } finally {
      await fixture.cleanup();
    }
  });

  // @spec VOTE-UI-PRIOR-VOTES-002
  test("submit button reads 'Update N?' on page load when prior votes exist", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      await castPriorVotes(fixture.roundId, "dave@example.com", [fixture.noms.dune]);
      await loginAs(page, "dave@example.com");

      await page.goto(`/clubs/${fixture.clubId}/vote`);
      await expect(page.getByTestId("submit-votes-btn")).toContainText(/Voted.*Update 1/);
    } finally {
      await fixture.cleanup();
    }
  });

  // @spec VOTE-UI-PRIOR-VOTES-002
  test("'You voted previously' hint is visible when prior votes exist", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      await castPriorVotes(fixture.roundId, "dave@example.com", [fixture.noms.dune]);
      await loginAs(page, "dave@example.com");

      await page.goto(`/clubs/${fixture.clubId}/vote`);
      await expect(page.getByTestId("prior-vote-hint")).toBeVisible();
      await expect(page.getByTestId("prior-vote-hint")).toContainText(/voted previously/i);
    } finally {
      await fixture.cleanup();
    }
  });

  // @spec VOTE-UI-PRIOR-VOTES-002
  test("first-time voter does NOT see the prior-vote hint", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${fixture.clubId}/vote`);
      await expect(page.getByTestId("voting-phase")).toBeVisible();
      await expect(page.getByTestId("prior-vote-hint")).toHaveCount(0);
    } finally {
      await fixture.cleanup();
    }
  });
});

test.describe("Vote persistence — live turnout updates", () => {
  // @spec VOTE-UI-TURNOUT-LIVE-001, VOTE-UI-TURNOUT-CHANGE-COUNT-001
  test("first vote increments the turnout card without a manual page reload", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${fixture.clubId}/vote`);

      const initialTurnout = await readTurnoutCount(page);
      expect(initialTurnout).toBe(0);

      await page.getByTestId(`nomination-${fixture.noms.dune}`).click();
      await page.getByTestId("submit-votes-btn").click();
      await expect(page.getByTestId("vote-success")).toBeVisible({ timeout: 10000 });

      // Wait for the server-rendered turnout card to refresh in place.
      await expect.poll(() => readTurnoutCount(page), { timeout: 10000 }).toBe(1);
    } finally {
      await fixture.cleanup();
    }
  });

  // @spec VOTE-UI-TURNOUT-CHANGE-COUNT-001
  test("update vote leaves turnout count unchanged", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      // Dave is already a voter with 1 prior vote.
      await castPriorVotes(fixture.roundId, "dave@example.com", [fixture.noms.dune]);
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${fixture.clubId}/vote`);

      const before = await readTurnoutCount(page);
      expect(before).toBe(1);

      // Toggle off Dune, toggle on Kindred — net selection change, but still 1 voter.
      await page.getByTestId(`nomination-${fixture.noms.dune}`).click();
      await page.getByTestId(`nomination-${fixture.noms.kindred}`).click();
      await page.getByTestId("submit-votes-btn").click();
      await expect(page.getByTestId("vote-success")).toBeVisible({ timeout: 10000 });

      // Turnout should remain 1 — same distinct voter, different picks.
      await expect.poll(() => readTurnoutCount(page), { timeout: 10000 }).toBe(1);
    } finally {
      await fixture.cleanup();
    }
  });
});

test.describe("Vote persistence — distinct success messages", () => {
  // @spec VOTE-UI-UPDATE-CONFIRM-001
  test("first submit shows 'recorded'", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${fixture.clubId}/vote`);

      await page.getByTestId(`nomination-${fixture.noms.dune}`).click();
      await page.getByTestId("submit-votes-btn").click();

      await expect(page.getByTestId("vote-success")).toContainText(/recorded/i, {
        timeout: 10000,
      });
    } finally {
      await fixture.cleanup();
    }
  });

  // @spec VOTE-UI-UPDATE-CONFIRM-001
  test("subsequent submit shows 'updated'", async ({ page }) => {
    const fixture = await createVotingRoundFixture();
    try {
      // Pre-cast a vote so any subsequent submit is an update.
      await castPriorVotes(fixture.roundId, "dave@example.com", [fixture.noms.dune]);
      await loginAs(page, "dave@example.com");
      await page.goto(`/clubs/${fixture.clubId}/vote`);

      // Toggle a different nomination and submit (this is an update).
      await page.getByTestId(`nomination-${fixture.noms.kindred}`).click();
      await page.getByTestId("submit-votes-btn").click();

      await expect(page.getByTestId("vote-success")).toContainText(/updated/i, {
        timeout: 10000,
      });
    } finally {
      await fixture.cleanup();
    }
  });
});
