// Email service wrapping Resend. In test mode, records calls without sending.
// @spec VOTE-NOTIFY-NONBLOCK-001, MEET-NOTIFY-NONBLOCK-001
import { env } from "@/env";

export interface EmailCall {
  to: string[];
  subject: string;
  body: string;
}

const emailCalls: EmailCall[] = [];

// User-controlled values (club names, book titles, meeting titles, locations)
// are interpolated into HTML below. Email clients sandbox aggressively so this
// is defense-in-depth, not an active XSS vector — but a `<b>` in a club name
// would otherwise render as bold in the message.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isTestMode(): boolean {
  const key = env.RESEND_API_KEY;
  if (env.NODE_ENV === "test") return true;
  if (key === "test") return true;
  // Dev convention: any key prefixed `re_mock` short-circuits to recorded-only.
  if (key !== undefined && key.startsWith("re_mock")) return true;
  return false;
}

async function send(to: string[], subject: string, body: string): Promise<void> {
  emailCalls.push({ to, subject, body });
  if (isTestMode()) return;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Dogear <noreply@bookclubhub.app>",
      to,
      subject,
      html: body,
    });
  } catch (err) {
    // Notifications are best-effort. A round/meeting state change must not
    // fail because the email provider rejected, the key is unset, or the
    // network is down.
    console.error("[email] send failed", { subject, recipients: to.length, err });
  }
}

// Public API
export const emailService = {
  // @spec AUTH-OTP-REQUEST-001 — deliver the login one-time code.
  async sendOtpCode(email: string, code: string) {
    await send(
      [email],
      `Your Dogear sign-in code: ${code}`,
      `<p>Your Dogear sign-in code is <b>${escapeHtml(code)}</b>.</p><p>It expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
    );
  },

  async sendRoundNominating(memberEmails: string[], clubName: string) {
    await send(memberEmails, `New voting round in ${clubName}`, `<p>A new voting round has started in <b>${escapeHtml(clubName)}</b>. Start nominating books!</p>`);
  },

  async sendRoundVoting(memberEmails: string[], clubName: string) {
    await send(memberEmails, `Voting is open in ${clubName}`, `<p>Nominations are closed. Cast your votes in <b>${escapeHtml(clubName)}</b>!</p>`);
  },

  async sendVotingDeadlineReminder(memberEmails: string[], clubName: string) {
    await send(memberEmails, `Voting deadline approaching in ${clubName}`, `<p>Voting closes in 24 hours in <b>${escapeHtml(clubName)}</b>. Don't forget to vote!</p>`);
  },

  async sendRoundDecided(memberEmails: string[], clubName: string, bookTitle: string) {
    await send(memberEmails, `Next book decided in ${clubName}: ${bookTitle}`, `<p>The next book for <b>${escapeHtml(clubName)}</b> is <b>${escapeHtml(bookTitle)}</b>!</p>`);
  },

  async sendMeetingProposed(memberEmails: string[], clubName: string, title: string) {
    await send(memberEmails, `Meeting proposed: ${title}`, `<p>A new meeting has been proposed in <b>${escapeHtml(clubName)}</b>. Submit your availability!</p>`);
  },

  async sendMeetingConfirmed(memberEmails: string[], clubName: string, title: string, time: string, location?: string) {
    const locationHtml = location ? `<p>Location: ${escapeHtml(location)}</p>` : "";
    await send(memberEmails, `Meeting confirmed: ${title}`, `<p>Meeting confirmed in <b>${escapeHtml(clubName)}</b> for ${escapeHtml(time)}.</p>${locationHtml}`);
  },

  async sendMeetingReminder(memberEmails: string[], title: string, time: string) {
    await send(memberEmails, `Reminder: ${title} tomorrow`, `<p>Your meeting <b>${escapeHtml(title)}</b> is scheduled for ${escapeHtml(time)} (24 hours from now).</p>`);
  },

  async sendMeetingCancelled(memberEmails: string[], clubName: string, title: string) {
    await send(memberEmails, `Meeting cancelled: ${title}`, `<p>The meeting <b>${escapeHtml(title)}</b> in <b>${escapeHtml(clubName)}</b> has been cancelled.</p>`);
  },

  async sendAvailabilityReminder(memberEmails: string[], clubName: string, title: string) {
    await send(memberEmails, `Availability needed: ${title}`, `<p>You haven't submitted your availability for <b>${escapeHtml(title)}</b> in <b>${escapeHtml(clubName)}</b>.</p>`);
  },
};

// Test helpers
export function getEmailCalls(): EmailCall[] {
  return [...emailCalls];
}

export function resetEmailCalls(): void {
  emailCalls.length = 0;
}
