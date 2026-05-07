// @spec MEET-API-001 through MEET-API-005, MEET-DATA-001, MEET-BE-002
// Cross-club / state-machine / temporal-integrity hardening for the meetings router.
import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, dave, insertAllUsers } from "@tests/fixtures/users";
import { wedReads, sciFiExplorers } from "@tests/fixtures/clubs";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { resetEmailCalls, getEmailCalls } from "@/server/services/email";

const db = getTestDb();

const futureA = new Date("2099-05-18T19:00:00Z");
const futureB = new Date("2099-05-20T20:00:00Z");
const futureC = new Date("2099-05-23T14:00:00Z");

describe("meetings — cross-club isolation", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    // Two separate clubs:
    //   wedReads:  alice=owner, bob=admin, carol=member
    //   sciFi:     dave=owner   (no overlap with wedReads members)
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    await seedClubWithMembers(db, sciFiExplorers, dave, [], []);
    resetEmailCalls();
  });

  // @spec MEET-BE-CROSS-001
  it("meetings.confirm rejects a slotId from a different meeting", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    const daveCaller = await createAuthenticatedCaller(db, dave);

    const { meeting: wedMeeting } = await aliceCaller.meetings.create({
      clubId: wedReads.id,
      slots: [{ time: futureA }, { time: futureB }],
    });
    const { meeting: sciFiMeeting } = await daveCaller.meetings.create({
      clubId: sciFiExplorers.id,
      slots: [{ time: futureA }, { time: futureC }],
    });

    // Alice tries to confirm her wedReads meeting using a slot owned by sciFi's meeting.
    await expect(
      aliceCaller.meetings.confirm({
        clubId: wedReads.id,
        meetingId: wedMeeting.id,
        slotId: sciFiMeeting.slots[0].id,
      })
    ).rejects.toThrow(TRPCError);

    const stillProposed = await db.meeting.findUnique({
      where: { id: wedMeeting.id },
    });
    expect(stillProposed?.status).toBe("proposed");
    expect(stillProposed?.confirmedTime).toBeNull();
  });

  // @spec MEET-BE-CROSS-002
  it("meetings.update rejects a meetingId belonging to a different club", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    const daveCaller = await createAuthenticatedCaller(db, dave);

    const { meeting: sciFiMeeting } = await daveCaller.meetings.create({
      clubId: sciFiExplorers.id,
      slots: [{ time: futureA }, { time: futureB }],
    });

    // Alice is admin of wedReads but tries to edit sciFi's meeting via her clubId.
    await expect(
      aliceCaller.meetings.update({
        clubId: wedReads.id,
        meetingId: sciFiMeeting.id,
        title: "pwned",
      })
    ).rejects.toThrow(TRPCError);

    const untouched = await db.meeting.findUnique({
      where: { id: sciFiMeeting.id },
    });
    expect(untouched?.title).toBe(sciFiMeeting.title);
  });

  // @spec MEET-BE-CROSS-003
  it("meetings.cancel rejects a meetingId belonging to a different club", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    const daveCaller = await createAuthenticatedCaller(db, dave);

    const { meeting: sciFiMeeting } = await daveCaller.meetings.create({
      clubId: sciFiExplorers.id,
      slots: [{ time: futureA }, { time: futureB }],
    });

    resetEmailCalls();
    await expect(
      aliceCaller.meetings.cancel({
        clubId: wedReads.id,
        meetingId: sciFiMeeting.id,
      })
    ).rejects.toThrow(TRPCError);

    const untouched = await db.meeting.findUnique({
      where: { id: sciFiMeeting.id },
    });
    expect(untouched?.status).toBe("proposed");
    // No spurious cancellation email should have been sent to either club.
    expect(getEmailCalls()).toHaveLength(0);
  });

  // @spec MEET-BE-CROSS-004
  it("meetings.submitAvailability rejects slotIds not belonging to the supplied meeting", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    const daveCaller = await createAuthenticatedCaller(db, dave);
    const carolCaller = await createAuthenticatedCaller(db, carol);

    const { meeting: wedMeeting } = await aliceCaller.meetings.create({
      clubId: wedReads.id,
      slots: [{ time: futureA }, { time: futureB }],
    });
    const { meeting: sciFiMeeting } = await daveCaller.meetings.create({
      clubId: sciFiExplorers.id,
      slots: [{ time: futureA }, { time: futureC }],
    });

    // Carol is a wedReads member; she tries to write a response against sciFi's slot
    // by piggybacking on a wedReads meetingId.
    await expect(
      carolCaller.meetings.submitAvailability({
        clubId: wedReads.id,
        meetingId: wedMeeting.id,
        responses: [
          {
            slotId: sciFiMeeting.slots[0].id,
            status: "available" as const,
          },
        ],
      })
    ).rejects.toThrow(TRPCError);

    // No row should have been written against the sciFi slot.
    const leaked = await db.availabilityResponse.findMany({
      where: { slotId: sciFiMeeting.slots[0].id },
    });
    expect(leaked).toHaveLength(0);
  });
});

describe("meetings — state-machine guards", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    resetEmailCalls();
  });

  // @spec MEET-BE-STATE-001
  it("meetings.confirm rejects re-confirming a cancelled meeting", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);

    const { meeting } = await aliceCaller.meetings.create({
      clubId: wedReads.id,
      slots: [{ time: futureA }, { time: futureB }],
    });
    await aliceCaller.meetings.cancel({
      clubId: wedReads.id,
      meetingId: meeting.id,
    });

    resetEmailCalls();
    await expect(
      aliceCaller.meetings.confirm({
        clubId: wedReads.id,
        meetingId: meeting.id,
        slotId: meeting.slots[0].id,
      })
    ).rejects.toThrow(TRPCError);

    const after = await db.meeting.findUnique({ where: { id: meeting.id } });
    expect(after?.status).toBe("cancelled");
    // No second confirmation email.
    expect(getEmailCalls()).toHaveLength(0);
  });

  // @spec MEET-BE-STATE-002
  it("meetings.cancel rejects cancelling an already-cancelled meeting (idempotent reject)", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);

    const { meeting } = await aliceCaller.meetings.create({
      clubId: wedReads.id,
      slots: [{ time: futureA }, { time: futureB }],
    });
    await aliceCaller.meetings.cancel({
      clubId: wedReads.id,
      meetingId: meeting.id,
    });

    resetEmailCalls();
    await expect(
      aliceCaller.meetings.cancel({
        clubId: wedReads.id,
        meetingId: meeting.id,
      })
    ).rejects.toThrow(TRPCError);

    // No duplicate cancellation email blast.
    expect(getEmailCalls()).toHaveLength(0);
  });
});

describe("meetings — temporal validation", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    resetEmailCalls();
  });

  // @spec MEET-BE-TIME-001
  it("meetings.create rejects any slot whose time is in the past", async () => {
    const aliceCaller = await createAuthenticatedCaller(db, alice);
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await expect(
      aliceCaller.meetings.create({
        clubId: wedReads.id,
        slots: [{ time: past }, { time: futureA }],
      })
    ).rejects.toThrow();

    const meetings = await db.meeting.findMany({
      where: { clubId: wedReads.id },
    });
    expect(meetings).toHaveLength(0);
    // No notification fired for a rejected create.
    expect(getEmailCalls()).toHaveLength(0);
  });
});
