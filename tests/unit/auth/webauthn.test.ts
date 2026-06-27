import { describe, it, expect, afterEach, vi } from "vitest";
import { assertCounterValid, getRpConfig, WebAuthnError } from "@/lib/auth/webauthn";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertCounterValid (cloned-authenticator guard)", () => {
  // @spec AUTH-PASSKEY-COUNTER-001
  it("accepts a strictly increasing counter", () => {
    expect(() => assertCounterValid(5, 6)).not.toThrow();
    expect(() => assertCounterValid(0, 1)).not.toThrow();
  });

  it("accepts the all-zero (no-counter authenticator) case", () => {
    expect(() => assertCounterValid(0, 0)).not.toThrow();
  });

  it("rejects a non-increasing counter when a counter is in use", () => {
    expect(() => assertCounterValid(5, 5)).toThrow(WebAuthnError);
    expect(() => assertCounterValid(5, 4)).toThrow(/cloned authenticator/i);
    expect(() => assertCounterValid(1, 0)).toThrow(WebAuthnError);
  });
});

describe("getRpConfig", () => {
  // @spec AUTH-PASSKEY-RP-001
  it("defaults to localhost dev config", () => {
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    vi.stubEnv("WEBAUTHN_RP_NAME", "");
    expect(getRpConfig()).toEqual({
      rpID: "localhost",
      origin: "http://localhost:3000",
      rpName: "Dogear",
    });
  });

  it("reads configured production RP values", () => {
    vi.stubEnv("WEBAUTHN_RP_ID", "dogear.app");
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://dogear.app");
    vi.stubEnv("WEBAUTHN_RP_NAME", "Dogear");
    expect(getRpConfig()).toEqual({
      rpID: "dogear.app",
      origin: "https://dogear.app",
      rpName: "Dogear",
    });
  });
});
