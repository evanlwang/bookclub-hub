"use client";

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
          disabled={!joinReady || joiningClub}
          aria-busy={joiningClub}
          onClick={onSubmit}
        >
          {joiningClub ? "Joining…" : `Join ${clubInfo?.name || "the club"}`}
        </Button>
      </div>
    </div>
  );
}
