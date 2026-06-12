// @spec PROG-DASH-LIVE-001, PROG-UI-DASH-003, PROG-UI-DASH-006, PROG-UI-DASH-007, PROG-UI-DASH-008, PROG-UI-DASH-009, PROG-UI-DASH-010, PROG-UI-DASH-011, PROG-UI-DASH-012, PROG-UI-DASH-013, PROG-DASH-MEDIAN-001, PROG-DASH-UPDATED-001
"use client";

import { Card, Badge, ProgressBar, Avatar } from "@/components/ui";
import { medianOfReading } from "@/lib/progress/median";
import { relativeTimeShort } from "@/lib/progress/relative-time";
import { trpc } from "@/trpc/react-hooks";
import { useLiveQueryOptions } from "@/lib/hooks/use-live-query";
import { DogEarCorner } from "./bookmark";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ProgressDashboardProps {
  clubId: string;
  bookId: string;
  /** RSC-fetched seed (dates ISO-stringified) for the polled progress.list query. */
  initialProgress: any[];
}

// @spec PROG-DASH-LIVE-001 — other members' rows and the aggregate summary
// render from a polled `progress.list` query (60s, RSC-seeded), refreshed
// in place under stable userId keys so row animations don't replay on
// background refetches.
export function ProgressDashboard({
  clubId,
  bookId,
  initialProgress,
}: ProgressDashboardProps) {
  const progressQuery = trpc.progress.list.useQuery(
    { clubId, bookId },
    {
      initialData: initialProgress,
      ...useLiveQueryOptions({ intervalMs: 60_000 }),
    },
  );
  const progress: any[] = progressQuery.data ?? initialProgress;

  if (progress.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p data-testid="no-progress" className="text-ink-3 text-sm">
          No progress tracked yet.
        </p>
      </Card>
    );
  }

  const sorted = [...progress].sort(
    (a: any, b: any) => (b.percentage ?? 0) - (a.percentage ?? 0)
  );

  const finished = progress.filter((p: any) => p.status === "finished").length;
  const reading = progress.filter((p: any) => p.status === "reading").length;
  const notStarted = progress.filter((p: any) => p.status === "not_started").length;
  // @spec PROG-DASH-MEDIAN-001
  // Median is computed over members who have started reading. Including
  // not_started zeros made the headline number misleading when a club was
  // mid-cycle and several members hadn't picked up the book yet.
  const median = medianOfReading(
    progress.map((p: any) => ({
      percentage: p.percentage ?? 0,
      status: p.status ?? "not_started",
    }))
  );
  const startedCount = reading + finished;

  return (
    <>
      <Card className="relative p-6 mb-6">
        <DogEarCorner />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div data-testid="progress-ring" className="relative w-[100px] h-[100px] flex-shrink-0">
            <svg width="100" height="100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-bg-sunken)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="var(--color-primary)" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - median / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span data-testid="ring-percentage" className="font-[var(--font-display)] text-2xl font-semibold text-ink">
                {median}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            {/* @spec PROG-DASH-MEDIAN-001 */}
            <p data-testid="progress-summary" className="text-sm text-ink-2 mb-3">
              {startedCount > 0
                ? `median ${median}% across ${startedCount} reading`
                : "No one has started yet"}
              {notStarted > 0 && ` · ${notStarted} not started`}
              {finished > 0 && ` · ${finished} finished`}
            </p>

            <div data-testid="distribution-bar" className="flex rounded-full overflow-hidden h-3 mb-2.5 gap-0.5 bg-bg-sunken">
              {finished > 0 && (
                <div style={{ width: `${(finished / progress.length) * 100}%` }} className="bg-accent" />
              )}
              {reading > 0 && (
                <div style={{ width: `${(reading / progress.length) * 100}%` }} className="bg-primary" />
              )}
              {notStarted > 0 && (
                <div style={{ width: `${(notStarted / progress.length) * 100}%` }} className="bg-bg-sunken" />
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span data-testid="legend-finished" className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-accent" />
                Finished <strong className="text-ink">{finished}</strong>
              </span>
              <span data-testid="legend-reading" className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-primary" />
                Reading <strong className="text-ink">{reading}</strong>
              </span>
              <span data-testid="legend-not-started" className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-ink-4" />
                Not started <strong className="text-ink">{notStarted}</strong>
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-ink">Where everyone is</h2>
        <span className="text-xs text-ink-3">Sorted by progress</span>
      </div>

      <Card className="divide-y divide-line">
        <ul data-testid="progress-list">
          {sorted.map((p: any, i: number) => (
            <li
              key={p.userId}
              data-testid={`progress-${p.userId}`}
              className="flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-3.5"
            >
              <Avatar
                name={p.user?.displayName ?? ""}
                size="md"
              />
              <div className="min-w-0 flex-1 sm:flex-none sm:w-40">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-ink truncate">
                    {p.user?.displayName ?? "Member"}
                  </span>
                  {p.status === "finished" && (
                    <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-accent text-ink shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-3 mt-0.5">
                  {p.status === "not_started"
                    ? "Not started yet"
                    : p.status === "finished"
                      ? `Finished · ${p.totalPages ?? p.currentPage ?? ""} pages`
                      : `Page ${p.currentPage ?? 0}${p.currentChapter != null ? ` · ch. ${p.currentChapter}` : ""}`}
                </p>
                {/* @spec PROG-DASH-UPDATED-001 */}
                {p.updatedAt && p.status !== "not_started" && (
                  <time
                    data-testid={`progress-updated-${p.userId}`}
                    dateTime={new Date(p.updatedAt).toISOString()}
                    title={new Date(p.updatedAt).toLocaleString("en-US")}
                    className="text-[11px] text-ink-3"
                  >
                    Updated {relativeTimeShort(p.updatedAt)}
                  </time>
                )}
              </div>
              <div className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1 sm:min-w-0">
                <ProgressBar
                  percentage={p.percentage ?? 0}
                  status={p.status ?? "not_started"}
                  animate
                  delay={i * 60}
                />
              </div>
              <div className="text-right w-14 ml-auto sm:ml-0">
                <span className="font-[var(--font-display)] text-lg font-semibold tabular-nums">{p.percentage ?? 0}</span>
                <span className="text-ink-3 text-sm">%</span>
              </div>
              {p.status === "finished" && (
                <span data-testid="badge-finished"><Badge tone="accent">Done</Badge></span>
              )}
              {p.status === "reading" && (
                <span data-testid="badge-reading"><Badge tone="primary" dot>Reading</Badge></span>
              )}
              {p.status === "not_started" && (
                <span data-testid="badge-not-started"><Badge tone="neutral">Waiting</Badge></span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
