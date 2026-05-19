import { PrismaClient } from "@prisma/client";
// Side-effect import: validates env at boot. Throws if production is missing
// a required key. Every server code path imports `prisma` from here, so this
// becomes the de-facto early entry point. @spec INFRA-ENV-VALIDATION-001
import { env } from "@/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query"] : [],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
