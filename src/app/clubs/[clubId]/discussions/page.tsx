// @spec DISC-UI-001, DISC-UI-002, DISC-UI-003, DISC-UI-005, DISC-UI-011, DISC-UI-PROGRESS-AUTOFILTER-001, DISC-UI-PROGRESS-AUTOFILTER-002
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, ChapterChip, Avatar } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { deriveSpoilerCutoff } from "@/lib/discussions/spoiler-cutoff";
import { CreateThreadButton } from "./create-thread";

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
  // Once we know the current book, fetch the viewer's progress and seed the
  // chapter input. We only prefill once — the user is free to override after.
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
    // Wait until viewer progress has been fetched so the first thread query
    // already reflects the spoiler cutoff (avoids a one-frame full-list flash).
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
      {/* Create thread */}
      {currentBookId && (
        <div className="mb-6">
          <CreateThreadButton
            clubId={clubId}
            bookId={currentBookId}
            onCreated={loadThreads}
          />
        </div>
      )}

      {error && (
        <p data-testid="discussions-error" className="text-danger text-sm mb-4">
          {error}
        </p>
      )}

      {/* Spoiler filter */}
      <div
        data-testid="chapter-filter"
        className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-primary-soft rounded-[var(--radius-md)] border border-primary/20"
      >
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <span>I&apos;m on chapter:</span>
          <input
            type="number"
            value={maxChapter ?? ""}
            onChange={(e) => {
              setShowAll(false);
              setMaxChapter(e.target.value ? Number(e.target.value) : null);
            }}
            data-testid="max-chapter-input"
            className="w-16 text-sm bg-bg border border-line-strong rounded-[var(--radius-sm)] px-2 py-1 text-ink text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="—"
          />
        </label>
        {hiddenCount > 0 && !showAll && (
          <p data-testid="hidden-count" className="text-xs text-ink-3">
            {hiddenCount} thread{hiddenCount !== 1 ? "s" : ""} hidden due to spoiler filter.{" "}
            <button
              onClick={() => setShowAll(true)}
              data-testid="show-all-btn"
              className="text-primary hover:underline"
            >
              Show all
            </button>
          </p>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs text-ink-3">{threads.length} thread{threads.length !== 1 ? "s" : ""}</span>
        <div className="flex gap-1 p-0.5 bg-bg-soft rounded-[var(--radius-md)] border border-line">
          <button
            data-testid="sort-recent"
            onClick={() => setSort("recent")}
            className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors ${sort === "recent" ? "bg-bg font-medium text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}
          >
            Recent
          </button>
          <button
            data-testid="sort-comments"
            onClick={() => setSort("comments")}
            className={`px-3 py-1 text-xs rounded-[var(--radius-sm)] transition-colors ${sort === "comments" ? "bg-bg font-medium text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}
          >
            Most comments
          </button>
        </div>
      </div>

      {/* Thread list */}
      {!threadsLoaded ? (
        <ThreadListSkeleton compact />
      ) : threads.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ink-3 text-sm">
            No discussions yet — start one with the button above.
          </p>
        </Card>
      ) : (
        <ul data-testid="threads-list" className="space-y-2">
          {threads.map((thread) => (
            <li key={thread.id} data-testid={`thread-${thread.id}`}>
              <Card className="p-4 hover:border-line-strong transition-colors duration-150 cursor-pointer">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                  {thread.chapterTag && (
                    <span data-testid="chapter-tag">
                      <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber} />
                    </span>
                  )}
                  {thread.commentCount != null && (
                    <span className="text-xs text-ink-3 ml-auto">{thread.commentCount} replies</span>
                  )}
                </div>
                {thread.body && (
                  <p
                    data-testid="thread-body-preview"
                    className="text-sm text-ink leading-snug line-clamp-2"
                  >
                    {thread.body}
                  </p>
                )}
                {thread.author && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <Avatar name={thread.author.displayName} size="sm" />
                    <span className="text-xs text-ink-3">
                      {thread.author.displayName.split(" ")[0]}
                      {thread.createdAt && ` · ${relativeTime(thread.createdAt)}`}
                    </span>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ThreadListSkeleton({ compact = false }: { compact?: boolean }) {
  const rows = compact ? 3 : 4;
  return (
    <div data-testid="loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading discussions…</span>
      <ul className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i}>
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-16 rounded-full bg-bg-sunken animate-pulse" />
                <div className="h-3 w-12 rounded-full bg-bg-sunken animate-pulse ml-auto" />
              </div>
              <div className="h-3 w-full rounded bg-bg-sunken animate-pulse mb-1.5" />
              <div className="h-3 w-3/5 rounded bg-bg-sunken animate-pulse" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DiscussionsPage() {
  const params = useParams();
  const clubId = params.clubId as string;

  return (
    <div className="max-w-3xl">
      <Link
        href={`/clubs/${clubId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Dashboard
      </Link>

      <Suspense fallback={<p data-testid="loading" className="text-ink-3 text-sm">Loading...</p>}>
        <DiscussionsContent />
      </Suspense>
    </div>
  );
}
