// @spec VOTE-NOTIFY-001, VOTE-NOTIFY-002, VOTE-NOTIFY-004, MEET-NOTIFY-001, MEET-NOTIFY-003, MEET-NOTIFY-005
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, leftHand, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { getEmailCalls, resetEmailCalls } from "@/server/services/email";

const db = getTestDb();

describe("notifications", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    await insertBook(db, leftHand);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    resetEmailCalls();
  });

  it("sends email when round enters nominating", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    await caller.rounds.create({ clubId: wedReads.id });

    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].to).toHaveLength(3); // 3 members
    expect(calls[0].subject).toContain(wedReads.name);
  });

  it("sends email when round advances to voting", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await caller.rounds.create({ clubId: wedReads.id });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    // @spec VOTE-API-ADVANCE-MINNOMS-001 — advance requires ≥2 nominations.
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: leftHand.id,
    });

    resetEmailCalls();
    await caller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].subject).toContain("Voting");
  });

  it("sends email when round decided with winner", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { round } = await caller.rounds.create({ clubId: wedReads.id });
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: dune.id,
    });
    // @spec VOTE-API-ADVANCE-MINNOMS-001 — advance requires ≥2 nominations.
    await memberCaller.nominations.create({
      clubId: wedReads.id,
      roundId: round.id,
      bookId: leftHand.id,
    });
    await caller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const nom = await db.nomination.findFirst({
      where: { roundId: round.id, bookId: dune.id },
    });
    await memberCaller.votes.submit({
      clubId: wedReads.id,
      roundId: round.id,
      nominationIds: [nom!.id],
    });

    resetEmailCalls();
    await caller.rounds.advance({ clubId: wedReads.id, roundId: round.id });

    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].subject).toContain("Dune");
  });

  it("sends email when meeting proposed", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    resetEmailCalls();

    await caller.meetings.create({
      clubId: wedReads.id,
      title: "Dune Discussion",
      slots: [
        { time: new Date(Date.now() + 7 * 86_400_000) },
        { time: new Date(Date.now() + 9 * 86_400_000) },
      ],
    });

    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].subject).toContain("Dune Discussion");
  });

  it("sends email when meeting confirmed", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      title: "Discussion",
      slots: [
        { time: new Date(Date.now() + 7 * 86_400_000) },
        { time: new Date(Date.now() + 9 * 86_400_000) },
      ],
    });

    resetEmailCalls();
    await caller.meetings.confirm({
      clubId: wedReads.id,
      meetingId: meeting.id,
      slotId: meeting.slots[0].id,
    });

    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].subject).toContain("confirmed");
  });

  it("sends email when meeting cancelled", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      title: "To Cancel",
      slots: [
        { time: new Date(Date.now() + 7 * 86_400_000) },
        { time: new Date(Date.now() + 9 * 86_400_000) },
      ],
    });

    resetEmailCalls();
    await caller.meetings.cancel({
      clubId: wedReads.id,
      meetingId: meeting.id,
    });

    const calls = getEmailCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].subject).toContain("cancelled");
  });
});
