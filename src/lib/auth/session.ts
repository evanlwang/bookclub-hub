// @spec AUTH-BE-001, AUTH-BE-002
import { randomBytes } from "crypto";

const SESSION_LENGTH = 64; // 64 hex characters = 32 bytes
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

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

/**
 * Build the canonical session-cookie Set-Cookie value.
 *
 * @spec AUTH-BE-001 — HttpOnly, Secure, SameSite=Lax. Secure is dropped in
 *       development (NODE_ENV !== "production") so localhost (which is not
 *       https) can still receive the cookie.
 */
export function sessionSetCookieHeader(
  sessionId: string,
  maxAgeSeconds: number = SESSION_TTL_SECONDS,
): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `session_id=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export const SESSION_COOKIE_TTL_SECONDS = SESSION_TTL_SECONDS;
