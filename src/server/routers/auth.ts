// @spec AUTH-API-001, AUTH-API-002, AUTH-API-003, AUTH-API-004, AUTH-API-005
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { normalizeEmail, validateEmail } from "@/lib/validation/email";
import { generateSessionId, computeNewExpiry } from "@/lib/auth/session";

export const authRouter = router({
  enter: publicProcedure
    .input(
      z.object({
        email: z.string(),
        displayName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const emailValidation = validateEmail(input.email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.error);
      }

      const email = normalizeEmail(input.email);

      // Create or update user
      const user = await ctx.db.user.upsert({
        where: { email },
        update: { displayName: input.displayName },
        create: { email, displayName: input.displayName },
      });

      // Create session
      const sessionId = generateSessionId();
      const session = await ctx.db.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          expiresAt: computeNewExpiry(),
        },
      });

      return { user, sessionId: session.id };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
      where: { userId: ctx.user.id },
      include: { club: true },
    });

    return {
      user: ctx.user,
      clubs: memberships.map((m) => ({
        id: m.club.id,
        name: m.club.name,
        code: m.club.code,
        role: m.role,
      })),
    };
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.session.delete({ where: { id: ctx.sessionId } });
    return { success: true };
  }),
});
