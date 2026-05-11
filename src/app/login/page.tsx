// @spec AUTH-UI-LOGIN-001, AUTH-UI-LOGIN-002, AUTH-UI-LOGIN-003, AUTH-API-SIGNIN-001
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, LogoIcon, ChevronRightIcon } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";

const paperBg =
  "radial-gradient(circle at 20% 10%, oklch(0.97 0.012 75) 0, transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.96 0.018 30) 0, transparent 55%), var(--color-bg)";

function ErrorBox({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="p-3 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border animate-fade-in"
      style={{ borderColor: "oklch(0.88 0.04 25)" }}
      {...rest}
    >
      {children}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const emailValid = email.includes("@") && email.includes(".");
  const canSubmit = emailValid && passcode.length > 0;

  // @spec AUTH-API-SIGNIN-001 — server emits the HttpOnly+Secure+SameSite cookie
  // via Set-Cookie on the auth.signIn response; no client-side write needed
  // (see AUTH-BE-001).
  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: async () => {
      // User exists — find their first club and drop them there. We use
      // utils.auth.me.fetch (imperative) because this is a one-shot decision
      // that follows the signIn, not an ongoing subscription.
      try {
        const me = await utils.auth.me.fetch();
        if (me.clubs.length > 0) {
          router.push(`/clubs/${me.clubs[0].id}`);
          return;
        }
      } catch {
        // Fall through to /join below — graceful degradation.
      }
      // Account exists but has no memberships — onboard them.
      router.push("/join?welcome=1");
    },
    onError: (err) => {
      // NOT_FOUND or BAD_REQUEST — bounce to /join with welcome flag so the
      // /join page reads ?welcome=1 and shows a friendly banner.
      if (err.data?.code === "NOT_FOUND") {
        router.push(`/join?welcome=1&email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err.message || "Could not sign in");
    },
  });

  function handleLogin() {
    if (!canSubmit) return;
    setError("");
    signIn.mutate({ email, passcode });
  }

  const signingIn = signIn.isPending;

  return (
    <main id="main-content" className="min-h-screen flex flex-col" style={{ background: paperBg }}>
      <header className="flex items-center justify-between" style={{ padding: "20px 32px" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon size={22} />
          <span className="font-[var(--font-display)] text-[16px] font-semibold text-ink">
            BookClub Hub
          </span>
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
          <h1 className="font-[var(--font-display)] text-[28px] font-semibold text-ink mb-1.5">
            Welcome back
          </h1>
          <p className="text-ink-3 text-[14px] mb-6">
            Enter your email to jump back into your clubs.
          </p>

          <div className="space-y-4">
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
                  if (e.key === "Enter" && canSubmit && !signingIn) handleLogin();
                }}
                placeholder="you@example.com"
                className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
                autoFocus
              />
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit && !signingIn) handleLogin();
                }}
                placeholder="Shared with the pilot group"
                className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
              />
            </div>

            {error && (
              <ErrorBox role="alert" aria-live="assertive">
                {error}
              </ErrorBox>
            )}

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canSubmit || signingIn}
              onClick={handleLogin}
              iconRight={<ChevronRightIcon size={14} />}
            >
              {signingIn ? "Signing you in…" : "Log in"}
            </Button>

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
