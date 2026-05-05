// @spec AUTH-DATA-001, AUTH-DATA-002
import { describe, it, expect } from "vitest";
import { normalizeEmail, validateEmail } from "@/lib/validation/email";

describe("normalizeEmail", () => {
  it("converts to lowercase", () => {
    expect(normalizeEmail("Evan@Example.COM")).toBe("evan@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  alice@example.com  ")).toBe("alice@example.com");
  });

  it("handles mixed case and whitespace", () => {
    expect(normalizeEmail(" Bob@GMAIL.com ")).toBe("bob@gmail.com");
  });

  it("case-insensitive dedup: same emails normalize to same string", () => {
    expect(normalizeEmail("Evan@Example.com")).toBe(
      normalizeEmail("evan@example.com")
    );
  });
});

describe("validateEmail", () => {
  it("accepts valid email", () => {
    expect(validateEmail("alice@example.com")).toEqual({ valid: true });
  });

  it("rejects empty string", () => {
    expect(validateEmail("")).toEqual({
      valid: false,
      error: "Email is required",
    });
  });

  it("rejects whitespace-only", () => {
    expect(validateEmail("   ")).toEqual({
      valid: false,
      error: "Email is required",
    });
  });

  it("rejects missing @", () => {
    const result = validateEmail("aliceexample.com");
    expect(result.valid).toBe(false);
  });

  it("rejects missing domain", () => {
    const result = validateEmail("alice@");
    expect(result.valid).toBe(false);
  });

  it("rejects missing local part", () => {
    const result = validateEmail("@example.com");
    expect(result.valid).toBe(false);
  });

  it("accepts complex valid emails", () => {
    expect(validateEmail("user+tag@sub.domain.com")).toEqual({ valid: true });
  });
});
