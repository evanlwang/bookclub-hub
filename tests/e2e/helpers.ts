import { type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const DB_URL = process.env.DATABASE_URL || "postgresql://evanwang@localhost:5432/bookclub_hub_test";

let _db: PrismaClient | null = null;

export function getDb() {
  if (!_db) {
    _db = new PrismaClient({ datasourceUrl: DB_URL });
  }
  return _db;
}

/**
 * Authenticate a user by creating a session and setting the cookie.
 */
export async function loginAs(page: Page, email: string) {
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const crypto = await import("crypto");
  const sessionId = crypto.randomBytes(64).toString("hex");
  await db.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await page.context().addCookies([
    {
      name: "session_id",
      value: sessionId,
      domain: "localhost",
      path: "/",
    },
  ]);

  return user;
}

export async function getClubByCode(code: string) {
  const db = getDb();
  return db.club.findUniqueOrThrow({ where: { code } });
}

export async function getBookByTitle(title: string) {
  const db = getDb();
  return db.book.findFirstOrThrow({ where: { title } });
}
