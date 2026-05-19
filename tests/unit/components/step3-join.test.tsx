// @vitest-environment jsdom
// @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// next/link is used inside Step3Join; jsdom-safe stub.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { Step3Join } from "@/app/join/_step3-join";

function renderStep(overrides: Partial<React.ComponentProps<typeof Step3Join>> = {}) {
  const props: React.ComponentProps<typeof Step3Join> = {
    code: "OAKWOOD-7Q",
    onCodeChange: vi.fn(),
    lookupLoading: false,
    clubInfo: { name: "Oakwood Readers", memberCount: 5 },
    joinError: "",
    joinReady: true,
    joiningClub: false,
    alreadyMember: null,
    onSubmit: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<Step3Join {...props} />) };
}

describe("Step3Join — already-member banner", () => {
  // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001
  it("renders nothing when alreadyMember is null", () => {
    renderStep({ alreadyMember: null });
    expect(screen.queryByTestId("already-member-banner")).toBeNull();
  });

  // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001
  it("renders the banner with the club name and a deep link when alreadyMember is set", () => {
    renderStep({
      alreadyMember: { id: "club-abc", name: "Oakwood Readers" },
    });
    expect(screen.getByTestId("already-member-banner")).toBeInTheDocument();
    expect(
      screen.getByText(/already in Oakwood Readers/i),
    ).toBeInTheDocument();
    const link = screen.getByTestId("already-member-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/clubs/club-abc");
  });

  // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001
  it("disables the Join button while the already-member banner is visible", () => {
    renderStep({
      alreadyMember: { id: "club-abc", name: "Oakwood Readers" },
    });
    const join = screen.getByRole("button", { name: /Join Oakwood Readers/i });
    expect(join).toBeDisabled();
  });

  // @spec AUTH-UI-STEP3A-ALREADY-MEMBER-001
  it("does NOT call onSubmit when the Join button is clicked while alreadyMember is set", () => {
    const onSubmit = vi.fn();
    renderStep({
      onSubmit,
      alreadyMember: { id: "club-abc", name: "Oakwood Readers" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Join Oakwood Readers/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
