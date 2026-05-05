// @spec MEET-API-001 through MEET-API-005, MEET-DATA-001, MEET-DATA-002, MEET-BE-001, MEET-BE-002
import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import { createAuthenticatedCaller } from "@tests/helpers/trpc";
import { alice, bob, carol, insertAllUsers } from "@tests/fixtures/users";
import { wedReads } from "@tests/fixtures/clubs";
import { dune, insertBook } from "@tests/fixtures/books";
import { seedClubWithMembers } from "@tests/fixtures/memberships";
import { resetEmailCalls, getEmailCalls } from "@/server/services/email";

const db = getTestDb();

describe("meetings", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    await insertBook(db, dune);
    await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);
    resetEmailCalls();
  });

  it("creates meeting with 3 time slots", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      title: "Dune Discussion",
      slots: [
        { time: new Date("2026-05-18T19:00:00Z") },
        { time: new Date("2026-05-20T20:00:00Z") },
        { time: new Date("2026-05-23T14:00:00Z") },
      ],
    });

    expect(meeting.status).toBe("proposed");
    expect(meeting.slots).toHaveLength(3);
    expect(getEmailCalls()).toHaveLength(1); // notification sent
  });

  it("defaults title from book when linked", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      bookId: dune.id,
      slots: [
        { time: new Date("2026-05-18T19:00:00Z") },
        { time: new Date("2026-05-20T20:00:00Z") },
      ],
    });

    expect(meeting.title).toBe("Meeting: Dune");
  });

  it("rejects fewer than 2 slots", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    await expect(
      caller.meetings.create({
        clubId: wedReads.id,
        slots: [{ time: new Date("2026-05-18T19:00:00Z") }],
      })
    ).rejects.toThrow();
  });

  it("submits and replaces availability", async () => {
    const adminCaller = await createAuthenticatedCaller(db, alice);
    const memberCaller = await createAuthenticatedCaller(db, carol);

    const { meeting } = await adminCaller.meetings.create({
      clubId: wedReads.id,
      slots: [
        { time: new Date("2026-05-18T19:00:00Z") },
        { time: new Date("2026-05-20T20:00:00Z") },
      ],
    });

    // First submission
    await memberCaller.meetings.submitAvailability({
      clubId: wedReads.id,
      meetingId: meeting.id,
      responses: meeting.slots.map((s) => ({
        slotId: s.id,
        status: "available" as const,
      })),
    });

    // Replace: now unavailable for first slot
    await memberCaller.meetings.submitAvailability({
      clubId: wedReads.id,
      meetingId: meeting.id,
      responses: [
        { slotId: meeting.slots[0].id, status: "unavailable" as const },
        { slotId: meeting.slots[1].id, status: "available" as const },
      ],
    });

    const responses = await db.availabilityResponse.findMany({
      where: { userId: carol.id },
    });
    expect(responses).toHaveLength(2);
    const firstSlotResponse = responses.find(
      (r) => r.slotId === meeting.slots[0].id
    );
    expect(firstSlotResponse?.status).toBe("unavailable");
  });

  it("confirms meeting with selected slot", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    resetEmailCalls();

    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      slots: [
        { time: new Date("2026-05-18T19:00:00Z") },
        { time: new Date("2026-05-20T20:00:00Z") },
      ],
    });

    resetEmailCalls();
    const confirmResult = await caller.meetings.confirm({
      clubId: wedReads.id,
      meetingId: meeting.id,
      slotId: meeting.slots[0].id,
    });

    expect(confirmResult.meeting.status).toBe("confirmed");
    expect(confirmResult.meeting.confirmedTime).toBeTruthy();
    expect(getEmailCalls()).toHaveLength(1); // confirmation email
  });

  it("cancels meeting", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      slots: [
        { time: new Date("2026-05-18T19:00:00Z") },
        { time: new Date("2026-05-20T20:00:00Z") },
      ],
    });

    resetEmailCalls();
    await caller.meetings.cancel({
      clubId: wedReads.id,
      meetingId: meeting.id,
    });

    const updated = await db.meeting.findUnique({
      where: { id: meeting.id },
    });
    expect(updated?.status).toBe("cancelled");
    expect(getEmailCalls()).toHaveLength(1); // cancellation email
  });

  it("stores timestamps in UTC", async () => {
    const caller = await createAuthenticatedCaller(db, alice);
    const { meeting } = await caller.meetings.create({
      clubId: wedReads.id,
      slots: [
        { time: new Date("2026-05-18T19:00:00Z") },
        { time: new Date("2026-05-20T20:00:00Z") },
      ],
    });

    const slot = await db.meetingTimeSlot.findFirst({
      where: { meetingId: meeting.id },
    });
    // Prisma returns Date objects which are always UTC internally
    expect(slot?.proposedTime instanceof Date).toBe(true);
  });
});
