"use client";

import { useMemo, useState } from "react";
import { Button, ChapterChip } from "@/components/ui";
import { detectChapterMismatch } from "@/lib/discussions/chapter-mismatch";
import { trpc } from "@/trpc/react-hooks";

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
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  // @spec DISC-UI-COMPOSE-MISMATCH-001
  const mismatch = useMemo(
    () => detectChapterMismatch(body, chapterTag),
    [body, chapterTag],
  );

  const createThread = trpc.threads.create.useMutation({
    onSuccess: () => {
      // Invalidate the threads list so the page (and any other mount) refetches.
      void utils.threads.list.invalidate({ clubId, bookId });
      onCreated();
    },
    onError: (err) => {
      setError(err.message || "Failed to create thread");
    },
  });

  const canSubmit =
    body.trim().length > 0 &&
    chapterTag.trim().length > 0 &&
    !mismatch.mismatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    createThread.mutate({
      clubId,
      bookId,
      body: body.trim(),
      chapterTag: chapterTag.trim(),
    });
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
              if (canSubmit && !createThread.isPending) {
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

      {/* @spec DISC-UI-COMPOSE-MISMATCH-WARN-001, DISC-UI-COMPOSE-INFO-001 */}
      {mismatch.mismatch ? (
        <div
          data-testid="compose-mismatch-warning"
          role="alert"
          className="p-3 rounded-[var(--radius-md)] bg-danger-soft border border-danger/40 text-sm text-ink mb-3"
        >
          <strong className="text-danger">Spoiler ahead:</strong> the body
          mentions Chapter {mismatch.bodyChapter}, but you tagged this thread
          for Chapter {mismatch.tagChapter}. Members reading along at the
          tagged chapter will be spoiled. Either bump the chapter tag up to
          match the body, or trim the body so it stays at or below the tag.
        </div>
      ) : (
        body.trim().length > 0 && chapterTag.trim().length > 0 && (
          <p
            data-testid="compose-info-card"
            className="text-xs text-ink-3 mb-3"
          >
            💡 Spoiler-safe by default — only members past Chapter{" "}
            {mismatch.tagChapter ?? "—"} will see this thread.
          </p>
        )
      )}

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
          loading={createThread.isPending}
          disabled={!canSubmit}
          type="submit"
          data-testid="submit-thread-btn"
        >
          {/* @spec DISC-UI-COMPOSE-MISMATCH-DISABLE-001 */}
          {mismatch.mismatch ? "Resolve spoiler warning" : "Post Thread"}
        </Button>
      </div>
    </form>
  );
}
