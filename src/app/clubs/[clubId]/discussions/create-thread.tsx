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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [chapterTag, setChapterTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/trpc/threads.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          bookId,
          title,
          body,
          chapterTag: chapterTag || undefined,
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

      <div className="mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Thread title"
          data-testid="thread-title-input"
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="mb-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          placeholder="What's on your mind?"
          data-testid="thread-body-input"
          rows={4}
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-vertical"
        />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={chapterTag}
          onChange={(e) => setChapterTag(e.target.value)}
          placeholder="Chapter tag (e.g. Chapter 5)"
          data-testid="thread-chapter-input"
          className="w-48 text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {chapterTag && (
          <span data-testid="chapter-tag-preview">
            <ChapterChip tag={chapterTag} />
          </span>
        )}
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
          type="submit"
          data-testid="submit-thread-btn"
        >
          Post Thread
        </Button>
      </div>
    </form>
  );
}
