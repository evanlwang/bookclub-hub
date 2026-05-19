import dotenv from "dotenv";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { getTestDb, resetDb, closeDb } from "@/lib/db.test-utils";
import { _resetRateLimits } from "@/lib/auth/rate-limit";

dotenv.config({ path: ".env.test" });

beforeAll(async () => {
  // Ensure the test DB is accessible
  const db = getTestDb();
  await db.$connect();
});

beforeEach(async () => {
  const db = getTestDb();
  await resetDb(db);
  // Existing auth-heavy suites make 2-3 calls per test; the 5/min ceiling
  // would otherwise bleed across cases in the same suite.
  _resetRateLimits();
});

afterAll(async () => {
  await closeDb();
});
