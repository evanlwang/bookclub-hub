"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Badge, BookCover } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";
import { Slip } from "./slip";
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
      {/* The "Now reading" shelf moment — amber wash, centered cover resting
          on an ink shelf. @spec VOTE-UI-DEC-CTA-MEETING-001, VOTE-UI-DEC-CTA-OPENLIB-001 */}
      {winner && (
        <>
          <div
            className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line shadow-md px-4 pt-6 pb-0 text-center"
            style={{
              background:
                "linear-gradient(180deg, var(--color-accent-soft), var(--color-bg-soft) 75%)",
            }}
          >
            <Badge tone="accent" dot>Now reading</Badge>
            <h2 className="font-[var(--font-display)] text-[23px] font-extrabold leading-tight tracking-tight text-ink mt-2.5 mb-0.5 break-words">
              {winner.book.title}
            </h2>
            <p className="font-[var(--font-serif)] italic text-[15px] text-ink-2 m-0">
              {winner.book.author} · {winner.voteCount ?? 0} approval vote{(winner.voteCount ?? 0) === 1 ? "" : "s"} · nominated by {winner.nominator.displayName}
            </p>
            <div className="flex justify-center mt-3.5">
              <BookCover title={winner.book.title} author={winner.book.author} coverUrl={winner.book.coverUrl} size="md" />
            </div>
            {/* the shelf */}
            <div className="h-3 -mx-4 rounded-t bg-ink shadow-[0_-3px_8px_rgba(96,64,32,0.18)]" />
          </div>
          <div className="flex gap-2 mt-3 mb-6">
            <Link
              href={`/clubs/${clubId}/meetings`}
              data-testid="winner-cta-meeting"
              className="flex-1 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-bg shadow-[0_2px_0_var(--color-primary-hover)] hover:bg-primary-hover transition-colors"
            >
              Set up first meeting
            </Link>
            {winner.book.openLibraryId && (
              <a
                href={`https://openlibrary.org${winner.book.openLibraryId}`}
                target="_blank"
                rel="noreferrer"
                data-testid="winner-cta-openlib"
                className="inline-flex items-center gap-1 justify-center rounded-full bg-bg-soft px-4 py-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-primary shadow-[inset_0_0_0_2px_var(--color-primary-soft)] hover:shadow-[inset_0_0_0_2px_var(--color-primary)] transition-all"
              >
                Open Library ↗
              </a>
            )}
          </div>
        </>
      )}

      {/* Final tallies */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <h3 className="font-[var(--font-display)] text-[19px] font-extrabold">Final tallies</h3>
        {isAdmin && (
          <div className="flex flex-col items-end gap-1.5">
            <Button
              variant="primary"
              size="md"
              loading={createRound.isPending}
              onClick={handleStartNewRound}
              data-testid="start-new-round-btn"
              className="group"
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

      {/* @spec DENSITY-VOTE-001 — ranked slips with vote bars stack cleanly
          at any width; the rank badge marks the winner in amber. */}
      <div className="flex flex-col gap-2.5">
        {nominations.map((nom, i) => (
          <Slip
            key={nom.id}
            nom={nom}
            rank={i + 1}
            votes={nom.voteCount ?? 0}
            maxVotes={maxVotes}
          />
        ))}
      </div>

      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </div>
  );
}
