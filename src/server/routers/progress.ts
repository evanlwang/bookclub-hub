// @spec PROG-API-001, PROG-API-002, PROG-API-003, PROG-API-004, PROG-BE-001 through PROG-BE-006
import { z } from "zod";
import { router, memberProcedure } from "../trpc";
import { computeProgress } from "@/lib/progress/compute";

export const progressRouter = router({
  list: memberProcedure
    .input(z.object({ clubId: z.string().uuid(), bookId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.readingProgress.findMany({
        where: { clubId: input.clubId, bookId: input.bookId },
        include: { user: true },
        orderBy: { percentage: "desc" },
      });
    }),

  me: memberProcedure
    .input(z.object({ clubId: z.string().uuid(), bookId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.readingProgress.findUnique({
        where: {
          clubId_bookId_userId: {
            clubId: input.clubId,
            bookId: input.bookId,
            userId: ctx.user.id,
          },
        },
      });
    }),

  update: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        bookId: z.string().uuid(),
        currentPage: z.number().int().min(0).optional(),
        percentage: z.number().int().min(0).max(100).optional(),
        currentChapter: z.number().int().min(0).optional(),
        status: z.enum(["not_started", "reading", "finished"]).optional(),
        totalPages: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.readingProgress.findUnique({
        where: {
          clubId_bookId_userId: {
            clubId: input.clubId,
            bookId: input.bookId,
            userId: ctx.user.id,
          },
        },
      });

      // Get totalPages from book if not provided
      let totalPages = input.totalPages ?? existing?.totalPages ?? null;
      if (totalPages == null) {
        const book = await ctx.db.book.findUnique({
          where: { id: input.bookId },
        });
        totalPages = book?.pageCount ?? null;
      }

      const computed = computeProgress({
        currentPage: input.currentPage ?? existing?.currentPage,
        totalPages,
        percentage: input.percentage ?? existing?.percentage,
        status: input.status ?? existing?.status ?? "reading",
      });

      const data = {
        currentPage: computed.currentPage,
        totalPages: computed.totalPages,
        percentage: computed.percentage,
        status: computed.status,
        ...(input.currentChapter !== undefined && {
          currentChapter: input.currentChapter,
        }),
      };

      const progress = await ctx.db.readingProgress.upsert({
        where: {
          clubId_bookId_userId: {
            clubId: input.clubId,
            bookId: input.bookId,
            userId: ctx.user.id,
          },
        },
        update: data,
        create: {
          clubId: input.clubId,
          bookId: input.bookId,
          userId: ctx.user.id,
          ...data,
        },
      });

      return { progress };
    }),

  summary: memberProcedure
    .input(z.object({ clubId: z.string().uuid(), bookId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.readingProgress.findMany({
        where: { clubId: input.clubId, bookId: input.bookId },
      });

      const finishedCount = records.filter(
        (r) => r.status === "finished"
      ).length;
      const readingCount = records.filter((r) => r.status === "reading").length;
      const notStartedCount = records.filter(
        (r) => r.status === "not_started"
      ).length;

      // Median percentage
      const percentages = records.map((r) => r.percentage).sort((a, b) => a - b);
      const medianPct =
        percentages.length === 0
          ? 0
          : percentages.length % 2 === 1
            ? percentages[Math.floor(percentages.length / 2)]
            : Math.round(
                (percentages[percentages.length / 2 - 1] +
                  percentages[percentages.length / 2]) /
                  2
              );

      // Chapter distribution
      const chapterDistribution: Record<number, number> = {};
      for (const r of records) {
        if (r.currentChapter != null) {
          chapterDistribution[r.currentChapter] =
            (chapterDistribution[r.currentChapter] ?? 0) + 1;
        }
      }

      return {
        medianPct,
        finishedCount,
        readingCount,
        notStartedCount,
        chapterDistribution,
      };
    }),
});
