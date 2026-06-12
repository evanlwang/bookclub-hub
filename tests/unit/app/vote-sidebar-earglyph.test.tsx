// @vitest-environment jsdom
// @spec VOTE-UI-005

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createTrpcTestHarness } from "@tests/helpers/trpc-react";
import { VotingPhase } from "@/app/clubs/[clubId]/vote/voting-phase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
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

describe("VotingPhase sidebar — approval indicator as EarGlyphs", () => {
  // @spec VOTE-UI-005
  it("renders dog-ear glyphs (not check circles) with the correct filled count", () => {
    const harness = createTrpcTestHarness((path) => {
      if (path === "rounds.turnout")
        return { voterCount: 1, memberCount: 4, status: "voting" };
      throw new Error(`unexpected ${path}`);
    });

    render(
      <harness.Wrapper>
        <VotingPhase
          clubId={clubId}
          roundId={roundId}
          nominations={nominations}
          maxApprovals={3}
          myVotes={[nominations[0].id]}
          isAdmin={false}
          initialTurnout={{ voterCount: 1, memberCount: 4, status: "voting" }}
          closePreview={null}
          activeVotingDeadline={null}
        />
      </harness.Wrapper>,
    );

    const dots = screen.getAllByTestId("approval-dot");
    expect(dots).toHaveLength(3);
    expect(dots[0].getAttribute("data-filled")).toBe("true");
    expect(dots[1].getAttribute("data-filled")).toBe("false");
    // The dog-ear idiom replaced the circle-with-checkmark adaptation:
    // every slot is an EarGlyph, and no SVG checkmark renders.
    for (const dot of dots) {
      expect(dot.getAttribute("data-glyph")).toBe("ear");
      expect(dot.querySelector("svg")).toBeNull();
    }
  });
});
