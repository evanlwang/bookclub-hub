import { PrismaClient } from "@prisma/client";

let testPrisma: PrismaClient | null = null;

export function getTestDb(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient();
  }
  return testPrisma;
}

// Truncate all tables in reverse-FK dependency order
export async function resetDb(db: PrismaClient): Promise<void> {
  await db.$transaction([
    db.comment.deleteMany(),
    db.discussionThread.deleteMany(),
    db.availabilityResponse.deleteMany(),
    db.meetingTimeSlot.deleteMany(),
    db.meeting.deleteMany(),
    db.readingProgress.deleteMany(),
    db.vote.deleteMany(),
    db.nomination.deleteMany(),
    db.bookSelection.deleteMany(),
    db.votingRound.deleteMany(),
    db.membership.deleteMany(),
    db.session.deleteMany(),
    db.credential.deleteMany(),
    db.webAuthnChallenge.deleteMany(),
    db.emailOtp.deleteMany(),
    db.book.deleteMany(),
    db.club.deleteMany(),
    db.user.deleteMany(),
  ]);
}

export async function closeDb(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}
