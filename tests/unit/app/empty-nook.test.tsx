// @vitest-environment jsdom
// @spec DASH-UI-EMPTY-NOOK-001, DASH-UI-EMPTY-SETUP-001, DASH-UI-EMPTY-UNLOCKS-001

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyNook } from "@/app/clubs/[clubId]/empty-nook";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const clubId = "club-1";

function renderNook(props: Partial<React.ComponentProps<typeof EmptyNook>> = {}) {
  return render(
    <EmptyNook
      clubId={clubId}
      clubName="Wednesday Reads"
      code="WEDREADS"
      memberCount={1}
      admin={false}
      {...props}
    />,
  );
}

describe("EmptyNook — first-run reading nook", () => {
  // @spec DASH-UI-EMPTY-NOOK-001
  it("welcomes a fresh club with its name and the page-edge promise", () => {
    renderNook();
    expect(screen.getByText("It’s quiet in here.")).toBeInTheDocument();
    expect(
      screen.getByText(/Wednesday Reads is a fresh shelf/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/everyone’s bookmarks line up here/),
    ).toBeInTheDocument();
  });

  // @spec DASH-UI-EMPTY-SETUP-001
  it("shows the invite code and a copy button in the setup rail", () => {
    renderNook();
    expect(screen.getByTestId("empty-club-code")).toHaveTextContent("WEDREADS");
    expect(screen.getByTestId("empty-copy-code-btn")).toBeInTheDocument();
    expect(screen.getByText("Just you so far")).toBeInTheDocument();
  });

  // @spec DASH-UI-EMPTY-SETUP-001 — member count pluralizes past the first member.
  it("counts members past yourself", () => {
    renderNook({ memberCount: 3 });
    expect(screen.getByText("3 members so far")).toBeInTheDocument();
  });

  // @spec DASH-UI-EMPTY-SETUP-001 — admin can start the ballot; the CTA routes to vote.
  it("offers admins a 'Start a book vote' CTA linking to the vote page", () => {
    renderNook({ admin: true });
    const cta = screen.getByTestId("empty-start-vote");
    expect(cta).toHaveTextContent("Start a book vote");
    expect(cta).toHaveAttribute("href", `/clubs/${clubId}/vote`);
    expect(screen.getByText("I’ll pick")).toBeInTheDocument();
  });

  // @spec DASH-UI-EMPTY-SETUP-001 — members nominate rather than open the ballot.
  it("offers members a 'Nominate a book' CTA and hides the admin 'I’ll pick' shortcut", () => {
    renderNook({ admin: false });
    expect(screen.getByTestId("empty-start-vote")).toHaveTextContent(
      "Nominate a book",
    );
    expect(screen.queryByText("I’ll pick")).not.toBeInTheDocument();
  });

  // @spec DASH-UI-EMPTY-UNLOCKS-001
  it("teaches the populated layout with the 'fills in next' strip", () => {
    renderNook();
    expect(screen.getByText("Then the nook fills in")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Margin notes")).toBeInTheDocument();
    expect(screen.getByText("Reading progress")).toBeInTheDocument();
  });
});
