// @spec AUTH-API-001, AUTH-API-002, AUTH-API-003, AUTH-API-004, AUTH-API-005, AUTH-API-SIGNIN-001, AUTH-API-LOGOUT-001, AUTH-API-LOGOUT-002
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { normalizeEmail, validateEmail } from "@/lib/validation/email";
import { generateSessionId, computeNewExpiry, sessionSetCookieHeader } from "@/lib/auth/session";
import { passcodeOk } from "@/lib/auth/passcode";

export const authRouter = router({
  // @spec AUTH-API-SIGNIN-001
  // Existing-user-only login. Unlike auth.enter (which upserts), signIn refuses
  // to create a new user — it returns NOT_FOUND for unknown emails so the UI
  // can route users without an account into the sign-up flow.
  signIn: publicProcedure
    .input(z.object({ email: z.string(), passcode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const emailValidation = validateEmail(input.email);
      if (!emailValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: emailValidation.error,
        });
      }

      if (!passcodeOk(input.passcode)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong passcode" });
      }

      const email = normalizeEmail(input.email);
      const user = await ctx.db.user.findUnique({ where: { email } });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found with that email",
        });
      }

      const sessionId = generateSessionId();
      await ctx.db.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          expiresAt: computeNewExpiry(),
        },
      });

      // @spec AUTH-BE-001 — emit HttpOnly+Secure+SameSite=Lax server-side
      ctx.resHeaders?.append("Set-Cookie", sessionSetCookieHeader(sessionId));

      return { user, sessionId };
    }),

  enter: publicProcedure
    .input(
      z.object({
        email: z.string(),
        displayName: z.string().min(1).max(100),
        passcode: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const emailValidation = validateEmail(input.email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.error);
      }

      if (!passcodeOk(input.passcode)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong passcode" });
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

      // @spec AUTH-BE-001
      ctx.resHeaders?.append("Set-Cookie", sessionSetCookieHeader(sessionId));

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

  // @spec AUTH-API-LOGOUT-001, AUTH-API-LOGOUT-002
  // publicProcedure (not protected) so a stale or missing cookie still completes
  // sign-out cleanly. We delete the session row if it exists and always emit a
  // clearing Set-Cookie so the browser drops the cookie even if the client
  // forgets to.
  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionId) {
      await ctx.db.session
        .delete({ where: { id: ctx.sessionId } })
        .catch(() => {});
    }
    // @spec AUTH-BE-001 — clearing cookie also gets HttpOnly+SameSite for parity
    ctx.resHeaders?.append(
      "Set-Cookie",
      `session_id=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    return { success: true };
  }),
});
