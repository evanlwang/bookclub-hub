// @spec VOTE-API-TURNOUT-001
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, dave, eve, insertAllUsers } from "@tests/fixtures/users";
import { wedReads, sciFiExplorers } from "@tests/fixtures/clubs";
import { dune, leftHand, insertAllBooks } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { resetEmailCalls } from "@/server/services/email";

const db = getTestDb();

async function createVotingRound() {
  const admin = await createAuthenticatedCaller(db, alice);
  const { round } = await admin.rounds.create({ clubId: wedReads.id });
  await admin.nominations.create({
    clubId: wedReads.id,
    roundId: round.id,
    bookId: dune.id,
  });
  await admin.nominations.create({
    clubId: wedReads.id,
    roundId: round.id,
    bookId: leftHand.id,
  });
  await admin.rounds.advance({ clubId: wedReads.id, roundId: round.id });
  const detail = await admin.rounds.get({ clubId: wedReads.id, roundId: round.id });
  return { round, nominations: detail.round.nominations };
}

describe("rounds.turnout", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertAllBooks(db);
    // 4 members: alice (owner), bob (admin), carol + dave (members)
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol, dave]);
    resetEmailCalls();
  });

  // @spec VOTE-API-TURNOUT-001
  it("returns voterCount, memberCount, and status for a voting round", async () => {
    const { round } = await createVotingRound();
    const caller = await createAuthenticatedCaller(db, carol);

    const turnout = await caller.rounds.turnout({
      clubId: wedReads.id,
      roundId: round.id,
    });

    expect(turnout).toEqual({
      voterCount: 0,
      memberCount: 4,
      status: "voting",
    });
  });

  // @spec VOTE-API-TURNOUT-001 — distinct-userId semantics (VOTE-UI-TURNOUT-CHANGE-COUNT-001 at the API level)
  it("counts distinct voters: first vote increments, re-vote does not", async () => {
    const { round, nominations } = await createVotingRound();
    const carolCaller = await createAuthenticatedCaller(db, carol);

    await carolCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nominations[0].id],
    });
    let turnout = await carolCaller.rounds.turnout({
      clubId: wedReads.id,
      roundId: round.id,
    });
    expect(turnout.voterCount).toBe(1);

    // Re-submit (replace votes) — still one distinct voter.
    await carolCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nominations[1].id],
    });
    turnout = await carolCaller.rounds.turnout({
      clubId: wedReads.id,
      roundId: round.id,
    });
    expect(turnout.voterCount).toBe(1);

    const daveCaller = await createAuthenticatedCaller(db, dave);
    await daveCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nominations[0].id],
    });
    turnout = await daveCaller.rounds.turnout({
      clubId: wedReads.id,
      roundId: round.id,
    });
    expect(turnout.voterCount).toBe(2);
  });

  // @spec VOTE-API-TURNOUT-001 — status lets the client detect close/cancel by an admin
  it("reflects the round status after an admin closes voting", async () => {
    const { round, nominations } = await createVotingRound();
    const admin = await createAuthenticatedCaller(db, alice);
    const carolCaller = await createAuthenticatedCaller(db, carol);

    await carolCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nominations[0].id],
    });
    await admin.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const turnout = await carolCaller.rounds.turnout({
      clubId: wedReads.id,
      roundId: round.id,
    });
    expect(turnout.status).toBe("decided");
  });

  // @spec VOTE-API-TURNOUT-001 — cross-club guard
  it("throws NOT_FOUND when the round belongs to a different club", async () => {
    const { round } = await createVotingRound();
    // alice owns a second club; querying wedReads' round through it must 404.
    await seedClubWithMembers(db, sciFiExplorers, alice, [], []);
    const caller = await createAuthenticatedCaller(db, alice);

    await expect(
      caller.rounds.turnout({ clubId: sciFiExplorers.id, roundId: round.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  // @spec VOTE-API-TURNOUT-001 — member-scoped
  it("throws FORBIDDEN for non-members", async () => {
    const { round } = await createVotingRound();
    const outsider = await createAuthenticatedCaller(db, eve);

    await expect(
      outsider.rounds.turnout({ clubId: wedReads.id, roundId: round.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
