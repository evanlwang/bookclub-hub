import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { prisma as db } from "@/lib/db";
import { cookies } from "next/headers";

async function handler(req: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value ?? null;

  let user = null;
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
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ resHeaders }) => ({ db, user, sessionId, resHeaders }),
  });
}

export { handler as GET, handler as POST };
