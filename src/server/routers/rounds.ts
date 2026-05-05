// @spec VOTE-API-001 through VOTE-API-004, VOTE-BE-002
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, memberProcedure, adminProcedure } from "../trpc";
import { tallyVotes } from "@/lib/voting/tally";
import { emailService } from "../services/email";

export const roundsRouter = router({
  list: memberProcedure.query(async ({ ctx, input }) => {
    return ctx.db.votingRound.findMany({
      where: { clubId: input.clubId },
      orderBy: { createdAt: "desc" },
      include: { winningBook: true },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        maxApprovalsPerMember: z.number().int().min(1).default(3),
        nominationDeadline: z.date().optional(),
        votingDeadline: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check no active round exists
      const activeRound = await ctx.db.votingRound.findFirst({
        where: {
          clubId: input.clubId,
          status: { in: ["nominating", "voting"] },
        },
      });

      if (activeRound) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An active voting round already exists",
        });
      }

      const round = await ctx.db.votingRound.create({
        data: {
          clubId: input.clubId,
          maxApprovalsPerMember: input.maxApprovalsPerMember,
          nominationDeadline: input.nominationDeadline,
          votingDeadline: input.votingDeadline,
          createdBy: ctx.user.id,
        },
      });

      // Notify members
      const members = await ctx.db.membership.findMany({
        where: { clubId: input.clubId },
        include: { user: true },
      });
      const club = await ctx.db.club.findUniqueOrThrow({
        where: { id: input.clubId },
      });
      await emailService.sendRoundNominating(
        members.map((m) => m.user.email),
        club.name
      );

      return { round };
    }),

  get: memberProcedure
    .input(z.object({ clubId: z.string().uuid(), roundId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const round = await ctx.db.votingRound.findUniqueOrThrow({
        where: { id: input.roundId },
        include: {
          nominations: {
            include: {
              book: true,
              nominator: true,
              votes: true,
            },
          },
          winningBook: true,
        },
      });

      // Hide votes unless decided or own votes
      const nominations = round.nominations.map((nom) => ({
        ...nom,
        votes:
          round.status === "decided"
            ? nom.votes
            : nom.votes.filter((v) => v.userId === ctx.user.id),
        voteCount: round.status === "decided" ? nom.votes.length : undefined,
      }));

      return { round: { ...round, nominations } };
    }),

  advance: adminProcedure
    .input(z.object({ clubId: z.string().uuid(), roundId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.votingRound.findUniqueOrThrow({
        where: { id: input.roundId },
      });

      if (round.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const club = await ctx.db.club.findUniqueOrThrow({
        where: { id: input.clubId },
      });
      const members = await ctx.db.membership.findMany({
        where: { clubId: input.clubId },
        include: { user: true },
      });
      const memberEmails = members.map((m) => m.user.email);

      if (round.status === "nominating") {
        await ctx.db.votingRound.update({
          where: { id: input.roundId },
          data: { status: "voting" },
        });

        await emailService.sendRoundVoting(memberEmails, club.name);
        return { newStatus: "voting" as const };
      }

      if (round.status === "voting") {
        // Tally votes and determine winner
        const nominations = await ctx.db.nomination.findMany({
          where: { roundId: input.roundId },
          include: { votes: true },
        });

        const tallyInput = nominations.map((n) => ({
          id: n.id,
          bookId: n.bookId,
          createdAt: n.createdAt,
          voteCount: n.votes.length,
        }));

        const result = tallyVotes(tallyInput);

        // Update round
        await ctx.db.votingRound.update({
          where: { id: input.roundId },
          data: {
            status: "decided",
            winningBookId: result.winner?.bookId ?? null,
          },
        });

        // Create BookSelection if there's a winner
        if (result.winner) {
          // Mark previous selections as not current
          await ctx.db.bookSelection.updateMany({
            where: { clubId: input.clubId, isCurrent: true },
            data: { isCurrent: false },
          });

          await ctx.db.bookSelection.create({
            data: {
              clubId: input.clubId,
              bookId: result.winner.bookId,
              roundId: input.roundId,
              isCurrent: true,
            },
          });

          const winningBook = await ctx.db.book.findUniqueOrThrow({
            where: { id: result.winner.bookId },
          });
          await emailService.sendRoundDecided(
            memberEmails,
            club.name,
            winningBook.title
          );
        }

        return { newStatus: "decided" as const, winner: result.winner };
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot advance round in "${round.status}" status`,
      });
    }),

  cancel: adminProcedure
    .input(z.object({ clubId: z.string().uuid(), roundId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.votingRound.findUniqueOrThrow({
        where: { id: input.roundId },
      });

      if (round.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (round.status === "decided" || round.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel round in "${round.status}" status`,
        });
      }

      // Delete votes and nominations (cascade handles votes)
      await ctx.db.vote.deleteMany({ where: { roundId: input.roundId } });
      await ctx.db.nomination.deleteMany({ where: { roundId: input.roundId } });

      await ctx.db.votingRound.update({
        where: { id: input.roundId },
        data: { status: "cancelled" },
      });

      return { success: true };
    }),
});
