// @spec VOTE-UI-LIVE-POLL-001, DISC-UI-LIVE-001, DISC-UI-LIST-LIVE-001, PROG-DASH-LIVE-001, MEET-UI-LIVE-001, CLUB-NAV-BADGE-LIVE-001
//
// Cross-member liveness: another member's action (simulated by direct DB
// writes — the receiving poll path is identical) appears on an already-open
// page without any reload. The web server runs with
// NEXT_PUBLIC_LIVE_INTERVAL_SCALE=0.15 (playwright.config.ts), so production
// intervals (10–60s) shrink to 1.5–9s here.
import { test, expect } from "@playwright/test";
import { loginAs, getDb } from "./helpers";

const POLL_TIMEOUT = 25_000;

type LiveFixture = {
  clubId: string;
  bookId: string;
  aliceId: string;
  bobId: string;
  cleanup: () => Promise<void>;
};

// Dedicated club per test — WEDREADS is shared across parallel specs.
async function createLiveFixture(opts: { withSelection?: boolean } = {}): Promise<LiveFixture> {
  const db = getDb();
  const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
  const bob = await db.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
  const book = await db.book.findFirstOrThrow();

  const uniqueCode = `LIV${Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, "0")
    .toUpperCase()
    .slice(0, 6)}`;
  const club = await db.club.create({
    data: {
      name: `Live Fixture ${uniqueCode}`,
      code: uniqueCode,
      createdBy: alice.id,
    },
  });
  await db.membership.createMany({
    data: [
      { clubId: club.id, userId: alice.id, role: "owner" },
      { clubId: club.id, userId: bob.id, role: "member" },
    ],
  });
  if (opts.withSelection) {
    await db.bookSelection.create({
      data: { clubId: club.id, bookId: book.id, isCurrent: true },
    });
  }

  return {
    clubId: club.id,
    bookId: book.id,
    aliceId: alice.id,
    bobId: bob.id,
    cleanup: async () => {
      const rounds = await db.votingRound.findMany({
        where: { clubId: club.id },
        select: { id: true },
      });
      const roundIds = rounds.map((r) => r.id);
      await db.vote.deleteMany({ where: { roundId: { in: roundIds } } });
      await db.nomination.deleteMany({ where: { roundId: { in: roundIds } } });
      // Comments, slots, and availability responses cascade from their parents.
      await db.discussionThread.deleteMany({ where: { clubId: club.id } });
      await db.meeting.deleteMany({ where: { clubId: club.id } });
      await db.readingProgress.deleteMany({ where: { clubId: club.id } });
      await db.bookSelection.deleteMany({ where: { clubId: club.id } });
      await db.votingRound.deleteMany({ where: { clubId: club.id } });
      await db.membership.deleteMany({ where: { clubId: club.id } });
      await db.club.deleteMany({ where: { id: club.id } });
    },
  };
}

test.describe("Live updates — other members' actions appear without reload", () => {
  // @spec VOTE-UI-LIVE-POLL-001
  test("turnout card updates when another member votes", async ({ page }) => {
    const f = await createLiveFixture();
    const db = getDb();
    try {
      const round = await db.votingRound.create({
        data: { clubId: f.clubId, status: "voting", createdBy: f.aliceId },
      });
      const books = await db.book.findMany({ take: 2 });
      const noms = await Promise.all(
        books.map((b) =>
          db.nomination.create({
            data: { roundId: round.id, bookId: b.id, nominatedBy: f.aliceId },
          }),
        ),
      );

      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}/vote`);
      await expect(page.getByTestId("voter-turnout")).toContainText("0");

      // Bob votes (server-side) — alice's poll picks it up, no reload.
      await db.vote.create({
        data: { roundId: round.id, nominationId: noms[0].id, userId: f.bobId },
      });
      await expect(page.getByTestId("voter-turnout")).toContainText("1", {
        timeout: POLL_TIMEOUT,
      });
    } finally {
      await f.cleanup();
    }
  });

  // @spec VOTE-UI-NOM-LIVE-001
  test("a nomination from another member appears during the nominating phase", async ({ page }) => {
    const f = await createLiveFixture();
    const db = getDb();
    try {
      const round = await db.votingRound.create({
        data: { clubId: f.clubId, status: "nominating", createdBy: f.aliceId },
      });
      const books = await db.book.findMany({ take: 2 });
      await db.nomination.create({
        data: { roundId: round.id, bookId: books[0].id, nominatedBy: f.aliceId },
      });

      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}/vote`);
      await expect(page.getByText(/1 slip so far/)).toBeVisible();

      await db.nomination.create({
        data: { roundId: round.id, bookId: books[1].id, nominatedBy: f.bobId },
      });
      await expect(page.getByText(/2 slips so far/)).toBeVisible({
        timeout: POLL_TIMEOUT,
      });
    } finally {
      await f.cleanup();
    }
  });

  // @spec DISC-UI-LIVE-001
  test("a new comment from another member appears on the open thread", async ({ page }) => {
    const f = await createLiveFixture({ withSelection: true });
    const db = getDb();
    try {
      const thread = await db.discussionThread.create({
        data: {
          clubId: f.clubId,
          bookId: f.bookId,
          authorId: f.aliceId,
          title: "Live comment fixture",
          body: "Waiting for replies…",
        },
      });

      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}/discussions/${thread.id}`);
      await expect(page.getByTestId("thread-detail")).toBeVisible();

      await db.comment.create({
        data: {
          threadId: thread.id,
          authorId: f.bobId,
          body: "Bob's live reply arrives mid-read",
        },
      });
      await expect(
        page.getByText("Bob's live reply arrives mid-read"),
      ).toBeVisible({ timeout: POLL_TIMEOUT });
    } finally {
      await f.cleanup();
    }
  });

  // @spec DISC-UI-LIST-LIVE-001
  test("a new thread from another member appears in the discussions list", async ({ page }) => {
    const f = await createLiveFixture({ withSelection: true });
    const db = getDb();
    try {
      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}/discussions`);
      await expect(page.getByTestId("chapter-filter")).toBeVisible();

      // Untagged thread → visible regardless of the viewer's spoiler cutoff.
      await db.discussionThread.create({
        data: {
          clubId: f.clubId,
          bookId: f.bookId,
          authorId: f.bobId,
          title: "Live list fixture",
          body: "Bob's brand-new live thread",
        },
      });
      await expect(page.getByText("Bob's brand-new live thread")).toBeVisible({
        timeout: POLL_TIMEOUT,
      });
    } finally {
      await f.cleanup();
    }
  });

  // @spec PROG-DASH-LIVE-001
  test("another member's progress row refreshes on the dashboard", async ({ page }) => {
    const f = await createLiveFixture({ withSelection: true });
    const db = getDb();
    try {
      await db.readingProgress.create({
        data: {
          clubId: f.clubId,
          bookId: f.bookId,
          userId: f.bobId,
          currentPage: 10,
          percentage: 10,
          status: "reading",
        },
      });

      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}/progress`);
      await expect(page.getByTestId(`progress-${f.bobId}`)).toContainText("10");

      await db.readingProgress.update({
        where: {
          clubId_bookId_userId: {
            clubId: f.clubId,
            bookId: f.bookId,
            userId: f.bobId,
          },
        },
        data: { currentPage: 77, percentage: 77 },
      });
      await expect(page.getByTestId(`progress-${f.bobId}`)).toContainText("77", {
        timeout: POLL_TIMEOUT,
      });
    } finally {
      await f.cleanup();
    }
  });

  // @spec MEET-UI-LIVE-001
  test("availability responses from another member fill the proposed-meeting bar", async ({ page }) => {
    const f = await createLiveFixture();
    const db = getDb();
    try {
      const meeting = await db.meeting.create({
        data: {
          clubId: f.clubId,
          title: "Live RSVP fixture",
          status: "proposed",
          createdBy: f.aliceId,
          slots: {
            create: [
              { proposedTime: new Date(Date.now() + 24 * 3600_000), durationMinutes: 60 },
              { proposedTime: new Date(Date.now() + 48 * 3600_000), durationMinutes: 60 },
            ],
          },
        },
        include: { slots: true },
      });

      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}/meetings`);
      const bar = page.getByTestId(`response-progress-${meeting.id}`);
      await expect(bar).toHaveAttribute("data-percentage", "0");

      await db.availabilityResponse.create({
        data: {
          slotId: meeting.slots[0].id,
          userId: f.bobId,
          status: "available",
        },
      });
      // 1 of 2 members responded → 50%.
      await expect(bar).toHaveAttribute("data-percentage", "50", {
        timeout: POLL_TIMEOUT,
      });
    } finally {
      await f.cleanup();
    }
  });

  // @spec CLUB-NAV-BADGE-LIVE-001
  test("the sidebar unread-discussions badge appears when another member posts", async ({ page }) => {
    const f = await createLiveFixture({ withSelection: true });
    const db = getDb();
    try {
      // Alice has visited discussions already — badge starts clear.
      await db.membership.updateMany({
        where: { clubId: f.clubId, userId: f.aliceId },
        data: { lastVisitedDiscussions: new Date() },
      });

      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${f.clubId}`);
      await expect(page.getByTestId("sidebar-nav-discussions")).toBeVisible();
      await expect(page.getByTestId("sidebar-discussions-unread")).toHaveCount(0);

      await db.discussionThread.create({
        data: {
          clubId: f.clubId,
          bookId: f.bookId,
          authorId: f.bobId,
          title: "Live badge fixture",
          body: "Triggers the unread badge",
        },
      });
      await expect(page.getByTestId("sidebar-discussions-unread")).toBeVisible({
        timeout: POLL_TIMEOUT,
      });
    } finally {
      await f.cleanup();
    }
  });
});
