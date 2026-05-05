"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, Badge } from "@/components/ui";
import { CreateThreadButton } from "./create-thread";

type Thread = {
  id: string;
  title: string;
  chapterTag: string | null;
  chapterNumber: number | null;
  authorId: string;
  createdAt: string;
};

function DiscussionsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clubId = params.clubId as string;
  const bookIdParam = searchParams.get("bookId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [maxChapter, setMaxChapter] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [currentBookId, setCurrentBookId] = useState<string | null>(bookIdParam);

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

  const loadThreads = useCallback(async () => {
    if (!currentBookId) return;
    try {
      const queryInput: Record<string, unknown> = { clubId, bookId: currentBookId };
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
    }
  }, [clubId, currentBookId, maxChapter, showAll]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  if (!currentBookId && !error) {
    return <p data-testid="loading" className="text-ink-3 text-sm">Loading...</p>;
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
        className="flex items-center gap-3 mb-6 p-3 bg-bg-soft rounded-[var(--radius-md)] border border-line"
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

      {/* Thread list */}
      {threads.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ink-3 text-sm">No discussions yet.</p>
        </Card>
      ) : (
        <ul data-testid="threads-list" className="space-y-2">
          {threads.map((thread) => (
            <li key={thread.id} data-testid={`thread-${thread.id}`}>
              <Card className="p-4 hover:border-line-strong transition-colors duration-150 cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink truncate">
                    {thread.title}
                  </span>
                  {thread.chapterTag && (
                    <span data-testid="chapter-tag">
                      <Badge tone="neutral">[{thread.chapterTag}]</Badge>
                    </span>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function DiscussionsPage() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight">
          Discussions
        </h1>
      </div>
      <Suspense fallback={<p data-testid="loading" className="text-ink-3 text-sm">Loading...</p>}>
        <DiscussionsContent />
      </Suspense>
    </div>
  );
}
