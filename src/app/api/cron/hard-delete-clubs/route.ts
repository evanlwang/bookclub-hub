// @spec CLUB-BE-005
import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";

/**
 * Cron endpoint that hard-deletes clubs that have been soft-deleted for 30+ days.
 *
 * Triggered by external cron (e.g., Vercel Cron). Validates `CRON_SECRET`
 * header to prevent unauthorized calls.
 *
 * Selects clubs with `status="deleted"` and `deletedAt <= now - 30d`, then
 * issues a `db.club.delete` (cascades to memberships, voting rounds, meetings,
 * etc. via the ON DELETE CASCADE relations declared in `prisma/schema.prisma`).
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("CRON_SECRET");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const expired = await db.club.findMany({
      where: { status: "deleted", deletedAt: { lte: cutoff } },
      select: { id: true, code: true },
    });

    let deleted = 0;
    for (const club of expired) {
      await db.club.delete({ where: { id: club.id } });
      deleted += 1;
    }

    return NextResponse.json({
      ok: true,
      cutoff: cutoff.toISOString(),
      deleted,
      ids: expired.map((c) => c.id),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
