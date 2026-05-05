"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, BookCover, Avatar } from "@/components/ui";

type Nomination = {
  id: string;
  book: { title: string; author: string };
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

// @spec VOTE-UI-001, VOTE-UI-002, VOTE-UI-004, VOTE-UI-006, VOTE-UI-007, VOTE-UI-008, VOTE-UI-010, VOTE-API-008, VOTE-BE-003, VOTE-API-002, VOTE-API-003
export function VoteRound({
  clubId,
  roundId,
  status,
  nominations,
  maxApprovals,
  myVotes: initialVotes,
  isAdmin,
}: VoteRoundProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialVotes);
  const [hasVoted, setHasVoted] = useState(initialVotes.length > 0);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");

  // @spec VOTE-BE-003
  function toggleSelection(nominationId: string) {
    setSelected((prev) => {
      if (prev.includes(nominationId)) {
        return prev.filter((id) => id !== nominationId);
      }
      if (prev.length >= maxApprovals) return prev;
      return [...prev, nominationId];
    });
  }

  // @spec VOTE-API-008
  async function handleSubmitVotes() {
    setLoading(true);
    setError("");
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
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
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
      <div data-testid="voting-phase">
        <p className="text-sm text-ink-2 mb-4">
          Approve up to {maxApprovals} book{maxApprovals !== 1 ? "s" : ""} you&rsquo;d be happy to read
        </p>

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

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={selected.length === 0}
          onClick={handleSubmitVotes}
          data-testid="submit-votes-btn"
        >
          {hasVoted
            ? `✓ Voted — Update ${selected.length}?`
            : `Submit ${selected.length} vote${selected.length !== 1 ? "s" : ""}`}
        </Button>

        {hasVoted && !loading && (
          <p className="text-xs text-success text-center mt-2 animate-fade-in" data-testid="vote-success">
            ✓ Your votes have been recorded
          </p>
        )}
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
            <div className="grid grid-cols-[auto_1fr] gap-7 items-center relative">
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
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-[var(--font-display)] text-[32px] font-semibold leading-none" style={{ color: "oklch(0.25 0.05 60)" }}>
                      {winner.voteCount ?? 0}
                    </span>
                    <span className="text-sm ml-1" style={{ color: "oklch(0.45 0.04 60)" }}>votes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final tallies */}
        <div className="flex items-center justify-between mb-3">
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
            <div key={nom.id} className={`grid grid-cols-[40px_auto_1fr_180px_auto] gap-4 items-center px-5 py-3.5 ${i === 0 ? "bg-[oklch(0.97_0.02_75)]" : ""}`}>
              <span className={`font-[var(--font-mono)] text-sm font-semibold ${i === 0 ? "text-accent-ink" : "text-ink-3"}`}>
                {i === 0 ? "①" : `0${i + 1}`}
              </span>
              <BookCover title={nom.book.title} author={nom.book.author} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{nom.book.title}</p>
                <p className="text-xs text-ink-3 italic">by {nom.book.author}</p>
              </div>
              <div className="h-1.5 bg-bg-sunken rounded-full overflow-hidden">
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
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm text-ink-2">
          {nominations.length} nomination{nominations.length !== 1 ? "s" : ""} so far. Anyone can nominate.
        </p>
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
        <div className="mt-6 flex gap-3">
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
        </div>
      )}
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
