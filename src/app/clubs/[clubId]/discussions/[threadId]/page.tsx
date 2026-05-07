"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge, Avatar } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { CommentComposer } from "../comment-composer";
import { CommentItem, type CommentLike } from "./comment-item";

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
  createdAt: string;
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
      <div className="mb-6" data-testid="thread-detail">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {thread.chapterTag && (
            <Badge tone="neutral">[{thread.chapterTag}]</Badge>
          )}
          <Avatar name={authorName} size="sm" />
          <span className="text-xs text-ink-3">
            {authorName} · {new Date(thread.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="text-base text-ink leading-relaxed whitespace-pre-wrap">
          {thread.body}
        </div>
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
