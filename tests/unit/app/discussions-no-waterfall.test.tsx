// @vitest-environment jsdom
// @spec DISC-UI-FETCH-PARALLEL-001

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createTrpcTestHarness } from "@tests/helpers/trpc-react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/clubs/club-1/discussions",
}));

import { DiscussionsContent } from "@/app/clubs/[clubId]/discussions/discussions-content";

const clubId = "11111111-1111-4111-8111-111111111111";
const bookId = "22222222-2222-4222-8222-222222222222";

describe("DiscussionsContent — no client-side fetch waterfall", () => {
  // @spec DISC-UI-FETCH-PARALLEL-001
  it("fetches threads.list immediately with the server-derived cutoff; never selections.list or progress.me", async () => {
    const calls: Array<{ path: string; input: unknown }> = [];
    const harness = createTrpcTestHarness((path, input) => {
      calls.push({ path, input });
      if (path === "threads.list") return { threads: [], hiddenCount: 2 };
      if (path === "clubs.markDiscussionsVisited") return { success: true };
      if (path === "clubs.navState")
        return {
          hasActiveVote: false,
          hasUnrespondedMeeting: false,
          unreadDiscussionCounts: {},
        };
      throw new Error(`unexpected ${path}`);
    });

    render(
      <harness.Wrapper>
        <DiscussionsContent
          clubId={clubId}
          currentBookId={bookId}
          initialCutoff={3}
        />
      </harness.Wrapper>,
    );

    // The spoiler input is pre-seeded from the server-derived cutoff — no
    // client round trips needed to compute it.
    expect(
      (screen.getByTestId("max-chapter-input") as HTMLInputElement).value,
    ).toBe("3");

    await waitFor(() => {
      expect(calls.some((c) => c.path === "threads.list")).toBe(true);
    });
    const threadsCall = calls.find((c) => c.path === "threads.list")!;
    expect(threadsCall.input).toMatchObject({
      clubId,
      bookId,
      maxChapter: 3,
    });

    // The old waterfall is gone: book + progress resolve server-side.
    const paths = calls.map((c) => c.path);
    expect(paths).not.toContain("selections.list");
    expect(paths).not.toContain("progress.me");

    // Hidden count from the filtered query renders.
    await waitFor(() => {
      expect(screen.getByTestId("hidden-count").textContent).toContain("2");
    });
  });
});
