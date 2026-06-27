// @spec AUTH-PASSKEY-LIST-001, AUTH-PASSKEY-REVOKE-001, AUTH-PASSKEY-MULTI-001, AUTH-PASSKEY-UNKNOWN-001
//
// Thin Prisma helpers for passkey credentials. Kept separate from the router so
// the persistence shape (Bytes ↔ Buffer, transports array) lives in one place.
import type { PrismaClient } from "@prisma/client";
import type { StoredCredential } from "./webauthn";

export async function listCredentialsForUser(db: PrismaClient, userId: string) {
  return db.credential.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
  });
}

/** For `excludeCredentials` / `allowCredentials`. */
export async function credentialDescriptorsForUser(
  db: PrismaClient,
  userId: string,
): Promise<{ credentialId: string; transports: string[] }[]> {
  const rows = await db.credential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });
  return rows.map((r) => ({ credentialId: r.credentialId, transports: r.transports }));
}

export async function findStoredCredential(
  db: PrismaClient,
  credentialId: string,
): Promise<{ id: string; userId: string; stored: StoredCredential } | null> {
  const row = await db.credential.findUnique({ where: { credentialId } });
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    stored: {
      credentialId: row.credentialId,
      publicKey: Buffer.from(row.publicKey),
      counter: row.counter,
      transports: row.transports,
    },
  };
}

export async function createCredential(
  db: PrismaClient,
  params: {
    userId: string;
    deviceName: string;
    credential: StoredCredential;
  },
) {
  return db.credential.create({
    data: {
      userId: params.userId,
      deviceName: params.deviceName,
      credentialId: params.credential.credentialId,
      // Prisma `Bytes` expects a plain Uint8Array view.
      publicKey: new Uint8Array(params.credential.publicKey),
      counter: params.credential.counter,
      transports: params.credential.transports,
    },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
  });
}

export async function touchCredential(
  db: PrismaClient,
  credentialId: string,
  newCounter: number,
) {
  await db.credential.update({
    where: { credentialId },
    data: { counter: newCounter, lastUsedAt: new Date() },
  });
}

/**
 * Delete one of the caller's own credentials. Scoping the delete by `userId`
 * means a credential owned by someone else simply doesn't match (count 0),
 * so a user can never revoke another user's passkey.
 *
 * @spec AUTH-PASSKEY-REVOKE-001
 */
export async function revokeCredentialForUser(
  db: PrismaClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await db.credential.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
