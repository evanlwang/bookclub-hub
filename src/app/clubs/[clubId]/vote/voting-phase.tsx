"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, BookCover } from "@/components/ui";
import { successMessage } from "@/lib/voting/prior-votes";
import {
  CloseVotingDialog,
  CancelRoundDialog,
  type ClosePreview,
} from "./close-voting-dialog";
import type { Nomination } from "./vote-round-types";

interface VotingPhaseProps {
  clubId: string;
  roundId: string;
  nominations: Nomination[];
  maxApprovals: number;
  myVotes: string[];
  isAdmin: boolean;
  memberCount: number;
  voterCount: number;
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
  memberCount,
  voterCount,
  closePreview,
  activeVotingDeadline,
}: VotingPhaseProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialVotes);
  const [hasVoted, setHasVoted] = useState(initialVotes.length > 0);
  // @spec VOTE-UI-CLOSE-002, VOTE-UI-CANCEL-002
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState("");
  const [cancelConfirmText, setCancelConfirmText] = useState("");
  // Tracks the just-completed in-session submit so we can show a confirmation
  // toast that disappears on the next interaction. Distinct from `hasVoted`,
  // which persists across reloads to drive the "Update N?" button label.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [lastSubmitWasUpdate, setLastSubmitWasUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // @spec VOTE-UI-PRIOR-VOTES-001, VOTE-UI-TURNOUT-LIVE-001
  // After router.refresh() the parent server component re-renders with fresh
  // `myVotes`. Sync local `selected` state with the new prop so the picks UI
  // reflects what's now persisted. Safe because we only call router.refresh()
  // after a successful submit, where the server state matches local intent.
  const initialVotesKey = initialVotes.join(",");
  useEffect(() => {
    setSelected(initialVotes);
    // initialVotes identity changes per render; the join string is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVotesKey]);

  // @spec VOTE-UI-VOTE-003
  // True when the local selection diverges from what's persisted server-side,
  // i.e. the user has toggled something since their last save (or never saved).
  // Drives the submit button's enabled/label state so a voted user with no
  // pending edits sees "Votes saved" rather than the actionable "Save changes".
  const selectedKey = [...selected].sort().join(",");
  const persistedKey = [...initialVotes].sort().join(",");
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

  // @spec VOTE-API-008, VOTE-UI-TURNOUT-LIVE-001, VOTE-UI-UPDATE-CONFIRM-001
  async function handleSubmitVotes() {
    setLoading(true);
    setError("");
    const wasUpdate = hasVoted;
    try {
      const res = await fetch("/api/trpc/votes.submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, roundId, nominationIds: selected }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to submit votes");
      } else {
        setHasVoted(true);
        setJustSubmitted(true);
        setLastSubmitWasUpdate(wasUpdate);
        // Re-fetch the server component so the voter-turnout card reflects the new count.
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // @spec VOTE-UI-CLOSE-004, VOTE-UI-CLOSE-006, VOTE-API-003
  async function handleCloseVoting() {
    if (adminActionLoading) return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      const res = await fetch("/api/trpc/rounds.advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, roundId }),
      });
      const data = await res.json();
      if (data.error) {
        setAdminActionError(data.error.message || "Failed to close voting");
        return;
      }
      setCloseOpen(false);
      router.refresh();
    } catch {
      setAdminActionError("Something went wrong");
    } finally {
      setAdminActionLoading(false);
    }
  }

  // @spec VOTE-UI-CANCEL-002, VOTE-API-004
  async function handleCancelRound() {
    if (adminActionLoading) return;
    if (cancelConfirmText.trim().toLowerCase() !== "cancel") {
      setAdminActionError('Type "cancel" to confirm');
      return;
    }
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      const res = await fetch("/api/trpc/rounds.cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, roundId }),
      });
      const data = await res.json();
      if (data.error) {
        setAdminActionError(data.error.message || "Failed to cancel round");
        return;
      }
      setCancelOpen(false);
      setCancelConfirmText("");
      router.refresh();
    } catch {
      setAdminActionError("Something went wrong");
    } finally {
      setAdminActionLoading(false);
    }
  }

  return (
    <div data-testid="voting-phase" className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Main content */}
      <div className="min-w-0">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-ink-2">
              Approve up to {maxApprovals} book{maxApprovals !== 1 ? "s" : ""} you&rsquo;d be happy to read
            </p>
            {/* @spec VOTE-UI-PRIOR-VOTES-002 */}
            {initialVotes.length > 0 && !loading && (
              <span
                data-testid="prior-vote-hint"
                className="text-xs text-ink-3 italic"
              >
                You voted previously — tap a book to add or remove it, then save your changes.
              </span>
            )}
          </div>
          {/* Inline approval pill */}
          <div
            data-testid="approval-pill"
            className="flex items-center gap-2.5 px-3 py-1.5 bg-bg-soft border border-line rounded-full shrink-0"
          >
            <span className="text-xs text-ink-3">Picks</span>
            <span className="flex gap-1">
              {[...Array(maxApprovals)].map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full border-[1.5px] transition-all duration-150 ${
                    i < selected.length
                      ? "border-primary bg-primary"
                      : "border-line-strong bg-transparent"
                  }`}
                />
              ))}
            </span>
            <span className="font-[var(--font-mono)] text-[11px] text-ink-2 tabular-nums">
              {selected.length}/{maxApprovals}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 mb-6">
          {nominations.map((nom) => {
            const isSelected = selected.includes(nom.id);
            const isMaxed = selected.length >= maxApprovals && !isSelected;
            return (
              <button
                key={nom.id}
                type="button"
                onClick={() => toggleSelection(nom.id)}
                disabled={isMaxed}
                data-testid={`nomination-${nom.id}`}
                className={`w-full text-left p-4 rounded-[var(--radius-lg)] border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary-soft shadow-[0_0_0_3px_oklch(0.42_0.06_195/0.12)]"
                    : isMaxed
                      ? "border-line bg-bg-soft opacity-50 cursor-not-allowed"
                      : "border-line bg-bg hover:border-line-strong"
                }`}
              >
                <div className="grid grid-cols-[22px_auto_1fr] gap-4 items-center">
                  {/* Checkbox */}
                  <span
                    className={`w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-line-strong bg-bg"
                    }`}
                  >
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    )}
                  </span>
                  {/* Book cover */}
                  <BookCover title={nom.book.title} author={nom.book.author} coverUrl={nom.book.coverUrl} size="md" />
                  {/* Content */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{nom.book.title}</p>
                    <p className="text-xs text-ink-2 italic mb-1">by {nom.book.author} · nom. {nom.nominator.displayName.split(" ")[0]}</p>
                    {nom.pitch && (
                      <p className="text-xs text-ink-2 line-clamp-2">&ldquo;{nom.pitch}&rdquo;</p>
                    )}
                  </div>
                </div>
              </button>
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
              {closePreview && closePreview.totalVotes === 0 && (
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
                disabled={!closePreview || closePreview.totalVotes === 0}
                onClick={() => {
                  setAdminActionError("");
                  setCloseOpen(true);
                }}
                data-testid="close-voting-btn"
              >
                Close voting & reveal winner
              </Button>
            </div>
          </div>
        )}

        {closeOpen && closePreview && (
          <CloseVotingDialog
            preview={closePreview}
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
                      ? "border-primary bg-primary shadow-[0_0_0_3px_oklch(0.42_0.06_195/0.12)]"
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
            {voterCount}<span className="text-ink-3 text-sm ml-1">of {memberCount} have voted</span>
          </p>
          <p className="text-[11px] text-ink-3 mt-1.5">Tallies hidden until close</p>
        </Card>
      </aside>
    </div>
  );
}
