// @spec CLUB-NAV-MODAL-001, CLUB-NAV-MODAL-002, CLUB-NAV-MODAL-003, CLUB-NAV-MODAL-004, CLUB-NAV-MODAL-005, CLUB-NAV-MODAL-006, CLUB-NAV-MODAL-007, CLUB-NAV-MODAL-008
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, Card, CheckIcon } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

type Tab = "join" | "create";

interface ClubSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClubSwitcherModal({ isOpen, onClose }: ClubSwitcherModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("join");

  // Join state
  const [code, setCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [clubInfo, setClubInfo] = useState<{ name: string; memberCount: number } | null>(null);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [alreadyMemberClub, setAlreadyMemberClub] = useState<{ id: string; name: string } | null>(null);

  // Create state
  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Created success state (shown inside create tab after successful creation)
  const [createdClub, setCreatedClub] = useState<{ id: string; name: string; code: string } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen);

  const derivedCode = clubName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10) || "CLUB";

  const inFlight = joining || creating;
  const joinReady = clubInfo !== null;
  const createReady = clubName.trim().length >= 3;

  function reset() {
    setTab("join");
    setCode("");
    setClubInfo(null);
    setJoinError("");
    setAlreadyMemberClub(null);
    setClubName("");
    setClubCode("");
    setCadence("monthly");
    setCreateError("");
    setCreatedClub(null);
  }

  function handleClose() {
    if (inFlight) return;
    if (createdClub) {
      // User finished a create flow; navigate them in on dismissal.
      const targetId = createdClub.id;
      reset();
      onClose();
      router.push(`/clubs/${targetId}`);
      router.refresh();
      return;
    }
    reset();
    onClose();
  }

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inFlight, createdClub]);

  // Debounced join lookup
  useEffect(() => {
    if (tab !== "join") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setClubInfo(null);
      setLookupLoading(false);
      return;
    }

    setLookupLoading(true);
    setJoinError("");
    debounceRef.current = setTimeout(async () => {
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
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, tab]);

  async function handleJoin() {
    if (!joinReady || joining) return;
    setJoining(true);
    setJoinError("");
    setAlreadyMemberClub(null);

    try {
      const res = await fetch("/api/trpc/clubs.join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.error) {
        setJoinError(data.error.message || "Failed to join club");
        return;
      }
      const result = data.result?.data;
      if (!result?.club?.id) {
        setJoinError("Unexpected response format");
        return;
      }
      if (result.alreadyMember) {
        setAlreadyMemberClub({ id: result.club.id, name: result.club.name });
        return;
      }
      const targetId = result.club.id;
      reset();
      onClose();
      router.push(`/clubs/${targetId}`);
      router.refresh();
    } catch {
      setJoinError("Something went wrong");
    } finally {
      setJoining(false);
    }
  }

  function handleGoToAlreadyMemberClub() {
    if (!alreadyMemberClub) return;
    const targetId = alreadyMemberClub.id;
    reset();
    onClose();
    router.push(`/clubs/${targetId}`);
    router.refresh();
  }

  async function handleCreate() {
    if (!createReady || creating) return;
    setCreating(true);
    setCreateError("");

    const codeToUse = clubCode || derivedCode;

    // Uniqueness check via lookup (matches /join Step 3b behavior)
    try {
      const res = await fetch(
        `/api/trpc/clubs.lookup?input=${encodeURIComponent(JSON.stringify({ code: codeToUse }))}`
      );
      const data = await res.json();
      if (data.result?.data?.clubName) {
        setCreateError("This code is already in use");
        setCreating(false);
        return;
      }
    } catch {
      // network blip — proceed and let the create call surface the conflict.
    }

    try {
      // @spec AUTH-UI-STEP3B-CADENCE-DATA-001
      const res = await fetch("/api/trpc/clubs.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clubName.trim(),
          code: codeToUse,
          cadence,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setCreateError(data.error.message || "Failed to create club");
        return;
      }
      const result = data.result?.data;
      if (!result?.club?.id) {
        setCreateError("Unexpected response format");
        return;
      }
      setCreatedClub({ id: result.club.id, name: clubName.trim(), code: codeToUse });
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  function copyCreatedCode() {
    if (createdClub) navigator.clipboard.writeText(createdClub.code);
  }

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      data-testid="club-switcher-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-switcher-modal-title"
      tabIndex={-1}
      className="fixed inset-0 backdrop-blur-md bg-bg/40 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <Card
        className="w-full max-w-[480px] bg-bg p-6 rounded-[var(--radius-lg)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            id="club-switcher-modal-title"
            className="font-[var(--font-display)] text-lg font-semibold text-ink"
          >
            {createdClub ? `${createdClub.name} is live!` : "Add another club"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={inFlight}
            className="text-ink-3 hover:text-ink transition-colors disabled:opacity-50"
            aria-label="Close"
            data-testid="club-switcher-modal-close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Created success view */}
        {createdClub && (
          <div className="text-center animate-fade-in">
            <div
              role="img"
              aria-label="Success"
              className="w-14 h-14 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4"
            >
              <CheckIcon size={24} />
            </div>
            <p className="text-ink-3 text-[14px] mb-5">Share the invite code with your members.</p>

            <div className="bg-bg-soft rounded-[var(--radius-md)] p-4 mb-5">
              <p className="text-xs uppercase tracking-wider text-ink-3 mb-2">Invite code</p>
              <div className="flex items-center gap-2 justify-between">
                <span className="font-[var(--font-mono)] text-[18px] font-semibold text-primary">
                  {createdClub.code}
                </span>
                <Button type="button" size="sm" variant="secondary" onClick={copyCreatedCode}>
                  Copy
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleClose}
              data-testid="created-club-go"
            >
              Go to {createdClub.name}
            </Button>
          </div>
        )}

        {/* Tabs + body */}
        {!createdClub && (
          <>
            <div role="tablist" aria-label="Add a club" className="grid grid-cols-2 gap-1 p-1 mb-5 bg-bg-soft rounded-[var(--radius-md)]">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "join"}
                onClick={() => setTab("join")}
                disabled={inFlight}
                data-testid="modal-tab-join"
                className={`text-sm py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                  tab === "join" ? "bg-bg text-ink shadow-sm font-medium" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                Join with code
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "create"}
                onClick={() => setTab("create")}
                disabled={inFlight}
                data-testid="modal-tab-create"
                className={`text-sm py-1.5 rounded-[var(--radius-sm)] transition-colors ${
                  tab === "create" ? "bg-bg text-ink shadow-sm font-medium" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                Create new
              </button>
            </div>

            {tab === "join" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="modal-code" className="block text-[13px] font-medium text-ink-2 mb-1.5">
                    Club code
                  </label>
                  <div className="relative">
                    <input
                      id="modal-code"
                      data-testid="modal-code-input"
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setAlreadyMemberClub(null);
                      }}
                      placeholder="OAKWOOD-7Q"
                      autoFocus
                      className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150 font-[var(--font-mono)] tracking-[0.08em] uppercase pr-10"
                    />
                    {lookupLoading && (
                      <svg
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
                    )}
                  </div>
                </div>

                {clubInfo && !alreadyMemberClub && (
                  <div
                    data-testid="modal-club-found"
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-primary-soft border animate-fade-in"
                    style={{ borderColor: "oklch(0.85 0.04 195)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-primary-ink truncate">{clubInfo.name}</p>
                      <p className="text-xs text-primary-ink/75">
                        {clubInfo.memberCount} member{clubInfo.memberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <CheckIcon size={18} />
                  </div>
                )}

                {alreadyMemberClub && (
                  <div
                    data-testid="modal-already-member"
                    role="status"
                    className="p-3 rounded-[var(--radius-md)] bg-bg-soft border border-line text-[13px] text-ink-2 animate-fade-in"
                  >
                    <p className="mb-2">You&apos;re already a member of <span className="font-medium text-ink">{alreadyMemberClub.name}</span>.</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleGoToAlreadyMemberClub}
                      data-testid="modal-go-to-club"
                    >
                      Go to club
                    </Button>
                  </div>
                )}

                {joinError && !alreadyMemberClub && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="p-3 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border animate-fade-in"
                    style={{ borderColor: "oklch(0.88 0.04 25)" }}
                  >
                    {joinError}
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!joinReady || joining || !!alreadyMemberClub}
                  onClick={handleJoin}
                  data-testid="modal-join-submit"
                >
                  {joining ? "Joining…" : clubInfo ? `Join ${clubInfo.name}` : "Join"}
                </Button>
              </div>
            )}

            {tab === "create" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="modal-club-name" className="block text-[13px] font-medium text-ink-2 mb-1.5">
                    Club name
                  </label>
                  <input
                    id="modal-club-name"
                    data-testid="modal-club-name"
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="e.g. Slow Reads"
                    autoFocus
                    className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150"
                  />
                </div>

                <div>
                  <label htmlFor="modal-club-code" className="block text-[13px] font-medium text-ink-2 mb-1.5">
                    Invite code
                  </label>
                  <input
                    id="modal-club-code"
                    data-testid="modal-club-code"
                    type="text"
                    value={clubCode || derivedCode}
                    onChange={(e) => setClubCode(e.target.value.toUpperCase())}
                    placeholder="Auto-generated"
                    className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all duration-150 font-[var(--font-mono)] tracking-[0.08em] uppercase"
                  />
                </div>

                <div>
                  <label htmlFor="modal-cadence" className="block text-[13px] font-medium text-ink-2 mb-1.5">
                    Voting cadence
                  </label>
                  <div id="modal-cadence" className="grid grid-cols-3 gap-2">
                    {[
                      { value: "monthly", label: "Monthly", sub: "12/yr" },
                      { value: "six_weeks", label: "6 weeks", sub: "~9/yr" },
                      { value: "flexible", label: "Flexible", sub: "—" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCadence(opt.value)}
                        className={`p-2.5 rounded-[var(--radius-md)] border-[1.5px] transition-all duration-150 text-left ${
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

                {createError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="p-3 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border animate-fade-in"
                    style={{ borderColor: "oklch(0.88 0.04 25)" }}
                  >
                    {createError}
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!createReady || creating}
                  onClick={handleCreate}
                  data-testid="modal-create-submit"
                >
                  {creating ? "Creating…" : "Create club"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>,
    document.body
  );
}
