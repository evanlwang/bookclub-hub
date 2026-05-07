"use client";

import { useState } from "react";
import { Button, ChapterChip } from "@/components/ui";

interface CreateThreadProps {
  clubId: string;
  bookId: string;
  onCreated: () => void;
}

export function CreateThreadButton({
  clubId,
  bookId,
  onCreated,
}: CreateThreadProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        data-testid="new-thread-btn"
      >
        New Thread
      </Button>
    );
  }

  return (
    <CreateThreadForm
      clubId={clubId}
      bookId={bookId}
      onCreated={() => {
        setOpen(false);
        onCreated();
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

function CreateThreadForm({
  clubId,
  bookId,
  onCreated,
  onCancel,
}: CreateThreadProps & { onCancel: () => void }) {
  const [body, setBody] = useState("");
  const [chapterTag, setChapterTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = body.trim().length > 0 && chapterTag.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/trpc/threads.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          bookId,
          body: body.trim(),
          chapterTag: chapterTag.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to create thread");
      } else {
        onCreated();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="create-thread-form"
      className="bg-bg border border-line rounded-[var(--radius-lg)] p-5 mb-6 animate-slide-down"
    >
      <h3 className="font-medium text-ink text-sm mb-4">New Thread</h3>

      <div className="mb-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (canSubmit && !loading) {
                void handleSubmit(e as unknown as React.FormEvent);
              }
            }
          }}
          required
          autoFocus
          placeholder="What's on your mind?"
          data-testid="thread-body-input"
          rows={4}
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-vertical"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="thread-chapter-input"
          className="block text-[13px] font-medium text-ink-2 mb-1.5"
        >
          Chapter <span className="text-danger" aria-label="required">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="thread-chapter-input"
            type="text"
            value={chapterTag}
            onChange={(e) => setChapterTag(e.target.value)}
            required
            placeholder="e.g. Chapter 5, Prologue, Part II"
            data-testid="thread-chapter-input"
            className="flex-1 min-w-[16rem] text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          {chapterTag.trim() && (
            <span data-testid="chapter-tag-preview" className="shrink-0">
              <ChapterChip tag={chapterTag.trim()} />
            </span>
          )}
        </div>
        <p className="text-xs text-ink-3 mt-1.5 leading-snug">
          Used to filter threads by reader progress so members don&rsquo;t see spoilers ahead of where they are.
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger mb-3">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          disabled={!canSubmit}
          type="submit"
          data-testid="submit-thread-btn"
        >
          Post Thread
        </Button>
      </div>
    </form>
  );
}
