import type { PrismaClient } from "@prisma/client";
import type { TestUser } from "../factories/users";
import type { TestClub } from "../factories/clubs";
import { createMembership, insertClub } from "../factories";

// Re-export from factories
export { createMembership } from "../factories/entities";
export type { MembershipInput } from "../factories/entities";

/**
 * Helper: Create a club with owner, admins, and members.
 * Used by integration tests for quick setup.
 */
export async function seedClubWithMembers(
  db: PrismaClient,
  club: TestClub,
  owner: TestUser,
  admins: TestUser[],
  members: TestUser[]
) {
  // Create club with owner
  await insertClub(db, { ...club, createdBy: owner.id });

  // Add owner
  await createMembership(db, { clubId: club.id, userId: owner.id, role: "owner" });

  // Add admins
  for (const admin of admins) {
    await createMembership(db, { clubId: club.id, userId: admin.id, role: "admin" });
  }

  // Add members
  for (const member of members) {
    await createMembership(db, { clubId: club.id, userId: member.id, role: "member" });
  }
}
