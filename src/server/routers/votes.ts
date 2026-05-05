// @spec VOTE-API-008, VOTE-BE-003
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, memberProcedure } from "../trpc";

export const votesRouter = router({
  submit: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        roundId: z.string().uuid(),
        nominationIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.votingRound.findUniqueOrThrow({
        where: { id: input.roundId },
      });

      if (round.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (round.status !== "voting") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voting is only accepted during the voting phase",
        });
      }

      // Check max approvals
      if (input.nominationIds.length > round.maxApprovalsPerMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve more than ${round.maxApprovalsPerMember} nominations`,
        });
      }

      // Verify all nominations belong to this round
      const nominations = await ctx.db.nomination.findMany({
        where: {
          id: { in: input.nominationIds },
          roundId: input.roundId,
        },
      });

      if (nominations.length !== input.nominationIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more nominations not found in this round",
        });
      }

      // Replace all votes for this user in this round
      await ctx.db.vote.deleteMany({
        where: { roundId: input.roundId, userId: ctx.user.id },
      });

      if (input.nominationIds.length > 0) {
        await ctx.db.vote.createMany({
          data: input.nominationIds.map((nominationId) => ({
            roundId: input.roundId,
            nominationId,
            userId: ctx.user.id,
          })),
        });
      }

      return { success: true, voteCount: input.nominationIds.length };
    }),
});
