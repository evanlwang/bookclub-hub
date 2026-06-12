// @vitest-environment jsdom
// @spec PROG-UI-OPTIMISTIC-001

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/trpc/react-hooks";
import {
  createTrpcTestHarness,
  deferred,
  type TrpcHandler,
} from "@tests/helpers/trpc-react";
import { UpdateProgressButton } from "@/app/clubs/[clubId]/progress/update-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/clubs/club-1/progress",
}));

const clubId = "11111111-1111-4111-8111-111111111111";
const bookId = "22222222-2222-4222-8222-222222222222";

const viewer = {
  user: { id: "viewer-1", displayName: "Alice Chen", email: "alice@example.com" },
  clubs: [],
};

const initialList = [
  {
    userId: "viewer-1",
    user: { displayName: "Alice Chen" },
    currentPage: 50,
    totalPages: 400,
    percentage: 13,
    currentChapter: 2,
    status: "reading",
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "other-1",
    user: { displayName: "Bob" },
    currentPage: 200,
    totalPages: 400,
    percentage: 50,
    currentChapter: 10,
    status: "reading",
    updatedAt: new Date().toISOString(),
  },
];

function setup(handler: TrpcHandler) {
  const harness = createTrpcTestHarness((path, input) => {
    if (path === "auth.me") return viewer;
    return handler(path, input);
  });
  const listKey = getQueryKey(trpc.progress.list, { clubId, bookId }, "query");
  harness.queryClient.setQueryData(listKey, structuredClone(initialList));
  harness.queryClient.setQueryData(
    getQueryKey(trpc.auth.me, undefined, "query"),
    structuredClone(viewer),
  );
  const viewerRow = () =>
    (
      harness.queryClient.getQueryData(listKey) as
        | typeof initialList
        | undefined
    )?.find((p) => p.userId === "viewer-1");
  return { ...harness, viewerRow };
}

async function openModalAndSetPage(page: number) {
  fireEvent.click(screen.getByTestId("update-progress-btn"));
  await waitFor(() => expect(screen.getByTestId("page-input")).toBeTruthy());
  fireEvent.change(screen.getByTestId("page-input"), {
    target: { value: String(page) },
  });
  fireEvent.click(screen.getByTestId("save-progress-btn"));
}

describe("UpdateProgressButton — optimistic progress save", () => {
  // @spec PROG-UI-OPTIMISTIC-001
  it("rewrites the viewer's row in the progress.list cache before the server responds", async () => {
    const gate = deferred<unknown>();
    const { Wrapper, viewerRow } = setup((path) => {
      if (path === "progress.update") return gate.promise;
      if (path === "progress.list") return structuredClone(initialList);
      throw new Error(`unexpected ${path}`);
    });

    render(
      <Wrapper>
        <UpdateProgressButton
          clubId={clubId}
          bookId={bookId}
          totalPages={400}
          currentProgress={{
            currentPage: 50,
            percentage: 13,
            currentChapter: 2,
            status: "reading",
          }}
        />
      </Wrapper>,
    );

    await openModalAndSetPage(100);

    // Optimistic: cache row updated while the mutation is still in flight.
    await waitFor(() => {
      expect(viewerRow()?.currentPage).toBe(100);
      expect(viewerRow()?.percentage).toBe(25);
    });

    gate.resolve({
      progress: { currentPage: 100, percentage: 25, status: "reading" },
    });
    // Success: modal closes, toast appears.
    await waitFor(() => {
      expect(screen.getByTestId("progress-saved-toast")).toBeTruthy();
    });
  });

  // @spec PROG-UI-OPTIMISTIC-001 — rollback on error
  it("restores the prior row and shows the inline error when the save fails", async () => {
    const gate = deferred<unknown>();
    const { Wrapper, viewerRow } = setup((path) => {
      if (path === "progress.update") return gate.promise;
      if (path === "progress.list") return structuredClone(initialList);
      throw new Error(`unexpected ${path}`);
    });

    render(
      <Wrapper>
        <UpdateProgressButton
          clubId={clubId}
          bookId={bookId}
          totalPages={400}
          currentProgress={{
            currentPage: 50,
            percentage: 13,
            currentChapter: 2,
            status: "reading",
          }}
        />
      </Wrapper>,
    );

    await openModalAndSetPage(100);
    await waitFor(() => {
      expect(viewerRow()?.currentPage).toBe(100);
    });

    gate.reject(new Error("Save rejected"));

    await waitFor(() => {
      // Rollback restored the old row...
      expect(viewerRow()?.currentPage).toBe(50);
      // ...and the modal stays open with the inline error (PROG-ERR-001).
      expect(screen.getByTestId("modal-error").textContent).toContain(
        "Save rejected",
      );
    });
  });
});
