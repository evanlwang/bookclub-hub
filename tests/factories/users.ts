import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
}

export function createUser(overrides?: Partial<TestUser>): TestUser {
  const id = overrides?.id || randomUUID();
  return {
    id,
    email: overrides?.email || `user-${id.slice(0, 8)}@example.com`,
    displayName: overrides?.displayName || "Test User",
  };
}

export const alice = createUser({
  email: "alice@example.com",
  displayName: "Alice Chen",
});

export const bob = createUser({
  email: "bob@example.com",
  displayName: "Bob Martinez",
});

export const carol = createUser({
  email: "carol@example.com",
  displayName: "Carol Park",
});

export const dave = createUser({
  email: "dave@example.com",
  displayName: "Dave Singh",
});

export const eve = createUser({
  email: "eve@example.com",
  displayName: "Eve Thompson",
});

export const frank = createUser({
  email: "frank@example.com",
  displayName: "Frank Wilson",
});

export const grace = createUser({
  email: "grace@example.com",
  displayName: "Grace Lee",
});

export const henry = createUser({
  email: "henry@example.com",
  displayName: "Henry Kim",
});

export const allUsers = [alice, bob, carol, dave, eve, frank, grace, henry];

export async function insertUser(db: PrismaClient, user: TestUser) {
  return db.user.create({
    data: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}

export async function insertAllUsers(db: PrismaClient, users: TestUser[] = allUsers) {
  for (const user of users) {
    await insertUser(db, user);
  }
}
