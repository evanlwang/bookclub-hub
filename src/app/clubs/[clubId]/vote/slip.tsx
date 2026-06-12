// @spec VOTE-UI-SLIP-001, VOTE-UI-SLIPFOLD-001 — recommendation slips (cozy
// redesign): a paper slip per nomination with the pitch on a slightly rotated
// inset card. In the voting phase, tapping a slip dog-ears a 44px corner fold
// instead of ticking a checkbox.
"use client";

import { Avatar, BookCover } from "@/components/ui";
import { relativeTime, type Nomination } from "./vote-round-types";

/** The big dog-ear fold on a slip card — scales in/out on toggle. */
export function SlipFold({ folded }: { folded: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 z-[2] h-11 w-11"
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-tr-[var(--radius-lg)] origin-top-right transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ transform: folded ? "scale(1)" : "scale(0)" }}
      >
        {/* the page revealed beneath */}
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[44px] border-t-bg border-l-[44px] border-l-transparent" />
        {/* the folded terracotta flap */}
        <div className="absolute top-0 right-0 w-0 h-0 border-b-[44px] border-b-primary border-r-[44px] border-r-transparent drop-shadow-[-2px_2px_3px_rgba(96,64,32,0.3)]" />
      </div>
    </div>
  );
}

export function Slip({
  nom,
  selectable = false,
  selected = false,
  disabled = false,
  onToggle,
  rank,
  votes,
  maxVotes,
  testId,
}: {
  nom: Nomination;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  /** 1-based rank badge for decided tallies (1 = amber winner). */
  rank?: number;
  /** Vote tally + denominator — renders the result bar on decided slips. */
  votes?: number;
  maxVotes?: number;
  testId?: string;
}) {
  const inner = (
    <>
      {selectable && <SlipFold folded={selected} />}
      {rank != null && (
        <span
          className={`absolute -top-2 -left-1.5 z-[2] flex h-[26px] w-[26px] items-center justify-center rounded-full font-[var(--font-display)] text-[13px] font-extrabold shadow-sm ${
            rank === 1 ? "bg-accent text-ink" : "bg-bg-sunken text-ink-2"
          }`}
        >
          {rank}
        </span>
      )}
      <BookCover
        title={nom.book.title}
        author={nom.book.author}
        coverUrl={nom.book.coverUrl}
        isbn={nom.book.isbn}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`font-[var(--font-display)] text-base font-extrabold leading-[1.15] text-ink ${
            selectable ? "pr-8" : ""
          }`}
        >
          {nom.book.title}
        </p>
        <p className="font-[var(--font-display)] text-xs font-semibold text-ink-3 mt-px">
          {nom.book.author}
        </p>
        {nom.pitch && (
          <div className="mt-2 -rotate-[0.5deg] rounded-[10px] border border-line bg-bg px-2.5 py-2">
            <p className="font-[var(--font-serif)] text-sm italic leading-snug text-ink">
              &ldquo;{nom.pitch}&rdquo;
            </p>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar name={nom.nominator.displayName} size="sm" decorative />
          <span className="font-[var(--font-display)] text-[11.5px] font-bold text-ink-3">
            {nom.nominator.displayName}
            {nom.createdAt && ` · ${relativeTime(nom.createdAt)}`}
          </span>
          {votes != null && maxVotes != null && maxVotes > 0 && (
            <span className="ml-1.5 flex min-w-0 flex-1 items-center gap-1.5">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                <span
                  className={`block h-full rounded-full ${rank === 1 ? "bg-accent" : "bg-primary"}`}
                  style={{ width: `${(votes / maxVotes) * 100}%` }}
                />
              </span>
              <span className="font-[var(--font-display)] text-xs font-extrabold text-primary tabular-nums">
                {votes}
              </span>
            </span>
          )}
        </div>
      </div>
    </>
  );

  const surface = `relative flex gap-3.5 rounded-[var(--radius-lg)] bg-bg-soft p-3.5 text-left border-2 transition-all duration-150 ${
    selected
      ? "border-primary shadow-lg"
      : "border-transparent shadow-md"
  }`;

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        data-testid={testId}
        className={`${surface} w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div data-testid={testId} className={surface}>
      {inner}
    </div>
  );
}
