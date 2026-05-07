import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { seedDev } from "./factories/scenarios";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

/**
 * Dev DB seed for `make seed` / `make up`. Wipes then loads the rich
 * `seedDev` scenario, which exercises every feature surface of the app.
 *
 * Kept separate from tests/e2e/global-setup.ts so that automated E2E
 * tests continue to use the deterministic `seedStandard` dataset.
 */
export default async function devSetup() {
  const db = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ||
      `postgresql://${process.env.USER}@localhost:5432/bookclub_hub_dev`,
  });

  try {
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

    await seedDev(db);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  devSetup()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
