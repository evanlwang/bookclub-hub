"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface NonePhaseProps {
  clubId: string;
  isAdmin: boolean;
}

// @spec VOTE-API-001 — admin-only "Start your first round" state.
// Renders ONLY the start-new-round button (with optional deadline pickers).
// Critically, the nominate-modal trigger is suppressed here because
// `roundId === ""` would fail the `nominations.create` Zod uuid check.
export function NonePhase({ clubId, isAdmin }: NonePhaseProps) {
  const router = useRouter();
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  // @spec VOTE-UI-DEADLINE-NOM-001, VOTE-UI-DEADLINE-VOTE-001
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [nominationDeadline, setNominationDeadline] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("");

  // @spec VOTE-API-001, VOTE-UI-VOTE-DEADLINE-001
  async function handleStartNewRound() {
    setCreateLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = { clubId };
      if (nominationDeadline)
        body.nominationDeadline = new Date(nominationDeadline).toISOString();
      if (votingDeadline)
        body.votingDeadline = new Date(votingDeadline).toISOString();
      const res = await fetch("/api/trpc/rounds.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to create round");
      } else {
        setShowDeadlines(false);
        setNominationDeadline("");
        setVotingDeadline("");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  }

  if (!isAdmin) return null;
  return (
    <div data-testid="no-round-admin" className="mt-4 flex flex-col items-center gap-3">
      <button
        type="button"
        data-testid="toggle-deadline-config"
        onClick={() => setShowDeadlines((v) => !v)}
        className="text-xs text-ink-2 hover:text-ink hover:underline"
      >
        {showDeadlines ? "Hide deadlines" : "Configure deadlines"}
      </button>
      {showDeadlines && (
        <div
          data-testid="deadline-config"
          className="w-full max-w-md p-3 rounded-[var(--radius-md)] border border-line bg-bg-soft grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <label className="text-xs text-ink-2">
            Nomination deadline (optional)
            <input
              type="datetime-local"
              data-testid="nomination-deadline-input"
              value={nominationDeadline}
              onChange={(e) => setNominationDeadline(e.target.value)}
              className="mt-1 w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-2 py-1.5 text-ink"
            />
          </label>
          <label className="text-xs text-ink-2">
            Voting deadline (optional)
            <input
              type="datetime-local"
              data-testid="voting-deadline-input"
              value={votingDeadline}
              onChange={(e) => setVotingDeadline(e.target.value)}
              className="mt-1 w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-2 py-1.5 text-ink"
            />
          </label>
        </div>
      )}
      <Button
        variant="primary"
        size="md"
        loading={createLoading}
        onClick={handleStartNewRound}
        data-testid="start-new-round-btn"
        className="group shadow-[0_2px_10px_-2px_oklch(0.42_0.06_195/0.35)] hover:shadow-[0_6px_16px_-4px_oklch(0.42_0.06_195/0.5)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_2px_6px_-2px_oklch(0.42_0.06_195/0.4)]"
        iconRight={
          !createLoading && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )
        }
      >
        Start your first round
      </Button>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
