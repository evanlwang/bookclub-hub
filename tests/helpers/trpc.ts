import { type PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/trpc";
import type { TestUser } from "@tests/fixtures/users";
import { generateSessionId, computeNewExpiry } from "@/lib/auth/session";

/**
 * Create an authenticated tRPC caller with a real user session.
 * Pass a `resHeaders` Headers object to inspect Set-Cookie writes from procedures.
 */
export async function createAuthenticatedCaller(
  db: PrismaClient,
  user: TestUser,
  opts: { resHeaders?: Headers; ip?: string | null } = {}
) {
  const sessionId = generateSessionId();
  await db.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt: computeNewExpiry(),
    },
  });

  const ctx: Context = {
    db,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    sessionId,
    resHeaders: opts.resHeaders ?? null,
    ip: opts.ip ?? null,
  };

  return appRouter.createCaller(ctx);
}

/**
 * Create an anonymous (unauthenticated) tRPC caller.
 */
export function createAnonymousCaller(
  db: PrismaClient,
  opts: { resHeaders?: Headers; ip?: string | null } = {}
) {
  const ctx: Context = {
    db,
    user: null,
    sessionId: null,
    resHeaders: opts.resHeaders ?? null,
    ip: opts.ip ?? null,
  };

  return appRouter.createCaller(ctx);
}
