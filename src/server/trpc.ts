import { initTRPC, TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";
import { z } from "zod";

export type Context = {
  db: PrismaClient;
  user: { id: string; email: string; displayName: string } | null;
  sessionId: string | null;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires a valid session
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user, sessionId: ctx.sessionId! } });
});

// Requires membership in the club specified by input.clubId
export const memberProcedure = protectedProcedure
  .input(z.object({ clubId: z.string().uuid() }).passthrough())
  .use(async ({ ctx, input, next }) => {
    const membership = await ctx.db.membership.findUnique({
      where: {
        clubId_userId: {
          clubId: (input as { clubId: string }).clubId,
          userId: ctx.user.id,
        },
      },
    });
    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a club member" });
    }
    return next({ ctx: { ...ctx, membership } });
  });

// Requires admin+ role in the club
export const adminProcedure = protectedProcedure
  .input(z.object({ clubId: z.string().uuid() }).passthrough())
  .use(async ({ ctx, input, next }) => {
    const membership = await ctx.db.membership.findUnique({
      where: {
        clubId_userId: {
          clubId: (input as { clubId: string }).clubId,
          userId: ctx.user.id,
        },
      },
    });
    if (!membership || membership.role === "member") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin or owner role required",
      });
    }
    return next({ ctx: { ...ctx, membership } });
  });
