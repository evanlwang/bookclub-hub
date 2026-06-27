// @spec AUTH-API-001, AUTH-API-002, AUTH-API-003, AUTH-API-004, AUTH-API-005, AUTH-API-LOGOUT-001, AUTH-API-LOGOUT-002, AUTH-API-RATELIMIT-001
// @spec AUTH-OTP-REQUEST-001, AUTH-OTP-REQUEST-ENUM-001, AUTH-OTP-VERIFY-001, AUTH-OTP-SINGLE-USE-001, AUTH-OTP-EXPIRY-001, AUTH-OTP-ATTEMPTS-001, AUTH-OTP-LATEST-001
// @spec AUTH-PASSKEY-REG-001, AUTH-PASSKEY-LOGIN-001, AUTH-PASSKEY-COUNTER-001, AUTH-PASSKEY-UNKNOWN-001, AUTH-PASSKEY-MULTI-001, AUTH-PASSKEY-LIST-001, AUTH-PASSKEY-REVOKE-001, AUTH-PASSKEY-CHALLENGE-001
// @spec AUTH-RECOVERY-001, AUTH-RECOVERY-002, AUTH-BE-SESSION-001
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { normalizeEmail, validateEmail } from "@/lib/validation/email";
import {
  generateSessionId,
  computeNewExpiry,
  sessionSetCookieHeader,
} from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
  computeOtpExpiry,
  isOtpExpired,
  isOtpAttemptsExceeded,
} from "@/lib/auth/otp";
import {
  buildRegistrationOptions,
  verifyRegistration,
  buildAuthenticationOptions,
  verifyAuthentication,
  WebAuthnError,
} from "@/lib/auth/webauthn";
import {
  listCredentialsForUser,
  credentialDescriptorsForUser,
  findStoredCredential,
  createCredential,
  touchCredential,
  revokeCredentialForUser,
} from "@/lib/auth/credentials";
import { emailService } from "@/server/services/email";
import { env } from "@/env";

const RATE_LIMIT_WINDOW_MS = 60_000;
// OTP request/verify are the security-sensitive, expensive paths (email send +
// code guessing): 5/min in test & production. Development is effectively
// unthrottled so a shared-IP local E2E run isn't locked out — mirrors the
// non-prod OTP dev bypass.
const OTP_LIMIT_PER_MINUTE = env.NODE_ENV === "development" ? 100_000 : 5;
// Passkey ceremonies just issue/verify a challenge and fire on every login-page
// load (conditional autofill), so they get a higher ceiling than email sends.
const CEREMONY_LIMIT_PER_MINUTE = env.NODE_ENV === "development" ? 100_000 : 30;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Non-production fixed code so `make up`, the seeded accounts, and E2E can sign
// in deterministically without reading an inbox — the analog of the old
// dev passcode bypass. Strictly gated on NODE_ENV !== "production".
const DEV_OTP_BYPASS = "000000";

// @spec AUTH-API-RATELIMIT-001
function enforceRateLimit(
  procedure: string,
  ip: string | null,
  key: string | null,
  limit: number,
): void {
  const buckets: string[] = [];
  if (ip) buckets.push(`${procedure}:ip:${ip}`);
  if (key) buckets.push(`${procedure}:key:${key}`);
  for (const bucket of buckets) {
    const check = checkRateLimit(bucket, limit, RATE_LIMIT_WINDOW_MS);
    if (!check.ok) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded — try again in a minute",
      });
    }
  }
}

function requireValidEmail(raw: string): string {
  const v = validateEmail(raw);
  if (!v.valid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: v.error });
  }
  return normalizeEmail(raw);
}

function displayNameFromEmail(email: string): string {
  return (email.split("@")[0] || "Reader").slice(0, 100);
}

/** Extract the base64url challenge the authenticator actually signed. */
function challengeFromClientData(clientDataJSON: string): string | null {
  try {
    const json = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8"));
    return typeof json.challenge === "string" ? json.challenge : null;
  } catch {
    return null;
  }
}

type SessionCtx = {
  db: import("@prisma/client").PrismaClient;
  resHeaders: Headers | null;
};

async function openSession(ctx: SessionCtx, userId: string): Promise<string> {
  const sessionId = generateSessionId();
  await ctx.db.session.create({
    data: { id: sessionId, userId, expiresAt: computeNewExpiry() },
  });
  // @spec AUTH-BE-001
  ctx.resHeaders?.append("Set-Cookie", sessionSetCookieHeader(sessionId));
  return sessionId;
}

const UNAUTHORIZED_OTP = new TRPCError({
  code: "UNAUTHORIZED",
  message: "That code is invalid or has expired. Request a new one.",
});

export const authRouter = router({
  // @spec AUTH-OTP-REQUEST-001, AUTH-OTP-REQUEST-ENUM-001, AUTH-OTP-LATEST-001
  requestOtp: publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const email = requireValidEmail(input.email);
      enforceRateLimit("requestOtp", ctx.ip, email, OTP_LIMIT_PER_MINUTE);

      // @spec AUTH-OTP-LATEST-001 — supersede any prior unconsumed code.
      await ctx.db.emailOtp.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      const code = generateOtpCode();
      await ctx.db.emailOtp.create({
        data: { email, codeHash: hashOtp(code), expiresAt: computeOtpExpiry() },
      });
      await emailService.sendOtpCode(email, code);

      // @spec AUTH-OTP-REQUEST-ENUM-001 — identical response regardless of account existence.
      return { ok: true as const };
    }),

  // @spec AUTH-OTP-VERIFY-001, AUTH-OTP-SINGLE-USE-001, AUTH-OTP-EXPIRY-001, AUTH-OTP-ATTEMPTS-001, AUTH-API-001, AUTH-API-002, AUTH-BE-SESSION-001
  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string(),
        code: z.string().min(1),
        displayName: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = requireValidEmail(input.email);
      enforceRateLimit("verifyOtp", ctx.ip, email, OTP_LIMIT_PER_MINUTE);

      const devBypass =
        env.NODE_ENV !== "production" && input.code === DEV_OTP_BYPASS;

      if (!devBypass) {
        const otp = await ctx.db.emailOtp.findFirst({
          where: { email, consumedAt: null },
          orderBy: { createdAt: "desc" },
        });
        if (!otp) throw UNAUTHORIZED_OTP;
        if (isOtpExpired(otp.expiresAt)) throw UNAUTHORIZED_OTP; // @spec AUTH-OTP-EXPIRY-001
        if (isOtpAttemptsExceeded(otp.attempts)) throw UNAUTHORIZED_OTP; // @spec AUTH-OTP-ATTEMPTS-001

        // Count the attempt before checking, so brute force burns the budget.
        await ctx.db.emailOtp.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } },
        });
        if (!verifyOtpHash(input.code, otp.codeHash)) throw UNAUTHORIZED_OTP;

        // @spec AUTH-OTP-SINGLE-USE-001 — consume on success.
        await ctx.db.emailOtp.update({
          where: { id: otp.id },
          data: { consumedAt: new Date() },
        });
      }

      // @spec AUTH-API-001 — create on first verify, match otherwise.
      const existing = await ctx.db.user.findUnique({ where: { email } });
      const isNewUser = !existing;
      const displayName = input.displayName?.trim();
      let user;
      if (!existing) {
        user = await ctx.db.user.create({
          data: { email, displayName: displayName || displayNameFromEmail(email) },
        });
      } else if (displayName && displayName !== existing.displayName) {
        // @spec AUTH-API-002
        user = await ctx.db.user.update({
          where: { id: existing.id },
          data: { displayName },
        });
      } else {
        user = existing;
      }

      const sessionId = await openSession(ctx, user.id);
      return { user, sessionId, isNewUser };
    }),

  // @spec AUTH-PASSKEY-REG-001, AUTH-PASSKEY-MULTI-001, AUTH-PASSKEY-CHALLENGE-001
  startPasskeyRegistration: protectedProcedure.mutation(async ({ ctx }) => {
    const exclude = await credentialDescriptorsForUser(ctx.db, ctx.user.id);
    const options = await buildRegistrationOptions({
      userId: ctx.user.id,
      userName: ctx.user.email,
      userDisplayName: ctx.user.displayName,
      excludeCredentials: exclude,
    });
    await ctx.db.webAuthnChallenge.create({
      data: {
        userId: ctx.user.id,
        challenge: options.challenge,
        type: "register",
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });
    return { options };
  }),

  // @spec AUTH-PASSKEY-REG-001, AUTH-PASSKEY-CHALLENGE-001
  finishPasskeyRegistration: protectedProcedure
    .input(
      z.object({
        // RegistrationResponseJSON from @simplewebauthn/browser.
        attestation: z.any(),
        deviceName: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clientChallenge = challengeFromClientData(
        input.attestation?.response?.clientDataJSON ?? "",
      );
      const challengeRow = clientChallenge
        ? await ctx.db.webAuthnChallenge.findFirst({
            where: {
              userId: ctx.user.id,
              type: "register",
              challenge: clientChallenge,
              consumedAt: null,
              expiresAt: { gt: new Date() },
            },
          })
        : null;
      if (!challengeRow) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Registration challenge not found or expired" });
      }

      let stored;
      try {
        stored = await verifyRegistration({
          response: input.attestation,
          expectedChallenge: challengeRow.challenge,
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof WebAuthnError ? err.message : "Passkey registration failed",
        });
      }

      // Single-use challenge.
      await ctx.db.webAuthnChallenge.update({
        where: { id: challengeRow.id },
        data: { consumedAt: new Date() },
      });

      const credential = await createCredential(ctx.db, {
        userId: ctx.user.id,
        deviceName: input.deviceName?.trim() || "Passkey",
        credential: stored,
      });
      return { credential };
    }),

  // @spec AUTH-PASSKEY-LOGIN-001, AUTH-PASSKEY-CHALLENGE-001, AUTH-RECOVERY-001
  startPasskeyLogin: publicProcedure
    .input(z.object({ email: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit("startPasskeyLogin", ctx.ip, null, CEREMONY_LIMIT_PER_MINUTE);
      let allow: { credentialId: string; transports: string[] }[] = [];
      let userId: string | null = null;
      if (input.email) {
        const v = validateEmail(input.email);
        if (v.valid) {
          const email = normalizeEmail(input.email);
          const user = await ctx.db.user.findUnique({ where: { email } });
          if (user) {
            userId = user.id;
            allow = await credentialDescriptorsForUser(ctx.db, user.id);
          }
        }
      }
      const options = await buildAuthenticationOptions({ allowCredentials: allow });
      await ctx.db.webAuthnChallenge.create({
        data: {
          userId,
          challenge: options.challenge,
          type: "login",
          expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
        },
      });
      return { options };
    }),

  // @spec AUTH-PASSKEY-LOGIN-001, AUTH-PASSKEY-COUNTER-001, AUTH-PASSKEY-UNKNOWN-001, AUTH-BE-SESSION-001
  finishPasskeyLogin: publicProcedure
    .input(z.object({ assertion: z.any() }))
    .mutation(async ({ ctx, input }) => {
      enforceRateLimit("finishPasskeyLogin", ctx.ip, null, CEREMONY_LIMIT_PER_MINUTE);
      const credentialId: unknown = input.assertion?.id;
      if (typeof credentialId !== "string") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Malformed assertion" });
      }

      // @spec AUTH-PASSKEY-UNKNOWN-001
      const found = await findStoredCredential(ctx.db, credentialId);
      if (!found) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unknown passkey" });
      }

      const clientChallenge = challengeFromClientData(
        input.assertion?.response?.clientDataJSON ?? "",
      );
      const challengeRow = clientChallenge
        ? await ctx.db.webAuthnChallenge.findFirst({
            where: {
              type: "login",
              challenge: clientChallenge,
              consumedAt: null,
              expiresAt: { gt: new Date() },
            },
          })
        : null;
      if (!challengeRow) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Login challenge not found or expired" });
      }

      let result;
      try {
        result = await verifyAuthentication({
          response: input.assertion,
          expectedChallenge: challengeRow.challenge,
          credential: found.stored,
        });
      } catch (err) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: err instanceof WebAuthnError ? err.message : "Passkey login failed",
        });
      }

      await ctx.db.webAuthnChallenge.update({
        where: { id: challengeRow.id },
        data: { consumedAt: new Date() },
      });
      await touchCredential(ctx.db, credentialId, result.newCounter);

      const user = await ctx.db.user.findUnique({ where: { id: found.userId } });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Account no longer exists" });
      }
      const sessionId = await openSession(ctx, user.id);
      return { user, sessionId };
    }),

  // @spec AUTH-PASSKEY-LIST-001
  listCredentials: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await listCredentialsForUser(ctx.db, ctx.user.id);
    return { credentials };
  }),

  // @spec AUTH-PASSKEY-REVOKE-001, AUTH-RECOVERY-002
  revokeCredential: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const ok = await revokeCredentialForUser(ctx.db, ctx.user.id, input.id);
      if (!ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found" });
      }
      return { ok: true as const };
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
  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionId) {
      await ctx.db.session.delete({ where: { id: ctx.sessionId } }).catch(() => {});
    }
    // @spec AUTH-BE-001 — clearing cookie mirrors the set-cookie attributes.
    ctx.resHeaders?.append(
      "Set-Cookie",
      `session_id=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    return { success: true };
  }),
});
