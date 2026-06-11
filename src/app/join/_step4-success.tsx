// @spec JOIN-UI-LIBRARYCARD-001 — the library-card success moment (cozy
// redesign): the card slides out of an amber pocket, then the JOINED stamp
// presses on after 550ms.
"use client";

import { useState } from "react";

function stampDate(): string {
  return new Date()
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

export function Step4Success({
  path,
  successClubName,
  successClubCode,
  memberName,
  onCopyCode,
}: {
  path: "join" | "create" | null;
  successClubName: string;
  successClubCode: string;
  memberName?: string;
  onCopyCode: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="text-center pt-1.5 animate-fade-in">
      <h2 className="font-[var(--font-display)] text-[25px] font-extrabold text-primary mb-0.5">
        {path === "join" ? `Welcome to ${successClubName}!` : `${successClubName} is live!`}
      </h2>
      <p className="font-[var(--font-serif)] italic text-[14.5px] text-ink-2 mb-5">
        Your library card, freshly stamped.
      </p>

      {/* card + pocket */}
      <div className="relative mx-1.5 pb-16">
        {/* the card */}
        <div className="relative z-[1] mx-2.5 rounded-[var(--radius-lg)] border border-line bg-bg-soft p-[18px] pb-5 text-left shadow-md animate-card-slide">
          <div className="font-[var(--font-mono)] text-[9.5px] font-bold tracking-[0.22em] text-ink-3">
            DOGEAR LENDING LIBRARY
          </div>
          <div className="my-2.5 h-[1.5px] bg-line" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-[var(--font-display)] text-[19px] font-extrabold text-ink truncate">
                {memberName || "New member"}
              </div>
              <div className="font-[var(--font-serif)] italic text-[13.5px] text-ink-2 mt-0.5 truncate">
                Member · {successClubName}
              </div>
              <div className="font-[var(--font-mono)] text-[11px] tracking-[0.1em] text-ink-3 mt-2.5">
                {successClubCode}
              </div>
            </div>
            {/* the stamp */}
            <div className="shrink-0 rounded-md border-[2.5px] border-primary px-2 py-1.5 text-center font-[var(--font-mono)] text-[10px] font-bold tracking-[0.12em] text-primary animate-stamp-press">
              JOINED
              <br />
              {stampDate()}
            </div>
          </div>

          {path === "create" && (
            <>
              <p className="font-[var(--font-display)] text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3 mt-4 mb-1.5">
                Invite code — share it with your members
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full cursor-pointer rounded-[12px] border-[1.5px] border-dashed border-primary bg-primary-soft px-3 py-2.5 font-[var(--font-mono)] text-sm font-bold tracking-[0.14em] text-primary-ink"
              >
                {copied ? "✓ COPIED" : `${successClubCode} · COPY`}
              </button>
            </>
          )}
        </div>
        {/* the pocket */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-[2] h-[110px] rounded-[14px_14px_18px_18px] bg-gradient-to-b from-accent-soft to-bg-sunken shadow-[0_-2px_8px_rgba(96,64,32,0.12)_inset]"
          style={{ clipPath: "polygon(0 38%, 50% 0, 100% 38%, 100% 100%, 0 100%)" }}
        />
      </div>

      <p className="font-[var(--font-display)] text-[12.5px] font-bold text-ink-3 mt-4">
        Opening your reading nook…
      </p>
    </div>
  );
}
