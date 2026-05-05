import { type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
}

export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: randomUUID(),
    email: `user-${randomUUID().slice(0, 8)}@example.com`,
    displayName: "Test User",
    ...overrides,
  };
}

// Pre-built users
export const alice = createTestUser({
  email: "alice@example.com",
  displayName: "Alice Chen",
});

export const bob = createTestUser({
  email: "bob@example.com",
  displayName: "Bob Martinez",
});

export const carol = createTestUser({
  email: "carol@example.com",
  displayName: "Carol Park",
});

export const dave = createTestUser({
  email: "dave@example.com",
  displayName: "Dave Singh",
});

export const eve = createTestUser({
  email: "eve@example.com",
  displayName: "Eve Thompson",
});

export const frank = createTestUser({
  email: "frank@example.com",
  displayName: "Frank Wilson",
});

export const allUsers = [alice, bob, carol, dave, eve, frank];

export async function insertUser(db: PrismaClient, user: TestUser) {
  return db.user.create({
    data: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}

export async function insertAllUsers(db: PrismaClient) {
  for (const user of allUsers) {
    await insertUser(db, user);
  }
}
