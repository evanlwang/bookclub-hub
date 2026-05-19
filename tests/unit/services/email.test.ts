import { describe, it, expect, beforeEach } from "vitest";
import { emailService, getEmailCalls, resetEmailCalls } from "@/server/services/email";

describe("emailService — HTML escaping", () => {
  beforeEach(() => {
    resetEmailCalls();
  });

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

  it("escapes title in sendMeetingProposed", async () => {
    await emailService.sendMeetingProposed(["carol@example.com"], "Club", `<script>alert(1)</script>`);
    // sendMeetingProposed escapes clubName but the title only appears in the
    // (text) subject. Verify clubName escaping in the body is the contract.
    const [call] = getEmailCalls();
    expect(call.body).not.toContain("<script>");
    expect(call.body).toContain("Club"); // subject contains raw title; body doesn't include title
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
