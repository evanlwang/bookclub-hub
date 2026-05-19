import { appRouter } from "@/server/routers/_app";
import { prisma as db } from "@/lib/db";
import { cookies } from "next/headers";
import { computeNewExpiry } from "@/lib/auth/session";

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
      // @spec AUTH-BE-002 — sliding expiration on RSC reads. We can't emit
      // Set-Cookie from RSC trees, so the cookie's Max-Age is rolled forward
      // by the next tRPC HTTP call; the DB row is refreshed here regardless
      // so server-side expiry checks see the latest timestamp.
      await db.session.update({
        where: { id: sessionId },
        data: { expiresAt: computeNewExpiry() },
      });
    }
  }

  return appRouter.createCaller({ db, user, sessionId, resHeaders: null, ip: null });
}
