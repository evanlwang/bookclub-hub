// @spec VOTE-API-005, VOTE-API-006, VOTE-API-007
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, memberProcedure } from "../trpc";

export const nominationsRouter = router({
  create: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        roundId: z.string().uuid(),
        bookId: z.string().uuid(),
        pitch: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.votingRound.findUniqueOrThrow({
        where: { id: input.roundId },
      });

      if (round.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (round.status !== "nominating") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nominations are only accepted during the nominating phase",
        });
      }

      // Check duplicate
      const existing = await ctx.db.nomination.findUnique({
        where: {
          roundId_bookId: {
            roundId: input.roundId,
            bookId: input.bookId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This book has already been nominated in this round",
        });
      }

      const nomination = await ctx.db.nomination.create({
        data: {
          roundId: input.roundId,
          bookId: input.bookId,
          nominatedBy: ctx.user.id,
          pitch: input.pitch,
        },
        include: { book: true },
      });

      return { nomination };
    }),

  delete: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        nominationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nomination = await ctx.db.nomination.findUniqueOrThrow({
        where: { id: input.nominationId },
        include: { round: true },
      });

      // Check authorization: author or admin+
      const isAuthor = nomination.nominatedBy === ctx.user.id;
      if (!isAuthor && ctx.membership.role === "member") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the nominator or an admin can delete a nomination",
        });
      }

      await ctx.db.nomination.delete({
        where: { id: input.nominationId },
      });

      return { success: true };
    }),
});
