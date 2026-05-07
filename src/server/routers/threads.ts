// @spec DISC-API-001 through DISC-API-004
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, memberProcedure } from "../trpc";
import { parseChapterTag } from "@/lib/validation/chapter-tag";

/**
 * Title is a vestigial NOT NULL column — the UI no longer collects one.
 * Derive a stable, short title from the first line/sentence of the body
 * so DB constraints stay satisfied and any legacy display sites can fall
 * back without crashing.
 */
function deriveTitleFromBody(body: string): string {
  const firstLine = body.split("\n").find((s) => s.trim().length > 0)?.trim() ?? body.trim();
  if (firstLine.length === 0) return "(untitled)";
  if (firstLine.length <= 80) return firstLine;
  return firstLine.slice(0, 77).trimEnd() + "…";
}

export const threadsRouter = router({
  list: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        bookId: z.string().uuid(),
        maxChapter: z.number().int().optional(),
        sort: z.enum(["recent", "comments"]).default("recent"),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        clubId: input.clubId,
        bookId: input.bookId,
      };

      // Spoiler filter: only show threads at or below maxChapter, or untagged
      if (input.maxChapter !== undefined) {
        where.OR = [
          { chapterNumber: null },
          { chapterNumber: { lte: input.maxChapter } },
        ];
      }

      const threads = await ctx.db.discussionThread.findMany({
        where,
        include: {
          author: true,
          _count: { select: { comments: true } },
        },
        orderBy:
          input.sort === "recent"
            ? { createdAt: "desc" }
            : { comments: { _count: "desc" } },
      });

      // Also get total count without filter for "N threads hidden"
      const totalCount = await ctx.db.discussionThread.count({
        where: { clubId: input.clubId, bookId: input.bookId },
      });

      return {
        threads: threads.map((t) => ({
          ...t,
          commentCount: t._count.comments,
        })),
        totalCount,
        hiddenCount: totalCount - threads.length,
      };
    }),

  create: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        bookId: z.string().uuid(),
        // Title is no longer surfaced in the UI; clients may omit it. We
        // derive a value from the body so the underlying NOT NULL column
        // is satisfied without requiring a migration.
        title: z.string().min(1).max(200).optional(),
        body: z.string().min(1),
        chapterTag: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const chapterNumber = parseChapterTag(input.chapterTag);
      const title = input.title ?? deriveTitleFromBody(input.body);

      const thread = await ctx.db.discussionThread.create({
        data: {
          clubId: input.clubId,
          bookId: input.bookId,
          authorId: ctx.user.id,
          title,
          body: input.body,
          chapterTag: input.chapterTag,
          chapterNumber,
        },
      });

      return { thread };
    }),

  get: memberProcedure
    .input(
      z.object({ clubId: z.string().uuid(), threadId: z.string().uuid() })
    )
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.discussionThread.findUniqueOrThrow({
        where: { id: input.threadId },
        include: {
          author: true,
          comments: {
            include: { author: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (thread.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { thread };
    }),

  update: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        threadId: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        body: z.string().min(1).optional(),
        chapterTag: z.string().optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.discussionThread.findUniqueOrThrow({
        where: { id: input.threadId },
      });

      // Authorization: author or admin+
      const isAuthor = thread.authorId === ctx.user.id;
      if (!isAuthor && ctx.membership.role === "member") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the author or an admin can update this thread",
        });
      }

      const data: Record<string, unknown> = {};
      if (input.title) data.title = input.title;
      if (input.body) data.body = input.body;
      if (input.chapterTag !== undefined) {
        data.chapterTag = input.chapterTag;
        data.chapterNumber = parseChapterTag(input.chapterTag);
      }
      if (input.isPinned !== undefined) data.isPinned = input.isPinned;

      const updated = await ctx.db.discussionThread.update({
        where: { id: input.threadId },
        data,
      });

      return { thread: updated };
    }),

  delete: memberProcedure
    .input(
      z.object({ clubId: z.string().uuid(), threadId: z.string().uuid() })
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.discussionThread.findUniqueOrThrow({
        where: { id: input.threadId },
      });

      const isAuthor = thread.authorId === ctx.user.id;
      if (!isAuthor && ctx.membership.role === "member") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the author or an admin can delete this thread",
        });
      }

      // Cascade: comments are deleted via Prisma onDelete: Cascade
      await ctx.db.discussionThread.delete({
        where: { id: input.threadId },
      });

      return { success: true };
    }),
});
