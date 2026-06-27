// @spec AUTH-UI-001, AUTH-UI-003, AUTH-UI-STEP1-EMAIL-001, AUTH-UI-STEP1-SENDCODE-001, AUTH-UI-STEP1-OTP-001, AUTH-UI-STEP1-NAME-001, AUTH-UI-STEP1-VERIFY-001, AUTH-UI-STEP1-RESEND-001, AUTH-UI-STEP1-PASSKEY-OFFER-001
"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button, ChevronRightIcon } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";
import { ErrorBox } from "./_shared";

const inputClass =
  "w-full text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition-all duration-150";

function passkeysSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export function Step1Identity({
  welcomeFromLogin,
  email,
  setEmail,
  displayName,
  setDisplayName,
  onAuthenticated,
}: {
  welcomeFromLogin: boolean;
  email: string;
  setEmail: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  onAuthenticated: (isNewUser: boolean) => void;
}) {
  const [phase, setPhase] = useState<"email" | "code" | "passkey">("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const emailValid = email.includes("@") && email.includes(".");
  const codeValid = /^\d{6}$/.test(code);
  const nameValid = displayName.trim().length > 0;

  const requestOtp = trpc.auth.requestOtp.useMutation({
    onSuccess: () => {
      setError("");
      setPhase("code");
    },
    onError: (err) => setError(err.message || "Could not send a code"),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onError: (err) => setError(err.message || "That code didn't work"),
  });
  const startReg = trpc.auth.startPasskeyRegistration.useMutation();
  const finishReg = trpc.auth.finishPasskeyRegistration.useMutation();

  const busy =
    requestOtp.isPending || verifyOtp.isPending || startReg.isPending || finishReg.isPending;

  // Tracks whether the just-verified account was newly created, so we can pass
  // it onward once the optional passkey step resolves.
  const [pendingNew, setPendingNew] = useState(false);

  async function handleVerify() {
    if (!codeValid || !nameValid) return;
    setError("");
    try {
      const res = await verifyOtp.mutateAsync({ email, code, displayName: displayName.trim() });
      // @spec AUTH-UI-STEP1-PASSKEY-OFFER-001 — offer FaceID setup post-verify.
      if (passkeysSupported()) {
        setPendingNew(res.isNewUser);
        setPhase("passkey");
      } else {
        onAuthenticated(res.isNewUser);
      }
    } catch {
      // error surfaced via onError
    }
  }

  async function handleSetupPasskey() {
    setError("");
    try {
      const { options } = await startReg.mutateAsync();
      const attestation = await startRegistration({ optionsJSON: options });
      await finishReg.mutateAsync({ attestation });
    } catch {
      // Registration is optional — a failure/cancel shouldn't block the user.
    } finally {
      onAuthenticated(pendingNew);
    }
  }

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
          onKeyDown={(e) => {
            if (e.key === "Enter" && phase === "email" && emailValid && !busy)
              requestOtp.mutate({ email });
          }}
          placeholder="you@example.com"
          autoComplete="email webauthn"
          disabled={phase !== "email"}
          className={inputClass}
          autoFocus
        />
      </div>

      {phase === "email" && (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          data-testid="send-code"
          disabled={!emailValid || busy}
          onClick={() => requestOtp.mutate({ email })}
          iconRight={<ChevronRightIcon size={14} />}
        >
          {requestOtp.isPending ? "Sending…" : "Send me a code"}
        </Button>
      )}

      {phase === "code" && (
        <>
          <div>
            <label htmlFor="otp" className="block text-[13px] font-medium text-ink-2 mb-1.5">
              6-digit code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={inputClass}
              autoFocus
            />
            <button
              type="button"
              className="text-xs text-ink-3 mt-1.5 mr-3 hover:underline"
              onClick={() => requestOtp.mutate({ email })}
              disabled={busy}
            >
              Resend code
            </button>
            <button
              type="button"
              className="text-xs text-ink-3 mt-1.5 hover:underline"
              onClick={() => {
                setPhase("email");
                setCode("");
                setError("");
              }}
              disabled={busy}
            >
              Use a different email
            </button>
          </div>

          <div>
            <label htmlFor="name" className="block text-[13px] font-medium text-ink-2 mb-1.5">
              Display name
            </label>
            <input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codeValid && nameValid && !busy) handleVerify();
              }}
              placeholder="e.g. Marisol"
              className={inputClass}
            />
            <p className="text-xs text-ink-3 mt-1.5">Visible to other members in the club</p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="verify-code"
            disabled={!codeValid || !nameValid || busy}
            onClick={handleVerify}
            iconRight={<ChevronRightIcon size={14} />}
          >
            {verifyOtp.isPending ? "Verifying…" : "Verify & continue"}
          </Button>
        </>
      )}

      {phase === "passkey" && (
        <div className="space-y-3" data-testid="passkey-offer">
          <p className="text-[14px] text-ink-2">
            Want to use FaceID or Touch ID next time? Set up a passkey so you can sign in with one tap —
            no codes.
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="setup-passkey"
            disabled={busy}
            onClick={handleSetupPasskey}
          >
            {startReg.isPending || finishReg.isPending ? "Setting up…" : "Set up FaceID"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            data-testid="skip-passkey"
            disabled={busy}
            onClick={() => onAuthenticated(pendingNew)}
          >
            Not now
          </Button>
        </div>
      )}

      {error && (
        <ErrorBox role="alert" aria-live="assertive">
          {error}
        </ErrorBox>
      )}
    </div>
  );
}
