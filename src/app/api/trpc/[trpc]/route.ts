import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { prisma as db } from "@/lib/db";
import { cookies } from "next/headers";
import { computeNewExpiry, sessionSetCookieHeader } from "@/lib/auth/session";

async function handler(req: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value ?? null;

  let user = null;
  let slidingCookie: string | null = null;
  if (sessionId) {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (session && session.expiresAt > new Date()) {
      user = {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
      };
      // @spec AUTH-BE-002 — sliding expiration: refresh on each authenticated
      // request, both in the DB row and via a fresh Set-Cookie so the browser's
      // Max-Age is rolled forward.
      const nextExpiry = computeNewExpiry();
      await db.session.update({
        where: { id: sessionId },
        data: { expiresAt: nextExpiry },
      });
      slidingCookie = sessionSetCookieHeader(sessionId);
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders }) => {
      if (slidingCookie) resHeaders.append("Set-Cookie", slidingCookie);
      return { db, user, sessionId, resHeaders };
    },
  });
}

export { handler as GET, handler as POST };
