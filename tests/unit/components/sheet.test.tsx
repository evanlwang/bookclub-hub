// @vitest-environment jsdom
// @spec OVERLAY-SHEET-001, OVERLAY-SHEET-002
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sheet } from "@/components/ui/sheet";

describe("Sheet — overlay primitive", () => {
  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={() => {}}>
        <p>hello</p>
      </Sheet>,
    );
    expect(screen.queryByText("hello")).toBeNull();
  });

  it("renders children inside a dialog when open", () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="Test sheet">
        <p>hello</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Test sheet");
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("calls onClose on Escape when dismissible", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="s">
        <button>x</button>
      </Sheet>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape when not dismissible (e.g. mid-submit)", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} dismissible={false} ariaLabel="s">
        <button>x</button>
      </Sheet>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on backdrop tap but not on inner-content tap", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="s">
        <button>inner</button>
      </Sheet>,
    );
    fireEvent.click(screen.getByText("inner"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
