// @vitest-environment jsdom
// @spec DISC-UI-COMMENT-OPTIMISTIC-001

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/trpc/react-hooks";
import {
  createTrpcTestHarness,
  deferred,
  type TrpcHandler,
} from "@tests/helpers/trpc-react";
import { CommentComposer } from "@/app/clubs/[clubId]/discussions/comment-composer";

const clubId = "11111111-1111-4111-8111-111111111111";
const threadId = "22222222-2222-4222-8222-222222222222";

const viewer = {
  user: { id: "viewer-1", displayName: "Alice Chen", email: "alice@example.com" },
  clubs: [],
};

const baseThread = {
  thread: {
    id: threadId,
    title: "t",
    body: "Thread body",
    chapterTag: null,
    chapterNumber: null,
    authorId: "someone-else",
    author: { displayName: "Bob" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    comments: [] as Array<Record<string, unknown>>,
  },
};

function setup(handler: TrpcHandler) {
  const harness = createTrpcTestHarness((path, input) => {
    if (path === "auth.me") return viewer;
    return handler(path, input);
  });
  const threadKey = getQueryKey(
    trpc.threads.get,
    { clubId, threadId },
    "query",
  );
  harness.queryClient.setQueryData(threadKey, structuredClone(baseThread));
  // Seed the viewer cache — in the app, auth.me is already cached from page
  // load, so the optimistic comment can attribute to the real display name.
  harness.queryClient.setQueryData(
    getQueryKey(trpc.auth.me, undefined, "query"),
    structuredClone(viewer),
  );
  const cachedComments = () =>
    (
      harness.queryClient.getQueryData(threadKey) as typeof baseThread | undefined
    )?.thread.comments ?? [];
  return { ...harness, cachedComments };
}

describe("CommentComposer — optimistic append", () => {
  // @spec DISC-UI-COMMENT-OPTIMISTIC-001
  it("appends a pending comment to the cache before the server responds, then reconciles", async () => {
    const gate = deferred<unknown>();
    const onPosted = vi.fn();
    const { Wrapper, cachedComments } = setup((path) => {
      if (path === "comments.create") return gate.promise;
      if (path === "threads.get") return structuredClone(baseThread);
      throw new Error(`unexpected ${path}`);
    });

    render(
      <Wrapper>
        <CommentComposer clubId={clubId} threadId={threadId} onPosted={onPosted} />
      </Wrapper>,
    );

    fireEvent.change(screen.getByTestId("comment-input"), {
      target: { value: "Hot take about chapter 3" },
    });
    fireEvent.click(screen.getByTestId("submit-comment-btn"));

    // Optimistic: temp comment in cache immediately, marked pending,
    // attributed to the viewer; draft still in the textarea.
    await waitFor(() => {
      expect(cachedComments()).toHaveLength(1);
    });
    const temp = cachedComments()[0] as Record<string, unknown>;
    expect(temp.pending).toBe(true);
    expect(temp.body).toBe("Hot take about chapter 3");
    expect((temp.author as { displayName: string }).displayName).toBe(
      "Alice Chen",
    );
    expect(
      (screen.getByTestId("comment-input") as HTMLTextAreaElement).value,
    ).toBe("Hot take about chapter 3");

    gate.resolve({ comment: { id: "real-1" } });

    // Success: draft cleared, onPosted fired.
    await waitFor(() => {
      expect(
        (screen.getByTestId("comment-input") as HTMLTextAreaElement).value,
      ).toBe("");
      expect(onPosted).toHaveBeenCalled();
    });
  });

  // @spec DISC-UI-COMMENT-OPTIMISTIC-001 — rollback; DISC-UI-COMPOSER-DRAFT-PRESERVE-001 upheld
  it("removes the pending comment and preserves the draft when the mutation fails", async () => {
    const gate = deferred<unknown>();
    const { Wrapper, cachedComments } = setup((path) => {
      if (path === "comments.create") return gate.promise;
      if (path === "threads.get") return structuredClone(baseThread);
      throw new Error(`unexpected ${path}`);
    });

    render(
      <Wrapper>
        <CommentComposer clubId={clubId} threadId={threadId} onPosted={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.change(screen.getByTestId("comment-input"), {
      target: { value: "Doomed comment" },
    });
    fireEvent.click(screen.getByTestId("submit-comment-btn"));

    await waitFor(() => {
      expect(cachedComments()).toHaveLength(1);
    });

    gate.reject(new Error("Server exploded"));

    await waitFor(() => {
      // Rollback removed the temp comment...
      expect(cachedComments()).toHaveLength(0);
      // ...the error is shown...
      expect(screen.getByText(/server exploded/i)).toBeTruthy();
    });
    // ...and the draft survives verbatim.
    expect(
      (screen.getByTestId("comment-input") as HTMLTextAreaElement).value,
    ).toBe("Doomed comment");
  });
});
