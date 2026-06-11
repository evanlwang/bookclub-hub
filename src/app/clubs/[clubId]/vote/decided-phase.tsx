"use client";

/* eslint-disable no-restricted-syntax --
 * The winner banner (lines ~60-90) and the Open-Library CTA color (~107) use
 * page-private warm gradients/inks specifically designed to celebrate the
 * round winner. These colors are intentionally not promoted to global tokens
 * (they're not reused anywhere else and the celebratory palette is unique to
 * this page). DSYS-TOKEN-003 exemption documented per VOTE-UI-DECIDED-WINNER-BANNER intent.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Badge, BookCover } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";
import type { Nomination } from "./vote-round-types";

interface DecidedPhaseProps {
  clubId: string;
  nominations: Nomination[];
  isAdmin: boolean;
}

// @spec VOTE-UI-001, VOTE-UI-005, VOTE-API-002, VOTE-API-003, DENSITY-VOTE-001
export function DecidedPhase({ clubId, nominations, isAdmin }: DecidedPhaseProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  // @spec VOTE-UI-DEADLINE-NOM-001, VOTE-UI-DEADLINE-VOTE-001
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [nominationDeadline, setNominationDeadline] = useState("");
  const [votingDeadline, setVotingDeadline] = useState("");

  // @spec VOTE-API-001, VOTE-UI-VOTE-DEADLINE-001
  const createRound = trpc.rounds.create.useMutation({
    onSuccess: () => {
      setShowDeadlines(false);
      setNominationDeadline("");
      setVotingDeadline("");
      void utils.rounds.list.invalidate({ clubId });
      router.refresh();
    },
    onError: (err) => {
      setError(err.message || "Failed to create round");
    },
  });

  function handleStartNewRound() {
    setError("");
    createRound.mutate({
      clubId,
      ...(nominationDeadline
        ? { nominationDeadline: new Date(nominationDeadline) }
        : {}),
      ...(votingDeadline
        ? { votingDeadline: new Date(votingDeadline) }
        : {}),
    });
  }

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
            <BookCover title={winner.book.title} author={winner.book.author} coverUrl={winner.book.coverUrl} size="xl" />
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Badge tone="accent" dot>Winner</Badge>
                <span className="font-[var(--font-mono)] text-[11px] text-accent-ink">Round winner</span>
              </div>
              <h2 className="font-[var(--font-display)] text-[32px] sm:text-[44px] font-semibold leading-tight tracking-tight mb-1 break-words" style={{ color: "oklch(0.25 0.05 60)" }}>
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
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <h3 className="font-[var(--font-display)] text-lg font-semibold">Final tallies</h3>
        {isAdmin && (
          <div className="flex flex-col items-end gap-1.5">
            <Button
              variant="primary"
              size="md"
              loading={createRound.isPending}
              onClick={handleStartNewRound}
              data-testid="start-new-round-btn"
              className="group shadow-[0_2px_10px_-2px_oklch(0.42_0.06_195/0.35)] hover:shadow-[0_6px_16px_-4px_oklch(0.42_0.06_195/0.5)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_2px_6px_-2px_oklch(0.42_0.06_195/0.4)]"
              iconRight={
                !createRound.isPending && (
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
              Start new round
            </Button>
            <button
              type="button"
              data-testid="toggle-deadline-config"
              onClick={() => setShowDeadlines((v) => !v)}
              className="text-[11px] text-ink-3 hover:text-ink-2 hover:underline tracking-wide"
            >
              {showDeadlines ? "Hide deadlines" : "Configure deadlines"}
            </button>
          </div>
        )}
      </div>
      {/* @spec VOTE-UI-DEADLINE-NOM-001, VOTE-UI-DEADLINE-VOTE-001 */}
      {isAdmin && showDeadlines && (
        <div
          data-testid="deadline-config"
          className="mb-3 p-3 rounded-[var(--radius-md)] border border-line bg-bg-soft grid grid-cols-1 sm:grid-cols-2 gap-3"
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
          <p className="text-[11px] text-ink-3 sm:col-span-2">
            When set, the system emails non-voters 24h before the voting deadline (`VOTE-NOTIFY-003`).
          </p>
        </div>
      )}

      <Card className="divide-y divide-line">
        {nominations.map((nom, i) => (
          <div
            key={nom.id}
            className={`grid grid-cols-[22px_auto_1fr_auto] md:grid-cols-[40px_auto_1fr_180px_auto] gap-2.5 md:gap-4 items-center px-3 py-3 sm:px-5 sm:py-3.5 ${i === 0 ? "bg-accent-soft" : ""}`}
          >
            <span className={`font-[var(--font-mono)] text-sm font-semibold ${i === 0 ? "text-accent-ink" : "text-ink-3"}`}>
              {i === 0 ? "①" : `0${i + 1}`}
            </span>
            <BookCover title={nom.book.title} author={nom.book.author} coverUrl={nom.book.coverUrl} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{nom.book.title}</p>
              <p className="text-xs text-ink-3 italic truncate">by {nom.book.author}</p>
            </div>
            <div className="hidden md:block h-1.5 bg-bg-sunken rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${i === 0 ? "bg-accent" : "bg-primary"}`}
                style={{ width: `${((nom.voteCount ?? 0) / maxVotes) * 100}%` }}
              />
            </div>
            <div className="text-right">
              <span className="font-[var(--font-display)] text-lg font-semibold">{nom.voteCount ?? 0}</span>
              <span className="text-xs text-ink-3 ml-1 hidden sm:inline">votes</span>
            </div>
          </div>
        ))}
      </Card>

      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
