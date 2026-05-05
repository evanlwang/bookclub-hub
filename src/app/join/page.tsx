// @spec JOIN-UI-001 through JOIN-UI-017, HOME-A11Y-003
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, LogoIcon, CheckIcon, ChevronRightIcon } from "@/components/ui";

const paperBg =
  "radial-gradient(circle at 20% 10%, oklch(0.97 0.012 75) 0, transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.96 0.018 30) 0, transparent 55%), var(--color-bg)";

function StepDot({ n, state }: { n: number; state: "active" | "done" | "inactive" }) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0";

  if (state === "done") {
    return (
      <div data-testid={`step-dot-${n}`} data-state="done" className={`${base} bg-primary text-bg`}>
        <CheckIcon size={12} />
      </div>
    );
  }

  if (state === "active") {
    return (
      <div
        data-testid={`step-dot-${n}`}
        data-state="active"
        className={`${base} border-[1.5px] border-primary text-primary`}
      >
        {n}
      </div>
    );
  }

  return (
    <div
      data-testid={`step-dot-${n}`}
      data-state="inactive"
      className={`${base} border-[1.5px] border-line-strong text-ink-3`}
    >
      {n}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  function dotState(n: number): "active" | "done" | "inactive" {
    if (n < step) return "done";
    if (n === step) return "active";
    return "inactive";
  }

  return (
    <div data-testid="stepper" className="flex items-center gap-2 mb-6">
      <StepDot n={1} state={dotState(1)} />
      <div className={`flex-1 h-px ${step > 1 ? "bg-primary" : "bg-line"}`} />
      <StepDot n={2} state={dotState(2)} />
      <div className={`flex-1 h-px ${step > 2 ? "bg-primary" : "bg-line"}`} />
      <StepDot n={3} state={dotState(3)} />
    </div>
  );
}

function LookupSpinner() {
  return (
    <svg
      data-testid="lookup-spinner"
      className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        fill="currentColor"
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ClubFoundPanel({ clubInfo }: { clubInfo: { name: string; memberCount: number } }) {
  return (
    <div
      data-testid="club-found-panel"
      className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] bg-primary-soft border animate-fade-in"
      style={{ borderColor: "oklch(0.85 0.04 195)" }}
    >
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary text-bg flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-primary-ink">{clubInfo.name}</p>
        <p className="text-xs text-primary-ink/75">
          {clubInfo.memberCount} member{clubInfo.memberCount !== 1 ? "s" : ""}
        </p>
      </div>
      <CheckIcon size={18} />
    </div>
  );
}

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

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [clubInfo, setClubInfo] = useState<{ name: string; memberCount: number } | null>(null);
  const [clubName, setClubName] = useState("");

  async function handleCodeBlur() {
    if (!code.trim()) return;
    setLookupLoading(true);
    setError("");
    setClubInfo(null);
    try {
      const res = await fetch(
        `/api/trpc/clubs.lookup?input=${encodeURIComponent(JSON.stringify({ code: code.trim() }))}`
      );
      const data = await res.json();
      const result = data.result?.data;
      if (result?.clubName) {
        setClubInfo({ name: result.clubName, memberCount: result.memberCount });
        setError("");
      } else {
        setClubInfo(null);
        setError("No club found with that code");
      }
    } catch {
      setError("Failed to look up club");
    } finally {
      setLookupLoading(false);
    }
  }

  function handleBack() {
    setStep(1);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 2) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/trpc/clubs.join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, displayName }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Join failed");
      } else {
        const result = data.result?.data;
        if (result?.sessionId) {
          document.cookie = `session_id=${result.sessionId}; path=/; max-age=${30 * 24 * 60 * 60}`;
        }
        if (result?.club?.id) {
          setClubName(result.club.name || "your club");
          setStep(3);
          setTimeout(() => router.push(`/clubs/${result.club.id}`), 1500);
        } else {
          setError("Unexpected response format");
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex flex-col" style={{ background: paperBg }}>
      {/* Header */}
      <header className="flex items-center gap-2.5" style={{ padding: "20px 32px" }}>
        <LogoIcon size={22} />
        <span className="font-[var(--font-display)] text-[16px] font-semibold text-ink">
          BookClub Hub
        </span>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="w-full max-w-[440px] p-8">
          <h1 className="font-[var(--font-display)] text-[28px] font-semibold text-ink mb-1.5">
            Join a club
          </h1>
          <p className="text-ink-3 text-[14px] mb-6">
            Enter the invite code shared by your club organizer.
          </p>

          {step < 3 && <Stepper step={step as 1 | 2} />}

          <form data-testid="join-form" onSubmit={handleSubmit}>
            {/* Step 1 */}
            <div style={{ display: step === 1 ? "block" : "none" }}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="code-input"
                    className="block text-[13px] font-medium text-ink-2 mb-1.5"
                  >
                    Club code
                  </label>
                  <div className="relative">
                    <input
                      id="code-input"
                      data-testid="code-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onBlur={handleCodeBlur}
                      required
                      placeholder="e.g. OAKWOOD-7Q"
                      className="w-full text-[15px] bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150 font-[var(--font-mono)] tracking-[0.08em] uppercase pr-[42px]"
                    />
                    {lookupLoading && <LookupSpinner />}
                  </div>
                </div>

                {clubInfo && <ClubFoundPanel clubInfo={clubInfo} />}

                {error && step === 1 && (
                  <ErrorBox data-testid="error-message" role="alert" aria-live="assertive">
                    {error}
                  </ErrorBox>
                )}

                <Button
                  data-testid="continue-button"
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!clubInfo}
                  onClick={() => { setStep(2); setError(""); }}
                >
                  Continue
                  <ChevronRightIcon size={14} />
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: step === 2 ? "block" : "none" }}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email-input"
                    className="block text-[13px] font-medium text-ink-2 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email-input"
                    data-testid="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
                  />
                </div>

                <div>
                  <label
                    htmlFor="name-input"
                    className="block text-[13px] font-medium text-ink-2 mb-1.5"
                  >
                    Display name
                  </label>
                  <input
                    id="name-input"
                    data-testid="name-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="How others will see you"
                    className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
                  />
                  <p className="text-xs text-ink-3 mt-1.5">Visible to other members of the club</p>
                </div>

                {error && step === 2 && (
                  <ErrorBox data-testid="error-message" role="alert" aria-live="assertive">
                    {error}
                  </ErrorBox>
                )}

                <div className="flex gap-2 mt-1">
                  <Button
                    data-testid="back-button"
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  <Button
                    data-testid="join-button"
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    loading={loading}
                    aria-busy={loading || undefined}
                  >
                    {loading ? "Joining…" : "Join the club"}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* Step 3 — Success */}
          {step === 3 && (
            <div className="text-center py-3 animate-fade-in">
              <div
                role="img"
                aria-label="Success"
                className="w-16 h-16 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4"
              >
                <CheckIcon size={28} />
              </div>
              <h2 className="font-[var(--font-display)] text-[26px] font-semibold text-ink mb-2">
                Welcome to {clubName}!
              </h2>
              <p className="text-ink-3 text-[14px]">Redirecting you now…</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
