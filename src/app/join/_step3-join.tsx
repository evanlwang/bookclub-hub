// @spec AUTH-UI-STEP3A-CODE-001, AUTH-UI-STEP3A-JOIN-001, AUTH-UI-STEP3A-BACK-001, AUTH-UI-STEP3A-ALREADY-MEMBER-001
"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { ClubFoundPanel, ErrorBox, LookupSpinner } from "./_shared";

export function Step3Join({
  code,
  onCodeChange,
  lookupLoading,
  clubInfo,
  joinError,
  joinReady,
  joiningClub,
  alreadyMember,
  onSubmit,
  onBack,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  lookupLoading: boolean;
  clubInfo: { name: string; memberCount: number } | null;
  joinError: string;
  joinReady: boolean;
  joiningClub: boolean;
  alreadyMember: { id: string; name: string } | null;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Club code
        </label>
        <div className="relative">
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="OAKWOOD-7Q"
            className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150 font-[var(--font-mono)] tracking-[0.08em] uppercase pr-10"
            autoFocus
          />
          {lookupLoading && <LookupSpinner />}
        </div>
        <p className="text-xs text-ink-3 mt-1.5">Try OAKWOOD-7Q or SLOW-READS to preview.</p>
      </div>

      {clubInfo && <ClubFoundPanel clubInfo={clubInfo} />}

      {alreadyMember && (
        // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001
        <div
          data-testid="already-member-banner"
          role="status"
          aria-live="polite"
          className="p-3 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink text-[13px] border animate-fade-in"
          style={{ borderColor: "var(--color-primary-line)" }}
        >
          <p className="font-medium mb-1">You&apos;re already in {alreadyMember.name}.</p>
          <Link
            href={`/clubs/${alreadyMember.id}`}
            data-testid="already-member-link"
            className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
          >
            Open it →
          </Link>
        </div>
      )}

      {joinError && (
        <ErrorBox role="alert" aria-live="assertive">
          {joinError}
        </ErrorBox>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="flex-1"
          disabled={!joinReady || joiningClub || !!alreadyMember}
          aria-busy={joiningClub}
          onClick={onSubmit}
        >
          {joiningClub ? "Joining…" : `Join ${clubInfo?.name || "the club"}`}
        </Button>
      </div>
    </div>
  );
}
