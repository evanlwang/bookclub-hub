// @spec AUTH-UI-001, AUTH-UI-002, AUTH-UI-003, AUTH-UI-004, CLUB-UI-001, CLUB-UI-002, CLUB-UI-003
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, LogoIcon } from "@/components/ui";
import { paperBg } from "./_shared";
import { Stepper } from "./_stepper";
import { Step1Identity } from "./_step1-identity";
import { Step2Path } from "./_step2-path";
import { Step3Join } from "./_step3-join";
import { Step3Create, type CodeStatus } from "./_step3-create";
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
  const [joiningClub, setJoiningClub] = useState(false);

  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [codeError, setCodeError] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);
  // @spec CLUB-UI-CODE-LIVE-001 — debounced uniqueness check
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const codeLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeLookupController = useRef<AbortController | null>(null);

  const [successClubName, setSuccessClubName] = useState("");
  const [successClubCode, setSuccessClubCode] = useState("");

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
          setCodeStatus("available");
        });
    }, 300);

    return () => {
      if (codeLookupTimer.current) clearTimeout(codeLookupTimer.current);
      controller.abort();
    };
  }, [effectiveCode, shouldLookupCode]);

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

      // @spec AUTH-BE-001 — server emits the HttpOnly+Secure+SameSite cookie
      // via Set-Cookie on the auth.enter response; no client-side write needed.

      if (pathOverride === "join" || pathOverride === "create") {
        setPath(pathOverride);
        setStep(3);
        setSigningIn(false);
        return;
      }

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

  function handlePathChoice(chosen: "join" | "create") {
    setPath(chosen);
    setStep(3);
    setJoinError("");
    setCodeError("");
  }

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
      return true;
    }
  }

  async function handleCreateSubmit() {
    if (!createReady) return;

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
              joiningClub={joiningClub}
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
              creatingClub={creatingClub}
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
