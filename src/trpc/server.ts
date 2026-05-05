import { appRouter } from "@/server/routers/_app";
import { prisma as db } from "@/lib/db";
import { cookies } from "next/headers";

export async function getServerCaller() {
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

  return appRouter.createCaller({ db, user, sessionId });
}
