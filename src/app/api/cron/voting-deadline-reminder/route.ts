// @spec VOTE-NOTIFY-003
import { NextRequest, NextResponse } from "next/server";
import { prisma as db } from "@/lib/db";
import { emailService } from "@/server/services/email";
import { env } from "@/env";

/**
 * Cron endpoint that sends voting deadline reminders to club members.
 *
 * Triggered by external cron (e.g., Vercel Cron, GitHub Actions, etc.)
 * Validates CRON_SECRET header to prevent unauthorized calls.
 *
 * Queries all VotingRound where:
 * - status = "voting"
 * - votingDeadline is between now and now + 24h
 *
 * For each round, sends reminder to members who haven't voted.
 */
export async function GET(request: NextRequest) {
  // Validate CRON_SECRET header
  const cronSecret = request.headers.get("CRON_SECRET");
  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const inTwentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Query voting rounds with deadline in the next 24h
    const roundsToRemind = await db.votingRound.findMany({
      where: {
        status: "voting",
        votingDeadline: {
          gte: now,
          lt: inTwentyFourHours,
        },
      },
      include: {
        club: true,
        nominations: {
          include: {
            votes: true,
          },
        },
      },
    });

    let totalReminded = 0;

    for (const round of roundsToRemind) {
      // Get all members of the club
      const members = await db.membership.findMany({
        where: { clubId: round.clubId },
        include: { user: true },
      });

      // Get users who have voted in this round
      const votedUserIds = new Set<string>();
      for (const nomination of round.nominations) {
        for (const vote of nomination.votes) {
          votedUserIds.add(vote.userId);
        }
      }

      // Collect members who haven't voted
      const nonVoters = members.filter((m) => !votedUserIds.has(m.userId));

      if (nonVoters.length > 0) {
        const emails = nonVoters.map((m) => m.user.email);
        await emailService.sendVotingDeadlineReminder(emails, round.club.name);
        totalReminded += nonVoters.length;
      }
    }

    return NextResponse.json({
      reminded: totalReminded,
      rounds: roundsToRemind.length,
    });
  } catch (error) {
    console.error("Error in voting-deadline-reminder cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
