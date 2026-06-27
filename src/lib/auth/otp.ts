// @spec AUTH-OTP-REQUEST-001, AUTH-OTP-HASH-001, AUTH-OTP-VERIFY-001, AUTH-OTP-EXPIRY-001, AUTH-OTP-MAGNITUDES-001
//
// Pure OTP helpers: generation, hashing, constant-time verification, and the
// TTL/attempt-cap magnitudes. DB orchestration (issue, supersede prior codes,
// consume, attempt counting) lives in the auth router and is covered by
// integration tests; this module stays pure and unit-testable.
import { randomInt, createHash, timingSafeEqual } from "crypto";

export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Generate a zero-padded 6-digit numeric code using a CSPRNG.
 * `randomInt` is uniform over [0, 10^6), avoiding modulo bias.
 */
export function generateOtpCode(): string {
  const n = randomInt(0, 10 ** OTP_CODE_LENGTH);
  return n.toString().padStart(OTP_CODE_LENGTH, "0");
}

/**
 * One-way hash of an OTP. The raw code is never stored. Codes are short-lived
 * and attempt-capped, so SHA-256 (fast) is appropriate — bcrypt's slowness
 * would only add latency without meaningful benefit at this entropy + TTL.
 *
 * @spec AUTH-OTP-HASH-001
 */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Constant-time comparison of a presented code against a stored hash.
 *
 * @spec AUTH-OTP-VERIFY-001, AUTH-OTP-HASH-001
 */
export function verifyOtpHash(code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code), "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Expiry timestamp for a freshly issued code. */
export function computeOtpExpiry(now: number = Date.now()): Date {
  return new Date(now + OTP_TTL_MS);
}

/**
 * Whether a stored OTP has passed its expiry.
 *
 * @spec AUTH-OTP-EXPIRY-001
 */
export function isOtpExpired(expiresAt: Date, now: number = Date.now()): boolean {
  return now > expiresAt.getTime();
}

/**
 * Whether the per-code verification attempt cap has been reached.
 *
 * @spec AUTH-OTP-ATTEMPTS-001
 */
export function isOtpAttemptsExceeded(attempts: number): boolean {
  return attempts >= OTP_MAX_ATTEMPTS;
}
