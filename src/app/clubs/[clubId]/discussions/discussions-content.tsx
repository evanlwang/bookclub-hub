// @spec DISC-UI-001, DISC-UI-002, DISC-UI-003, DISC-UI-005, DISC-UI-011, DISC-UI-FETCH-PARALLEL-001
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, ChapterChip, Avatar, Badge } from "@/components/ui";
import { CreateThreadButton } from "./create-thread";
import { MarkDiscussionsVisited } from "./mark-visited";
import { trpc } from "@/trpc/react-hooks";
import "./discussions.css";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface DiscussionsContentProps {
  clubId: string;
  currentBookId: string;
  /**
   * Server-derived spoiler cutoff (deriveSpoilerCutoff in the page RSC) —
   * fail-safe 0 when the viewer has no recorded chapter, per
   * DISC-LIB-CUTOFF-FAILSAFE-001 / DISC-UI-PROGRESS-AUTOFILTER-002.
   */
  initialCutoff: number;
}

// @spec DISC-UI-FETCH-PARALLEL-001 — the current book and spoiler cutoff
// arrive as props from the page RSC, so `threads.list` is the only request
// this component makes (the old selections → progress → threads waterfall
// is gone).
export function DiscussionsContent({
  clubId,
  currentBookId,
  initialCutoff,
}: DiscussionsContentProps) {
  const [maxChapter, setMaxChapter] = useState<number | null>(initialCutoff);
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<"recent" | "comments">("recent");

  const threadsQuery = trpc.threads.list.useQuery({
    clubId,
    bookId: currentBookId,
    sort,
    ...(maxChapter !== null && !showAll ? { maxChapter } : {}),
  });

  const threads = threadsQuery.data?.threads ?? [];
  const hiddenCount = threadsQuery.data?.hiddenCount ?? 0;
  const threadsLoaded = threadsQuery.isSuccess;
  const error = threadsQuery.error?.message ?? "";

  return (
    <>
      <MarkDiscussionsVisited clubId={clubId} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-6">
        {/* Main column */}
        <div className="min-w-0">
          {error && (
            <p data-testid="discussions-error" className="text-danger text-sm mb-4" role="alert">
              {error}
            </p>
          )}

          {/* Spoiler bar — terracotta-tint, bookmark voice. @spec DISC-UI-SPOILERBAR-001 */}
          <Card
            data-testid="chapter-filter"
            className="p-3.5 mb-4 bg-primary-soft border-primary/15"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span aria-hidden="true" className="text-[15px]">🔖</span>
              <label className="flex items-center gap-2 font-[var(--font-display)] text-[13.5px] font-extrabold text-primary-ink">
                <span>You&rsquo;re on chapter</span>
                <input
                  type="number"
                  value={maxChapter ?? ""}
                  onChange={(e) => {
                    setShowAll(false);
                    setMaxChapter(e.target.value ? Number(e.target.value) : null);
                  }}
                  data-testid="max-chapter-input"
                  className="w-16 text-center font-[var(--font-mono)] text-sm font-bold h-8 bg-bg-soft border-2 border-line-strong rounded-[10px] px-2 py-1 text-ink focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
                  placeholder="—"
                  aria-label="Your current chapter"
                />
                <span>— later notes stay tucked away</span>
              </label>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[13.5px]">
              {hiddenCount > 0 && !showAll ? (
                <p data-testid="hidden-count" className="m-0 font-[var(--font-serif)] italic text-ink-2">
                  {hiddenCount} note{hiddenCount !== 1 ? "s" : ""} waiting past your bookmark
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    data-testid="show-all-btn"
                    className="ml-2 font-[var(--font-display)] not-italic font-extrabold text-[12.5px] text-primary underline"
                  >
                    Show all anyway
                  </button>
                </p>
              ) : showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="font-[var(--font-display)] font-extrabold text-[12.5px] text-primary underline"
                >
                  Hide spoilers again
                </button>
              ) : (
                <span className="font-[var(--font-serif)] italic text-ink-2">All notes visible</span>
              )}
            </div>
          </Card>

          {/* Sort pills + New note */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                data-testid="sort-recent"
                onClick={() => setSort("recent")}
                className={`min-h-[32px] rounded-full px-3.5 py-1.5 font-[var(--font-display)] text-[12.5px] font-extrabold shadow-sm transition-colors ${
                  sort === "recent" ? "bg-ink text-bg" : "bg-bg-soft text-ink-2"
                }`}
              >
                Recent
              </button>
              <button
                type="button"
                data-testid="sort-comments"
                onClick={() => setSort("comments")}
                className={`min-h-[32px] rounded-full px-3.5 py-1.5 font-[var(--font-display)] text-[12.5px] font-extrabold shadow-sm transition-colors ${
                  sort === "comments" ? "bg-ink text-bg" : "bg-bg-soft text-ink-2"
                }`}
              >
                Most replies
              </button>
            </div>
            <CreateThreadButton
              clubId={clubId}
              bookId={currentBookId}
              onCreated={() => {
                void threadsQuery.refetch();
              }}
            />
          </div>

          {/* Thread list — single Card with internal hairline rows */}
          {/* @spec DISC-UI-PAGE-EMPTY-001, DISC-UI-PAGE-EMPTY-SPOILER-001 */}
          {!threadsLoaded ? (
            <ThreadListSkeleton compact />
          ) : threads.length === 0 && hiddenCount > 0 && !showAll ? (
            <Card
              className="p-10 text-center"
              data-testid="empty-state-spoiler"
            >
              <p className="text-ink text-sm font-medium mb-2">
                {hiddenCount} thread{hiddenCount !== 1 ? "s" : ""} hidden by your
                spoiler filter
              </p>
              <p className="text-ink-3 text-[13px] mb-4 max-w-md mx-auto leading-snug">
                You&rsquo;re currently on{" "}
                <strong className="text-ink-2 font-medium">
                  chapter {maxChapter ?? 0}
                </strong>
                . Update your chapter above to see more, or reveal everything if
                you don&rsquo;t mind spoilers.
              </p>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                data-testid="empty-state-show-all-btn"
                className="text-sm text-primary hover:underline underline-offset-2"
              >
                Show all anyway
              </button>
            </Card>
          ) : threads.length === 0 ? (
            <Card className="p-10 text-center" data-testid="empty-state-none">
              <p className="text-ink-3 text-sm">
                No discussions yet — start one with the button above.
              </p>
            </Card>
          ) : (
            <ul data-testid="threads-list" className="flex flex-col gap-3">
              {threads.map((thread, i) => (
                <li
                  key={thread.id}
                  data-testid={`thread-${thread.id}`}
                  data-pinned={thread.isPinned ? "true" : "false"}
                  style={{
                    transform: thread.isPinned
                      ? "none"
                      : `rotate(${i % 2 === 0 ? -0.6 : 0.5}deg)`,
                  }}
                >
                  <Link
                    href={`/clubs/${clubId}/discussions/${thread.id}`}
                    className={`block rounded-[var(--radius-lg)] border px-4 py-3.5 shadow-md transition-shadow hover:shadow-lg ${
                      thread.isPinned
                        ? "bg-accent-soft border-accent/20"
                        : "bg-bg-soft border-line"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.chapterTag ? (
                        <span data-testid="chapter-tag">
                          <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                        </span>
                      ) : (
                        <Badge tone="neutral">No tag</Badge>
                      )}
                      {/* @spec DISC-UI-PIN-VISUAL-001 */}
                      {thread.isPinned && <Badge tone="accent">Pinned</Badge>}
                      {thread.commentCount != null && (
                        <span className="ml-auto rounded-full bg-primary-soft px-2.5 py-0.5 font-[var(--font-display)] text-xs font-extrabold text-primary tabular-nums">
                          {thread.commentCount}
                        </span>
                      )}
                    </div>

                    {thread.body && (
                      <p
                        data-testid="thread-body-preview"
                        className="font-[var(--font-serif)] text-sm leading-[1.45] text-ink-2 mt-2 mb-0 line-clamp-2"
                      >
                        {thread.body}
                      </p>
                    )}

                    {thread.author && (
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <Avatar name={thread.author.displayName} size="sm" decorative />
                        <span className="font-[var(--font-display)] text-[11.5px] font-bold text-ink-3">
                          {thread.author.displayName}
                          {thread.createdAt && ` · ${relativeTime(String(thread.createdAt))}`}
                        </span>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sidebar — reading-position context + tagging tip */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-6 self-start">
          <Card className="p-[18px]">
            <div className="font-[var(--font-display)] text-base font-semibold text-ink mb-1.5">
              Your reading
            </div>
            <p className="text-[13px] text-ink-2 leading-snug mb-3">
              {maxChapter != null ? (
                <>
                  You said you&rsquo;re on{" "}
                  <strong className="text-ink font-medium">chapter {maxChapter}</strong>.
                </>
              ) : (
                <>Set a chapter above to filter spoilers ahead of where you are.</>
              )}
            </p>
            <p className="text-[11px] text-ink-3">
              Threads tagged with a later chapter are hidden by default.
            </p>
          </Card>
          <Card className="p-[18px] bg-bg-soft border-line">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5" aria-hidden="true">📖</span>
              <p className="text-xs text-ink-2 leading-relaxed">
                <strong className="text-ink">Tagging tip:</strong> use the latest chapter your post
                mentions. Untagged threads are visible to everyone.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function ThreadListSkeleton({ compact = false }: { compact?: boolean }) {
  const rows = compact ? 4 : 5;
  return (
    <div data-testid="loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading discussions…</span>
      <Card className="p-0 overflow-hidden">
        <ul>
          {Array.from({ length: rows }).map((_, i) => (
            <li key={i} className={`px-[18px] py-4 ${i > 0 ? "border-t border-line" : ""}`}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-4 w-16 rounded-full bg-bg-sunken animate-pulse" />
              </div>
              <div className="h-3.5 w-full rounded bg-bg-sunken animate-pulse mb-1.5" />
              <div className="h-3.5 w-3/5 rounded bg-bg-sunken animate-pulse mb-3" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-bg-sunken animate-pulse" />
                <div className="h-3 w-24 rounded bg-bg-sunken animate-pulse" />
                <div className="h-3 w-10 rounded bg-bg-sunken animate-pulse ml-auto" />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
