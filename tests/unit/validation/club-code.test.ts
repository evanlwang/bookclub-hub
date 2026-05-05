// @spec CLUB-DATA-001, CLUB-DATA-002
import { describe, it, expect } from "vitest";
import { normalizeCode, validateCode } from "@/lib/validation/club-code";

describe("normalizeCode", () => {
  it("converts to uppercase", () => {
    expect(normalizeCode("wedreads")).toBe("WEDREADS");
  });

  it("trims whitespace", () => {
    expect(normalizeCode("  SCIFI42  ")).toBe("SCIFI42");
  });

  it("handles mixed case", () => {
    expect(normalizeCode("SciFi42")).toBe("SCIFI42");
  });
});

describe("validateCode", () => {
  it("accepts 4-character code", () => {
    expect(validateCode("ABCD")).toEqual({ valid: true });
  });

  it("accepts 16-character code", () => {
    expect(validateCode("ABCDEFGHIJKLMNOP")).toEqual({ valid: true });
  });

  it("accepts alphanumeric code", () => {
    expect(validateCode("SCIFI42")).toEqual({ valid: true });
  });

  it("rejects 3-character code", () => {
    const result = validateCode("ABC");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least 4");
  });

  it("rejects 17-character code", () => {
    const result = validateCode("ABCDEFGHIJKLMNOPQ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most 16");
  });

  it("rejects special characters", () => {
    const result = validateCode("ABC!");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("alphanumeric");
  });

  it("rejects spaces", () => {
    const result = validateCode("AB CD");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("alphanumeric");
  });

  it("rejects hyphens", () => {
    const result = validateCode("AB-CD");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("alphanumeric");
  });

  it("rejects underscores", () => {
    const result = validateCode("AB_CD");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("alphanumeric");
  });
});
