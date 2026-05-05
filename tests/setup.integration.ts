import dotenv from "dotenv";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { getTestDb, resetDb, closeDb } from "@/lib/db.test-utils";

dotenv.config({ path: ".env.test" });

beforeAll(async () => {
  // Ensure the test DB is accessible
  const db = getTestDb();
  await db.$connect();
});

beforeEach(async () => {
  const db = getTestDb();
  await resetDb(db);
});

afterAll(async () => {
  await closeDb();
});
