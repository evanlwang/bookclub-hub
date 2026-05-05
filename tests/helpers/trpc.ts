import { type PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/routers/_app";
import type { Context } from "@/server/trpc";
import type { TestUser } from "@tests/fixtures/users";
import { generateSessionId, computeNewExpiry } from "@/lib/auth/session";

/**
 * Create an authenticated tRPC caller with a real user session.
 */
export async function createAuthenticatedCaller(
  db: PrismaClient,
  user: TestUser
) {
  // Create a session for the user
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
  };

  return appRouter.createCaller(ctx);
}

/**
 * Create an anonymous (unauthenticated) tRPC caller.
 */
export function createAnonymousCaller(db: PrismaClient) {
  const ctx: Context = {
    db,
    user: null,
    sessionId: null,
  };

  return appRouter.createCaller(ctx);
}
