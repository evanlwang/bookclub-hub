// @vitest-environment jsdom
// @spec AUTH-UI-LOGIN-EMAIL-HINT-001, AUTH-UI-LOGIN-PASSCODE-HINT-001, AUTH-UI-LOGIN-AUTOCOMPLETE-001

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the trpc react hooks. Login uses useUtils() and trpc.auth.signIn.useMutation.
vi.mock("@/trpc/react-hooks", () => ({
  trpc: {
    useUtils: () => ({
      auth: { me: { fetch: vi.fn() } },
    }),
    auth: {
      signIn: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

import LoginPage from "@/app/login/page";

describe("LoginPage — email format hint", () => {
  // @spec AUTH-UI-LOGIN-EMAIL-HINT-001
  it("does not show the email-format error when the field is empty", () => {
    render(<LoginPage />);
    expect(screen.queryByTestId("email-format-error")).toBeNull();
  });

  // @spec AUTH-UI-LOGIN-EMAIL-HINT-001
  it("shows the email-format error once the user types an invalid email", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "not-an-email" } });
    const hint = screen.getByTestId("email-format-error");
    expect(hint).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
  });

  // @spec AUTH-UI-LOGIN-EMAIL-HINT-001
  it("clears the hint once the email becomes valid", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "x" } });
    expect(screen.getByTestId("email-format-error")).toBeInTheDocument();
    fireEvent.change(email, { target: { value: "name@example.com" } });
    expect(screen.queryByTestId("email-format-error")).toBeNull();
    expect(email).not.toHaveAttribute("aria-invalid");
  });
});

describe("LoginPage — passcode recovery hint", () => {
  // @spec AUTH-UI-LOGIN-PASSCODE-HINT-001
  it("renders a recovery hint beneath the passcode field", () => {
    render(<LoginPage />);
    expect(
      screen.getByText(/Contact your organizer if you don't have the passcode/i),
    ).toBeInTheDocument();
  });
});

describe("LoginPage — autocomplete attrs", () => {
  // @spec AUTH-UI-LOGIN-AUTOCOMPLETE-001
  it("sets autoComplete on email and passcode inputs", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Pilot passcode")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });
});
