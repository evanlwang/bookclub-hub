"use client";

import { Button } from "@/components/ui";
import { ErrorBox } from "./_shared";

export type Cadence = "monthly" | "six_weeks" | "flexible";

const CADENCE_OPTIONS: { value: Cadence; label: string; sub: string }[] = [
  { value: "monthly", label: "Monthly", sub: "12 books/yr" },
  { value: "six_weeks", label: "6 weeks", sub: "~9 books/yr" },
  { value: "flexible", label: "Flexible", sub: "No schedule" },
];

export type CodeStatus = "idle" | "loading" | "available" | "taken";

// @spec CLUB-UI-CODE-LIVE-001 — debounced uniqueness UI for the create-branch
// invite-code input. The lookup itself runs in the orchestrator; this component
// renders the `codeStatus` state and the aria-invalid wiring on the input.
export function Step3Create({
  clubName,
  setClubName,
  clubCode,
  setClubCode,
  derivedCode,
  cadence,
  setCadence,
  codeStatus,
  codeError,
  createReady,
  creatingClub,
  onSubmit,
  onBack,
}: {
  clubName: string;
  setClubName: (v: string) => void;
  clubCode: string;
  setClubCode: (v: string) => void;
  derivedCode: string;
  cadence: Cadence;
  setCadence: (v: Cadence) => void;
  codeStatus: CodeStatus;
  codeError: string;
  createReady: boolean;
  creatingClub: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="club-name" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Club name
        </label>
        <input
          id="club-name"
          type="text"
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          placeholder="e.g. Slow Reads, Oakwood Library Society"
          className="w-full text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition-all duration-150"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="club-code" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Invite code
        </label>
        <input
          id="club-code"
          type="text"
          value={clubCode || derivedCode}
          onChange={(e) => setClubCode(e.target.value.toUpperCase())}
          placeholder="Auto-generated"
          aria-invalid={codeStatus === "taken"}
          className={`w-full text-sm bg-bg border rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:ring-3 transition-all duration-150 font-[var(--font-mono)] tracking-[0.08em] uppercase ${
            codeStatus === "taken"
              ? "border-danger focus:border-danger focus:ring-danger/15"
              : "border-line-strong focus:border-primary focus:ring-primary/15"
          }`}
        />
        {/* @spec CLUB-UI-CODE-LIVE-001 */}
        <div
          data-testid="code-status"
          data-state={codeStatus}
          className="text-xs mt-1.5 min-h-[1em]"
          aria-live="polite"
        >
          {codeStatus === "available" && (
            <span className="text-success">✓ Available</span>
          )}
          {codeStatus === "taken" && (
            <span className="text-danger">✗ Taken — pick another code</span>
          )}
          {codeStatus === "loading" && (
            <span className="text-ink-3">Checking…</span>
          )}
          {codeStatus === "idle" && (
            <span className="text-ink-3">Your members will use this to join.</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="cadence" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Voting cadence
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CADENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCadence(opt.value)}
              className={`p-3 rounded-[var(--radius-md)] border-[1.5px] transition-all duration-150 text-left ${
                cadence === opt.value
                  ? "border-primary bg-primary-soft"
                  : "border-line bg-bg hover:border-line-strong"
              }`}
            >
              <div className="font-medium text-[13px] text-ink">{opt.label}</div>
              <div className="text-[11px] text-ink-3">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {codeError && (
        <ErrorBox role="alert" aria-live="assertive">
          {codeError}
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
          disabled={!createReady || creatingClub || codeStatus === "taken"}
          onClick={onSubmit}
        >
          {creatingClub ? "Creating…" : "Create club"}
        </Button>
      </div>
    </div>
  );
}
