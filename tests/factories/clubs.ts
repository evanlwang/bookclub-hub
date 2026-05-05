import { randomUUID } from "crypto";
import type { PrismaClient, ClubStatus } from "@prisma/client";

export interface TestClub {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: ClubStatus;
  createdBy: string;
  deletedAt?: Date;
}

export function createClub(createdBy: string, overrides?: Partial<TestClub>): TestClub {
  const id = overrides?.id || randomUUID();
  return {
    id,
    name: overrides?.name || "Test Club",
    code: overrides?.code || `TST${randomUUID().slice(0, 4).toUpperCase()}`,
    description: overrides?.description,
    status: overrides?.status || "active",
    createdBy,
    deletedAt: overrides?.deletedAt,
  };
}

// Pre-built clubs
export const wedReads = createClub("", {
  name: "Wednesday Night Reads",
  code: "WEDREADS",
  description: "We read books on Wednesday nights",
});

export const sciFiExplorers = createClub("", {
  name: "Sci-Fi Explorers",
  code: "SCIFI42",
  description: "Exploring the universe through science fiction",
});

export const historyBuffs = createClub("", {
  name: "History Buffs",
  code: "HSTBUF",
  description: "Reading history, one book at a time",
});

export const fantasyFans = createClub("", {
  name: "Fantasy Fans United",
  code: "FFU",
  description: "For lovers of epic fantasy worlds",
});

export async function insertClub(db: PrismaClient, club: TestClub) {
  return db.club.create({
    data: {
      id: club.id,
      name: club.name,
      code: club.code,
      description: club.description,
      status: club.status || "active",
      createdBy: club.createdBy,
      deletedAt: club.deletedAt,
    },
  });
}
