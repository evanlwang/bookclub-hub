"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, BookCover, Avatar } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";
import { NominateModal } from "./nominate-modal";
import { successMessage } from "@/lib/voting/prior-votes";
import {
  CloseVotingDialog,
  CancelRoundDialog,
  type ClosePreview,
} from "./close-voting-dialog";

type Nomination = {
  id: string;
  book: { id: string; title: string; author: string; openLibraryId?: string | null };
  nominator: { displayName: string };
  pitch?: string;
  createdAt?: string;
  voteCount?: number;
};

interface VoteRoundProps {
  clubId: string;
  roundId: string;
  status: string;
  nominations: Nomination[];
  maxApprovals: number;
  myVotes: string[];
  isAdmin: boolean;
  memberCount?: number;
  voterCount?: number;
  closePreview?: ClosePreview | null;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// @spec VOTE-UI-001, VOTE-UI-002, VOTE-UI-005, VOTE-UI-006, VOTE-UI-009, VOTE-API-002, VOTE-API-003, VOTE-API-008, VOTE-BE-003
export function VoteRound({
  clubId,
  roundId,
  status,
  nominations,
  maxApprovals,
  myVotes: initialVotes,
  isAdmin,
  memberCount = 0,
  voterCount = 0,
  closePreview = null,
}: VoteRoundProps) {
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
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);

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

  // @spec VOTE-API-001
  async function handleStartNewRound() {
    setCreateLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/rounds.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to create round");
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  }

  if (status === "voting") {
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
                    <BookCover title={nom.book.title} author={nom.book.author} size="sm" />
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

  if (status === "decided") {
    const winner = nominations[0];
    const maxVotes = Math.max(...nominations.map((n) => n.voteCount ?? 0), 1);

    return (
      <div data-testid="decided-phase">
        {/* Winner banner */}
        {winner && (
          <div
            className="rounded-[var(--radius-lg)] border p-8 mb-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.96 0.04 75) 0%, oklch(0.94 0.05 30) 100%)",
              borderColor: "oklch(0.85 0.06 60)",
            }}
          >
            <div className="absolute -top-5 -right-5 text-[200px] opacity-[0.06] font-[var(--font-display)] font-bold leading-none" style={{ color: "oklch(0.45 0.10 30)" }}>
              ✦
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-7 sm:items-center relative">
              <BookCover title={winner.book.title} author={winner.book.author} size="lg" />
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Badge tone="accent" dot>Winner</Badge>
                  <span className="font-[var(--font-mono)] text-[11px] text-[oklch(0.55_0.13_75)]">Round winner</span>
                </div>
                <h2 className="font-[var(--font-display)] text-[44px] font-semibold leading-tight tracking-tight mb-1" style={{ color: "oklch(0.25 0.05 60)" }}>
                  {winner.book.title}
                </h2>
                <p className="text-base italic mb-4" style={{ color: "oklch(0.40 0.04 60)" }}>
                  by {winner.book.author} · nominated by {winner.nominator.displayName}
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <span className="font-[var(--font-display)] text-[32px] font-semibold leading-none" style={{ color: "oklch(0.25 0.05 60)" }}>
                      {winner.voteCount ?? 0}
                    </span>
                    <span className="text-sm ml-1" style={{ color: "oklch(0.45 0.04 60)" }}>votes</span>
                  </div>
                </div>
                {/* @spec VOTE-UI-DEC-CTA-MEETING-001, VOTE-UI-DEC-CTA-OPENLIB-001 */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/clubs/${clubId}/meetings`}
                    data-testid="winner-cta-meeting"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] bg-primary text-bg text-sm font-medium hover:bg-primary-hover transition-colors"
                  >
                    Set up first meeting
                  </Link>
                  {winner.book.openLibraryId && (
                    <a
                      href={`https://openlibrary.org${winner.book.openLibraryId}`}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="winner-cta-openlib"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] border border-line-strong text-sm font-medium text-ink hover:bg-bg-soft transition-colors"
                      style={{ color: "oklch(0.30 0.05 60)" }}
                    >
                      View on Open Library
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17L17 7M7 7h10v10" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final tallies */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-[var(--font-display)] text-lg font-semibold">Final tallies</h3>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              loading={createLoading}
              onClick={handleStartNewRound}
              data-testid="start-new-round-btn"
            >
              Start new round
            </Button>
          )}
        </div>

        <Card className="divide-y divide-line">
          {nominations.map((nom, i) => (
            <div
              key={nom.id}
              className={`grid grid-cols-[32px_auto_1fr_auto] md:grid-cols-[40px_auto_1fr_180px_auto] gap-3 md:gap-4 items-center px-5 py-3.5 ${i === 0 ? "bg-[oklch(0.97_0.02_75)]" : ""}`}
            >
              <span className={`font-[var(--font-mono)] text-sm font-semibold ${i === 0 ? "text-accent-ink" : "text-ink-3"}`}>
                {i === 0 ? "①" : `0${i + 1}`}
              </span>
              <BookCover title={nom.book.title} author={nom.book.author} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{nom.book.title}</p>
                <p className="text-xs text-ink-3 italic">by {nom.book.author}</p>
              </div>
              <div className="hidden md:block h-1.5 bg-bg-sunken rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${i === 0 ? "bg-accent" : "bg-primary"}`}
                  style={{ width: `${((nom.voteCount ?? 0) / maxVotes) * 100}%` }}
                />
              </div>
              <div className="text-right min-w-[70px]">
                <span className="font-[var(--font-display)] text-lg font-semibold">{nom.voteCount ?? 0}</span>
                <span className="text-xs text-ink-3 ml-1">votes</span>
              </div>
            </div>
          ))}
        </Card>

        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </div>
    );
  }

  // @spec VOTE-API-002, VOTE-API-003
  async function handleAdvanceRound() {
    setCreateLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/rounds.advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, roundId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to advance round");
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div data-testid="nominating-phase">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-ink-2">
          {nominations.length} nomination{nominations.length !== 1 ? "s" : ""} so far. Anyone can nominate.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsNominateModalOpen(true)}
          data-testid="search-and-nominate-btn"
          className="inline-flex items-center gap-2"
        >
          <SearchIcon size={16} />
          Search & nominate a book
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {nominations.map((nom) => (
          <Card key={nom.id} className="p-5">
            <div className="grid grid-cols-[auto_1fr] gap-5">
              <BookCover title={nom.book.title} author={nom.book.author} size="md" />
              <div>
                <p className="font-[var(--font-display)] text-[19px] font-semibold tracking-tight text-ink">{nom.book.title}</p>
                <p className="text-sm text-ink-2 italic mb-2.5">by {nom.book.author}</p>
                {nom.pitch && (
                  <p className="text-sm text-ink-2 leading-relaxed mb-3">
                    &ldquo;{nom.pitch}&rdquo;
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Avatar name={nom.nominator.displayName} size="sm" />
                  <span className="text-xs text-ink-3">
                    Nominated by <strong className="text-ink-2">{nom.nominator.displayName}</strong>
                    {nom.createdAt && ` · ${relativeTime(nom.createdAt)}`}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-6 flex gap-3 items-center">
          <Button
            variant="primary"
            size="md"
            loading={createLoading}
            disabled={nominations.length < 2}
            onClick={handleAdvanceRound}
            data-testid="advance-round-btn"
          >
            Advance to Voting
          </Button>
          {nominations.length < 2 && (
            <span className="text-xs text-ink-3 self-center">Needs at least 2 nominations</span>
          )}
          {/* @spec VOTE-UI-CANCEL-002 */}
          <Button
            variant="ghost"
            size="md"
            className="ml-auto"
            onClick={() => {
              setAdminActionError("");
              setCancelOpen(true);
            }}
            data-testid="cancel-round-btn"
          >
            Cancel round
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger mt-2">{error}</p>}

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

      <NominateModal
        isOpen={isNominateModalOpen}
        onClose={() => setIsNominateModalOpen(false)}
        clubId={clubId}
        roundId={roundId}
        onNominationSuccess={() => router.refresh()}
      />
    </div>
  );
}
