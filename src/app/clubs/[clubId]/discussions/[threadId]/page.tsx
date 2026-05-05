"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Avatar, Button } from "@/components/ui";
import { CommentComposer } from "../comment-composer";

type Comment = {
  id: string;
  body: string;
  authorName?: string;
  author?: { displayName: string };
  parentCommentId: string | null;
  createdAt: string;
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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
      {/* Thread header */}
      <div className="mb-6" data-testid="thread-detail">
        <div className="flex items-center gap-2 mb-2">
          {thread.chapterTag && (
            <Badge tone="neutral">[{thread.chapterTag}]</Badge>
          )}
        </div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-ink tracking-tight mb-2">
          {thread.title}
        </h1>
        <div className="flex items-center gap-2 text-xs text-ink-3 mb-4">
          <Avatar name={authorName} size="sm" />
          <span>{authorName}</span>
          <span>·</span>
          <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
          {thread.body}
        </div>
      </div>

      <hr className="border-line mb-6" />

      {/* Comments */}
      <div data-testid="comments-list" className="space-y-4 mb-6">
        {topLevelComments.length === 0 && (
          <p className="text-ink-3 text-sm">No comments yet. Be the first!</p>
        )}
        {topLevelComments.map((comment) => {
          const cAuthor =
            comment.author?.displayName || comment.authorName || "Unknown";
          return (
            <div
              key={comment.id}
              data-testid={`comment-${comment.id}`}
              className="space-y-3"
            >
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={cAuthor} size="sm" />
                  <span className="text-xs font-medium text-ink-2">
                    {cAuthor}
                  </span>
                  <span className="text-xs text-ink-3">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-ink leading-relaxed">
                  {comment.body}
                </p>
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setReplyingTo(
                        replyingTo === comment.id ? null : comment.id
                      )
                    }
                    data-testid={`reply-btn-${comment.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Reply
                  </button>
                </div>
                {replyingTo === comment.id && (
                  <div className="mt-3 pl-4 border-l-2 border-line">
                    <CommentComposer
                      clubId={clubId}
                      threadId={threadId}
                      parentCommentId={comment.id}
                      onPosted={() => {
                        setReplyingTo(null);
                        loadThread();
                      }}
                      onCancel={() => setReplyingTo(null)}
                      placeholder="Write a reply…"
                    />
                  </div>
                )}
              </Card>

              {/* Nested replies */}
              {replies(comment.id).map((reply) => {
                const rAuthor =
                  reply.author?.displayName || reply.authorName || "Unknown";
                return (
                  <div
                    key={reply.id}
                    data-testid={`reply-${reply.id}`}
                    className="ml-6 pl-4 border-l-2 border-line"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={rAuthor} size="sm" />
                      <span className="text-xs font-medium text-ink-2">
                        {rAuthor}
                      </span>
                    </div>
                    <p className="text-sm text-ink">{reply.body}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
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
