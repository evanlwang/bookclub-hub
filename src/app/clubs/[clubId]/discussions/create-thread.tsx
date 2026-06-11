"use client";

import { useMemo, useState } from "react";
import { Button, ChapterChip, Sheet } from "@/components/ui";
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

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="new-thread-btn"
      >
        + New note
      </Button>
      {open && (
        <Sheet open onClose={() => setOpen(false)} ariaLabel="Leave a margin note">
          <CreateThreadForm
            clubId={clubId}
            bookId={bookId}
            onCreated={() => {
              setOpen(false);
              onCreated();
            }}
            onCancel={() => setOpen(false)}
          />
        </Sheet>
      )}
    </>
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
    <form onSubmit={handleSubmit} data-testid="create-thread-form">
      <h3 className="font-[var(--font-display)] text-[21px] font-extrabold text-ink mb-3">
        Leave a margin note
      </h3>

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
          placeholder="What did the book do to you?"
          data-testid="thread-body-input"
          rows={4}
          className="w-full font-[var(--font-serif)] text-[15.5px] bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3.5 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft resize-none"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="thread-chapter-input"
          className="block font-[var(--font-display)] text-[12.5px] font-extrabold text-ink-2 mb-1.5"
        >
          Chapter tag <span className="text-danger" aria-label="required">*</span>
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
            className="flex-1 min-w-[14rem] font-[var(--font-display)] font-bold text-sm bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink placeholder:text-ink-4 placeholder:font-semibold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />
          {chapterTag.trim() && (
            <span data-testid="chapter-tag-preview" className="shrink-0">
              <ChapterChip tag={chapterTag.trim()} />
            </span>
          )}
        </div>
      </div>

      {/* @spec DISC-UI-COMPOSE-MISMATCH-WARN-001, DISC-UI-COMPOSE-INFO-001 */}
      {mismatch.mismatch ? (
        <div
          data-testid="compose-mismatch-warning"
          role="alert"
          className="rounded-[12px] bg-danger-soft px-3 py-2.5 mb-3"
        >
          <p className="m-0 font-[var(--font-display)] text-[12.5px] font-bold leading-[1.45] text-danger">
            Spoiler ahead: your note mentions Chapter {mismatch.bodyChapter} but
            is tagged Chapter {mismatch.tagChapter} — readers behind you would
            see it. Raise the tag or soften the note.
          </p>
        </div>
      ) : (
        body.trim().length > 0 && chapterTag.trim().length > 0 && (
          <div
            data-testid="compose-info-card"
            className="rounded-[12px] bg-success-soft px-3 py-2.5 mb-3"
          >
            <p className="m-0 font-[var(--font-display)] text-[12.5px] font-bold leading-[1.45] text-success">
              Spoiler-safe by default — only members past Chapter{" "}
              {mismatch.tagChapter ?? "—"} will see this.
            </p>
          </div>
        )
      )}

      {error && (
        <p className="text-sm text-danger mb-3">{error}</p>
      )}

      <div className="flex gap-2.5">
        <Button variant="ghost" size="md" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          variant={mismatch.mismatch ? "danger" : "primary"}
          size="md"
          className="flex-1"
          loading={createThread.isPending}
          disabled={!canSubmit}
          type="submit"
          data-testid="submit-thread-btn"
        >
          {/* @spec DISC-UI-COMPOSE-MISMATCH-DISABLE-001 */}
          {mismatch.mismatch ? "Resolve spoiler warning" : "Post note"}
        </Button>
      </div>
    </form>
  );
}
