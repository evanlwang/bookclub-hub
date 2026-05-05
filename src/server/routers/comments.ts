// @spec DISC-API-005, DISC-API-006, DISC-API-007, DISC-DATA-002
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, memberProcedure } from "../trpc";

export const commentsRouter = router({
  create: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        threadId: z.string().uuid(),
        body: z.string().min(1),
        parentCommentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify thread belongs to club
      const thread = await ctx.db.discussionThread.findUniqueOrThrow({
        where: { id: input.threadId },
      });
      if (thread.clubId !== input.clubId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Enforce one-level nesting: reject grandchild comments
      if (input.parentCommentId) {
        const parent = await ctx.db.comment.findUniqueOrThrow({
          where: { id: input.parentCommentId },
        });
        if (parent.parentCommentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot reply to a reply (one level of nesting only)",
          });
        }
      }

      const comment = await ctx.db.comment.create({
        data: {
          threadId: input.threadId,
          authorId: ctx.user.id,
          body: input.body,
          parentCommentId: input.parentCommentId,
        },
        include: { author: true },
      });

      return { comment };
    }),

  update: memberProcedure
    .input(
      z.object({
        clubId: z.string().uuid(),
        commentId: z.string().uuid(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.commentId },
      });

      if (comment.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the author can edit this comment",
        });
      }

      const updated = await ctx.db.comment.update({
        where: { id: input.commentId },
        data: { body: input.body },
      });

      return { comment: updated };
    }),

  delete: memberProcedure
    .input(
      z.object({ clubId: z.string().uuid(), commentId: z.string().uuid() })
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findUniqueOrThrow({
        where: { id: input.commentId },
        include: { replies: true },
      });

      const isAuthor = comment.authorId === ctx.user.id;
      if (!isAuthor && ctx.membership.role === "member") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the author or an admin can delete this comment",
        });
      }

      // If comment has replies, replace body with placeholder
      if (comment.replies.length > 0) {
        await ctx.db.comment.update({
          where: { id: input.commentId },
          data: { body: "[deleted]" },
        });
        return { deleted: false, placeholder: true };
      }

      await ctx.db.comment.delete({ where: { id: input.commentId } });
      return { deleted: true, placeholder: false };
    }),
});
