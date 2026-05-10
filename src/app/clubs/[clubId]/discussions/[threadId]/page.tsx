"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge, Avatar } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { CommentComposer } from "../comment-composer";
import { CommentItem, type CommentLike } from "./comment-item";
import { renderBodyHtml } from "@/lib/discussions/markdown";

type Comment = CommentLike & {
  authorId: string;
};

type ThreadDetail = {
  id: string;
  title: string;
  body: string;
  chapterTag: string | null;
  author?: { displayName: string };
  authorName?: string;
  authorId?: string;
  createdAt: string;
  isPinned?: boolean;
  comments: Comment[];
};

export default function ThreadDetailPage() {
  const params = useParams();
  const clubId = params.clubId as string;
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // @spec DISC-UI-EDIT-BTN-001, DISC-UI-DELETE-BTN-001, DISC-UI-PIN-BTN-001
  const [editingThread, setEditingThread] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [threadActionError, setThreadActionError] = useState("");

  // One-shot: load viewer identity + role for this club. Drives edit/delete
  // permission gating in CommentItem.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/trpc/auth.me")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const me = data.result?.data;
        if (me) {
          setViewerId(me.user?.id ?? null);
          const myMembership = me.clubs?.find(
            (c: { id: string; role: string }) => c.id === clubId
          );
          setIsAdmin(
            myMembership?.role === "admin" || myMembership?.role === "owner"
          );
        }
      })
      .catch(() => {
        // Falls back to viewerId=null/isAdmin=false → no edit/delete affordances.
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const loadThread = useCallback(async () => {
    try {
      const input = encodeURIComponent(
        JSON.stringify({ clubId, threadId })
      );
      const res = await fetch(`/api/trpc/threads.get?input=${input}`);
      const data = await res.json();
      const result = data.result?.data;
      if (result?.thread) {
        setThread(result.thread);
        setError("");
      } else if (data.error) {
        setError(data.error.message || "Error loading thread");
      }
    } catch {
      setError("Failed to load thread");
    }
  }, [clubId, threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  if (error) {
    return (
      <div className="max-w-3xl">
        <p data-testid="thread-error" className="text-danger text-sm">
          {error}
        </p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-3xl">
        <p className="text-ink-3 text-sm">Loading...</p>
      </div>
    );
  }

  const topLevelComments = thread.comments.filter(
    (c) => !c.parentCommentId
  );
  const replies = (parentId: string) =>
    thread.comments.filter((c) => c.parentCommentId === parentId);

  const authorName =
    thread.author?.displayName || thread.authorName || "Unknown";

  return (
    <div className="max-w-3xl">
      <Link
        href={`/clubs/${clubId}/discussions`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Discussions
      </Link>

      {/* Thread header */}
      <div
        className={`mb-6 ${thread.isPinned ? "p-4 -mx-4 rounded-[var(--radius-md)] bg-warning-soft border border-warning/40" : ""}`}
        data-testid="thread-detail"
        data-pinned={thread.isPinned ? "true" : "false"}
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* @spec DISC-UI-PIN-VISUAL-001 */}
          {thread.isPinned && (
            <Badge tone="warning" dot>
              PINNED
            </Badge>
          )}
          {thread.chapterTag && (
            <Badge tone="neutral">[{thread.chapterTag}]</Badge>
          )}
          <Avatar name={authorName} size="sm" />
          <span className="text-xs text-ink-3">
            {authorName} · {new Date(thread.createdAt).toLocaleDateString()}
          </span>
          <ThreadHeaderActions
            clubId={clubId}
            thread={thread}
            viewerId={viewerId}
            isAdmin={isAdmin}
            editing={editingThread}
            onStartEdit={() => {
              setEditBody(thread.body);
              setEditingThread(true);
              setThreadActionError("");
            }}
            confirmingDelete={confirmingDelete}
            onStartDelete={() => {
              setConfirmingDelete(true);
              setThreadActionError("");
            }}
            onCancelDelete={() => setConfirmingDelete(false)}
            onConfirmDelete={async () => {
              setThreadActionError("");
              const res = await fetch("/api/trpc/threads.delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clubId, threadId: thread.id }),
              });
              const data = await res.json();
              if (data?.error) {
                setThreadActionError(data.error.message || "Failed to delete");
                setConfirmingDelete(false);
                return;
              }
              window.location.href = `/clubs/${clubId}/discussions`;
            }}
            onTogglePin={async () => {
              setThreadActionError("");
              const res = await fetch("/api/trpc/threads.update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clubId,
                  threadId: thread.id,
                  isPinned: !thread.isPinned,
                }),
              });
              const data = await res.json();
              if (data?.error) {
                setThreadActionError(data.error.message || "Failed to toggle pin");
                return;
              }
              setThread((t) => (t ? { ...t, isPinned: !t.isPinned } : t));
            }}
          />
        </div>
        {/* @spec DISC-BE-002, DISC-BE-003 — rendered Markdown, sanitized */}
        {editingThread ? (
          <div className="space-y-2">
            <textarea
              data-testid="thread-edit-body"
              className="w-full min-h-[160px] text-base text-ink leading-relaxed bg-bg border border-line-strong rounded-[var(--radius-md)] p-3 focus:outline-none focus:border-primary"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="thread-edit-save"
                disabled={!editBody.trim() || editBody === thread.body}
                onClick={async () => {
                  setThreadActionError("");
                  const res = await fetch("/api/trpc/threads.update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      clubId,
                      threadId: thread.id,
                      body: editBody.trim(),
                    }),
                  });
                  const data = await res.json();
                  if (data?.error) {
                    setThreadActionError(data.error.message || "Failed to save");
                    return;
                  }
                  setThread((t) =>
                    t ? { ...t, body: editBody.trim() } : t
                  );
                  setEditingThread(false);
                }}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-primary text-bg text-sm font-medium disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingThread(false)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] border border-line-strong text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="text-base text-ink leading-relaxed prose-thread"
            dangerouslySetInnerHTML={{ __html: renderBodyHtml(thread.body) }}
          />
        )}
        {threadActionError && (
          <p className="text-xs text-danger mt-2" role="alert">
            {threadActionError}
          </p>
        )}
      </div>

      <hr className="border-line mb-6" />

      {/* Comments */}
      <div data-testid="comments-list" className="space-y-4 mb-6">
        {topLevelComments.length === 0 && (
          <p className="text-ink-3 text-sm">No comments yet. Be the first!</p>
        )}
        {topLevelComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            clubId={clubId}
            threadId={threadId}
            viewerId={viewerId}
            isAdmin={isAdmin}
            canReply
            layout="card"
            onMutated={loadThread}
          >
            {/* Nested replies render as siblings inside the comment block. */}
            {replies(comment.id).map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                clubId={clubId}
                threadId={threadId}
                viewerId={viewerId}
                isAdmin={isAdmin}
                canReply={false}
                layout="reply"
                onMutated={loadThread}
              />
            ))}
          </CommentItem>
        ))}
      </div>

      {/* Sticky composer */}
      <div className="sticky bottom-0 bg-bg pt-4 pb-2 border-t border-line">
        <CommentComposer
          clubId={clubId}
          threadId={threadId}
          onPosted={loadThread}
        />
      </div>
    </div>
  );
}

// @spec DISC-UI-EDIT-BTN-001, DISC-UI-DELETE-BTN-001, DISC-UI-PIN-BTN-001
function ThreadHeaderActions({
  thread,
  viewerId,
  isAdmin,
  editing,
  onStartEdit,
  confirmingDelete,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
  onTogglePin,
}: {
  clubId: string;
  thread: ThreadDetail;
  viewerId: string | null;
  isAdmin: boolean;
  editing: boolean;
  onStartEdit: () => void;
  confirmingDelete: boolean;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onTogglePin: () => void;
}) {
  const isAuthor = !!viewerId && viewerId === thread.authorId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const canPin = isAdmin;

  if (!canEdit && !canDelete && !canPin) return null;

  if (confirmingDelete) {
    return (
      <span className="ml-auto inline-flex items-center gap-2 text-xs">
        <span className="text-ink-2">Delete this thread?</span>
        <button
          type="button"
          data-testid="thread-delete-confirm"
          onClick={onConfirmDelete}
          className="text-danger hover:underline"
        >
          Yes, delete
        </button>
        <span className="text-ink-4">·</span>
        <button
          type="button"
          onClick={onCancelDelete}
          className="text-ink-2 hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="ml-auto inline-flex items-center gap-2 text-xs">
      {canPin && (
        <button
          type="button"
          data-testid="thread-pin-btn"
          onClick={onTogglePin}
          aria-pressed={thread.isPinned ? "true" : "false"}
          className={`hover:underline ${thread.isPinned ? "text-warning-foreground text-warning" : "text-ink-2"}`}
        >
          {thread.isPinned ? "Unpin" : "Pin"}
        </button>
      )}
      {canEdit && !editing && (
        <button
          type="button"
          data-testid="thread-edit-btn"
          onClick={onStartEdit}
          className="text-primary hover:underline"
        >
          Edit
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          data-testid="thread-delete-btn"
          onClick={onStartDelete}
          className="text-danger hover:underline"
        >
          Delete
        </button>
      )}
    </span>
  );
}
