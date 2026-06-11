"use client";

import { Button, ChevronRightIcon } from "@/components/ui";
import { ErrorBox } from "./_shared";

export function Step1Identity({
  welcomeFromLogin,
  email,
  setEmail,
  displayName,
  setDisplayName,
  passcode,
  setPasscode,
  identityError,
  identityValid,
  signingIn,
  onContinue,
}: {
  welcomeFromLogin: boolean;
  email: string;
  setEmail: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  passcode: string;
  setPasscode: (v: string) => void;
  identityError: string;
  identityValid: boolean;
  signingIn: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      {welcomeFromLogin && (
        <div
          data-testid="welcome-banner"
          role="status"
          className="p-3 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink text-[13px] border animate-fade-in"
          style={{ borderColor: "var(--color-primary-line)" }}
        >
          We couldn&apos;t find any clubs for that email — let&apos;s get you set up below.
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition-all duration-150"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Display name
        </label>
        <input
          id="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Marisol"
          className="w-full text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition-all duration-150"
        />
        <p className="text-xs text-ink-3 mt-1.5">Visible to other members in the club</p>
      </div>

      <div>
        <label htmlFor="passcode" className="block text-[13px] font-medium text-ink-2 mb-1.5">
          Pilot passcode
        </label>
        <input
          id="passcode"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Shared with the pilot group"
          className="w-full text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition-all duration-150"
        />
      </div>

      {identityError && (
        <ErrorBox role="alert" aria-live="assertive">
          {identityError}
        </ErrorBox>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!identityValid || signingIn}
        onClick={onContinue}
        iconRight={<ChevronRightIcon size={14} />}
      >
        {signingIn ? "Signing you in…" : "Continue"}
      </Button>
    </div>
  );
}
