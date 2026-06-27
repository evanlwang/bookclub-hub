// @spec AUTH-UI-LOGIN-001, AUTH-UI-LOGIN-002, AUTH-UI-LOGIN-003, AUTH-UI-LOGIN-EMAIL-HINT-001, AUTH-UI-LOGIN-AUTOCOMPLETE-001
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  startAuthentication,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";
import { Button, Card, LogoIcon, ChevronRightIcon } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";

const paperBg =
  "radial-gradient(circle at 20% 10%, oklch(0.97 0.012 75) 0, transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.96 0.018 30) 0, transparent 55%), var(--color-bg)";

function ErrorBox({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="p-3 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border animate-fade-in"
      style={{ borderColor: "var(--color-danger-line)" }}
      {...rest}
    >
      {children}
    </div>
  );
}

const inputClass =
  "w-full text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition-all duration-150";

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const conditionalStarted = useRef(false);

  const emailValid = email.includes("@") && email.includes(".");
  // @spec AUTH-UI-LOGIN-EMAIL-HINT-001 — helper only after the user has typed.
  const showEmailFormatError = email.length > 0 && !emailValid;
  const codeValid = /^\d{6}$/.test(code);

  // Route the user after any successful login.
  async function routeAfterLogin(isNewUser = false) {
    try {
      const me = await utils.auth.me.fetch();
      // @spec AUTH-UI-LOGIN-002
      if (!isNewUser && me.clubs.length > 0) {
        router.push(`/clubs/${me.clubs[0].id}`);
        return;
      }
    } catch {
      // fall through
    }
    // @spec AUTH-UI-LOGIN-003 — new user or no memberships → onboard.
    router.push(`/join?welcome=1${email ? `&email=${encodeURIComponent(email)}` : ""}`);
  }

  const startLogin = trpc.auth.startPasskeyLogin.useMutation();
  const finishLogin = trpc.auth.finishPasskeyLogin.useMutation();
  const requestOtp = trpc.auth.requestOtp.useMutation({
    onSuccess: () => {
      setError("");
      setInfo("We emailed you a 6-digit code. Enter it below.");
      setPhase("code");
    },
    onError: (err) => setError(err.message || "Could not send a code"),
  });
  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: (res) => routeAfterLogin(res.isNewUser),
    onError: (err) => setError(err.message || "That code didn't work"),
  });

  // @spec AUTH-UI-LOGIN-001 — passkey assertion. `email` scopes allowCredentials
  // when known; omitted for discoverable (conditional autofill) login.
  async function attemptPasskey(opts: { conditional: boolean }) {
    try {
      const { options } = await startLogin.mutateAsync({
        email: opts.conditional ? undefined : emailValid ? email : undefined,
      });
      const assertion = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: opts.conditional,
      });
      const res = await finishLogin.mutateAsync({ assertion });
      await routeAfterLogin(false);
      return res;
    } catch (err) {
      // User-cancelled / no credential during conditional UI is not an error.
      if (!opts.conditional) {
        setError(
          err instanceof Error && /unknown passkey|did not increase/i.test(err.message)
            ? err.message
            : "Couldn't use a passkey. Try emailing yourself a code instead.",
        );
      }
    }
  }

  // @spec AUTH-UI-LOGIN-001 — kick off conditional (autofill) passkey UI on mount.
  useEffect(() => {
    if (conditionalStarted.current) return;
    conditionalStarted.current = true;
    browserSupportsWebAuthnAutofill()
      .then((ok) => {
        if (ok) void attemptPasskey({ conditional: true });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy =
    requestOtp.isPending ||
    verifyOtp.isPending ||
    startLogin.isPending ||
    finishLogin.isPending;

  return (
    <main id="main-content" className="min-h-screen flex flex-col" style={{ background: paperBg }}>
      <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5 safe-top">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon size={22} />
          <span className="font-[var(--font-display)] text-[16px] font-semibold text-ink">Dogear</span>
        </Link>
        <div className="text-xs text-ink-3">
          New here?{" "}
          <Link href="/join" className="text-primary hover:underline">
            Sign up →
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="w-full max-w-[420px] p-8">
          <h1 className="font-[var(--font-display)] text-[28px] font-extrabold text-primary mb-1.5">
            Welcome back
          </h1>
          <p className="font-[var(--font-serif)] italic text-ink-2 text-[15px] mb-6">
            Use FaceID, or we&apos;ll email you a code.
          </p>

          <div className="space-y-4">
            {/* @spec AUTH-UI-LOGIN-001 — explicit passkey entry point. */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              data-testid="passkey-login"
              disabled={busy}
              onClick={() => {
                setError("");
                void attemptPasskey({ conditional: false });
              }}
            >
              {startLogin.isPending || finishLogin.isPending
                ? "Waiting for your passkey…"
                : "Sign in with a passkey"}
            </Button>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-ink-4">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

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
                  if (e.key === "Enter" && emailValid && !busy) requestOtp.mutate({ email });
                }}
                placeholder="you@example.com"
                // @spec AUTH-UI-LOGIN-AUTOCOMPLETE-001
                autoComplete="email webauthn"
                disabled={phase === "code"}
                aria-invalid={showEmailFormatError || undefined}
                aria-describedby={showEmailFormatError ? "email-error" : undefined}
                className={inputClass}
                autoFocus
              />
              {showEmailFormatError && (
                <p id="email-error" data-testid="email-format-error" className="text-xs text-danger mt-1.5">
                  Enter a valid email like name@example.com.
                </p>
              )}
            </div>

            {phase === "code" && (
              <div>
                <label htmlFor="otp" className="block text-[13px] font-medium text-ink-2 mb-1.5">
                  6-digit code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  // @spec AUTH-UI-LOGIN-AUTOCOMPLETE-001
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && codeValid && !busy) verifyOtp.mutate({ email, code });
                  }}
                  placeholder="000000"
                  className={inputClass}
                  autoFocus
                />
                <button
                  type="button"
                  className="text-xs text-ink-3 mt-1.5 hover:underline"
                  onClick={() => requestOtp.mutate({ email })}
                  disabled={busy}
                >
                  Resend code
                </button>
              </div>
            )}

            {info && !error && (
              <p className="text-xs text-ink-3" aria-live="polite">
                {info}
              </p>
            )}
            {error && (
              <ErrorBox role="alert" aria-live="assertive">
                {error}
              </ErrorBox>
            )}

            {phase === "email" ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
                data-testid="send-code"
                disabled={!emailValid || busy}
                onClick={() => requestOtp.mutate({ email })}
                iconRight={<ChevronRightIcon size={14} />}
              >
                {requestOtp.isPending ? "Sending…" : "Email me a code"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                data-testid="verify-code"
                disabled={!codeValid || busy}
                onClick={() => verifyOtp.mutate({ email, code })}
                iconRight={<ChevronRightIcon size={14} />}
              >
                {verifyOtp.isPending ? "Verifying…" : "Verify & sign in"}
              </Button>
            )}

            <p className="text-xs text-ink-3 text-center">
              Don&apos;t have an account?{" "}
              <Link href="/join" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
