// @spec MEET-API-001 through MEET-API-005, MEET-DATA-001, MEET-BE-001
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, memberProcedure, adminProcedure } from "../trpc";
import { emailService } from "../services/email";

export const meetingsRouter = router({
  list: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        status: z
          .enum(["proposed", "confirmed", "completed", "cancelled"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { clubId: input.clubId };
      if (input.status) where.status = input.status;

      const meetings = await ctx.db.meeting.findMany({
        where,
        include: {
          slots: { include: { responses: { include: { user: true } } } },
          book: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Derived per-viewer flag: have they responded to any slot of this meeting?
      // Lets the dashboard render the "respond" badge without re-walking the
      // slot/response tree on the client.
      const viewerId = ctx.user.id;
      return meetings.map((m) => ({
        ...m,
        viewerHasResponded: m.slots.some((s) =>
          s.responses.some((r) => r.userId === viewerId)
        ),
      }));
    }),

  create: adminProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        title: z.string().optional(),
        bookId: z.string().uuid().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        slots: z
          .array(
            z.object({
              time: z.coerce.date(),
              durationMinutes: z.number().int().min(15).default(60),
            })
          )
          .min(2)
          .max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @spec MEET-BE-TIME-001 — proposed slots must be in the future.
      const now = Date.now();
      if (input.slots.some((s) => s.time.getTime() <= now)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Meeting times must be in the future",
        });
      }

      // Determine title
      let title = input.title;
      if (!title && input.bookId) {
        const book = await ctx.db.book.findUnique({
          where: { id: input.bookId },
        });
        title = `Meeting: ${book?.title ?? "Book Discussion"}`;
      }
      title = title ?? "Club Meeting";

      const meeting = await ctx.db.meeting.create({
        data: {
          clubId: input.clubId,
          bookId: input.bookId,
          title,
          description: input.description,
          location: input.location,
          createdBy: ctx.user.id,
          slots: {
            create: input.slots.map((s) => ({
              proposedTime: s.time,
              durationMinutes: s.durationMinutes,
            })),
          },
        },
        include: { slots: true },
      });

      // Notify members
      const members = await ctx.db.membership.findMany({
        where: { clubId: input.clubId },
        include: { user: true },
      });
      const club = await ctx.db.club.findUniqueOrThrow({
        where: { id: input.clubId },
      });
      await emailService.sendMeetingProposed(
        members.map((m) => m.user.email),
        club.name,
        title
      );

      return { meeting };
    }),

  get: memberProcedure
    .input(
      z.object({ clubId: z.string().uuid(), meetingId: z.string().uuid() })
    )
    .query(async ({ ctx, input }) => {
      const meeting = await ctx.db.meeting.findUniqueOrThrow({
        where: { id: input.meetingId },
        include: {
          slots: { include: { responses: { include: { user: true } } } },
          book: true,
        },
      });

      if (meeting.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { meeting };
    }),

  update: adminProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        meetingId: z.string().uuid(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @spec MEET-BE-CROSS-002 — confirm meeting belongs to the supplied club.
      const existing = await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
        select: { clubId: true },
      });
      if (!existing || existing.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const meeting = await ctx.db.meeting.update({
        where: { id: input.meetingId },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.location !== undefined && { location: input.location }),
        },
      });

      return { meeting };
    }),

  confirm: adminProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        meetingId: z.string().uuid(),
        slotId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @spec MEET-BE-CROSS-001, MEET-BE-STATE-001 — meeting must belong to the
      // club, slot must belong to that meeting, and the meeting must still be in
      // the "proposed" state.
      const existing = await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
        select: { clubId: true, status: true },
      });
      if (!existing || existing.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (existing.status !== "proposed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only proposed meetings can be confirmed",
        });
      }

      const slot = await ctx.db.meetingTimeSlot.findUnique({
        where: { id: input.slotId },
        select: { meetingId: true, proposedTime: true },
      });
      if (!slot || slot.meetingId !== input.meetingId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const meeting = await ctx.db.meeting.update({
        where: { id: input.meetingId },
        data: {
          status: "confirmed",
          confirmedTime: slot.proposedTime,
        },
        include: { book: true },
      });

      // Notify members
      const members = await ctx.db.membership.findMany({
        where: { clubId: input.clubId },
        include: { user: true },
      });
      const club = await ctx.db.club.findUniqueOrThrow({
        where: { id: input.clubId },
      });
      await emailService.sendMeetingConfirmed(
        members.map((m) => m.user.email),
        club.name,
        meeting.title,
        slot.proposedTime.toISOString(),
        meeting.location ?? undefined
      );

      return { meeting };
    }),

  cancel: adminProcedure
    .input(
      z.object({ clubId: z.string().uuid(), meetingId: z.string().uuid() })
    )
    .mutation(async ({ ctx, input }) => {
      // @spec MEET-BE-CROSS-003, MEET-BE-STATE-002 — meeting must belong to the
      // club and must not already be cancelled.
      const existing = await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
        select: { clubId: true, status: true },
      });
      if (!existing || existing.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (existing.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Meeting is already cancelled",
        });
      }

      const meeting = await ctx.db.meeting.update({
        where: { id: input.meetingId },
        data: { status: "cancelled" },
      });

      // Notify members
      const members = await ctx.db.membership.findMany({
        where: { clubId: input.clubId },
        include: { user: true },
      });
      const club = await ctx.db.club.findUniqueOrThrow({
        where: { id: input.clubId },
      });
      await emailService.sendMeetingCancelled(
        members.map((m) => m.user.email),
        club.name,
        meeting.title
      );

      return { success: true };
    }),

  submitAvailability: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        meetingId: z.string().uuid(),
        responses: z.array(
          z.object({
            slotId: z.string().uuid(),
            status: z.enum(["available", "maybe", "unavailable"]),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @spec MEET-BE-CROSS-004 — meeting must belong to this club, and every
      // submitted slotId must belong to this meeting (no cross-meeting smuggling).
      const meeting = await ctx.db.meeting.findUnique({
        where: { id: input.meetingId },
        select: { clubId: true },
      });
      if (!meeting || meeting.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const slots = await ctx.db.meetingTimeSlot.findMany({
        where: { meetingId: input.meetingId },
        select: { id: true },
      });
      const slotIds = slots.map((s) => s.id);
      const slotIdSet = new Set(slotIds);

      const foreign = input.responses.find((r) => !slotIdSet.has(r.slotId));
      if (foreign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Slot does not belong to this meeting",
        });
      }

      // Delete previous responses for this user in this meeting
      await ctx.db.availabilityResponse.deleteMany({
        where: {
          slotId: { in: slotIds },
          userId: ctx.user.id,
        },
      });

      // Create new responses
      await ctx.db.availabilityResponse.createMany({
        data: input.responses.map((r) => ({
          slotId: r.slotId,
          userId: ctx.user.id,
          status: r.status,
        })),
      });

      return { success: true };
    }),
});
