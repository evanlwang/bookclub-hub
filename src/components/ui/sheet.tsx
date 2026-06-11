// @spec OVERLAY-SHEET-001, OVERLAY-SHEET-002
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

/**
 * One overlay primitive for the whole app. Below `md` it renders as a bottom
 * sheet — anchored to the bottom edge, rounded top, slide-up entrance, a drag
 * handle, internal scroll, safe-area padding, and swipe-down-to-dismiss. At
 * `md` and up it renders as the classic centered modal card. Backdrop tap and
 * Escape dismiss in both modes (unless `dismissible` is false, e.g. mid-submit).
 *
 * Consumers pass only the inner content; the panel chrome (Card-equivalent
 * surface, padding) lives here so every overlay shares mobile behavior.
 */
export function Sheet({
  open,
  onClose,
  children,
  labelledById,
  ariaLabel,
  dismissible = true,
  testId,
  className = "p-6",
  desktopMaxWidth = "md:max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id of the heading element, wired to aria-labelledby */
  labelledById?: string;
  /** fallback accessible name when there is no visible heading */
  ariaLabel?: string;
  /** when false, backdrop/Escape/swipe do not close (e.g. during submit) */
  dismissible?: boolean;
  testId?: string;
  /** padding/utility classes for the inner content surface */
  className?: string;
  /** desktop max-width class, e.g. "md:max-w-lg" */
  desktopMaxWidth?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  // Live finger offset while dragging the sheet down (mobile only).
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useFocusTrap(panelRef, open);

  // Escape to dismiss + lock body scroll while open (native-feeling).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissible, onClose]);

  // Reset any in-progress drag whenever we open/close.
  useEffect(() => {
    if (!open) {
      setDragY(0);
      dragStart.current = null;
    }
  }, [open]);

  if (!mounted || !open) return null;

  // Swipe-down-to-dismiss: only engage when the panel is scrolled to the top,
  // so the gesture never fights with scrolling long content.
  function onTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    if (!dismissible) return;
    const el = panelRef.current;
    if (el && el.scrollTop > 0) return;
    dragStart.current = e.touches[0].clientY;
  }
  function onTouchMove(e: ReactTouchEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    const delta = e.touches[0].clientY - dragStart.current;
    setDragY(delta > 0 ? delta : 0);
  }
  function onTouchEnd() {
    if (dragStart.current === null) return;
    const shouldClose = dragY > 80;
    dragStart.current = null;
    if (shouldClose && dismissible) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      aria-label={ariaLabel}
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 md:items-center md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className={[
          // shared surface (paper-card)
          "w-full bg-bg-soft shadow-lg overflow-y-auto overscroll-contain outline-none",
          // mobile bottom-sheet
          "max-h-[90dvh] rounded-t-[var(--radius-xl)] animate-sheet-up safe-bottom",
          // desktop centered modal
          "md:max-h-[90vh] md:w-full md:rounded-[var(--radius-lg)] md:animate-fade-in md:pb-0",
          desktopMaxWidth,
          dragY > 0 ? "transition-none" : "transition-transform duration-200",
        ].join(" ")}
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="md:hidden sticky top-0 flex justify-center pt-2.5 pb-1 bg-bg-soft">
          <span
            aria-hidden="true"
            className="h-1 w-9 rounded-full bg-line-strong"
          />
        </div>
        <div className={className}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
