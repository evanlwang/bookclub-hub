"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";

type Nomination = {
  id: string;
  book: { title: string; author: string };
  nominator: { displayName: string };
  pitch?: string;
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

  function toggleSelection(nominationId: string) {
    setSelected((prev) => {
      if (prev.includes(nominationId)) {
        return prev.filter((id) => id !== nominationId);
      }
      if (prev.length >= maxApprovals) return prev;
      return [...prev, nominationId];
    });
  }

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
          Select up to {maxApprovals} book{maxApprovals !== 1 ? "s" : ""}
        </p>

        <div className="space-y-2 mb-6">
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
                    ? "border-primary bg-primary-soft"
                    : isMaxed
                      ? "border-line bg-bg-soft opacity-50 cursor-not-allowed"
                      : "border-line bg-bg hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {nom.book.title}
                    </p>
                    <p className="text-xs text-ink-3">
                      {nom.book.author} · nominated by {nom.nominator.displayName}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </div>
                  )}
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
    return (
      <div data-testid="decided-phase">
        {nominations.map((nom) => (
          <Card key={nom.id} className="p-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{nom.book.title}</p>
                <p className="text-xs text-ink-3">{nom.book.author}</p>
              </div>
              {nom.voteCount != null && (
                <Badge tone="neutral">{nom.voteCount} votes</Badge>
              )}
            </div>
          </Card>
        ))}
        {isAdmin && (
          <div className="mt-6">
            <Button
              variant="secondary"
              size="md"
              loading={createLoading}
              onClick={handleStartNewRound}
              data-testid="start-new-round-btn"
            >
              Start New Round
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </div>
    );
  }

  // Nominating phase
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
      <p className="text-sm text-ink-2 mb-4">
        Members are nominating books for this round. {nominations.length} nomination{nominations.length !== 1 ? "s" : ""} so far.
      </p>
      <div className="space-y-3 mb-6">
        {nominations.map((nom) => (
          <Card key={nom.id} className="p-4">
            <p className="text-sm font-medium text-ink">{nom.book.title}</p>
            <p className="text-xs text-ink-3 mt-0.5">
              by {nom.book.author}
            </p>
            {nom.pitch && (
              <p className="text-xs text-ink-2 mt-2 italic">&ldquo;{nom.pitch}&rdquo;</p>
            )}
            <p className="text-xs text-ink-3 mt-2">
              Nominated by <strong className="text-ink-2">{nom.nominator.displayName}</strong>
            </p>
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
