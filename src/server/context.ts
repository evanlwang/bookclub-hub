import { prisma } from "@/lib/db";
import { isSessionExpired, computeNewExpiry } from "@/lib/auth/session";
import type { Context } from "./trpc";

/**
 * Create tRPC context from a session ID (typically from cookie).
 * For tests, pass sessionId directly instead of parsing cookies.
 */
export async function createContext(sessionId?: string | null): Promise<Context> {
  if (!sessionId) {
    return { db: prisma, user: null, sessionId: null, resHeaders: null };
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || isSessionExpired(session.expiresAt)) {
    if (session) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: sessionId } });
    }
    return { db: prisma, user: null, sessionId: null, resHeaders: null };
  }

  // Sliding expiration: refresh on each authenticated request
  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt: computeNewExpiry() },
  });

  return {
    db: prisma,
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
    },
    sessionId,
    resHeaders: null,
  };
}
