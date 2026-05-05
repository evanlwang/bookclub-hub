import { type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export interface TestClub {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export function createTestClub(overrides?: Partial<TestClub>): TestClub {
  return {
    id: randomUUID(),
    name: "Test Club",
    code: `TEST${randomUUID().slice(0, 4).toUpperCase()}`,
    ...overrides,
  };
}

export const wedReads = createTestClub({
  name: "Wednesday Night Reads",
  code: "WEDREADS",
  description: "We read books on Wednesday nights",
});

export const sciFiExplorers = createTestClub({
  name: "Sci-Fi Explorers",
  code: "SCIFI42",
  description: "Exploring the universe through science fiction",
});

export const historyBuffs = createTestClub({
  name: "History Buffs",
  code: "HSTBUF",
  description: "Reading history, one book at a time",
});

export async function insertClub(
  db: PrismaClient,
  club: TestClub,
  ownerId: string
) {
  return db.club.create({
    data: {
      id: club.id,
      name: club.name,
      code: club.code,
      description: club.description,
      createdBy: ownerId,
    },
  });
}
