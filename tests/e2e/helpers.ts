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

/**
 * Restore the seed-canonical WEDREADS membership graph: alice owner,
 * bob+carol admin, dave+eve+frank member, plus carol explicitly absent
 * from SCIFI42. Use in beforeEach to make a test resilient to state
 * pollution from earlier tests (e.g. the switcher join-club test adds
 * carol to SCIFI42; the members test demotes admins; the join-club
 * tests create throwaway users who join WEDREADS).
 *
 * This is a STRICT reset: any WEDREADS membership not in the seed graph
 * is deleted (so test-created joiners don't inflate the member count).
 */
export async function restoreSeedMembershipGraph() {
  const db = getDb();
  const [wedreads, scifi] = await Promise.all([
    db.club.findUniqueOrThrow({ where: { code: "WEDREADS" } }),
    db.club.findUniqueOrThrow({ where: { code: "SCIFI42" } }),
  ]);
  const seedEmails = ["alice@example.com", "bob@example.com", "carol@example.com", "dave@example.com", "eve@example.com", "frank@example.com"];
  const users = await db.user.findMany({ where: { email: { in: seedEmails } } });
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const seedUserIds = users.map((u) => u.id);

  const want: Array<{ email: string; clubId: string; role: "owner" | "admin" | "member" }> = [
    { email: "alice@example.com", clubId: wedreads.id, role: "owner" },
    { email: "bob@example.com", clubId: wedreads.id, role: "admin" },
    { email: "carol@example.com", clubId: wedreads.id, role: "admin" },
    { email: "dave@example.com", clubId: wedreads.id, role: "member" },
    { email: "eve@example.com", clubId: wedreads.id, role: "member" },
    { email: "frank@example.com", clubId: wedreads.id, role: "member" },
  ];
  await Promise.all(
    want.map((w) =>
      db.membership.upsert({
        where: { clubId_userId: { clubId: w.clubId, userId: byEmail[w.email].id } },
        update: { role: w.role },
        create: { clubId: w.clubId, userId: byEmail[w.email].id, role: w.role },
      }),
    ),
  );

  // Delete any WEDREADS membership for a non-seed user (throwaway test users).
  await db.membership.deleteMany({
    where: { clubId: wedreads.id, userId: { notIn: seedUserIds } },
  });

  // Carol must NOT be in SCIFI42 (the switcher test adds her there).
  await db.membership.deleteMany({
    where: { clubId: scifi.id, userId: byEmail["carol@example.com"].id },
  });
}
