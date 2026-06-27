// @vitest-environment jsdom
// @spec AUTH-UI-LOGIN-EMAIL-HINT-001, AUTH-UI-LOGIN-AUTOCOMPLETE-001, AUTH-UI-LOGIN-001

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

// The login page kicks off conditional passkey autofill in a useEffect via
// @simplewebauthn/browser. Stub it so jsdom stays quiet (no real authenticator).
vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: vi.fn(),
  browserSupportsWebAuthnAutofill: vi.fn().mockResolvedValue(false),
}));

// Mock the trpc react hooks. Login uses useUtils() plus the passkey + OTP
// mutations (startPasskeyLogin, finishPasskeyLogin, requestOtp, verifyOtp).
vi.mock("@/trpc/react-hooks", () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    trpc: {
      useUtils: () => ({
        auth: { me: { fetch: vi.fn() } },
      }),
      auth: {
        startPasskeyLogin: { useMutation: mutation },
        finishPasskeyLogin: { useMutation: mutation },
        requestOtp: { useMutation: mutation },
        verifyOtp: { useMutation: mutation },
      },
    },
  };
});

import LoginPage from "@/app/login/page";

describe("LoginPage — passkey-first controls", () => {
  // @spec AUTH-UI-LOGIN-001
  it("renders a passkey login button", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("passkey-login")).toBeInTheDocument();
  });

  // @spec AUTH-UI-LOGIN-001
  it("renders an email-me-a-code button", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("send-code")).toBeInTheDocument();
  });
});

describe("LoginPage — email input", () => {
  // @spec AUTH-UI-LOGIN-AUTOCOMPLETE-001
  it("sets autoComplete to 'email webauthn' on the email input", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email webauthn",
    );
  });
});

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
