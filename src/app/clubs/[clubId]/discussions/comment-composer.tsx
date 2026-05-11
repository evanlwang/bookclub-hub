"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";

interface CommentComposerProps {
  clubId: string;
  threadId: string;
  parentCommentId?: string;
  onPosted: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

export function CommentComposer({
  clubId,
  threadId,
  parentCommentId,
  onPosted,
  onCancel,
  placeholder = "Write a comment…",
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setBody("");
      // Refresh the parent thread's cached comments. The page also calls
      // `loadThread` via the `onPosted` callback, but invalidating here keeps
      // any other mount of `threads.get` in sync too.
      void utils.threads.get.invalidate({ clubId, threadId });
      onPosted();
    },
    onError: (err) => {
      setError(err.message || "Failed to post comment");
    },
  });

  async function submit() {
    if (!body.trim() || createComment.isPending) return;
    setError("");
    createComment.mutate({
      clubId,
      threadId,
      body: body.trim(),
      parentCommentId: parentCommentId || undefined,
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      data-testid={parentCommentId ? "reply-form" : "comment-form"}
      className="flex flex-col gap-2"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // Cmd+Enter (mac) or Ctrl+Enter (win/linux) submits — leaves plain
          // Enter free for line breaks, the standard textarea behavior.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        rows={parentCommentId ? 2 : 3}
        data-testid={parentCommentId ? "reply-input" : "comment-input"}
        className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-vertical"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          loading={createComment.isPending}
          type="submit"
          disabled={!body.trim()}
          data-testid={parentCommentId ? "submit-reply-btn" : "submit-comment-btn"}
        >
          Post
        </Button>
      </div>
    </form>
  );
}
