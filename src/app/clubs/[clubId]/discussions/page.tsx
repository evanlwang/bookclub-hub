// @spec DISC-UI-001, DISC-UI-002, DISC-UI-003, DISC-UI-005, DISC-UI-011, DISC-UI-PROGRESS-AUTOFILTER-001, DISC-UI-PROGRESS-AUTOFILTER-002
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, ChapterChip, Avatar, Badge } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";
import { CreateThreadButton } from "./create-thread";
import { MarkDiscussionsVisited } from "./mark-visited";
import "./discussions.css";

type Thread = {
  id: string;
  title: string;
  body: string;
  chapterTag: string | null;
  chapterNumber: number | null;
  authorId: string;
  author?: { displayName: string };
  createdAt: string;
  commentCount?: number;
  isPinned?: boolean;
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DiscussionsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clubId = params.clubId as string;
  const bookIdParam = searchParams.get("bookId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [maxChapter, setMaxChapter] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<"recent" | "comments">("recent");
  const [error, setError] = useState("");
  const [currentBookId, setCurrentBookId] = useState<string | null>(bookIdParam);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [threadsLoaded, setThreadsLoaded] = useState(false);

  useEffect(() => {
    if (currentBookId) return;
    async function fetchCurrentBook() {
      try {
        const input = encodeURIComponent(JSON.stringify({ clubId }));
        const res = await fetch(`/api/trpc/selections.list?input=${input}`);
        const data = await res.json();
        const selections = data.result?.data;
        if (Array.isArray(selections) && selections.length > 0) {
          const current = selections.find((s: { isCurrent: boolean }) => s.isCurrent);
          if (current) setCurrentBookId(current.bookId);
        }
      } catch {
        setError("Failed to load current book");
      }
    }
    fetchCurrentBook();
  }, [clubId, currentBookId]);

  // @spec DISC-UI-PROGRESS-AUTOFILTER-001, DISC-UI-PROGRESS-AUTOFILTER-002
  useEffect(() => {
    if (!currentBookId || progressLoaded) return;
    let cancelled = false;
    async function loadViewerProgress() {
      try {
        const input = encodeURIComponent(
          JSON.stringify({ clubId, bookId: currentBookId })
        );
        const res = await fetch(`/api/trpc/progress.me?input=${input}`);
        const data = await res.json();
        if (cancelled) return;
        const cutoff = deriveSpoilerCutoff(data.result?.data ?? null);
        if (cutoff != null) setMaxChapter(cutoff);
      } catch {
        // Soft-fail: leave the filter unset so we surface all threads.
      } finally {
        if (!cancelled) setProgressLoaded(true);
      }
    }
    loadViewerProgress();
    return () => {
      cancelled = true;
    };
  }, [clubId, currentBookId, progressLoaded]);

  const loadThreads = useCallback(async () => {
    if (!currentBookId || !progressLoaded) return;
    try {
      const queryInput: Record<string, unknown> = { clubId, bookId: currentBookId, sort };
      if (maxChapter !== null && !showAll) {
        queryInput.maxChapter = maxChapter;
      }
      const input = encodeURIComponent(JSON.stringify(queryInput));
      const res = await fetch(`/api/trpc/threads.list?input=${input}`);
      const data = await res.json();
      const result = data.result?.data;
      if (result) {
        setThreads(result.threads);
        setHiddenCount(result.hiddenCount ?? 0);
        setError("");
      } else if (data.error) {
        setError(data.error.message || "Error loading threads");
      }
    } catch {
      setError("Failed to load threads");
    } finally {
      setThreadsLoaded(true);
    }
  }, [clubId, currentBookId, maxChapter, showAll, sort, progressLoaded]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  if (!currentBookId && !error) {
    return <ThreadListSkeleton />;
  }

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

          {/* Spoiler protection — primary-tinted Card per the design system */}
          <Card
            data-testid="chapter-filter"
            className="p-3.5 mb-4 bg-primary-soft/70 border-primary/20"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-primary-ink">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M6 12h12M10 18h4" />
                </svg>
                <span className="text-[13px] font-medium">Spoiler protection</span>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-primary-ink">
                <span>I&rsquo;m on chapter</span>
                <input
                  type="number"
                  value={maxChapter ?? ""}
                  onChange={(e) => {
                    setShowAll(false);
                    setMaxChapter(e.target.value ? Number(e.target.value) : null);
                  }}
                  data-testid="max-chapter-input"
                  className="w-16 text-center font-[var(--font-mono)] text-sm h-8 bg-bg border border-line-strong rounded-[var(--radius-sm)] px-2 py-1 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="—"
                  aria-label="Your current chapter"
                />
                <span className="text-ink-3">— hide threads tagged later</span>
              </label>
              <div className="ml-auto text-xs text-primary-ink">
                {hiddenCount > 0 && !showAll ? (
                  <p data-testid="hidden-count">
                    <strong>
                      {hiddenCount} thread{hiddenCount !== 1 ? "s" : ""} hidden
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      data-testid="show-all-btn"
                      className="ml-2 text-primary hover:underline underline-offset-2"
                    >
                      Show all anyway
                    </button>
                  </p>
                ) : (
                  <span>All threads visible</span>
                )}
              </div>
            </div>
          </Card>

          {/* Sort + thread count + New thread */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="text-[13px] text-ink-3">
              {threads.length} thread{threads.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-0.5 bg-bg-soft rounded-[var(--radius-md)] border border-line">
                <button
                  type="button"
                  data-testid="sort-recent"
                  onClick={() => setSort("recent")}
                  className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors ${
                    sort === "recent"
                      ? "bg-bg font-medium text-ink shadow-sm"
                      : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  Recent
                </button>
                <button
                  type="button"
                  data-testid="sort-comments"
                  onClick={() => setSort("comments")}
                  className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors ${
                    sort === "comments"
                      ? "bg-bg font-medium text-ink shadow-sm"
                      : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  Most comments
                </button>
              </div>
              {currentBookId && (
                <CreateThreadButton
                  clubId={clubId}
                  bookId={currentBookId}
                  onCreated={loadThreads}
                />
              )}
            </div>
          </div>

          {/* Thread list — single Card with internal hairline rows */}
          {!threadsLoaded ? (
            <ThreadListSkeleton compact />
          ) : threads.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-ink-3 text-sm">
                No discussions yet — start one with the button above.
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <ul data-testid="threads-list">
                {threads.map((thread, i) => (
                  <li
                    key={thread.id}
                    data-testid={`thread-${thread.id}`}
                    data-pinned={thread.isPinned ? "true" : "false"}
                    className={i > 0 ? "border-t border-line" : ""}
                  >
                    <Link
                      href={`/clubs/${clubId}/discussions/${thread.id}`}
                      className={`block px-[18px] py-4 transition-colors hover:bg-bg-soft ${
                        thread.isPinned ? "bg-warning-soft/40 hover:bg-warning-soft/55" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        {/* @spec DISC-UI-PIN-VISUAL-001 */}
                        {thread.isPinned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-accent-ink">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 17v5M5 9l1 5h12l1-5M7 9l2-7h6l2 7" />
                            </svg>
                            PINNED
                          </span>
                        )}
                        {thread.chapterTag ? (
                          <span data-testid="chapter-tag">
                            <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                          </span>
                        ) : (
                          <Badge tone="neutral">No tag</Badge>
                        )}
                      </div>

                      {thread.body && (
                        <p
                          data-testid="thread-body-preview"
                          className="font-[var(--font-display)] text-[15px] font-medium text-ink leading-snug mb-1.5 line-clamp-2 tracking-[-0.005em]"
                        >
                          {thread.body}
                        </p>
                      )}

                      <div className="flex items-center gap-2.5 text-xs text-ink-3">
                        {thread.author && (
                          <>
                            <Avatar name={thread.author.displayName} size="sm" />
                            <span>
                              <strong className="text-ink-2 font-medium">
                                {thread.author.displayName.split(" ")[0]}
                              </strong>
                              {thread.createdAt && ` · ${relativeTime(thread.createdAt)}`}
                            </span>
                          </>
                        )}
                        {thread.commentCount != null && (
                          <span className="ml-auto inline-flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 17 0z" />
                            </svg>
                            {thread.commentCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
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

export default function DiscussionsPage() {
  const params = useParams();
  const clubId = params.clubId as string;

  return (
    <div className="w-full max-w-[1200px]">
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight mb-5">
        Discussions
      </h1>

      <Suspense
        fallback={
          <p data-testid="loading" className="text-ink-3 text-sm">
            Loading...
          </p>
        }
      >
        <DiscussionsContent />
      </Suspense>
    </div>
  );
}
