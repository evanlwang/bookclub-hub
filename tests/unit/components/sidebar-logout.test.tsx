// @vitest-environment jsdom
// @spec AUTH-UI-LOGOUT-INVALIDATE-001

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/clubs/club-1",
}));

const logoutMutate = vi.fn().mockResolvedValue({ success: true });
const invalidate = vi.fn().mockResolvedValue(undefined);

vi.mock("@/trpc/react-hooks", () => ({
  trpc: {
    useUtils: () => ({ invalidate }),
    auth: {
      logout: {
        useMutation: () => ({
          mutateAsync: logoutMutate,
          isPending: false,
        }),
      },
    },
  },
}));

// Stub the switcher modal — its internals call other hooks we don't need here.
vi.mock("@/components/club/club-switcher-modal", () => ({
  ClubSwitcherModal: () => null,
}));

import { ClubSidebar } from "@/app/clubs/[clubId]/sidebar";

describe("ClubSidebar — sign out", () => {
  // @spec AUTH-UI-LOGOUT-INVALIDATE-001
  it("invalidates every cached query after auth.logout resolves", async () => {
    render(
      <ClubSidebar
        clubId="club-1"
        clubName="Test Club"
        userName="Alice"
        clubs={[{ id: "club-1", name: "Test Club", code: "TEST", role: "member" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(logoutMutate).toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/");
    });
  });
});
