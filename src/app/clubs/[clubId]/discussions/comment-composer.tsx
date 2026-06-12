"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";
import { useViewer } from "@/lib/auth/use-viewer";

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
  const { viewerId, viewerName } = useViewer();

  // @spec DISC-UI-COMMENT-OPTIMISTIC-001, DISC-UI-COMPOSER-DRAFT-PRESERVE-001
  // Optimistic append: the comment shows up in the thread (pending style)
  // before the server responds; rollback removes it on error.
  // CONTRACT: clear the draft body ONLY in `onSuccess`. On error, leave the
  // textarea untouched so the user doesn't lose their unsent comment to a
  // transient network failure — the rollback restores the comment list and
  // the inline `setError` message is the only other visible side effect.
  const createComment = trpc.comments.create.useMutation({
    onMutate: async (vars) => {
      // Kill in-flight fetches (incl. polls) for this key so a stale response
      // can't overwrite the optimistic comment.
      await utils.threads.get.cancel({ clubId, threadId });
      const snapshot = utils.threads.get.getData({ clubId, threadId });
      utils.threads.get.setData({ clubId, threadId }, (prev) => {
        if (!prev) return prev;
        const tempComment = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          threadId,
          body: vars.body,
          authorId: viewerId ?? "viewer",
          author: { displayName: viewerName || "You" },
          parentCommentId: vars.parentCommentId ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pending: true,
        } as unknown as (typeof prev.thread.comments)[number];
        return {
          ...prev,
          thread: {
            ...prev.thread,
            comments: [...prev.thread.comments, tempComment],
          },
        };
      });
      return { snapshot };
    },
    onSuccess: () => {
      setBody("");
      onPosted();
    },
    onError: (err, _vars, context) => {
      // Rollback the optimistic append; draft preserved.
      if (context && context.snapshot !== undefined) {
        utils.threads.get.setData({ clubId, threadId }, context.snapshot);
      }
      setError(err.message || "Failed to post comment");
    },
    onSettled: () => {
      // Server reconciliation: replaces the temp comment with the real row
      // (and keeps any other mount of `threads.get` in sync too).
      void utils.threads.get.invalidate({ clubId, threadId });
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
        className="w-full font-[var(--font-serif)] text-[15px] bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3.5 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft resize-vertical"
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
