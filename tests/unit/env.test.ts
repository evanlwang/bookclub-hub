// @spec INFRA-ENV-VALIDATION-001
import { describe, it, expect } from "vitest";
import { parseEnv } from "@/env";

describe("parseEnv", () => {
  it("accepts minimal dev env (no production-required keys)", () => {
    const env = parseEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe("development");
    expect(env.OPEN_LIBRARY_BASE_URL).toBe("https://openlibrary.org");
  });

  it("defaults WebAuthn RP config to localhost for dev", () => {
    const env = parseEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
    expect(env.WEBAUTHN_RP_ID).toBe("localhost");
    expect(env.WEBAUTHN_ORIGIN).toBe("http://localhost:3000");
    expect(env.WEBAUTHN_RP_NAME).toBe("Dogear");
  });

  it("accepts minimal test env", () => {
    const env = parseEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe("test");
  });

  it("defaults NODE_ENV to development when unset", () => {
    const env = parseEnv({} as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects invalid NODE_ENV", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "staging" } as unknown as NodeJS.ProcessEnv)
    ).toThrow(/NODE_ENV/);
  });

  it("rejects production missing DATABASE_URL, DIRECT_URL, and CRON_SECRET", () => {
    expect(() =>
      parseEnv({ NODE_ENV: "production" } as NodeJS.ProcessEnv)
    ).toThrow(/DATABASE_URL[\s\S]*DIRECT_URL[\s\S]*CRON_SECRET/);
  });

  it("rejects production missing only CRON_SECRET", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://localhost/x",
        DIRECT_URL: "postgresql://localhost/x",
      } as NodeJS.ProcessEnv)
    ).toThrow(/CRON_SECRET/);
  });

  it("accepts production when all required keys present", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/x",
      DIRECT_URL: "postgresql://localhost/x",
      CRON_SECRET: "secret",
    } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe("production");
    expect(env.CRON_SECRET).toBe("secret");
  });

  it("rejects invalid OPEN_LIBRARY_BASE_URL", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        OPEN_LIBRARY_BASE_URL: "not a url",
      } as NodeJS.ProcessEnv)
    ).toThrow(/OPEN_LIBRARY_BASE_URL/);
  });

  it("error message is human-readable (lists each issue on its own line)", () => {
    try {
      parseEnv({ NODE_ENV: "production" } as NodeJS.ProcessEnv);
      throw new Error("should not reach");
    } catch (err) {
      expect((err as Error).message).toMatch(/^Invalid environment:/);
      expect((err as Error).message).toContain("DATABASE_URL");
      expect((err as Error).message).toContain("DIRECT_URL");
      expect((err as Error).message).toContain("CRON_SECRET");
    }
  });
});
