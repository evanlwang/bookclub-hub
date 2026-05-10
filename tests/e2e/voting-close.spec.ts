// @spec VOTE-UI-CLOSE-002, VOTE-UI-CLOSE-003, VOTE-UI-CLOSE-004, VOTE-UI-CLOSE-005, VOTE-UI-CLOSE-006, VOTE-UI-CLOSE-007, VOTE-UI-CANCEL-002, VOTE-UI-DEC-CTA-MEETING-001, VOTE-UI-DEC-CTA-OPENLIB-001, VOTE-API-003, VOTE-API-004
import { test, expect } from "@playwright/test";
import { loginAs, getDb } from "./helpers";

test.describe.configure({ mode: "serial" });

/**
 * These tests run on a dedicated round in SCIFI42 (bob=owner).
 * Each test seeds the round into the state it needs.
 */
async function teardownRoundsFor(clubId: string) {
  const db = getDb();
  const rounds = await db.votingRound.findMany({ where: { clubId } });
  for (const r of rounds) {
    await db.vote.deleteMany({ where: { nomination: { roundId: r.id } } });
    await db.nomination.deleteMany({ where: { roundId: r.id } });
  }
  await db.bookSelection.deleteMany({ where: { clubId } });
  await db.votingRound.deleteMany({ where: { clubId } });
}

async function seedVotingRound(opts: {
  clubId: string;
  ownerId: string;
  voterIds: string[];
  approvalsPerVoter: number; // 1..3
}) {
  const db = getDb();
  const books = await db.book.findMany({ take: 3 });
  if (books.length < 3) throw new Error("Need at least 3 books in seed data");

  const round = await db.votingRound.create({
    data: { clubId: opts.clubId, status: "voting", createdBy: opts.ownerId },
  });

  // Create 3 nominations with deterministic createdAt order so tie-breaks are predictable.
  const nominations = [];
  for (let i = 0; i < 3; i++) {
    const nom = await db.nomination.create({
      data: {
        roundId: round.id,
        bookId: books[i].id,
        nominatedBy: opts.ownerId,
        createdAt: new Date(Date.now() + i * 1000),
      },
    });
    nominations.push(nom);
  }

  // Each voter approves the first `approvalsPerVoter` nominations so the leader is deterministic.
  for (const userId of opts.voterIds) {
    for (let k = 0; k < opts.approvalsPerVoter; k++) {
      await db.vote.create({
        data: { roundId: round.id, nominationId: nominations[k].id, userId },
      });
    }
  }

  return { round, nominations, books };
}

test.describe("Voting Close & Cancel", () => {
  // Dedicated club so this file doesn't race with voting-phases.spec.ts (which uses SCIFI42).
  const clubCode = `VC${Date.now().toString().slice(-6)}`;
  let clubId = "";
  let bobId = "";
  let aliceId = "";

  test.beforeAll(async () => {
    const db = getDb();
    const bob = await db.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const dave = await db.user.findUniqueOrThrow({ where: { email: "dave@example.com" } });
    bobId = bob.id;
    aliceId = alice.id;

    const club = await db.club.create({
      data: {
        name: `VotingClose Test ${clubCode}`,
        code: clubCode,
        createdBy: bob.id,
      },
    });
    clubId = club.id;
    await db.membership.createMany({
      data: [
        { clubId: club.id, userId: bob.id, role: "owner" },
        { clubId: club.id, userId: alice.id, role: "admin" },
        { clubId: club.id, userId: dave.id, role: "member" },
      ],
    });
  });

  test.beforeEach(async () => {
    await teardownRoundsFor(clubId);
  });

  test.afterAll(async () => {
    const db = getDb();
    await teardownRoundsFor(clubId);
    await db.membership.deleteMany({ where: { clubId } });
    await db.club.delete({ where: { id: clubId } }).catch(() => {});
  });

  // @spec VOTE-UI-CLOSE-002
  test("admin sees Close + Cancel actions during voting; member does not", async ({ page, browser }) => {
    await seedVotingRound({ clubId, ownerId: bobId, voterIds: [bobId], approvalsPerVoter: 1 });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("close-voting-btn")).toBeVisible();
    await expect(page.getByTestId("cancel-round-btn")).toBeVisible();

    // Dave is just a member.
    const ctx = await browser.newContext();
    const memberPage = await ctx.newPage();
    await loginAs(memberPage, "dave@example.com");
    await memberPage.goto(`/clubs/${clubId}/vote`);
    await expect(memberPage.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });
    await expect(memberPage.getByTestId("close-voting-btn")).toHaveCount(0);
    await expect(memberPage.getByTestId("cancel-round-btn")).toHaveCount(0);
    await ctx.close();
  });

  // @spec VOTE-UI-CLOSE-007
  test("Close button is disabled with hint when no votes have been cast", async ({ page }) => {
    await seedVotingRound({ clubId, ownerId: bobId, voterIds: [], approvalsPerVoter: 0 });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);

    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("close-voting-btn")).toBeDisabled();
    await expect(page.getByTestId("close-disabled-hint")).toContainText(/No votes cast/i);
  });

  // @spec VOTE-UI-CLOSE-003, VOTE-UI-CLOSE-004, VOTE-UI-CLOSE-006, VOTE-API-003
  test("clicking Close opens preview, confirm transitions to decided & sets current book", async ({ page }) => {
    // Bob and Alice both approve nomination #1 (clear leader).
    const seeded = await seedVotingRound({
      clubId,
      ownerId: bobId,
      voterIds: [bobId, aliceId],
      approvalsPerVoter: 1,
    });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);
    await expect(page.getByTestId("voting-phase")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("close-voting-btn").click();
    await expect(page.getByTestId("close-voting-dialog")).toBeVisible();

    // Top row marked as the new current book.
    await expect(page.getByTestId("close-preview-row-0")).toContainText(seeded.books[0].title);
    await expect(page.getByTestId("close-preview-leader-tag")).toContainText(/current book/i);
    // No tie note since this is a clear winner.
    await expect(page.getByTestId("close-preview-tie-note")).toHaveCount(0);

    await page.getByTestId("close-voting-confirm").click();

    await expect(page.getByTestId("decided-phase")).toBeVisible({ timeout: 10000 });

    // Server-side: BookSelection.isCurrent is set to the winner.
    const db = getDb();
    const sel = await db.bookSelection.findFirst({
      where: { clubId, isCurrent: true },
      include: { book: true },
    });
    expect(sel?.book.title).toBe(seeded.books[0].title);
  });

  // @spec VOTE-UI-DEC-CTA-MEETING-001, VOTE-UI-DEC-CTA-OPENLIB-001
  test("winner banner exposes 'Set up first meeting' and 'View on Open Library' CTAs", async ({ page }) => {
    const db = getDb();
    const seeded = await seedVotingRound({
      clubId,
      ownerId: bobId,
      voterIds: [bobId],
      approvalsPerVoter: 1,
    });

    // Transition the round to decided directly so we land on the winner banner
    // without going through the close-voting dialog (already covered above).
    await db.votingRound.update({
      where: { id: seeded.round.id },
      data: { status: "decided", winningBookId: seeded.books[0].id },
    });
    await db.bookSelection.create({
      data: { clubId, bookId: seeded.books[0].id, isCurrent: true },
    });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);
    await expect(page.getByTestId("decided-phase")).toBeVisible({ timeout: 10000 });

    const meetingCta = page.getByTestId("winner-cta-meeting");
    await expect(meetingCta).toBeVisible();
    await expect(meetingCta).toHaveAttribute("href", `/clubs/${clubId}/meetings`);

    const winnerBook = seeded.books[0];
    if (winnerBook.openLibraryId) {
      const openLibCta = page.getByTestId("winner-cta-openlib");
      await expect(openLibCta).toBeVisible();
      await expect(openLibCta).toHaveAttribute(
        "href",
        `https://openlibrary.org${winnerBook.openLibraryId}`
      );
      await expect(openLibCta).toHaveAttribute("target", "_blank");
      await expect(openLibCta).toHaveAttribute("rel", /noreferrer|noopener/);
    } else {
      // Manual entries without an Open Library ID SHALL hide the CTA.
      await expect(page.getByTestId("winner-cta-openlib")).toHaveCount(0);
    }
  });

  // @spec VOTE-UI-CLOSE-005
  test("tie at the top surfaces 'earliest nomination wins' note", async ({ page }) => {
    // Bob approves nominations 0 and 1 → tie at 1 vote each.
    const seeded = await seedVotingRound({
      clubId,
      ownerId: bobId,
      voterIds: [bobId],
      approvalsPerVoter: 2,
    });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);
    await page.getByTestId("close-voting-btn").click();
    await expect(page.getByTestId("close-voting-dialog")).toBeVisible();
    await expect(page.getByTestId("close-preview-tie-note")).toContainText(
      /earliest nomination wins/i
    );
    // First-seeded nomination is the leader (its createdAt is earlier).
    await expect(page.getByTestId("close-preview-row-0")).toContainText(seeded.books[0].title);
  });

  // @spec VOTE-UI-CANCEL-002, VOTE-API-004
  test("cancel round dialog requires typed confirmation, then cancels", async ({ page }) => {
    const seeded = await seedVotingRound({
      clubId,
      ownerId: bobId,
      voterIds: [bobId],
      approvalsPerVoter: 1,
    });

    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/vote`);
    await page.getByTestId("cancel-round-btn").click();
    await expect(page.getByTestId("cancel-round-dialog")).toBeVisible();

    // Confirm button blocked until "cancel" is typed.
    await expect(page.getByTestId("cancel-round-confirm")).toBeDisabled();
    await page.getByTestId("cancel-confirm-input").fill("cancel");
    await expect(page.getByTestId("cancel-round-confirm")).toBeEnabled();
    await page.getByTestId("cancel-round-confirm").click();

    await expect(page.getByTestId("cancel-round-dialog")).toHaveCount(0, { timeout: 10000 });

    // Server-side: round status flipped to cancelled, votes/nominations gone.
    const db = getDb();
    const round = await db.votingRound.findUniqueOrThrow({ where: { id: seeded.round.id } });
    expect(round.status).toBe("cancelled");
    const noms = await db.nomination.count({ where: { roundId: seeded.round.id } });
    expect(noms).toBe(0);
  });
});
