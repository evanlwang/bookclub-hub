import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { seedStandard } from "../factories/scenarios";

dotenv.config({ path: ".env.test" });

/**
 * Global setup for E2E tests. Seeds the test database with the standard dataset
 * (same as the original golden dataset). Uses factories for consistency with
 * unit and integration tests.
 */
export default async function globalSetup() {
  const db = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ||
      "postgresql://evanwang@localhost:5432/bookclub_hub_test",
  });

  try {
    // Truncate all tables
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
      db.book.deleteMany(),
      db.club.deleteMany(),
      db.user.deleteMany(),
    ]);

    // Seed with standard scenario
    await seedStandard(db);

    console.log("E2E global setup: database seeded successfully");
  } finally {
    await db.$disconnect();
  }
}
