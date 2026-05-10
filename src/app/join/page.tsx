// @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, CLUB-UI-001, CLUB-UI-002, CLUB-UI-003
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, LogoIcon, CheckIcon, ChevronRightIcon, PlusIcon, UsersIcon } from "@/components/ui";

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

// @spec JOIN-UI-003 — 3-dot stepper (Identity → Path → Branch). Step 4 is the
// success state and is shown without a stepper, so it is not represented here.
function Stepper({ step, stepLabel }: { step: 1 | 2 | 3 | 4; stepLabel?: string }) {
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
      {stepLabel && <span className="text-xs font-medium text-ink-2 ml-2">{stepLabel}</span>}
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

function PathCard({
  icon,
  title,
  body,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex gap-4 p-5 border border-line rounded-[var(--radius-lg)] bg-bg hover:bg-bg-soft hover:border-line-strong transition-all duration-150 cursor-pointer text-left"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-[var(--radius-md)] bg-primary-soft text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-ink text-[15px] mb-1">{title}</h3>
        <p className="text-ink-2 text-[13px] mb-2 leading-relaxed">{body}</p>
        <p className="text-ink-3 text-[12px] font-[var(--font-mono)]">{meta}</p>
      </div>
      <ChevronRightIcon size={16} className="flex-shrink-0 text-ink-3 mt-1" />
    </button>
  );
}

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathOverride = searchParams.get("path");
  const welcomeFromLogin = searchParams.get("welcome") === "1";
  const prefilledEmail = searchParams.get("email") ?? "";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [path, setPath] = useState<"join" | "create" | null>(null);

  // Identity (Step 1)
  const [email, setEmail] = useState(prefilledEmail);
  const [displayName, setDisplayName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Join branch (Step 3a)
  const [code, setCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [clubInfo, setClubInfo] = useState<{ name: string; memberCount: number } | null>(null);
  const [joinError, setJoinError] = useState("");
  const [joiningClub, setJoiningClub] = useState(false);

  // Create branch (Step 3b)
  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [codeError, setCodeError] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);
  // @spec CLUB-UI-CODE-LIVE-001 — debounced uniqueness check
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "loading" | "available" | "taken"
  >("idle");
  const codeLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeLookupController = useRef<AbortController | null>(null);

  // Success state
  const [successClubName, setSuccessClubName] = useState("");
  const [successClubCode, setSuccessClubCode] = useState("");

  const identityValid =
    email.includes("@") && displayName.trim().length > 0 && passcode.length > 0;
  const joinReady = !!clubInfo && typeof clubInfo !== "string";
  const createReady = clubName.trim().length >= 3;

  // Auto-derive club code from club name
  const derivedCode = clubName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10) || "CLUB";

  // @spec CLUB-UI-CODE-LIVE-001 — debounced live uniqueness check on the
  // create-branch invite-code input. Codes resolve to either "available"
  // (lookup throws NOT_FOUND) or "taken" (lookup returns a club). Codes
  // shorter than 4 chars are skipped — clubs.lookup itself rejects them.
  const effectiveCode = (clubCode || derivedCode).trim().toUpperCase();
  const shouldLookupCode =
    step === 3 && path === "create" && effectiveCode.length >= 4 && effectiveCode !== "CLUB";
  useEffect(() => {
    if (!shouldLookupCode) {
      setCodeStatus("idle");
      return;
    }
    if (codeLookupTimer.current) clearTimeout(codeLookupTimer.current);
    if (codeLookupController.current) codeLookupController.current.abort();
    setCodeStatus("loading");

    const controller = new AbortController();
    codeLookupController.current = controller;
    codeLookupTimer.current = setTimeout(() => {
      const url = `/api/trpc/clubs.lookup?input=${encodeURIComponent(JSON.stringify({ code: effectiveCode }))}`;
      fetch(url, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data?.result?.data?.clubName) setCodeStatus("taken");
          else setCodeStatus("available");
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          // Treat network blips as "available" so we never block the user on
          // an intermittent failure; the on-submit check covers final truth.
          setCodeStatus("available");
        });
    }, 300);

    return () => {
      if (codeLookupTimer.current) clearTimeout(codeLookupTimer.current);
      controller.abort();
    };
  }, [effectiveCode, shouldLookupCode]);

  // Step 1: Continue with identity
  async function handleIdentityContinue() {
    if (!identityValid) return;
    setSigningIn(true);
    setIdentityError("");

    try {
      const res = await fetch("/api/trpc/auth.enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, passcode }),
      });
      const data = await res.json();

      if (data.error) {
        setIdentityError(data.error.message || "Failed to create session");
        setSigningIn(false);
        return;
      }

      const result = data.result?.data;
      if (!result?.sessionId) {
        setIdentityError("Unexpected response format");
        setSigningIn(false);
        return;
      }

      document.cookie = `session_id=${result.sessionId}; path=/; max-age=${30 * 24 * 60 * 60}`;

      // Honor explicit ?path= override — bypass smart detection.
      if (pathOverride === "join" || pathOverride === "create") {
        setPath(pathOverride);
        setStep(3);
        setSigningIn(false);
        return;
      }

      // Smart detection: if user already has clubs, drop them into their first one.
      try {
        const meInput = encodeURIComponent(JSON.stringify({}));
        const meRes = await fetch(`/api/trpc/auth.me?input=${meInput}`);
        const meData = await meRes.json();
        const clubs = meData.result?.data?.clubs;
        if (Array.isArray(clubs) && clubs.length > 0) {
          router.push(`/clubs/${clubs[0].id}`);
          return;
        }
      } catch {
        // Graceful degradation — fall through to Step 2.
      }

      setStep(2);
      setSigningIn(false);
    } catch {
      setIdentityError("Something went wrong");
      setSigningIn(false);
    }
  }

  // Step 2: Choose path
  function handlePathChoice(chosen: "join" | "create") {
    setPath(chosen);
    setStep(3);
    setJoinError("");
    setCodeError("");
  }

  // Step 3a: Debounced code lookup
  async function handleCodeChange(newCode: string) {
    const normalized = newCode.toUpperCase();
    setCode(normalized);

    if (normalized.length < 4) {
      setClubInfo(null);
      return;
    }

    setLookupLoading(true);
    setJoinError("");

    try {
      const res = await fetch(
        `/api/trpc/clubs.lookup?input=${encodeURIComponent(JSON.stringify({ code: normalized }))}`
      );
      const data = await res.json();
      const result = data.result?.data;

      if (result?.clubName) {
        setClubInfo({ name: result.clubName, memberCount: result.memberCount });
        setJoinError("");
      } else {
        setClubInfo(null);
        setJoinError("No club found with that code");
      }
    } catch {
      setClubInfo(null);
      setJoinError("Failed to look up club");
    } finally {
      setLookupLoading(false);
    }
  }

  // Step 3a: Submit join
  async function handleJoinSubmit() {
    if (!joinReady) return;
    setJoiningClub(true);
    setJoinError("");

    try {
      const res = await fetch("/api/trpc/clubs.join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (data.error) {
        setJoinError(data.error.message || "Failed to join club");
      } else {
        const result = data.result?.data;
        if (result?.club?.id) {
          setSuccessClubName(result.club.name || "your club");
          setStep(4);
          setTimeout(() => router.push(`/clubs/${result.club.id}`), 1500);
        } else {
          setJoinError("Unexpected response format");
        }
      }
    } catch {
      setJoinError("Something went wrong");
    } finally {
      setJoiningClub(false);
    }
  }

  // Step 3b: Validate code uniqueness
  async function validateClubCode(testCode: string) {
    try {
      const res = await fetch(
        `/api/trpc/clubs.lookup?input=${encodeURIComponent(JSON.stringify({ code: testCode }))}`
      );
      const data = await res.json();
      if (data.result?.data?.clubName) {
        setCodeError("This code is already in use");
        return false;
      }
      setCodeError("");
      return true;
    } catch {
      return true; // Assume valid on network error
    }
  }

  // Step 3b: Submit create
  async function handleCreateSubmit() {
    if (!createReady) return;

    // Validate code before submit
    const codeToUse = clubCode || derivedCode;
    const isValid = await validateClubCode(codeToUse);
    if (!isValid) return;

    setCreatingClub(true);
    setCodeError("");

    try {
      // @spec AUTH-UI-STEP3B-CADENCE-DATA-001, JOIN-UI-CREATE-CADENCE-001
      const res = await fetch("/api/trpc/clubs.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clubName,
          code: codeToUse,
          cadence,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setCodeError(data.error.message || "Failed to create club");
      } else {
        const result = data.result?.data;
        if (result?.club?.id) {
          setSuccessClubName(clubName);
          setSuccessClubCode(codeToUse);
          setStep(4);
          setTimeout(() => router.push(`/clubs/${result.club.id}`), 1500);
        } else {
          setCodeError("Unexpected response format");
        }
      }
    } catch {
      setCodeError("Something went wrong");
    } finally {
      setCreatingClub(false);
    }
  }

  function handleBack() {
    if (step === 3) {
      setStep(2);
      setPath(null);
    } else if (step === 2) {
      setStep(1);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(successClubCode);
  }

  const headings = {
    1: "Let's get you started",
    2: displayName ? `Welcome, ${displayName.split(" ")[0]}` : "Welcome",
    3:
      path === "join"
        ? "Find your club"
        : "Set up your club",
    4: path === "join" ? "Welcome!" : "Club created!",
  };

  const descriptions = {
    1: "Tell us who you are.",
    2: "Are you joining a club someone invited you to, or starting your own?",
    3:
      path === "join"
        ? "Enter the invite code your organizer sent you."
        : "You can change all of this later.",
    4:
      path === "join"
        ? "You're all set. Redirecting you now…"
        : "Share the invite code with your friends.",
  };

  return (
    <main id="main-content" className="min-h-screen flex flex-col" style={{ background: paperBg }}>
      {/* Header */}
      <header className="flex items-center justify-between" style={{ padding: "20px 32px" }}>
        <div className="flex items-center gap-2.5">
          <LogoIcon size={22} />
          <span className="font-[var(--font-display)] text-[16px] font-semibold text-ink">
            BookClub Hub
          </span>
        </div>
        {step < 4 && (
          <div className="text-xs text-ink-3">
            Already a member?{" "}
            <a
              href="/login"
              className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
            >
              Log in
            </a>
          </div>
        )}
      </header>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <Card className="w-full max-w-[480px] p-8">
          {step < 4 && (
            <>
              <h1 className="font-[var(--font-display)] text-[28px] font-semibold text-ink mb-1.5">
                {headings[step]}
              </h1>
              <p className="text-ink-3 text-[14px] mb-6">
                {descriptions[step]}
              </p>
              <Stepper
                step={step}
                stepLabel={step === 2 ? "Path" : step === 3 ? (path === "join" ? "Code" : "Club") : undefined}
              />
            </>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-4">
              {welcomeFromLogin && (
                <div
                  data-testid="welcome-banner"
                  role="status"
                  className="p-3 rounded-[var(--radius-md)] bg-primary-soft text-primary-ink text-[13px] border animate-fade-in"
                  style={{ borderColor: "oklch(0.85 0.04 195)" }}
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
                  className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
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
                  className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
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
                  className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
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
                onClick={handleIdentityContinue}
                iconRight={<ChevronRightIcon size={14} />}
              >
                {signingIn ? "Signing you in…" : "Continue"}
              </Button>
            </div>
          )}

          {/* Step 2: Path choice */}
          {step === 2 && (
            <div className="space-y-3">
              <PathCard
                icon={<UsersIcon size={20} />}
                title="Join an existing club"
                body="Use an invite code from your organizer. Most readers start here."
                meta="2,400+ readers in 340 clubs"
                onClick={() => handlePathChoice("join")}
              />
              <PathCard
                icon={<PlusIcon size={20} />}
                title="Create a new club"
                body="Start fresh, invite your friends, and run the first vote."
                meta="Takes about 2 minutes"
                onClick={() => handlePathChoice("create")}
              />
              <button
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2 text-sm text-ink-3 hover:text-ink-2 transition-colors mt-4"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 3a: Join branch */}
          {step === 3 && path === "join" && (
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
                    onChange={(e) => handleCodeChange(e.target.value)}
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
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={!joinReady || joiningClub}
                  onClick={handleJoinSubmit}
                >
                  {joiningClub ? "Joining…" : `Join ${clubInfo?.name || "the club"}`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3b: Create branch */}
          {step === 3 && path === "create" && (
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
                  className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
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
                  {[
                    { value: "monthly", label: "Monthly", sub: "12 books/yr" },
                    { value: "six_weeks", label: "6 weeks", sub: "~9 books/yr" },
                    { value: "flexible", label: "Flexible", sub: "No schedule" },
                  ].map((opt) => (
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
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={!createReady || creatingClub || codeStatus === "taken"}
                  onClick={handleCreateSubmit}
                >
                  {creatingClub ? "Creating…" : "Create club"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-3 animate-fade-in">
              <div
                role="img"
                aria-label="Success"
                className="w-16 h-16 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4"
              >
                <CheckIcon size={28} />
              </div>
              <h2 className="font-[var(--font-display)] text-[26px] font-semibold text-ink mb-2">
                {path === "join" ? `Welcome to ${successClubName}!` : `${successClubName} is live!`}
              </h2>
              <p className="text-ink-3 text-[14px] mb-6">
                {path === "join" ? "You're all set. Redirecting you now…" : "Share this code with your friends."}
              </p>

              {path === "create" && (
                <div className="bg-bg-soft rounded-[var(--radius-md)] p-4 mb-6">
                  <p className="text-xs uppercase tracking-wider text-ink-3 mb-2">Invite code</p>
                  <div className="flex items-center gap-2 justify-between">
                    <span className="font-[var(--font-mono)] text-[18px] font-semibold text-primary">
                      {successClubCode}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={copyToClipboard}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageInner />
    </Suspense>
  );
}
