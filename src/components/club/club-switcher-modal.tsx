// @spec CLUB-NAV-MODAL-001, CLUB-NAV-MODAL-002, CLUB-NAV-MODAL-003, CLUB-NAV-MODAL-004, CLUB-NAV-MODAL-005, CLUB-NAV-MODAL-006, CLUB-NAV-MODAL-007, CLUB-NAV-MODAL-008
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, Card, CheckIcon } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { trpc } from "@/trpc/react-hooks";

type Tab = "join" | "create";
type Cadence = "monthly" | "six_weeks" | "flexible";

interface ClubSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClubSwitcherModal({ isOpen, onClose }: ClubSwitcherModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("join");

  // Join state
  const [code, setCode] = useState("");
  // The debounced, normalized code that's actually sent to the server. We
  // update it 300ms after the user stops typing — useQuery cancels in-flight
  // lookups automatically when this value changes.
  const [debouncedCode, setDebouncedCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [alreadyMemberClub, setAlreadyMemberClub] = useState<{ id: string; name: string } | null>(null);

  // @spec CLUB-NAV-CLIENT-001 — prefetch the target club's RSC the moment we
  // know the user will go there, so the click-to-render handoff is near-instant.
  useEffect(() => {
    if (alreadyMemberClub) router.prefetch(`/clubs/${alreadyMemberClub.id}`);
  }, [alreadyMemberClub, router]);

  // Create state
  const [clubName, setClubName] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [createError, setCreateError] = useState("");

  // Created success state (shown inside create tab after successful creation)
  const [createdClub, setCreatedClub] = useState<{ id: string; name: string; code: string } | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen);

  // @spec CLUB-NAV-MODAL-001
  // Debounced lookup driven by `debouncedCode`. `enabled` keeps the query
  // dormant unless the user is on the join tab AND the code is long enough.
  const lookupQuery = trpc.clubs.lookup.useQuery(
    { code: debouncedCode },
    {
      enabled: tab === "join" && debouncedCode.length >= 4,
      retry: false,
      staleTime: 30_000,
    },
  );
  const clubInfo =
    lookupQuery.data && lookupQuery.data.clubName
      ? { name: lookupQuery.data.clubName, memberCount: lookupQuery.data.memberCount }
      : null;
  const lookupLoading =
    tab === "join" &&
    code.trim().length >= 4 &&
    (debouncedCode !== code.trim().toUpperCase() || lookupQuery.isFetching);

  const joinMutation = trpc.clubs.join.useMutation();
  const createMutation = trpc.clubs.create.useMutation();
  const joining = joinMutation.isPending;
  const creating = createMutation.isPending;
  // Stand-alone lookup used inside handleCreate to surface code-collision
  // errors before we POST clubs.create. Lazily fired via fetchQuery.
  const utils = trpc.useUtils();

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
    setDebouncedCode("");
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

  // Debounced join lookup: bump `debouncedCode` 300ms after the user stops
  // typing. `useQuery` keys on this and cancels stale requests automatically.
  useEffect(() => {
    if (tab !== "join") return;
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setDebouncedCode("");
      return;
    }
    const t = setTimeout(() => setDebouncedCode(normalized), 300);
    return () => clearTimeout(t);
  }, [code, tab]);

  // Project the query result into the existing join-error UX (404 → "no club
  // found", network failure → "failed to look up"). Done in an effect so we
  // don't fight React's render — setting state inline would loop.
  useEffect(() => {
    if (tab !== "join") return;
    if (debouncedCode.length < 4) {
      if (joinError) setJoinError("");
      return;
    }
    if (lookupQuery.isFetching) {
      if (joinError) setJoinError("");
      return;
    }
    if (lookupQuery.isError) {
      setJoinError("Failed to look up club");
      return;
    }
    if (lookupQuery.isSuccess) {
      if (!lookupQuery.data?.clubName) {
        setJoinError("No club found with that code");
      } else if (joinError) {
        setJoinError("");
      }
    }
    // joinError intentionally omitted — it's a derived clear-on-success signal,
    // not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    debouncedCode,
    lookupQuery.isFetching,
    lookupQuery.isError,
    lookupQuery.isSuccess,
    lookupQuery.data,
  ]);

  async function handleJoin() {
    if (!joinReady || joining) return;
    setJoinError("");
    setAlreadyMemberClub(null);

    try {
      const result = await joinMutation.mutateAsync({
        code: code.trim().toUpperCase(),
      });
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
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Failed to join club",
      );
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
    setCreateError("");

    const codeToUse = clubCode || derivedCode;

    // Uniqueness check via lookup (matches /join Step 3b behavior).
    // utils.clubs.lookup.fetch is the imperative version of useQuery — it
    // returns the same shape and respects the react-query cache.
    try {
      const lookup = await utils.clubs.lookup.fetch({ code: codeToUse });
      if (lookup?.clubName) {
        setCreateError("This code is already in use");
        return;
      }
    } catch {
      // network blip — proceed and let the create call surface the conflict.
    }

    try {
      // @spec AUTH-UI-STEP3B-CADENCE-DATA-001
      const result = await createMutation.mutateAsync({
        name: clubName.trim(),
        code: codeToUse,
        cadence,
      });
      if (!result?.club?.id) {
        setCreateError("Unexpected response format");
        return;
      }
      setCreatedClub({ id: result.club.id, name: clubName.trim(), code: codeToUse });
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create club",
      );
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
                    style={{ borderColor: "var(--color-primary-line)" }}
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
                    style={{ borderColor: "var(--color-danger-line)" }}
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
                    {([
                      { value: "monthly", label: "Monthly", sub: "12/yr" },
                      { value: "six_weeks", label: "6 weeks", sub: "~9/yr" },
                      { value: "flexible", label: "Flexible", sub: "—" },
                    ] as const).map((opt) => (
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
                    style={{ borderColor: "var(--color-danger-line)" }}
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
