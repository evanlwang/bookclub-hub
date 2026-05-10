"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Badge, Avatar, ChapterChip } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { CommentComposer } from "../comment-composer";
import { CommentItem, type CommentLike } from "./comment-item";
import { renderBodyHtml } from "@/lib/discussions/markdown";
import "../discussions.css";

type Comment = CommentLike & {
  authorId: string;
};

type ThreadDetail = {
  id: string;
  title: string;
  body: string;
  chapterTag: string | null;
  chapterNumber?: number | null;
  author?: { displayName: string };
  authorName?: string;
  authorId?: string;
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
  comments: Comment[];
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

  // One-shot: load viewer identity + role for this club.
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
      <div className="w-full max-w-[1200px]">
        <p data-testid="thread-error" className="text-danger text-sm" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="w-full max-w-[1200px]">
        <p className="text-ink-3 text-sm">Loading...</p>
      </div>
    );
  }

  const topLevelComments = thread.comments.filter((c) => !c.parentCommentId);
  const replies = (parentId: string) =>
    thread.comments.filter((c) => c.parentCommentId === parentId);
  const totalReplies = thread.comments.length;
  const uniqueRepliers = new Set(thread.comments.map((c) => c.authorId)).size;

  const authorName =
    thread.author?.displayName || thread.authorName || "Unknown";
  const wasEdited =
    !!thread.updatedAt &&
    new Date(thread.updatedAt).getTime() - new Date(thread.createdAt).getTime() > 1500;

  return (
    <div className="w-full max-w-[1200px]">
      <Link
        href={`/clubs/${clubId}/discussions`}
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeftIcon size={14} />
        Discussions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] gap-6">
        {/* Main column */}
        <div className="min-w-0">
          {/* OP thread card */}
          <Card
            className={`p-7 mb-4 ${thread.isPinned ? "bg-warning-soft/45 border-warning/40" : ""}`}
            data-testid="thread-detail"
            data-pinned={thread.isPinned ? "true" : "false"}
          >
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {/* @spec DISC-UI-PIN-VISUAL-001 */}
              {thread.isPinned && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-accent-ink">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 17v5M5 9l1 5h12l1-5M7 9l2-7h6l2 7" />
                  </svg>
                  PINNED
                </span>
              )}
              {thread.chapterTag ? (
                <ChapterChip tag={thread.chapterTag} chapter={thread.chapterNumber ?? null} />
              ) : (
                <Badge tone="neutral">No tag</Badge>
              )}
              <span className="text-xs text-ink-3">
                · {totalReplies} {totalReplies === 1 ? "reply" : "replies"}
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

            <div className="flex items-center gap-2.5 mb-4">
              <Avatar name={authorName} size="md" />
              <div>
                <div className="text-[13px] font-medium text-ink">{authorName}</div>
                <div className="text-[11px] text-ink-3">
                  {relativeTime(thread.createdAt)}
                  {wasEdited && " · edited"}
                </div>
              </div>
            </div>

            {/* @spec DISC-BE-002, DISC-BE-003 — rendered Markdown, sanitized */}
            {editingThread ? (
              <div className="space-y-2">
                <textarea
                  data-testid="thread-edit-body"
                  className="w-full min-h-[180px] font-[var(--font-display)] text-base text-ink leading-relaxed bg-bg border border-line-strong rounded-[var(--radius-md)] p-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
                      setThread((t) => (t ? { ...t, body: editBody.trim() } : t));
                      setEditingThread(false);
                    }}
                    className="px-3 py-1.5 rounded-[var(--radius-md)] bg-primary text-bg text-sm font-medium disabled:opacity-50 hover:bg-primary-hover transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingThread(false)}
                    className="px-3 py-1.5 rounded-[var(--radius-md)] border border-line-strong text-sm text-ink-2 hover:text-ink hover:border-ink-3 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="prose-thread font-[var(--font-display)] text-base text-ink"
                dangerouslySetInnerHTML={{ __html: renderBodyHtml(thread.body) }}
              />
            )}

            {threadActionError && (
              <p className="text-xs text-danger mt-3" role="alert">
                {threadActionError}
              </p>
            )}
          </Card>

          {/* Comments section */}
          <div className="mb-3 text-[13px] text-ink-3 font-medium">
            {totalReplies} {totalReplies === 1 ? "comment" : "comments"}
          </div>

          <div data-testid="comments-list" className="flex flex-col gap-3">
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

          {/* Sticky composer — sits below the comments with elevated shadow */}
          <div
            className="sticky bottom-0 mt-6 pt-3 pb-3"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--color-bg) 24px)",
            }}
          >
            <Card className="p-3.5 shadow-[var(--shadow-lg)]">
              <CommentComposer
                clubId={clubId}
                threadId={threadId}
                onPosted={loadThread}
              />
              <p className="text-[11px] text-ink-3 mt-2 italic">
                Markdown supported · be kind to readers behind you
              </p>
            </Card>
          </div>
        </div>

        {/* Sidebar — about this thread */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-6 self-start">
          <Card className="p-4">
            <div className="text-[11px] text-ink-3 uppercase tracking-[0.08em] mb-2 font-medium">
              About this thread
            </div>
            <div className="grid gap-2 text-[13px]">
              <div className="flex justify-between gap-2">
                <span className="text-ink-3">Chapter</span>
                <span className="text-ink text-right">
                  {thread.chapterTag ?? "Untagged"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-3">Replies</span>
                <span className="text-ink text-right">
                  {totalReplies} from {uniqueRepliers}{" "}
                  {uniqueRepliers === 1 ? "reader" : "readers"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-3">Started</span>
                <span className="text-ink text-right">
                  {relativeTime(thread.createdAt)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-ink-3">Author</span>
                <span className="text-ink text-right">{authorName}</span>
              </div>
            </div>
          </Card>
        </aside>
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
          className="text-danger hover:underline underline-offset-2"
        >
          Yes, delete
        </button>
        <span className="text-ink-4">·</span>
        <button
          type="button"
          onClick={onCancelDelete}
          className="text-ink-2 hover:text-ink hover:underline underline-offset-2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="ml-auto inline-flex items-center gap-1">
      {canPin && (
        <button
          type="button"
          data-testid="thread-pin-btn"
          onClick={onTogglePin}
          aria-pressed={thread.isPinned ? "true" : "false"}
          title={thread.isPinned ? "Unpin" : "Pin"}
          className={`p-1.5 rounded-[var(--radius-sm)] transition-colors hover:bg-bg-soft ${
            thread.isPinned ? "text-warning" : "text-ink-3 hover:text-ink"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 17v5M5 9l1 5h12l1-5M7 9l2-7h6l2 7" />
          </svg>
        </button>
      )}
      {canEdit && !editing && (
        <button
          type="button"
          data-testid="thread-edit-btn"
          onClick={onStartEdit}
          title="Edit"
          className="p-1.5 rounded-[var(--radius-sm)] text-ink-3 hover:text-primary hover:bg-bg-soft transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          data-testid="thread-delete-btn"
          onClick={onStartDelete}
          title="Delete"
          className="p-1.5 rounded-[var(--radius-sm)] text-ink-3 hover:text-danger hover:bg-bg-soft transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
          </svg>
        </button>
      )}
    </span>
  );
}
