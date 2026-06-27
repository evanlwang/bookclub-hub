// @spec DASH-UI-EMPTY-NOOK-001, DASH-UI-EMPTY-SETUP-001, DASH-UI-EMPTY-UNLOCKS-001
// The Nook in its zero state — a freshly created club with no book, no vote,
// nothing scheduled, no notes, no progress. Reframed from "four empty boxes"
// into a first-run: a warm welcome, a connected two-step setup rail (the only
// things that actually start a club — invite + first book), and a quiet
// "fills in next" preview that teaches the populated layout without dead space.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge, Avatar } from "@/components/ui";

/* ---------- an empty slot on the shelf (where the first cover will go) ---------- */
function EmptyBookSlot() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[120px] w-20 shrink-0 flex-col items-center justify-center gap-2 rounded-[5px] border-2 border-dashed border-line-strong bg-bg shadow-[inset_0_1px_3px_rgba(96,64,32,0.04)]"
    >
      <svg width="24" height="24" viewBox="0 0 22 22" className="text-ink-4">
        <rect x="4" y="3" width="14" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <line x1="8" y1="3.5" x2="8" y2="18.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
      <span className="font-[var(--font-mono)] text-[7.5px] font-bold tracking-[0.14em] text-ink-4">
        NO&nbsp;BOOK
      </span>
    </div>
  );
}

/* ---------- welcome hero: a quiet, freshly made-up nook with the signature page edge ---------- */
function WelcomeHero({ clubName }: { clubName: string }) {
  return (
    <Card className="relative overflow-hidden p-[18px]">
      <Badge tone="neutral" dot>Your nook</Badge>
      <div className="mt-3 flex gap-4">
        <EmptyBookSlot />
        <div className="min-w-0 flex-1">
          <h2 className="font-[var(--font-display)] text-[23px] font-extrabold leading-[1.05] tracking-tight text-ink mt-0.5 mb-1.5">
            It&rsquo;s quiet in here.
          </h2>
          <p className="font-[var(--font-serif)] text-[14.5px] italic leading-[1.5] text-ink-2 m-0">
            {clubName} is a fresh shelf and a blank page edge. Two small things wake it
            up &mdash; everything below fills in from there.
          </p>
        </div>
      </div>
      {/* the signature page-edge promise: where everyone's bookmarks will live */}
      <div className="mt-4">
        <div className="relative flex h-[26px] items-center justify-center overflow-hidden rounded-lg border-[1.5px] border-line-strong bg-[repeating-linear-gradient(90deg,var(--color-bg-soft)_0_3px,var(--color-bg-sunken)_3px_4px)]">
          <span className="font-[var(--font-serif)] px-2.5 text-center text-[11.5px] italic text-ink-3">
            everyone&rsquo;s bookmarks line up here once you start reading
          </span>
        </div>
        <div className="mt-1.5 flex justify-between font-[var(--font-display)] text-[10.5px] font-bold text-ink-3 opacity-70">
          <span>FIRST PAGE</span>
          <span>THE END</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- one node on the setup rail (numbered circle + connector) ---------- */
function StepNode({ n, last }: { n: number; last?: boolean }) {
  return (
    <div className="flex shrink-0 flex-col items-center self-stretch">
      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary font-[var(--font-display)] text-[15px] font-extrabold text-bg shadow-[0_2px_0_var(--color-primary-hover)]">
        {n}
      </div>
      {!last && <div className="mt-1.5 min-h-[18px] w-0.5 flex-1 bg-line" />}
    </div>
  );
}

/* ---------- the setup card: the two things that actually start a club ---------- */
function SetupCard({
  clubId,
  clubName,
  code,
  memberCount,
  admin,
}: {
  clubId: string;
  clubName: string;
  code: string;
  memberCount: number;
  admin: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard write can fail in insecure contexts; silently no-op.
    }
  }

  async function handleShare() {
    const text = `Join ${clubName} on Dogear with code ${code}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: clubName, text });
        return;
      } catch {
        // User dismissed the share sheet or it is unavailable — fall through.
      }
    }
    void handleCopy();
  }

  return (
    <Card className="p-[18px] mt-5.5" data-testid="empty-setup-card">
      {/* header + progress */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[18px] font-extrabold text-ink m-0">
          Open up the nook
        </h3>
        <span className="font-[var(--font-mono)] rounded-full border-[1.5px] border-line-strong bg-bg px-2.5 py-1 text-[11px] font-bold tracking-[0.1em] text-ink-2">
          0 OF 2 DONE
        </span>
      </div>

      {/* step 1 — invite */}
      <div className="flex gap-3.5">
        <StepNode n={1} />
        <div className="min-w-0 flex-1 pb-5">
          <h4 className="font-[var(--font-display)] text-base font-extrabold text-ink mt-1 mb-0.5">
            Bring your club in
          </h4>
          <p className="font-[var(--font-serif)] mb-3 text-[13.5px] leading-[1.45] text-ink-2">
            Share this code &mdash; anyone who types it in lands straight in {clubName}.
          </p>
          <div className="flex items-center justify-center rounded-[14px] border-2 border-dashed border-primary bg-bg px-3.5 py-3">
            <span
              className="font-[var(--font-mono)] whitespace-nowrap text-[25px] font-bold tracking-[0.14em] text-primary-ink"
              data-testid="empty-club-code"
            >
              {code}
            </span>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              data-testid="empty-copy-code-btn"
              aria-label={copied ? "Copied" : "Copy invite code"}
              className="flex-1 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-bg shadow-[0_2px_0_var(--color-primary-hover)] hover:bg-primary-hover transition-colors"
            >
              {copied ? "Copied ✓" : "Copy code"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center rounded-full bg-bg-soft px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-primary shadow-[inset_0_0_0_2px_var(--color-primary-soft)] hover:shadow-[inset_0_0_0_2px_var(--color-primary)] transition-all"
            >
              Share
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Avatar name="" size="sm" decorative />
            <span className="font-[var(--font-display)] text-[12.5px] font-bold text-ink-3">
              {memberCount <= 1
                ? "Just you so far"
                : `${memberCount} members so far`}
            </span>
          </div>
        </div>
      </div>

      {/* step 2 — first book */}
      <div className="flex gap-3.5">
        <StepNode n={2} last />
        <div className="min-w-0 flex-1">
          <h4 className="font-[var(--font-display)] text-base font-extrabold text-ink mt-1 mb-0.5">
            Choose the first read
          </h4>
          <p className="font-[var(--font-serif)] mb-3 text-[13.5px] leading-[1.45] text-ink-2">
            {admin
              ? "Open nominations and let the club vote — or skip the ballot and pick one yourself."
              : "Nominate a book you’d love to read together. Your organizer opens the vote when everyone’s in."}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/clubs/${clubId}/vote`}
              data-testid="empty-start-vote"
              className="flex-1 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-bg shadow-[0_2px_0_var(--color-primary-hover)] hover:bg-primary-hover transition-colors"
            >
              {admin ? "Start a book vote" : "Nominate a book"}
            </Link>
            {admin && (
              <Link
                href={`/clubs/${clubId}/vote`}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-ink-2 hover:bg-bg-sunken transition-colors"
              >
                I&rsquo;ll pick
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- a single muted preview row in the "fills in next" strip ---------- */
function UnlockRow({
  icon,
  title,
  desc,
  divider,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${divider ? "border-t border-line" : ""}`}
    >
      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] border-[1.5px] border-dashed border-line-strong bg-bg text-ink-3">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-[var(--font-display)] text-[14.5px] font-extrabold text-ink-2">
          {title}
        </div>
        <p className="font-[var(--font-serif)] mt-px text-[12.5px] leading-[1.4] text-ink-3">
          {desc}
        </p>
      </div>
      <span className="font-[var(--font-mono)] shrink-0 text-[8.5px] font-bold tracking-[0.14em] text-ink-3">
        SOON
      </span>
    </div>
  );
}

/* ---------- "fills in next": teaches the populated layout instead of stacking empty boxes ---------- */
function UnlocksStrip() {
  return (
    <div className="mt-5.5 mb-1">
      <div className="mx-0.5 mb-2.5 flex items-center gap-2.5">
        <h2 className="font-[var(--font-display)] text-base font-extrabold text-ink-2 m-0">
          Then the nook fills in
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      <Card className="py-1">
        <UnlockRow
          icon={
            <svg width="20" height="20" viewBox="0 0 22 22">
              <rect x="3.5" y="5" width="15" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <line x1="3.5" y1="9.5" x2="18.5" y2="9.5" stroke="currentColor" strokeWidth="1.7" />
              <line x1="7.5" y1="3" x2="7.5" y2="6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <line x1="14.5" y1="3" x2="14.5" y2="6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          }
          title="Meetings"
          desc="Propose a few times; everyone marks what works."
        />
        <UnlockRow
          divider
          icon={
            <svg width="20" height="20" viewBox="0 0 22 22">
              <path d="M4 5.5h14a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H10l-4 3.5v-3.5H4A1.5 1.5 0 012.5 14V7A1.5 1.5 0 014 5.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          }
          title="Margin notes"
          desc="Chapter-tagged threads, hidden until you&rsquo;ve caught up."
        />
        <UnlockRow
          divider
          icon={
            <svg width="20" height="20" viewBox="0 0 22 22">
              <path d="M6 3.5h10v15l-5-3.5-5 3.5v-15z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          }
          title="Reading progress"
          desc="Every member becomes a bookmark on the page edge."
        />
      </Card>
    </div>
  );
}

/* ---------- the first-run nook ---------- */
export function EmptyNook({
  clubId,
  clubName,
  code,
  memberCount,
  admin,
}: {
  clubId: string;
  clubName: string;
  code: string;
  memberCount: number;
  admin: boolean;
}) {
  return (
    <div data-testid="empty-nook" className="mx-auto w-full max-w-[640px]">
      <WelcomeHero clubName={clubName} />
      <SetupCard
        clubId={clubId}
        clubName={clubName}
        code={code}
        memberCount={memberCount}
        admin={admin}
      />
      <UnlocksStrip />
    </div>
  );
}
