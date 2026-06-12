// @spec CLUB-API-NAVSTATE-001
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, eve, insertAllUsers } from "@tests/fixtures/users";
import { wedReads, sciFiExplorers } from "@tests/fixtures/clubs";
import { dune, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { resetEmailCalls } from "@/server/services/email";

const db = getTestDb();

const futureSlots = [
  { time: new Date(Date.now() + 24 * 3600_000), durationMinutes: 60 },
  { time: new Date(Date.now() + 48 * 3600_000), durationMinutes: 60 },
];

describe("clubs.navState", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    await seedClubWithMembers(db, wedReads, alice, [], [bob]);
    resetEmailCalls();
  });

  // @spec CLUB-API-NAVSTATE-001
  it("returns all-quiet state for a club with no activity", async () => {
    const caller = await createAuthenticatedCaller(db, bob);
    const nav = await caller.clubs.navState({ clubId: wedReads.id });

    expect(nav.hasActiveVote).toBe(false);
    expect(nav.hasUnrespondedMeeting).toBe(false);
    expect(nav.unreadDiscussionCounts).toEqual({ [wedReads.id]: 0 });
  });

  // @spec CLUB-API-NAVSTATE-001
  it("flags an active vote while a round is nominating or voting", async () => {
    const admin = await createAuthenticatedCaller(db, alice);
    const caller = await createAuthenticatedCaller(db, bob);

    await admin.rounds.create({ clubId: wedReads.id });
    const nav = await caller.clubs.navState({ clubId: wedReads.id });
    expect(nav.hasActiveVote).toBe(true);
  });

  // @spec CLUB-API-NAVSTATE-001
  it("flags an unresponded proposed meeting and clears it after the viewer responds", async () => {
    const admin = await createAuthenticatedCaller(db, alice);
    const caller = await createAuthenticatedCaller(db, bob);

    const { meeting } = await admin.meetings.create({
      clubId: wedReads.id,
      slots: futureSlots,
    });

    let nav = await caller.clubs.navState({ clubId: wedReads.id });
    expect(nav.hasUnrespondedMeeting).toBe(true);

    const list = await caller.meetings.list({ clubId: wedReads.id });
    const slotId = list.find((m) => m.id === meeting.id)!.slots[0].id;
    await caller.meetings.submitAvailability({
      clubId: wedReads.id,
      meetingId: meeting.id,
      responses: [{ slotId, status: "available" }],
    });

    nav = await caller.clubs.navState({ clubId: wedReads.id });
    expect(nav.hasUnrespondedMeeting).toBe(false);
  });

  // @spec CLUB-API-NAVSTATE-001 — cross-club unread map (feeds switcher dots, CLUB-NAV-UNREAD-001)
  it("returns the cross-club unread map and clears after markDiscussionsVisited", async () => {
    await seedClubWithMembers(db, sciFiExplorers, alice, [], [bob]);
    const admin = await createAuthenticatedCaller(db, alice);
    const caller = await createAuthenticatedCaller(db, bob);

    await admin.threads.create({
      clubId: sciFiExplorers.id,
      bookId: dune.id,
      body: "First impressions of the sandworms?",
      chapterTag: "Chapter 1",
    });

    let nav = await caller.clubs.navState({ clubId: wedReads.id });
    expect(nav.unreadDiscussionCounts[sciFiExplorers.id]).toBe(1);
    expect(nav.unreadDiscussionCounts[wedReads.id]).toBe(0);

    await caller.clubs.markDiscussionsVisited({ clubId: sciFiExplorers.id });
    nav = await caller.clubs.navState({ clubId: wedReads.id });
    expect(nav.unreadDiscussionCounts[sciFiExplorers.id]).toBe(0);
  });

  // @spec CLUB-API-NAVSTATE-001 — member-scoped
  it("throws FORBIDDEN for non-members", async () => {
    const outsider = await createAuthenticatedCaller(db, eve);
    await expect(
      outsider.clubs.navState({ clubId: wedReads.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
