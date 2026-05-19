/**
 * Public health-check endpoint for external uptime monitoring.
 *
 * This route is intentionally UNAUTHENTICATED so that uptime services
 * (e.g. Vercel Cron, BetterStack, UptimeRobot, statuscake) can poll it
 * without managing secrets. The response carries no PII and no
 * environment values — only a coarse liveness signal, the deployment
 * commit SHA, and a database-reachability flag.
 *
 * Behavior:
 *   - 200 { status: "ok",       commit, db: "ok"   } when Prisma can run `SELECT 1`.
 *   - 503 { status: "degraded", commit, db: "down" } when the DB probe throws.
 *
 * The DB probe relies on Prisma's built-in query timeout and Vercel's
 * function timeout; a hung DB will surface as a 503 (or a platform-level
 * timeout), which is the desired signal for monitors.
 *
 * Rate-limiting is intentionally not implemented here — the handler is a
 * single trivial query and Vercel's edge handles abusive traffic.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", commit, db: "ok" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", commit, db: "down" },
      { status: 503 },
    );
  }
}
