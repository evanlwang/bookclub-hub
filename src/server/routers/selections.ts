// @spec VOTE-API-010, VOTE-BE-005
import { z } from "zod";
import { router, memberProcedure, adminProcedure } from "../trpc";

export const selectionsRouter = router({
  list: memberProcedure.query(async ({ ctx, input }) => {
    return ctx.db.bookSelection.findMany({
      where: { clubId: input.clubId },
      include: { book: true, round: true },
      orderBy: { selectedAt: "desc" },
    });
  }),

  createDirectPick: adminProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        bookId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // @spec VOTE-API-DECIDED-FINISHED-001 — same demote+stamp pattern as
      // rounds.advance, so manual admin picks also leave a clean "Finished"
      // entry in the history picker. Two-step preserves prior finishedAt.
      const now = new Date();
      await ctx.db.bookSelection.updateMany({
        where: {
          clubId: input.clubId,
          isCurrent: true,
          finishedAt: null,
        },
        data: { isCurrent: false, finishedAt: now },
      });
      await ctx.db.bookSelection.updateMany({
        where: { clubId: input.clubId, isCurrent: true },
        data: { isCurrent: false },
      });

      const selection = await ctx.db.bookSelection.create({
        data: {
          clubId: input.clubId,
          bookId: input.bookId,
          isCurrent: true,
          // roundId is null for direct picks
        },
        include: { book: true },
      });

      return { selection };
    }),
});
