// @vitest-environment jsdom
// @spec VOTE-UI-OPTIMISTIC-001, VOTE-UI-LIVE-POLL-001

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  createTrpcTestHarness,
  deferred,
  type TrpcHandler,
} from "@tests/helpers/trpc-react";
import { VotingPhase } from "@/app/clubs/[clubId]/vote/voting-phase";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/clubs/club-1/vote",
}));

const clubId = "11111111-1111-4111-8111-111111111111";
const roundId = "33333333-3333-4333-8333-333333333333";

const nominations = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    book: { id: "b1", title: "Dune", author: "Frank Herbert" },
    nominator: { displayName: "Bob" },
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    book: { id: "b2", title: "Kindred", author: "Octavia Butler" },
    nominator: { displayName: "Carol" },
  },
];

function renderVotingPhase(
  handler: TrpcHandler,
  props: Partial<React.ComponentProps<typeof VotingPhase>> = {},
) {
  const harness = createTrpcTestHarness(handler);
  const view = render(
    <harness.Wrapper>
      <VotingPhase
        clubId={clubId}
        roundId={roundId}
        nominations={nominations}
        maxApprovals={3}
        myVotes={[]}
        isAdmin={false}
        initialTurnout={{ voterCount: 0, memberCount: 4, status: "voting" }}
        closePreview={null}
        activeVotingDeadline={null}
        {...props}
      />
    </harness.Wrapper>,
  );
  return { ...harness, view };
}

beforeEach(() => {
  refresh.mockClear();
});

describe("VotingPhase — optimistic vote submit", () => {
  // @spec VOTE-UI-OPTIMISTIC-001
  it("flips the button to saved and bumps turnout before the server responds (first vote)", async () => {
    const gate = deferred<unknown>();
    renderVotingPhase((path) => {
      if (path === "votes.submit") return gate.promise;
      if (path === "rounds.turnout")
        return { voterCount: 1, memberCount: 4, status: "voting" };
      throw new Error(`unexpected ${path}`);
    });

    fireEvent.click(screen.getByTestId(`nomination-${nominations[0].id}`));
    fireEvent.click(screen.getByTestId("submit-votes-btn"));

    // Optimistic paint — server has not responded yet.
    await waitFor(() => {
      expect(
        screen.getByTestId("submit-votes-btn").getAttribute("data-state"),
      ).toBe("saved");
    });
    expect(screen.getByTestId("voter-turnout").textContent).toContain("1");
    expect(screen.getByTestId("voter-turnout").textContent).toContain("of 4");

    gate.resolve({ success: true, voteCount: 1 });
    await waitFor(() => {
      expect(screen.getByTestId("vote-success")).toBeTruthy();
    });
    // No full-page refresh on the counter path.
    expect(refresh).not.toHaveBeenCalled();
  });

  // @spec VOTE-UI-OPTIMISTIC-001 — turnout must NOT bump on a re-vote
  it("does not bump turnout when an already-voted member saves changes", async () => {
    const gate = deferred<unknown>();
    renderVotingPhase(
      (path) => {
        if (path === "votes.submit") return gate.promise;
        if (path === "rounds.turnout")
          return { voterCount: 2, memberCount: 4, status: "voting" };
        throw new Error(`unexpected ${path}`);
      },
      {
        myVotes: [nominations[0].id],
        initialTurnout: { voterCount: 2, memberCount: 4, status: "voting" },
      },
    );

    // Toggle a different nomination → "Save changes", then submit.
    fireEvent.click(screen.getByTestId(`nomination-${nominations[1].id}`));
    fireEvent.click(screen.getByTestId("submit-votes-btn"));

    await waitFor(() => {
      expect(
        screen.getByTestId("submit-votes-btn").getAttribute("data-state"),
      ).toBe("saved");
    });
    expect(screen.getByTestId("voter-turnout").textContent).toContain("2");
    gate.resolve({ success: true, voteCount: 2 });
  });

  // @spec VOTE-UI-OPTIMISTIC-001 — rollback on error
  it("restores button state and turnout when the mutation fails", async () => {
    const gate = deferred<unknown>();
    renderVotingPhase((path) => {
      if (path === "votes.submit") return gate.promise;
      if (path === "rounds.turnout")
        return { voterCount: 0, memberCount: 4, status: "voting" };
      throw new Error(`unexpected ${path}`);
    });

    fireEvent.click(screen.getByTestId(`nomination-${nominations[0].id}`));
    fireEvent.click(screen.getByTestId("submit-votes-btn"));
    await waitFor(() => {
      expect(
        screen.getByTestId("submit-votes-btn").getAttribute("data-state"),
      ).toBe("saved");
    });

    gate.reject(new Error("Vote rejected"));

    await waitFor(() => {
      expect(screen.getByText(/vote rejected/i)).toBeTruthy();
      expect(
        screen.getByTestId("submit-votes-btn").getAttribute("data-state"),
      ).toBe("first-submit");
    });
    expect(screen.getByTestId("voter-turnout").textContent).toContain("0");
  });

  // @spec VOTE-UI-LIVE-POLL-001 — polled status change triggers one structural refresh
  it("calls router.refresh once when the polled round status leaves voting", async () => {
    const gate = deferred<unknown>();
    renderVotingPhase((path) => {
      if (path === "votes.submit") return gate.promise;
      if (path === "rounds.turnout")
        // Reconciliation fetch reports the round was closed by an admin.
        return { voterCount: 3, memberCount: 4, status: "decided" };
      throw new Error(`unexpected ${path}`);
    });

    fireEvent.click(screen.getByTestId(`nomination-${nominations[0].id}`));
    fireEvent.click(screen.getByTestId("submit-votes-btn"));
    gate.resolve({ success: true, voteCount: 1 });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });
});
