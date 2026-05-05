// Email service wrapping Resend. In test mode, records calls without sending.

export interface EmailCall {
  to: string[];
  subject: string;
  body: string;
}

const emailCalls: EmailCall[] = [];

function isTestMode(): boolean {
  return process.env.NODE_ENV === "test" || process.env.RESEND_API_KEY === "test";
}

async function send(to: string[], subject: string, body: string): Promise<void> {
  emailCalls.push({ to, subject, body });
  if (isTestMode()) return;

  // In production, use Resend
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "BookClub Hub <noreply@bookclubhub.app>",
    to,
    subject,
    html: body,
  });
}

// Public API
export const emailService = {
  async sendRoundNominating(memberEmails: string[], clubName: string) {
    await send(memberEmails, `New voting round in ${clubName}`, `<p>A new voting round has started in <b>${clubName}</b>. Start nominating books!</p>`);
  },

  async sendRoundVoting(memberEmails: string[], clubName: string) {
    await send(memberEmails, `Voting is open in ${clubName}`, `<p>Nominations are closed. Cast your votes in <b>${clubName}</b>!</p>`);
  },

  async sendVotingDeadlineReminder(memberEmails: string[], clubName: string) {
    await send(memberEmails, `Voting deadline approaching in ${clubName}`, `<p>Voting closes in 24 hours in <b>${clubName}</b>. Don't forget to vote!</p>`);
  },

  async sendRoundDecided(memberEmails: string[], clubName: string, bookTitle: string) {
    await send(memberEmails, `Next book decided in ${clubName}: ${bookTitle}`, `<p>The next book for <b>${clubName}</b> is <b>${bookTitle}</b>!</p>`);
  },

  async sendMeetingProposed(memberEmails: string[], clubName: string, title: string) {
    await send(memberEmails, `Meeting proposed: ${title}`, `<p>A new meeting has been proposed in <b>${clubName}</b>. Submit your availability!</p>`);
  },

  async sendMeetingConfirmed(memberEmails: string[], clubName: string, title: string, time: string, location?: string) {
    const locationHtml = location ? `<p>Location: ${location}</p>` : "";
    await send(memberEmails, `Meeting confirmed: ${title}`, `<p>Meeting confirmed in <b>${clubName}</b> for ${time}.</p>${locationHtml}`);
  },

  async sendMeetingReminder(memberEmails: string[], title: string, time: string) {
    await send(memberEmails, `Reminder: ${title} tomorrow`, `<p>Your meeting <b>${title}</b> is scheduled for ${time} (24 hours from now).</p>`);
  },

  async sendMeetingCancelled(memberEmails: string[], clubName: string, title: string) {
    await send(memberEmails, `Meeting cancelled: ${title}`, `<p>The meeting <b>${title}</b> in <b>${clubName}</b> has been cancelled.</p>`);
  },

  async sendAvailabilityReminder(memberEmails: string[], clubName: string, title: string) {
    await send(memberEmails, `Availability needed: ${title}`, `<p>You haven't submitted your availability for <b>${title}</b> in <b>${clubName}</b>.</p>`);
  },
};

// Test helpers
export function getEmailCalls(): EmailCall[] {
  return [...emailCalls];
}

export function resetEmailCalls(): void {
  emailCalls.length = 0;
}
