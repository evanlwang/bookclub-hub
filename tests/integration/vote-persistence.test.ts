// @spec VOTE-DATA-VOTE-PERSIST-001, VOTE-API-MY-VOTES-001, VOTE-UI-PRIOR-VOTES-001, VOTE-UI-TURNOUT-CHANGE-COUNT-001, VOTE-API-VISIBILITY-001
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, leftHand, kindred, insertAllBooks } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { resetEmailCalls } from "@/server/services/email";
import { derivePriorVotes } from "@/lib/voting/prior-votes";

const db = getTestDb();

/**
 * Test fixture: club with three nominations advanced to voting phase.
 * Returns the nomination IDs and authenticated callers for each user role.
 */
async function setupVotingRound() {
  const admin = await createAuthenticatedCaller(db, alice);
  const { round } = await admin.rounds.create({ clubId: wedReads.id });

  for (const bookId of [dune.id, leftHand.id, kindred.id]) {
    await admin.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId,
    });
  }

  await admin.rounds.advance({ clubId: wedReads.id, roundId: round.id });

  const nominations = await db.nomination.findMany({
    where: { roundId: round.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    roundId: round.id,
    nomDune: nominations.find((n) => n.bookId === dune.id)!.id,
    nomLeftHand: nominations.find((n) => n.bookId === leftHand.id)!.id,
    nomKindred: nominations.find((n) => n.bookId === kindred.id)!.id,
  };
}

describe("vote persistence and turnout semantics", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertAllBooks(db);
    // Members: alice (owner), bob (admin), carol+dave (members) → 4 members
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol, dave]);
    resetEmailCalls();
  });

  describe("rounds.get returns the calling user's votes during voting phase", () => {
    // @spec VOTE-API-MY-VOTES-001
    it("returns the user's votes attached to each nomination they approved", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);

      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomDune, fixture.nomKindred],
      });

      const { round } = await aliceCaller.rounds.get({
        clubId: wedReads.id,
        roundId: fixture.roundId,
      });

      const myPriorVotes = derivePriorVotes(round.nominations, alice.id);
      expect(myPriorVotes).toHaveLength(2);
      expect(myPriorVotes).toContain(fixture.nomDune);
      expect(myPriorVotes).toContain(fixture.nomKindred);
    });

    // @spec VOTE-UI-PRIOR-VOTES-001
    it("returns no votes for a user who has not voted yet", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);

      const { round } = await aliceCaller.rounds.get({
        clubId: wedReads.id,
        roundId: fixture.roundId,
      });

      expect(derivePriorVotes(round.nominations, alice.id)).toEqual([]);
    });

    // @spec VOTE-API-VISIBILITY-001
    it("does NOT leak other members' votes into the calling user's view", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      // Bob votes for Dune; Alice votes for nothing.
      await bobCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomDune],
      });

      const { round: aliceView } = await aliceCaller.rounds.get({
        clubId: wedReads.id,
        roundId: fixture.roundId,
      });

      // From Alice's perspective, no nomination has any votes attached.
      const totalVotesVisibleToAlice = aliceView.nominations.reduce(
        (acc, n) => acc + (n.votes?.length ?? 0),
        0,
      );
      expect(totalVotesVisibleToAlice).toBe(0);
      expect(derivePriorVotes(aliceView.nominations, alice.id)).toEqual([]);

      // Bob, on the other hand, sees his own vote.
      const { round: bobView } = await bobCaller.rounds.get({
        clubId: wedReads.id,
        roundId: fixture.roundId,
      });
      expect(derivePriorVotes(bobView.nominations, bob.id)).toEqual([
        fixture.nomDune,
      ]);
    });
  });

  describe("vote persistence — replace-on-resubmit", () => {
    // @spec VOTE-DATA-VOTE-PERSIST-001
    it("replaces prior votes when the same user submits a different selection", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);

      // First submit: approve Dune + Kindred
      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomDune, fixture.nomKindred],
      });

      // Second submit: approve only LeftHand
      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomLeftHand],
      });

      const persisted = await db.vote.findMany({
        where: { roundId: fixture.roundId, userId: alice.id },
      });
      expect(persisted).toHaveLength(1);
      expect(persisted[0].nominationId).toBe(fixture.nomLeftHand);
    });

    // @spec VOTE-DATA-VOTE-PERSIST-001
    it("is safe to resubmit the same selection (idempotent from caller perspective)", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);

      const selection = [fixture.nomDune, fixture.nomKindred];

      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: selection,
      });
      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: selection,
      });

      const persisted = await db.vote.findMany({
        where: { roundId: fixture.roundId, userId: alice.id },
      });
      expect(persisted).toHaveLength(2);
      expect(persisted.map((v) => v.nominationId).sort()).toEqual(
        selection.slice().sort(),
      );
    });
  });

  describe("voter turnout semantics (distinct user count)", () => {
    // @spec VOTE-UI-TURNOUT-CHANGE-COUNT-001
    it("first vote increments distinct voter count by one", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);

      const beforeCount = await db.vote
        .findMany({
          where: { roundId: fixture.roundId },
          select: { userId: true },
          distinct: ["userId"],
        })
        .then((r) => r.length);
      expect(beforeCount).toBe(0);

      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomDune],
      });

      const afterCount = await db.vote
        .findMany({
          where: { roundId: fixture.roundId },
          select: { userId: true },
          distinct: ["userId"],
        })
        .then((r) => r.length);
      expect(afterCount).toBe(1);
    });

    // @spec VOTE-UI-TURNOUT-CHANGE-COUNT-001
    it("update vote leaves distinct voter count unchanged", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);

      // First submit puts alice in the distinct-voter set.
      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomDune],
      });

      // Updating her selection should NOT change the count.
      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomKindred, fixture.nomLeftHand],
      });

      const distinctCount = await db.vote
        .findMany({
          where: { roundId: fixture.roundId },
          select: { userId: true },
          distinct: ["userId"],
        })
        .then((r) => r.length);
      expect(distinctCount).toBe(1);
    });

    // @spec VOTE-UI-TURNOUT-CHANGE-COUNT-001
    it("a different user voting increments the distinct voter count", async () => {
      const fixture = await setupVotingRound();
      const aliceCaller = await createAuthenticatedCaller(db, alice);
      const bobCaller = await createAuthenticatedCaller(db, bob);

      await aliceCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomDune],
      });
      await bobCaller.votes.submit({
        clubId: wedReads.id,
        roundId: fixture.roundId,
        nominationIds: [fixture.nomKindred],
      });

      const distinctCount = await db.vote
        .findMany({
          where: { roundId: fixture.roundId },
          select: { userId: true },
          distinct: ["userId"],
        })
        .then((r) => r.length);
      expect(distinctCount).toBe(2);
    });
  });
});
