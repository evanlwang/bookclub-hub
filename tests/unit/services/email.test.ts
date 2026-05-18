// @spec VOTE-NOTIFY-NONBLOCK-001, MEET-NOTIFY-NONBLOCK-001
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ResendCtor, sendMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const ResendCtor = vi.fn(function (this: { emails: { send: typeof sendMock } }) {
    this.emails = { send: sendMock };
  });
  return { ResendCtor, sendMock };
});

vi.mock("resend", () => ({ Resend: ResendCtor }));

import {
  emailService,
  getEmailCalls,
  resetEmailCalls,
} from "@/server/services/email";

beforeEach(() => {
  resetEmailCalls();
  ResendCtor.mockClear();
  ResendCtor.mockImplementation(function (this: { emails: { send: typeof sendMock } }) {
    this.emails = { send: sendMock };
  });
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "ok" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("emailService — test-mode short-circuit", () => {
  it("treats RESEND_API_KEY='re_mock_...' as test mode (no network call)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_mock_key_for_local_dev");

    await emailService.sendRoundNominating(["a@x.com"], "Club");

    expect(ResendCtor).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(getEmailCalls()).toHaveLength(1);
  });

  it("treats the literal 'test' key as test mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "test");

    await emailService.sendRoundNominating(["a@x.com"], "Club");

    expect(ResendCtor).not.toHaveBeenCalled();
  });

  it("treats NODE_ENV=test as test mode regardless of key", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEND_API_KEY", "re_real_looking_key");

    await emailService.sendMeetingProposed(["a@x.com"], "Club", "Title");

    expect(ResendCtor).not.toHaveBeenCalled();
  });
});

describe("emailService — best-effort delivery", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("does not throw when Resend constructor throws (missing key in prod)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    ResendCtor.mockImplementationOnce(function () {
      throw new Error(
        'Missing API key. Pass it to the constructor `new Resend("re_123")`'
      );
    });

    await expect(
      emailService.sendRoundNominating(["a@x.com"], "Club")
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not throw when Resend.emails.send rejects", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_real_key");
    sendMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      emailService.sendMeetingConfirmed(
        ["a@x.com"],
        "Club",
        "Title",
        "2026-05-20"
      )
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("invokes Resend in production with a real-looking key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_real_key");

    await emailService.sendRoundDecided(["a@x.com"], "Club", "Some Book");

    expect(ResendCtor).toHaveBeenCalledWith("re_real_key");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
