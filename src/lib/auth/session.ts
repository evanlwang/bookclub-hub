// @spec AUTH-BE-001, AUTH-BE-002
import { randomBytes } from "crypto";

const SESSION_LENGTH = 64; // 64 hex characters = 32 bytes
const SESSION_TTL_DAYS = 30;

/**
 * Generate a cryptographically random session ID (64+ hex characters).
 */
export function generateSessionId(): string {
  return randomBytes(SESSION_LENGTH / 2).toString("hex");
}

/**
 * Check if a session has expired.
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Compute a new session expiry date (30 days from now).
 */
export function computeNewExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + SESSION_TTL_DAYS);
  return expiry;
}
