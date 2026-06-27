import { describe, it, expect } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
  computeOtpExpiry,
  isOtpExpired,
  isOtpAttemptsExceeded,
  OTP_CODE_LENGTH,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/auth/otp";

describe("OTP generation", () => {
  // @spec AUTH-OTP-REQUEST-001
  it("generates a zero-padded numeric code of the configured length", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtpCode();
      expect(code).toHaveLength(OTP_CODE_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("produces varied codes (not constant)", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("OTP hashing", () => {
  // @spec AUTH-OTP-HASH-001
  it("never returns the raw code and is deterministic", () => {
    const code = "123456";
    const hash = hashOtp(code);
    expect(hash).not.toContain(code);
    expect(hash).toEqual(hashOtp(code));
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it("produces different hashes for different codes", () => {
    expect(hashOtp("000000")).not.toEqual(hashOtp("000001"));
  });
});

describe("OTP verification", () => {
  // @spec AUTH-OTP-VERIFY-001
  it("accepts the correct code against its hash", () => {
    const code = generateOtpCode();
    expect(verifyOtpHash(code, hashOtp(code))).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const hash = hashOtp("123456");
    expect(verifyOtpHash("654321", hash)).toBe(false);
  });

  it("rejects against a malformed/empty stored hash without throwing", () => {
    expect(verifyOtpHash("123456", "")).toBe(false);
    expect(verifyOtpHash("123456", "deadbeef")).toBe(false);
  });
});

describe("OTP expiry", () => {
  // @spec AUTH-OTP-EXPIRY-001, AUTH-OTP-MAGNITUDES-001
  it("computes expiry TTL_MS in the future", () => {
    const now = 1_000_000;
    expect(computeOtpExpiry(now).getTime()).toBe(now + OTP_TTL_MS);
    expect(OTP_TTL_MS).toBe(10 * 60 * 1000);
  });

  it("is not expired before TTL and expired after", () => {
    const now = 1_000_000;
    const expiry = computeOtpExpiry(now);
    expect(isOtpExpired(expiry, now)).toBe(false);
    expect(isOtpExpired(expiry, now + OTP_TTL_MS - 1)).toBe(false);
    expect(isOtpExpired(expiry, now + OTP_TTL_MS + 1)).toBe(true);
  });
});

describe("OTP attempt cap", () => {
  // @spec AUTH-OTP-ATTEMPTS-001, AUTH-OTP-MAGNITUDES-001
  it("is exceeded only once attempts reach the cap", () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(isOtpAttemptsExceeded(OTP_MAX_ATTEMPTS - 1)).toBe(false);
    expect(isOtpAttemptsExceeded(OTP_MAX_ATTEMPTS)).toBe(true);
    expect(isOtpAttemptsExceeded(OTP_MAX_ATTEMPTS + 1)).toBe(true);
  });
});
