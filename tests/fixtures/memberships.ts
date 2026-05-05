import { type PrismaClient, type MemberRole } from "@prisma/client";
import type { TestUser } from "./users";
import type { TestClub } from "./clubs";

export async function insertMembership(
  db: PrismaClient,
  clubId: string,
  userId: string,
  role: MemberRole = "member"
) {
  return db.membership.create({
    data: { clubId, userId, role },
  });
}

export async function seedClubWithMembers(
  db: PrismaClient,
  club: TestClub,
  owner: TestUser,
  admins: TestUser[],
  members: TestUser[]
) {
  await db.club.create({
    data: {
      id: club.id,
      name: club.name,
      code: club.code,
      description: club.description,
      createdBy: owner.id,
    },
  });

  await insertMembership(db, club.id, owner.id, "owner");

  for (const admin of admins) {
    await insertMembership(db, club.id, admin.id, "admin");
  }

  for (const member of members) {
    await insertMembership(db, club.id, member.id, "member");
  }
}
