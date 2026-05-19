// @spec VOTE-API-001 through VOTE-API-008, VOTE-BE-001 through VOTE-BE-005, VOTE-DATA-001, VOTE-DATA-002
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, leftHand, kindred, insertAllBooks } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { resetEmailCalls } from "@/server/services/email";

const db = getTestDb();

describe("voting lifecycle", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertAllBooks(db);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol, dave]);
    resetEmailCalls();
  });

  it("full lifecycle: create → nominate → advance → vote → decide", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    // 1. Create round
    const { round } = await adminCaller.rounds.create({
      clubId: wedReads.id,
    });
    expect(round.status).toBe("nominating");

    // 2. Nominate books
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
      pitch: "A classic",
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: leftHand.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: kindred.id,
    });

    // 3. Advance to voting
    const advanceResult = await adminCaller.rounds.advance({
      clubId: wedReads.id,
      roundId: round.id,
    });
    expect(advanceResult.newStatus).toBe("voting");

    // 4. Get nominations for vote IDs
    const nominations = await db.nomination.findMany({
      where: { roundId: round.id },
    });
    const nomDune = nominations.find((n) => n.bookId === dune.id)!;
    const nomKindred = nominations.find((n) => n.bookId === kindred.id)!;
    const nomLeftHand = nominations.find((n) => n.bookId === leftHand.id)!;

    // 5. Submit votes — Dune gets 3, Kindred gets 2, Left Hand gets 1
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    const bobCaller = await createAuthenticatedCaller(db, bob);
    const daveCaller = await createAuthenticatedCaller(db, dave);

    await aliceCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomDune.id, nomKindred.id],
    });
    await bobCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomDune.id, nomLeftHand.id],
    });
    await memberCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomDune.id, nomKindred.id],
    });
    await daveCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomKindred.id],
    });

    // 6. Advance to decided
    const decideResult = await adminCaller.rounds.advance({
      clubId: wedReads.id,
      roundId: round.id,
    });
    expect(decideResult.newStatus).toBe("decided");
    expect(decideResult.winner?.bookId).toBe(dune.id); // 3 votes

    // 7. Verify BookSelection created
    const selection = await db.bookSelection.findFirst({
      where: { clubId: wedReads.id, isCurrent: true },
    });
    expect(selection?.bookId).toBe(dune.id);
  });

  // @spec VOTE-API-DECIDED-FINISHED-001
  it("stamps finishedAt on the prior current selection when a round decides", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    // Seed an existing current selection (Left Hand) with finishedAt unset.
    const prior = await db.bookSelection.create({
      data: {
        clubId: wedReads.id,
        bookId: leftHand.id,
        isCurrent: true,
      },
    });
    expect(prior.finishedAt).toBeNull();

    // Run a round to decided with Dune as the only nominee.
    const { round } = await adminCaller.rounds.create({ clubId: wedReads.id });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    // @spec VOTE-API-ADVANCE-MINNOMS-001 — advance requires ≥2 nominations
    // on the server too, not just in the UI.
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: kindred.id,
    });
    await adminCaller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const noms = await db.nomination.findMany({ where: { roundId: round.id } });
    const nomDune = noms.find((n) => n.bookId === dune.id)!;
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    await aliceCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomDune.id],
    });
    await adminCaller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    // Prior selection: demoted AND stamped with finishedAt.
    const updatedPrior = await db.bookSelection.findUniqueOrThrow({
      where: { id: prior.id },
    });
    expect(updatedPrior.isCurrent).toBe(false);
    expect(updatedPrior.finishedAt).not.toBeNull();
    expect(updatedPrior.finishedAt!.getTime()).toBeGreaterThan(
      prior.selectedAt.getTime()
    );

    // New selection: current and not yet finished.
    const newCurrent = await db.bookSelection.findFirstOrThrow({
      where: { clubId: wedReads.id, isCurrent: true },
    });
    expect(newCurrent.bookId).toBe(dune.id);
    expect(newCurrent.finishedAt).toBeNull();
  });

  // @spec VOTE-API-DECIDED-FINISHED-001
  it("preserves an already-stamped finishedAt on the prior selection", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const previouslyStamped = new Date("2025-01-15T00:00:00Z");
    const prior = await db.bookSelection.create({
      data: {
        clubId: wedReads.id,
        bookId: leftHand.id,
        isCurrent: true,
        finishedAt: previouslyStamped,
      },
    });

    const { round } = await adminCaller.rounds.create({ clubId: wedReads.id });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: kindred.id,
    });
    await adminCaller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const noms = await db.nomination.findMany({ where: { roundId: round.id } });
    const nomDune = noms.find((n) => n.bookId === dune.id)!;
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    await aliceCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomDune.id],
    });
    await adminCaller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const updatedPrior = await db.bookSelection.findUniqueOrThrow({
      where: { id: prior.id },
    });
    // Already stamped — must NOT be overwritten.
    expect(updatedPrior.finishedAt?.getTime()).toBe(previouslyStamped.getTime());
  });

  it("rejects duplicate nomination (CONFLICT)", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await adminCaller.rounds.create({
      clubId: wedReads.id,
    });

    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });

    await expect(
      memberCaller.nominations.create({
        clubId: wedReads.id,
        roundId: round.id,
        bookId: dune.id,
      })
    ).rejects.toThrow("already been nominated");
  });

  it("rejects nomination during voting phase (BAD_REQUEST)", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await adminCaller.rounds.create({
      clubId: wedReads.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    await adminCaller.rounds.advance({
      clubId: wedReads.id,
      roundId: round.id,
    });

    await expect(
      memberCaller.nominations.create({
        clubId: wedReads.id,
        roundId: round.id,
        bookId: leftHand.id,
      })
    ).rejects.toThrow("only accepted during the nominating");
  });

  it("rejects exceeding max_approvals", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await adminCaller.rounds.create({
      clubId: wedReads.id,
      maxApprovalsPerMember: 1,
    });

    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: leftHand.id,
    });

    await adminCaller.rounds.advance({
      clubId: wedReads.id,
      roundId: round.id,
    });

    const nominations = await db.nomination.findMany({
      where: { roundId: round.id },
    });

    await expect(
      memberCaller.votes.submit({
        clubId: wedReads.id,
        roundId: round.id,
        nominationIds: nominations.map((n) => n.id),
      })
    ).rejects.toThrow("Cannot approve more than");
  });

  it("enforces only one active round per club", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    await caller.rounds.create({ clubId: wedReads.id });

    await expect(
      caller.rounds.create({ clubId: wedReads.id })
    ).rejects.toThrow("active voting round already exists");
  });

  it("cancel deletes nominations and votes", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await adminCaller.rounds.create({
      clubId: wedReads.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });

    await adminCaller.rounds.cancel({
      clubId: wedReads.id,
      roundId: round.id,
    });

    const nominations = await db.nomination.count({
      where: { roundId: round.id },
    });
    expect(nominations).toBe(0);

    const updatedRound = await db.votingRound.findUnique({
      where: { id: round.id },
    });
    expect(updatedRound?.status).toBe("cancelled");
  });

  it("vote replacement: submit replaces previous votes", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await adminCaller.rounds.create({
      clubId: wedReads.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: leftHand.id,
    });

    await adminCaller.rounds.advance({
      clubId: wedReads.id,
      roundId: round.id,
    });

    const noms = await db.nomination.findMany({ where: { roundId: round.id } });
    const nomDune = noms.find((n) => n.bookId === dune.id)!;
    const nomLeftHand = noms.find((n) => n.bookId === leftHand.id)!;

    // First vote for Dune
    await memberCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomDune.id],
    });

    // Replace vote: now vote for Left Hand only
    await memberCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nomLeftHand.id],
    });

    const votes = await db.vote.findMany({
      where: { roundId: round.id, userId: carol.id },
    });
    expect(votes).toHaveLength(1);
    expect(votes[0].nominationId).toBe(nomLeftHand.id);
  });
});
