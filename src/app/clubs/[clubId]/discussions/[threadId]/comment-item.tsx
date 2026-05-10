// @spec DISC-UI-COMMENT-CONTROLS-001, DISC-UI-COMMENT-EDIT-001,
//        DISC-UI-COMMENT-DELETE-001, DISC-UI-COMMENT-DELETED-001,
//        DISC-UI-COMMENT-EDITED-001
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Avatar, Button } from "@/components/ui";
import { TrashIcon } from "@/components/ui/icons";
import { CommentComposer } from "../comment-composer";
import { renderBodyHtml } from "@/lib/discussions/markdown";

export interface CommentLike {
  id: string;
  body: string;
  authorId: string;
  authorName?: string;
  author?: { displayName: string };
  parentCommentId: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface CommentItemProps {
  comment: CommentLike;
  clubId: string;
  threadId: string;
  viewerId: string | null;
  isAdmin: boolean;
  /** Whether to render the Reply affordance — only true for top-level comments. */
  canReply: boolean;
  /** Wrap the row as a Card (top-level) or plain block (reply, indented). */
  layout: "card" | "reply";
  /** Called after a successful mutation so the parent refetches. */
  onMutated: () => void;
  /** Slot for nested replies, rendered after this comment's content. Card layout only. */
  children?: React.ReactNode;
}

const EDITED_THRESHOLD_MS = 1000;

function isEdited(comment: CommentLike): boolean {
  if (!comment.updatedAt) return false;
  const created = new Date(comment.createdAt).getTime();
  const updated = new Date(comment.updatedAt).getTime();
  return updated - created > EDITED_THRESHOLD_MS;
}

export function CommentItem({
  comment,
  clubId,
  threadId,
  viewerId,
  isAdmin,
  canReply,
  layout,
  onMutated,
  children,
}: CommentItemProps) {
  const [mode, setMode] = useState<"view" | "reply" | "edit" | "confirm-delete">("view");
  const [draftBody, setDraftBody] = useState(comment.body);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isDeletedPlaceholder = comment.body === "[deleted]";
  const isAuthor = viewerId !== null && viewerId === comment.authorId;
  const canEdit = !isDeletedPlaceholder && isAuthor;
  const canDelete = !isDeletedPlaceholder && (isAuthor || isAdmin);

  const authorName = comment.author?.displayName || comment.authorName || "Unknown";

  useEffect(() => {
    if (mode === "edit") {
      setDraftBody(comment.body);
      setError(null);
      // Defer focus to next tick so the textarea is mounted.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [mode, comment.body]);

  // Esc cancels edit mode.
  useEffect(() => {
    if (mode !== "edit") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("view");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  async function handleSaveEdit() {
    const body = draftBody.trim();
    if (!body || body === comment.body) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trpc/comments.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, commentId: comment.id, body }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message ?? "Failed to update comment");
        return;
      }
      setMode("view");
      onMutated();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trpc/comments.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, commentId: comment.id }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message ?? "Failed to delete comment");
        return;
      }
      // Parent refetch handles both the row-removal and "[deleted]" cases.
      onMutated();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ---- Body content ----
  const bodyContent = isDeletedPlaceholder ? (
    <p className="text-sm italic text-ink-3" data-testid={`comment-body-${comment.id}`}>
      [deleted]
    </p>
  ) : mode === "edit" ? (
    <div className="flex flex-col gap-2 mt-1">
      <textarea
        ref={textareaRef}
        value={draftBody}
        onChange={(e) => setDraftBody(e.target.value)}
        rows={3}
        data-testid={`comment-edit-input-${comment.id}`}
        className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-vertical"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setMode("view")} type="button">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          disabled={!draftBody.trim() || draftBody.trim() === comment.body}
          onClick={handleSaveEdit}
          data-testid={`comment-edit-save-${comment.id}`}
        >
          Save
        </Button>
      </div>
    </div>
  ) : (
    /* @spec DISC-BE-002, DISC-BE-003 — Markdown + sanitized HTML */
    <div
      className="text-sm text-ink leading-relaxed prose-comment"
      data-testid={`comment-body-${comment.id}`}
      dangerouslySetInnerHTML={{ __html: renderBodyHtml(comment.body) }}
    />
  );

  // ---- Affordance row ----
  // Hidden in edit mode (the textarea has its own Save/Cancel) and for the
  // "[deleted]" placeholder (per DISC-UI-COMMENT-DELETED-001).
  const showAffordances = mode !== "edit" && !isDeletedPlaceholder;
  const anyAffordance = canReply || canEdit || canDelete;

  const affordanceRow = !showAffordances || !anyAffordance ? null : mode === "confirm-delete" ? (
    <div
      className="mt-2 flex items-center gap-3 text-xs"
      data-testid={`comment-confirm-delete-${comment.id}`}
    >
      <span className="text-ink-2">Delete this comment?</span>
      <button
        type="button"
        onClick={handleConfirmDelete}
        disabled={loading}
        data-testid={`comment-confirm-yes-${comment.id}`}
        className="text-danger hover:underline disabled:opacity-50"
      >
        {loading ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setMode("view")}
        disabled={loading}
        className="text-ink-3 hover:text-ink-2"
      >
        Cancel
      </button>
      {error && <span className="text-danger">{error}</span>}
    </div>
  ) : (
    <div className="mt-2 flex items-center gap-3 text-xs">
      {canReply && (
        <button
          type="button"
          onClick={() => setMode(mode === "reply" ? "view" : "reply")}
          data-testid={`reply-btn-${comment.id}`}
          className="text-primary hover:underline"
        >
          Reply
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => setMode("edit")}
          data-testid={`comment-edit-btn-${comment.id}`}
          className="text-ink-3 hover:text-ink-2"
        >
          Edit
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => setMode("confirm-delete")}
          data-testid={`comment-delete-btn-${comment.id}`}
          className="inline-flex items-center gap-1 font-medium text-danger hover:text-danger/80 transition-colors"
        >
          <TrashIcon size={12} />
          Delete
        </button>
      )}
    </div>
  );

  // ---- Header (avatar / name / date / "(edited)") ----
  const header = (
    <div className="flex items-center gap-2 mb-1">
      <Avatar name={authorName} size="sm" />
      <span className="text-xs font-medium text-ink-2">{authorName}</span>
      <span className="text-xs text-ink-3">
        {new Date(comment.createdAt).toLocaleDateString()}
        {isEdited(comment) && (
          <span data-testid={`comment-edited-${comment.id}`}> · (edited)</span>
        )}
      </span>
    </div>
  );

  if (layout === "reply") {
    return (
      <div
        data-testid={`reply-${comment.id}`}
        className="ml-6 pl-4 border-l-2 border-line"
      >
        {header}
        {bodyContent}
        {affordanceRow}
      </div>
    );
  }

  return (
    <div data-testid={`comment-${comment.id}`} className="space-y-3">
      <Card className="p-4">
        {header}
        {bodyContent}
        {affordanceRow}
        {mode === "reply" && (
          <div className="mt-3 pl-4 border-l-2 border-line">
            <CommentComposer
              clubId={clubId}
              threadId={threadId}
              parentCommentId={comment.id}
              onPosted={() => {
                setMode("view");
                onMutated();
              }}
              onCancel={() => setMode("view")}
              placeholder="Write a reply…"
            />
          </div>
        )}
      </Card>
      {children}
    </div>
  );
}
