// @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, CLUB-UI-001, CLUB-UI-002, CLUB-UI-003
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, LogoIcon } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";
import { paperBg } from "./_shared";
import { Stepper } from "./_stepper";
import { Step1Identity } from "./_step1-identity";
import { Step2Path } from "./_step2-path";
import { Step3Join } from "./_step3-join";
import { Step3Create, type Cadence, type CodeStatus } from "./_step3-create";
import { Step4Success } from "./_step4-success";

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathOverride = searchParams.get("path");
  const welcomeFromLogin = searchParams.get("welcome") === "1";
  const prefilledEmail = searchParams.get("email") ?? "";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [path, setPath] = useState<"join" | "create" | null>(null);

  const [email, setEmail] = useState(prefilledEmail);
  const [displayName, setDisplayName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [code, setCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [clubInfo, setClubInfo] = useState<{ name: string; memberCount: number } | null>(null);
  const [joinError, setJoinError] = useState("");
  // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001 — when the server reports the
  // user is already in the club, render an in-flow banner with a deep link
  // instead of pretending the join "succeeded".
  const [alreadyMember, setAlreadyMember] = useState<{ id: string; name: string } | null>(null);

  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [codeError, setCodeError] = useState("");

  const [successClubName, setSuccessClubName] = useState("");
  const [successClubCode, setSuccessClubCode] = useState("");

  const utils = trpc.useUtils();
  const enterMutation = trpc.auth.enter.useMutation();
  const joinMutation = trpc.clubs.join.useMutation();
  const createMutation = trpc.clubs.create.useMutation();

  const identityValid =
    email.includes("@") && displayName.trim().length > 0 && passcode.length > 0;
  const joinReady = !!clubInfo && typeof clubInfo !== "string";
  const createReady = clubName.trim().length >= 3;

  const derivedCode = clubName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10) || "CLUB";

  // @spec CLUB-UI-CODE-LIVE-001 — debounced live uniqueness check on the
  // create-branch invite-code input. Codes resolve to either "available"
  // (lookup throws NOT_FOUND) or "taken" (lookup returns a club). Codes
  // shorter than 4 chars are skipped — clubs.lookup itself rejects them.
  // useQuery handles request cancellation automatically when the key changes,
  // so the old AbortController is gone.
  const effectiveCode = (clubCode || derivedCode).trim().toUpperCase();
  const shouldLookupCode =
    step === 3 && path === "create" && effectiveCode.length >= 4 && effectiveCode !== "CLUB";

  const [debouncedCode, setDebouncedCode] = useState("");
  useEffect(() => {
    if (!shouldLookupCode) {
      setDebouncedCode("");
      return;
    }
    const t = setTimeout(() => setDebouncedCode(effectiveCode), 300);
    return () => clearTimeout(t);
  }, [effectiveCode, shouldLookupCode]);

  const liveLookup = trpc.clubs.lookup.useQuery(
    { code: debouncedCode },
    {
      enabled: shouldLookupCode && debouncedCode.length >= 4,
      retry: false,
      staleTime: 30_000,
    },
  );

  const codeStatus: CodeStatus = !shouldLookupCode
    ? "idle"
    : debouncedCode !== effectiveCode || liveLookup.isPending
      ? "loading"
      : liveLookup.error
        ? "available"
        : liveLookup.data
          ? "taken"
          : "idle";

  async function handleIdentityContinue() {
    if (!identityValid) return;
    setSigningIn(true);
    setIdentityError("");

    try {
      // @spec AUTH-BE-001 — server emits the HttpOnly+Secure+SameSite cookie
      // via Set-Cookie on the auth.enter response; no client-side write needed.
      await enterMutation.mutateAsync({ email, displayName, passcode });

      if (pathOverride === "join" || pathOverride === "create") {
        setPath(pathOverride);
        setStep(3);
        return;
      }

      // Imperative fetch — one-shot redirect decision, not an ongoing subscription.
      try {
        const me = await utils.auth.me.fetch();
        if (me.clubs.length > 0) {
          router.push(`/clubs/${me.clubs[0].id}`);
          return;
        }
      } catch {
        // Graceful degradation — fall through to Step 2.
      }

      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setIdentityError(message);
    } finally {
      setSigningIn(false);
    }
  }

  function handlePathChoice(chosen: "join" | "create") {
    setPath(chosen);
    setStep(3);
    setJoinError("");
    setCodeError("");
  }

  async function handleCodeChange(newCode: string) {
    const normalized = newCode.toUpperCase();
    setCode(normalized);
    // Editing the code invalidates the previous already-member banner.
    setAlreadyMember(null);

    if (normalized.length < 4) {
      setClubInfo(null);
      return;
    }

    setLookupLoading(true);
    setJoinError("");

    try {
      const data = await utils.clubs.lookup.fetch({ code: normalized });
      setClubInfo({ name: data.clubName, memberCount: data.memberCount });
      setJoinError("");
    } catch (err) {
      setClubInfo(null);
      const code = (err as { data?: { code?: string } })?.data?.code;
      setJoinError(
        code === "NOT_FOUND" ? "No club found with that code" : "Failed to look up club",
      );
    } finally {
      setLookupLoading(false);
    }
  }

  // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001
  async function handleJoinSubmit() {
    if (!joinReady) return;
    setJoinError("");
    setAlreadyMember(null);

    try {
      const result = await joinMutation.mutateAsync({ code });
      if (result.alreadyMember) {
        setAlreadyMember({ id: result.club.id, name: result.club.name || "your club" });
        return;
      }
      setSuccessClubName(result.club.name || "your club");
      setStep(4);
      setTimeout(() => router.push(`/clubs/${result.club.id}`), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join club";
      setJoinError(message);
    }
  }

  async function validateClubCode(testCode: string) {
    try {
      await utils.clubs.lookup.fetch({ code: testCode });
      // Lookup succeeded → a club with this code exists → code is taken.
      setCodeError("This code is already in use");
      return false;
    } catch {
      // NOT_FOUND (or network blip) — assume available; server will reject on create if needed.
      setCodeError("");
      return true;
    }
  }

  async function handleCreateSubmit() {
    if (!createReady) return;

    const codeToUse = clubCode || derivedCode;
    const isValid = await validateClubCode(codeToUse);
    if (!isValid) return;

    setCodeError("");

    try {
      // @spec AUTH-UI-STEP3B-CADENCE-DATA-001, JOIN-UI-CREATE-CADENCE-001
      const result = await createMutation.mutateAsync({
        name: clubName,
        code: codeToUse,
        cadence,
      });
      setSuccessClubName(clubName);
      setSuccessClubCode(codeToUse);
      setStep(4);
      setTimeout(() => router.push(`/clubs/${result.club.id}`), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create club";
      setCodeError(message);
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
      {/* @spec TOUCH-HEADER-001 */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5 safe-top">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={22} />
          <span className="font-[var(--font-display)] text-[16px] font-semibold text-ink">
            Dogear
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

          {step === 1 && (
            <Step1Identity
              welcomeFromLogin={welcomeFromLogin}
              email={email}
              setEmail={setEmail}
              displayName={displayName}
              setDisplayName={setDisplayName}
              passcode={passcode}
              setPasscode={setPasscode}
              identityError={identityError}
              identityValid={identityValid}
              signingIn={signingIn}
              onContinue={handleIdentityContinue}
            />
          )}

          {step === 2 && (
            <Step2Path onChoose={handlePathChoice} onBack={handleBack} />
          )}

          {step === 3 && path === "join" && (
            <Step3Join
              code={code}
              onCodeChange={handleCodeChange}
              lookupLoading={lookupLoading}
              clubInfo={clubInfo}
              joinError={joinError}
              joinReady={joinReady}
              joiningClub={joinMutation.isPending}
              alreadyMember={alreadyMember}
              onSubmit={handleJoinSubmit}
              onBack={handleBack}
            />
          )}

          {step === 3 && path === "create" && (
            <Step3Create
              clubName={clubName}
              setClubName={setClubName}
              clubCode={clubCode}
              setClubCode={setClubCode}
              derivedCode={derivedCode}
              cadence={cadence}
              setCadence={setCadence}
              codeStatus={codeStatus}
              codeError={codeError}
              createReady={createReady}
              creatingClub={createMutation.isPending}
              onSubmit={handleCreateSubmit}
              onBack={handleBack}
            />
          )}

          {step === 4 && (
            <Step4Success
              path={path}
              successClubName={successClubName}
              successClubCode={successClubCode}
              onCopyCode={copyToClipboard}
            />
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
