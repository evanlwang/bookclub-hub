// @vitest-environment jsdom
// @spec CLUB-NAV-BADGE-LIVE-001

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  createTrpcTestHarness,
  type TrpcHandler,
} from "@tests/helpers/trpc-react";
import { useNavState, type NavState } from "@/lib/hooks/use-nav-state";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/clubs/club-1",
}));

// The switcher modal pulls in its own query tree — not under test here.
vi.mock("@/components/club/club-switcher-modal", () => ({
  ClubSwitcherModal: () => null,
}));

import { ClubSidebar } from "@/app/clubs/[clubId]/sidebar";
import { MarkDiscussionsVisited } from "@/app/clubs/[clubId]/discussions/mark-visited";

const clubId = "11111111-1111-4111-8111-111111111111";

const activeNavState: NavState = {
  hasActiveVote: true,
  hasUnrespondedMeeting: true,
  unreadDiscussionCounts: { [clubId]: 3 },
};

const quietNavState: NavState = {
  hasActiveVote: false,
  hasUnrespondedMeeting: false,
  unreadDiscussionCounts: { [clubId]: 0 },
};

beforeEach(() => {
  refresh.mockClear();
});

describe("ClubSidebar — badges from clubs.navState query", () => {
  // @spec CLUB-NAV-BADGE-LIVE-001
  it("renders Live / Respond / unread badges from the seeded query and updates on invalidation", async () => {
    let navStateResponse: NavState = activeNavState;
    const harness = createTrpcTestHarness((path) => {
      if (path === "clubs.navState") return navStateResponse;
      throw new Error(`unexpected ${path}`);
    });

    render(
      <harness.Wrapper>
        <ClubSidebar
          clubId={clubId}
          clubName="Test Club"
          userName="Alice"
          clubs={[{ id: clubId, name: "Test Club", code: "TEST", role: "member" }]}
          initialNavState={activeNavState}
        />
      </harness.Wrapper>,
    );

    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.getByTestId("sidebar-meetings-badge")).toBeTruthy();
    expect(screen.getByTestId("sidebar-discussions-unread").textContent).toContain("3");

    // A mutation elsewhere invalidates the query → badges update in place,
    // proving they render from the cache, not from frozen props.
    navStateResponse = quietNavState;
    await act(async () => {
      await harness.queryClient.invalidateQueries();
    });

    await waitFor(() => {
      expect(screen.queryByText("Live")).toBeNull();
      expect(screen.queryByTestId("sidebar-meetings-badge")).toBeNull();
      expect(screen.queryByTestId("sidebar-discussions-unread")).toBeNull();
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("MarkDiscussionsVisited — clears the badge via navState invalidation", () => {
  // @spec CLUB-NAV-BADGE-LIVE-001, CLUB-NAV-UNREAD-001
  function NavStateProbe({ initial }: { initial: NavState }) {
    const nav = useNavState(clubId, initial);
    return (
      <span data-testid="probe-unread">
        {nav.unreadDiscussionCounts[clubId] ?? 0}
      </span>
    );
  }

  it("marks visited, then invalidates clubs.navState instead of router.refresh()", async () => {
    let marked = false;
    const handler: TrpcHandler = (path) => {
      if (path === "clubs.markDiscussionsVisited") {
        marked = true;
        return { success: true };
      }
      if (path === "clubs.navState") {
        // After marking, the server reports zero unread.
        return marked ? quietNavState : activeNavState;
      }
      throw new Error(`unexpected ${path}`);
    };
    const harness = createTrpcTestHarness(handler);

    render(
      <harness.Wrapper>
        <NavStateProbe initial={activeNavState} />
        <MarkDiscussionsVisited clubId={clubId} />
      </harness.Wrapper>,
    );

    expect(screen.getByTestId("probe-unread").textContent).toBe("3");

    // Mutation fires on mount → onSuccess invalidates navState → the probe
    // refetches and the unread count clears, with no full-layout refresh.
    await waitFor(() => {
      expect(screen.getByTestId("probe-unread").textContent).toBe("0");
    });
    expect(marked).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
  });
});
