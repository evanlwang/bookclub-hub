"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, EarGlyph } from "@/components/ui";
import { successMessage } from "@/lib/voting/prior-votes";
import { trpc } from "@/trpc/react-hooks";
import { useLiveQueryOptions } from "@/lib/hooks/use-live-query";
import {
  CloseVotingDialog,
  CancelRoundDialog,
  type ClosePreview,
} from "./close-voting-dialog";
import { Slip } from "./slip";
import type { Nomination, Turnout } from "./vote-round-types";

interface VotingPhaseProps {
  clubId: string;
  roundId: string;
  nominations: Nomination[];
  maxApprovals: number;
  myVotes: string[];
  isAdmin: boolean;
  /** RSC-fetched seed for the polled `rounds.turnout` query. */
  initialTurnout: Turnout;
  closePreview: ClosePreview | null;
  /** @spec VOTE-UI-VOTE-DEADLINE-001 */
  activeVotingDeadline: string | null;
}

// @spec VOTE-UI-001, VOTE-UI-002, VOTE-UI-006, VOTE-UI-009, VOTE-API-008, VOTE-BE-003
export function VotingPhase({
  clubId,
  roundId,
  nominations,
  maxApprovals,
  myVotes: initialVotes,
  isAdmin,
  initialTurnout,
  closePreview,
  activeVotingDeadline,
}: VotingPhaseProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<string[]>(initialVotes);
  const [hasVoted, setHasVoted] = useState(initialVotes.length > 0);
  // What the server currently has persisted for this user. Tracked locally
  // (rather than read from the prop) because a successful submit no longer
  // triggers a router.refresh() — the prop only changes on real RSC renders.
  const [persistedVotes, setPersistedVotes] = useState<string[]>(initialVotes);

  // @spec VOTE-UI-TURNOUT-LIVE-001, VOTE-UI-LIVE-POLL-001
  // The turnout card renders from this polled query (seeded by the RSC) so
  // other members' votes — and a close/cancel by another admin — surface
  // within the poll interval without a reload.
  const turnoutQuery = trpc.rounds.turnout.useQuery(
    { clubId, roundId },
    {
      initialData: initialTurnout,
      ...useLiveQueryOptions({ intervalMs: 15_000 }),
    }
  );
  const turnout = turnoutQuery.data ?? initialTurnout;

  // @spec VOTE-UI-LIVE-POLL-001 — structural transition carve-out: when the
  // polled status says the round left "voting", re-render the page once via
  // router.refresh() so the decided/cancelled phase view takes over.
  const refreshedOnPhaseChange = useRef(false);
  useEffect(() => {
    if (turnout.status !== "voting" && !refreshedOnPhaseChange.current) {
      refreshedOnPhaseChange.current = true;
      router.refresh();
    }
  }, [turnout.status, router]);

  // @spec VOTE-UI-CLOSE-LIVE-001
  // Source of truth for the close-voting preview. The server-rendered
  // `closePreview` prop is used only as the initial paint so admins don't
  // see a flash of "no votes" — the real value comes from this query, which
  // is refetched on dialog open and after each local vote submit so the
  // enabled/disabled state of the close button and the standings inside the
  // dialog always reflect freshly-arrived votes.
  const closePreviewQuery = trpc.rounds.getClosePreview.useQuery(
    { clubId, roundId },
    {
      enabled: isAdmin,
      staleTime: 0,
      initialData: closePreview ?? undefined,
    }
  );
  const livePreview = closePreviewQuery.data ?? closePreview;

  // @spec VOTE-UI-CLOSE-002, VOTE-UI-CANCEL-002
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [adminActionError, setAdminActionError] = useState("");
  const [cancelConfirmText, setCancelConfirmText] = useState("");
  // Tracks the just-completed in-session submit so we can show a confirmation
  // toast that disappears on the next interaction. Distinct from `hasVoted`,
  // which persists across reloads to drive the "Update N?" button label.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [lastSubmitWasUpdate, setLastSubmitWasUpdate] = useState(false);
  const [error, setError] = useState("");

  // @spec VOTE-UI-PRIOR-VOTES-001
  // When the parent server component genuinely re-renders (phase change,
  // reload), sync local state with the fresh `myVotes` prop so the picks UI
  // reflects what's persisted.
  const initialVotesKey = initialVotes.join(",");
  useEffect(() => {
    setSelected(initialVotes);
    setPersistedVotes(initialVotes);
    // initialVotes identity changes per render; the join string is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVotesKey]);

  // @spec VOTE-UI-VOTE-003
  // True when the local selection diverges from what's persisted server-side,
  // i.e. the user has toggled something since their last save (or never saved).
  // Drives the submit button's enabled/label state so a voted user with no
  // pending edits sees "Votes saved" rather than the actionable "Save changes".
  const selectedKey = [...selected].sort().join(",");
  const persistedKey = [...persistedVotes].sort().join(",");
  const hasPendingChanges = selectedKey !== persistedKey;

  // @spec VOTE-BE-003
  function toggleSelection(nominationId: string) {
    // Clear the just-submitted toast as soon as the user starts changing their picks again.
    if (justSubmitted) setJustSubmitted(false);
    setSelected((prev) => {
      if (prev.includes(nominationId)) {
        return prev.filter((id) => id !== nominationId);
      }
      if (prev.length >= maxApprovals) return prev;
      return [...prev, nominationId];
    });
  }

  // @spec VOTE-API-008, VOTE-UI-OPTIMISTIC-001, VOTE-UI-TURNOUT-LIVE-001, VOTE-UI-UPDATE-CONFIRM-001
  // Optimistic submit: the button flips to its saved state and (on a first
  // vote only — VOTE-UI-TURNOUT-CHANGE-COUNT-001) the turnout count bumps in
  // `onMutate`; `onError` rolls everything back; `onSettled` reconciles with
  // the server. No router.refresh() — counters live in client queries now.
  const submitVotes = trpc.votes.submit.useMutation({
    onMutate: async (vars) => {
      setError("");
      await utils.rounds.turnout.cancel({ clubId, roundId });
      const snapshot = {
        turnout: utils.rounds.turnout.getData({ clubId, roundId }),
        hasVoted,
        persistedVotes,
        justSubmitted,
        lastSubmitWasUpdate,
      };
      const wasUpdate = hasVoted;
      setHasVoted(true);
      setJustSubmitted(true);
      setLastSubmitWasUpdate(wasUpdate);
      setPersistedVotes(vars.nominationIds);
      if (!wasUpdate) {
        utils.rounds.turnout.setData({ clubId, roundId }, (prev) =>
          prev ? { ...prev, voterCount: prev.voterCount + 1 } : prev
        );
      }
      return snapshot;
    },
    onError: (err, _vars, snapshot) => {
      if (snapshot) {
        setHasVoted(snapshot.hasVoted);
        setPersistedVotes(snapshot.persistedVotes);
        setJustSubmitted(snapshot.justSubmitted);
        setLastSubmitWasUpdate(snapshot.lastSubmitWasUpdate);
        utils.rounds.turnout.setData({ clubId, roundId }, snapshot.turnout);
      }
      setError(err.message || "Failed to submit votes");
    },
    onSettled: () => {
      void utils.rounds.turnout.invalidate({ clubId, roundId });
      void utils.rounds.get.invalidate({ clubId, roundId });
      // @spec VOTE-UI-CLOSE-LIVE-001 — own vote bumps the standings the
      // admin will see when they next open the close dialog.
      void utils.rounds.getClosePreview.invalidate({ clubId, roundId });
    },
  });

  function handleSubmitVotes() {
    submitVotes.mutate({ clubId, roundId, nominationIds: selected });
  }

  // @spec VOTE-UI-CLOSE-004, VOTE-UI-CLOSE-006, VOTE-API-003
  const advanceRound = trpc.rounds.advance.useMutation({
    onSuccess: () => {
      setCloseOpen(false);
      void utils.rounds.get.invalidate({ clubId, roundId });
      void utils.rounds.list.invalidate({ clubId });
      // @spec CLUB-NAV-BADGE-LIVE-001 — round close clears the "Live" badge.
      void utils.clubs.navState.invalidate();
      router.refresh();
    },
    onError: (err) => {
      setAdminActionError(err.message || "Failed to close voting");
    },
  });

  function handleCloseVoting() {
    if (advanceRound.isPending) return;
    setAdminActionError("");
    advanceRound.mutate({ clubId, roundId });
  }

  // @spec VOTE-UI-CANCEL-002, VOTE-API-004
  const cancelRound = trpc.rounds.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      setCancelConfirmText("");
      void utils.rounds.get.invalidate({ clubId, roundId });
      void utils.rounds.list.invalidate({ clubId });
      void utils.clubs.navState.invalidate();
      router.refresh();
    },
    onError: (err) => {
      setAdminActionError(err.message || "Failed to cancel round");
    },
  });

  function handleCancelRound() {
    if (cancelRound.isPending) return;
    if (cancelConfirmText.trim().toLowerCase() !== "cancel") {
      setAdminActionError('Type "cancel" to confirm');
      return;
    }
    setAdminActionError("");
    cancelRound.mutate({ clubId, roundId });
  }

  const adminActionLoading = advanceRound.isPending || cancelRound.isPending;
  const loading = submitVotes.isPending;

  return (
    <div data-testid="voting-phase" className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Main content */}
      <div className="min-w-0">
        {/* Picks indicator card — EarGlyphs fill as slips get dog-eared.
            @spec VOTE-UI-EARGLYPH-001 */}
        <Card data-testid="approval-pill" className="p-3.5 mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-[var(--font-display)] text-xs font-bold uppercase tracking-[0.05em] text-ink-3">
              Picks
            </span>
            <span className="flex gap-1.5">
              {[...Array(maxApprovals)].map((_, i) => (
                <EarGlyph key={i} filled={i < selected.length} size={20} />
              ))}
            </span>
            <span className="font-[var(--font-display)] text-[15px] font-extrabold text-ink tabular-nums">
              {selected.length}/{maxApprovals} dog-eared
            </span>
            <span className="ml-auto font-[var(--font-display)] text-xs font-bold text-ink-3">
              {turnout.voterCount} of {turnout.memberCount} have voted
            </span>
          </div>
          {/* @spec VOTE-UI-PRIOR-VOTES-002 */}
          {persistedVotes.length > 0 && !loading ? (
            <p
              data-testid="prior-vote-hint"
              className="font-[var(--font-serif)] italic text-[13.5px] text-ink-3 mt-2 mb-0"
            >
              You voted previously — tap a book to add or remove it, then save your changes.
            </p>
          ) : (
            <p className="font-[var(--font-serif)] italic text-[13.5px] text-ink-3 mt-2 mb-0">
              Approve up to {maxApprovals} book{maxApprovals !== 1 ? "s" : ""}. Your selections stay private — tallies are revealed when voting closes.
            </p>
          )}
        </Card>

        <div className="space-y-3 mb-6">
          {nominations.map((nom) => {
            const isSelected = selected.includes(nom.id);
            const isMaxed = selected.length >= maxApprovals && !isSelected;
            return (
              <Slip
                key={nom.id}
                nom={nom}
                selectable
                selected={isSelected}
                disabled={isMaxed}
                onToggle={() => toggleSelection(nom.id)}
                testId={`nomination-${nom.id}`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-danger mb-3">{error}</p>
        )}

        {/*
          Three-state submit button:
            - never voted, has picks  → "Submit N votes" (primary, enabled)
            - voted, no pending edits → "✓ Votes saved" (disabled, calm — no action to take)
            - voted, pending edits    → "Save changes" (primary, enabled — clear update verb)
          Loading collapses everything to the spinner regardless.
        */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={selected.length === 0 || (hasVoted && !hasPendingChanges)}
          onClick={handleSubmitVotes}
          data-testid="submit-votes-btn"
          data-state={
            !hasVoted
              ? "first-submit"
              : hasPendingChanges
                ? "save-changes"
                : "saved"
          }
        >
          {!hasVoted
            ? `Submit ${selected.length} vote${selected.length !== 1 ? "s" : ""}`
            : hasPendingChanges
              ? `Save changes`
              : `✓ Votes saved`}
        </Button>

        {/* @spec VOTE-UI-UPDATE-CONFIRM-001 */}
        {justSubmitted && !loading && (
          <p className="text-xs text-success text-center mt-2 animate-fade-in" data-testid="vote-success">
            {successMessage(lastSubmitWasUpdate)}
          </p>
        )}

        {/* @spec VOTE-UI-CLOSE-002, VOTE-UI-CLOSE-007, VOTE-UI-CANCEL-002 */}
        {isAdmin && (
          <div
            data-testid="admin-round-actions"
            className="mt-6 pt-5 border-t border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-ink-3">Admin actions</span>
              {livePreview && livePreview.totalVotes === 0 && (
                <span
                  data-testid="close-disabled-hint"
                  className="text-[11px] text-ink-3 italic mt-0.5"
                >
                  No votes cast yet
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdminActionError("");
                  setCancelOpen(true);
                }}
                data-testid="cancel-round-btn"
              >
                Cancel round
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!livePreview || livePreview.totalVotes === 0}
                onClick={() => {
                  setAdminActionError("");
                  // @spec VOTE-UI-CLOSE-LIVE-001 — refetch standings on every
                  // dialog open so admins never act on stale tallies.
                  void closePreviewQuery.refetch();
                  setCloseOpen(true);
                }}
                data-testid="close-voting-btn"
              >
                Close voting & reveal winner
              </Button>
            </div>
          </div>
        )}

        {closeOpen && livePreview && (
          <CloseVotingDialog
            preview={livePreview}
            submitting={adminActionLoading}
            error={adminActionError}
            onConfirm={handleCloseVoting}
            onCancel={() => {
              if (!adminActionLoading) {
                setCloseOpen(false);
                setAdminActionError("");
              }
            }}
          />
        )}

        {cancelOpen && (
          <CancelRoundDialog
            submitting={adminActionLoading}
            error={adminActionError}
            confirmText={cancelConfirmText}
            onConfirmTextChange={setCancelConfirmText}
            onConfirm={handleCancelRound}
            onCancel={() => {
              if (!adminActionLoading) {
                setCancelOpen(false);
                setCancelConfirmText("");
                setAdminActionError("");
              }
            }}
          />
        )}
      </div>

      {/* Sidebar */}
      <aside data-testid="vote-sidebar" className="hidden lg:flex flex-col gap-4 sticky top-6 self-start">
        <Card className="p-5">
          <Badge tone="accent" dot>Voting open</Badge>
          {/* @spec VOTE-UI-VOTE-DEADLINE-001 — surface the active voting
              deadline so members know how long they have to vote. */}
          {activeVotingDeadline && (
            <p
              data-testid="active-voting-deadline"
              className="text-xs text-ink-2 mt-2"
            >
              Closes {new Date(activeVotingDeadline).toLocaleString()}
            </p>
          )}
          <p className="font-[var(--font-display)] text-lg font-semibold mt-2.5 mb-1">
            You&rsquo;ve approved
          </p>
          <p className="font-[var(--font-display)] text-[28px] font-semibold tracking-tight">
            {selected.length}<span className="text-ink-3 text-lg"> / {maxApprovals}</span>
          </p>
          <div data-testid="approval-dots" className="flex gap-2 mt-3 mb-4 items-center">
            {[...Array(maxApprovals)].map((_, i) => {
              const filled = i < selected.length;
              return (
                <div
                  key={i}
                  data-testid="approval-dot"
                  data-filled={filled}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                    filled
                      ? "border-primary bg-primary shadow-[0_0_0_3px_var(--color-primary-soft)]"
                      : "border-line-strong bg-transparent"
                  }`}
                >
                  {filled && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </div>
              );
            })}
            <span className="text-[11px] text-ink-3 ml-auto">
              {maxApprovals - selected.length === 0 ? "all used" : `${maxApprovals - selected.length} left`}
            </span>
          </div>
        </Card>

        <Card className="p-5 bg-bg-soft" data-testid="voter-turnout">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-ink-3">
              <circle cx="9" cy="8" r="4" />
              <path d="M2 21a7 7 0 0 1 14 0" />
              <path d="M16 4a4 4 0 0 1 0 8" />
              <path d="M22 21a7 7 0 0 0-5-6.7" />
            </svg>
            <span className="text-xs text-ink-3">Voter turnout</span>
          </div>
          <p className="font-[var(--font-display)] text-2xl font-semibold">
            {turnout.voterCount}<span className="text-ink-3 text-sm ml-1">of {turnout.memberCount} have voted</span>
          </p>
          <p className="text-[11px] text-ink-3 mt-1.5">Tallies hidden until close</p>
        </Card>
      </aside>
    </div>
  );
}
