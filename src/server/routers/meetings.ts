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

      return ctx.db.meeting.findMany({
        where,
        include: {
          slots: { include: { responses: true } },
          book: true,
        },
        orderBy: { createdAt: "desc" },
      });
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
      const slot = await ctx.db.meetingTimeSlot.findUniqueOrThrow({
        where: { id: input.slotId },
      });

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
      // Delete previous responses for this user in this meeting
      const slots = await ctx.db.meetingTimeSlot.findMany({
        where: { meetingId: input.meetingId },
      });
      const slotIds = slots.map((s) => s.id);

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
