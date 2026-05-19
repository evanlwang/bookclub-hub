// @spec VOTE-API-NOMDELETE-XCLUB-001
// Cross-club isolation for the nominations router.
import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads, sciFiExplorers } from "@tests/fixtures/clubs";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { dune, kindred, insertBook } from "@tests/factories/books";
import { createVotingRound, createNomination } from "@tests/factories/entities";

const db = getTestDb();

describe("nominations — cross-club isolation", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    // Two clubs with no member overlap.
    //   wedReads: alice=owner, bob=admin
    //   sciFi:    dave=owner
    await seedClubWithMembers(db, wedReads, alice, [bob], []);
    await seedClubWithMembers(db, sciFiExplorers, dave, [], []);
    await insertBook(db, dune);
    await insertBook(db, kindred);
  });

  // @spec VOTE-API-NOMDELETE-XCLUB-001
  it("rejects deleting a nomination from a different club, even for an admin of the caller's club", async () => {
    // Dave (owner of sciFi) creates a round in sciFi and nominates a book there.
    const sciFiRound = await createVotingRound(db, {
      clubId: sciFiExplorers.id,
      createdBy: dave.id,
    });
    const victimNomination = await createNomination(db, {
      roundId: sciFiRound.id,
      bookId: dune.id,
      nominatedBy: dave.id,
    });

    // Bob is admin of wedReads but NOT a member of sciFi.
    // He tries to delete dave's nomination by passing his own clubId.
    const bobCaller = await createAuthenticatedCaller(db, bob);
    await expect(
      bobCaller.nominations.delete({
        clubId: wedReads.id,
        nominationId: victimNomination.id,
      })
    ).rejects.toThrow(TRPCError);

    // Confirm the nomination is still present.
    const stillThere = await db.nomination.findUnique({
      where: { id: victimNomination.id },
    });
    expect(stillThere).not.toBeNull();
  });

  // @spec VOTE-API-NOMDELETE-XCLUB-001
  it("rejects deleting a nomination when the nomination's round belongs to a different club", async () => {
    // wedReads has its own round and nomination (authored by bob).
    const wedRound = await createVotingRound(db, {
      clubId: wedReads.id,
      createdBy: alice.id,
    });
    const wedNomination = await createNomination(db, {
      roundId: wedRound.id,
      bookId: kindred.id,
      nominatedBy: bob.id,
    });

    // sciFi also has a round, with a nomination.
    const sciFiRound = await createVotingRound(db, {
      clubId: sciFiExplorers.id,
      createdBy: dave.id,
    });
    const sciFiNomination = await createNomination(db, {
      roundId: sciFiRound.id,
      bookId: dune.id,
      nominatedBy: dave.id,
    });

    // Alice (owner of wedReads) passes wedReads.id but a nominationId from sciFi.
    // The membership/admin checks would otherwise pass against wedReads; the
    // cross-club guard must reject before the authorization logic runs.
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    await expect(
      aliceCaller.nominations.delete({
        clubId: wedReads.id,
        nominationId: sciFiNomination.id,
      })
    ).rejects.toThrow(TRPCError);

    // Both nominations untouched.
    expect(
      await db.nomination.findUnique({ where: { id: sciFiNomination.id } })
    ).not.toBeNull();
    expect(
      await db.nomination.findUnique({ where: { id: wedNomination.id } })
    ).not.toBeNull();
  });

  it("allows deleting a nomination from the caller's own club (regression: guard does not over-block)", async () => {
    // Same-club happy path: admin deletes a member's nomination in their club.
    const wedRound = await createVotingRound(db, {
      clubId: wedReads.id,
      createdBy: alice.id,
    });
    const nomination = await createNomination(db, {
      roundId: wedRound.id,
      bookId: dune.id,
      nominatedBy: bob.id,
    });

    const aliceCaller = await createAuthenticatedCaller(db, alice);
    await expect(
      aliceCaller.nominations.delete({
        clubId: wedReads.id,
        nominationId: nomination.id,
      })
    ).resolves.toEqual({ success: true });

    expect(
      await db.nomination.findUnique({ where: { id: nomination.id } })
    ).toBeNull();
  });
});
