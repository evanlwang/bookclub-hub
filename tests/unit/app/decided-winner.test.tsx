// @vitest-environment jsdom
// @spec VOTE-UI-DEC-WINNER-001

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createTrpcTestHarness } from "@tests/helpers/trpc-react";
import { DecidedPhase } from "@/app/clubs/[clubId]/vote/decided-phase";
import type { Nomination } from "@/app/clubs/[clubId]/vote/vote-round-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/clubs/club-1/vote",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const clubId = "11111111-1111-4111-8111-111111111111";

// Ordered by tally rank (rounds.get returns winner first — VOTE-API-VISIBILITY-002).
const nominations: Nomination[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    book: { id: "b1", title: "Dune", author: "Frank Herbert" },
    nominator: { displayName: "Bob" },
    voteCount: 6,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    book: { id: "b2", title: "Kindred", author: "Octavia Butler" },
    nominator: { displayName: "Carol" },
    voteCount: 4,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    book: { id: "b3", title: "Orbital", author: "Samantha Harvey" },
    nominator: { displayName: "Dave" },
    voteCount: 2,
  },
];

function renderDecided(props: Partial<React.ComponentProps<typeof DecidedPhase>> = {}) {
  const harness = createTrpcTestHarness(() => ({}));
  return render(
    <harness.Wrapper>
      <DecidedPhase
        clubId={clubId}
        nominations={nominations}
        isAdmin={false}
        {...props}
      />
    </harness.Wrapper>,
  );
}

describe("DecidedPhase — winner card", () => {
  // @spec VOTE-UI-DEC-WINNER-001 — the winner gets the #1 rank badge and a
  // rubber-stamp seal carrying its vote count.
  it("crowns the top nomination with a stamped seal and its vote count", () => {
    renderDecided();
    const card = screen.getByTestId("decided-winner-card");
    expect(
      within(card).getByRole("heading", { name: "Dune" }),
    ).toBeInTheDocument();
    expect(within(card).getByText("1")).toBeInTheDocument();
    const stamp = screen.getByTestId("decided-winner-stamp");
    expect(stamp).toHaveTextContent("PICK");
    expect(stamp).toHaveTextContent("6 VOTES");
  });

  // @spec VOTE-UI-DEC-WINNER-001 — the winner appears only in the card above,
  // so the tally list starts at rank 2 and never repeats the winner.
  it("excludes the winner from the runner-up tally list", () => {
    renderDecided();
    const card = screen.getByTestId("decided-winner-card");
    // Every mention of the winner (heading + cover band) is inside the winner
    // card — it is never repeated in the tally list below.
    for (const dune of screen.getAllByText("Dune")) {
      expect(card).toContainElement(dune);
    }
    // Runner-ups render only in the tally list, never in the winner card.
    expect(within(card).queryByText("Kindred")).not.toBeInTheDocument();
    expect(screen.getAllByText("Kindred").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Orbital").length).toBeGreaterThan(0);
  });

  // @spec VOTE-UI-DEC-WINNER-001 — a lone winner shows a graceful empty tally.
  it("explains an empty runner-up list when the winner ran unopposed", () => {
    renderDecided({ nominations: [nominations[0]] });
    expect(
      screen.getByText("No other nominations this round."),
    ).toBeInTheDocument();
  });
});
