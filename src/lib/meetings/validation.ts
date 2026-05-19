// @spec MEET-BE-STATE-001, MEET-BE-RESP-EMPTY-001, MEET-BE-CREATE-DEDUP-001
//
// Pure validation helpers shared by the meetings router. These are
// extracted so they can be unit-tested without booting the Prisma DB
// (the router composes them; integration tests still cover the wiring).
import { TRPCError } from "@trpc/server";

export type MeetingStatus = "proposed" | "confirmed" | "completed" | "cancelled";

export type AvailabilityResponseInput = {
  slotId: string;
  status: "available" | "maybe" | "unavailable";
};

export type ProposedSlotInput = {
  time: Date;
  durationMinutes?: number;
};

/**
 * MEET-BE-RESP-EMPTY-001 — submitAvailability must reject empty response arrays.
 * Mirrors the inline client-side guard in MEET-UI-RESP-SAVE-001.
 */
export function assertNonEmptyResponses(
  responses: ReadonlyArray<AvailabilityResponseInput>
): void {
  if (responses.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please select availability for at least one time",
    });
  }
}

/**
 * MEET-BE-STATE-001 — availability cannot be edited on a confirmed,
 * cancelled, or completed meeting. Only "proposed" meetings accept responses.
 */
export function assertMeetingProposed(status: MeetingStatus): void {
  if (status !== "proposed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Availability can only be submitted for proposed meetings",
    });
  }
}

/**
 * MEET-BE-CREATE-DEDUP-001 — proposed slots must be unique by ISO time.
 * Different durations at the same instant are still duplicates from the
 * member's point of view (they'd be voting on the same calendar slot twice).
 */
export function assertUniqueSlotTimes(
  slots: ReadonlyArray<ProposedSlotInput>
): void {
  const seen = new Set<number>();
  for (const slot of slots) {
    const stamp = slot.time.getTime();
    if (seen.has(stamp)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Duplicate time slots are not allowed",
      });
    }
    seen.add(stamp);
  }
}
