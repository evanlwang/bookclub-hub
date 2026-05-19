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

describe("emailService — HTML escaping", () => {
  it("escapes <, >, &, \", ' in clubName for sendRoundNominating", async () => {
    await emailService.sendRoundNominating(["alice@example.com"], `<b>"X&Y"</b>'s Club`);
    const [call] = getEmailCalls();
    expect(call.body).toContain("&lt;b&gt;");
    expect(call.body).toContain("&quot;X&amp;Y&quot;");
    expect(call.body).toContain("&#39;s Club");
    expect(call.body).not.toContain("<b>\"X&Y\"</b>'s");
  });

  it("escapes interpolated values in sendRoundDecided (both clubName and bookTitle)", async () => {
    await emailService.sendRoundDecided(
      ["bob@example.com"],
      "Club <name>",
      `Book & "title"`
    );
    const [call] = getEmailCalls();
    expect(call.body).toContain("Club &lt;name&gt;");
    expect(call.body).toContain("Book &amp; &quot;title&quot;");
  });

  it("escapes clubName in sendMeetingProposed (title appears only in subject)", async () => {
    await emailService.sendMeetingProposed(["carol@example.com"], "<Club>", `<script>alert(1)</script>`);
    const [call] = getEmailCalls();
    expect(call.body).not.toContain("<script>");
    expect(call.body).toContain("&lt;Club&gt;");
  });

  it("escapes title, time, and location in sendMeetingConfirmed when location present", async () => {
    await emailService.sendMeetingConfirmed(
      ["dave@example.com"],
      "<b>Club</b>",
      "Title<unused>",
      "2099-05-18 7pm <wrap>",
      `Room "A" & B`
    );
    const [call] = getEmailCalls();
    expect(call.body).toContain("&lt;b&gt;Club&lt;/b&gt;");
    expect(call.body).toContain("2099-05-18 7pm &lt;wrap&gt;");
    expect(call.body).toContain("Room &quot;A&quot; &amp; B");
  });

  it("escapes title and time in sendMeetingReminder", async () => {
    await emailService.sendMeetingReminder(["eve@example.com"], `<i>Title</i>`, `<time>`);
    const [call] = getEmailCalls();
    expect(call.body).toContain("&lt;i&gt;Title&lt;/i&gt;");
    expect(call.body).toContain("&lt;time&gt;");
  });

  it("escapes title and clubName in sendMeetingCancelled", async () => {
    await emailService.sendMeetingCancelled(["frank@example.com"], `Club & Co`, `<Title>`);
    const [call] = getEmailCalls();
    expect(call.body).toContain("&lt;Title&gt;");
    expect(call.body).toContain("Club &amp; Co");
  });

  it("escapes title and clubName in sendAvailabilityReminder", async () => {
    await emailService.sendAvailabilityReminder(
      ["alice@example.com"],
      `Club's`,
      `Title"with"quotes`
    );
    const [call] = getEmailCalls();
    expect(call.body).toContain("Club&#39;s");
    expect(call.body).toContain("Title&quot;with&quot;quotes");
  });

  it("escapes clubName in sendRoundVoting, sendVotingDeadlineReminder", async () => {
    await emailService.sendRoundVoting(["alice@example.com"], "<x>");
    await emailService.sendVotingDeadlineReminder(["alice@example.com"], "<y>");
    const calls = getEmailCalls();
    expect(calls[0].body).toContain("&lt;x&gt;");
    expect(calls[1].body).toContain("&lt;y&gt;");
  });

  it("leaves benign characters unchanged", async () => {
    await emailService.sendRoundNominating(["alice@example.com"], "Normal Club Name");
    const [call] = getEmailCalls();
    expect(call.body).toContain("<b>Normal Club Name</b>");
  });
});
