// @vitest-environment jsdom
// @spec DSYS-MOTION-007, DSYS-MOTION-002
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock useReducedMotion BEFORE importing the hook under test so the hook
// resolves the mocked binding. The vi.hoisted dance keeps the mock factory
// stable across module reloads (Vitest re-evaluates per test in jsdom).
const { useReducedMotionMock } = vi.hoisted(() => ({
  useReducedMotionMock: vi.fn<() => boolean | null>(),
}));

vi.mock("motion/react", () => ({
  useReducedMotion: useReducedMotionMock,
}));

import { useMotionPreset } from "@/lib/motion/use-motion-preset";
import { presets } from "@/lib/motion/tokens";

beforeEach(() => {
  useReducedMotionMock.mockReset();
});

describe("useMotionPreset — reduced motion honored", () => {
  it("returns a zero-duration empty preset when prefers-reduced-motion is true", () => {
    useReducedMotionMock.mockReturnValue(true);
    const { result } = renderHook(() => useMotionPreset("cardEnter"));
    expect(result.current.initial).toEqual({});
    expect(result.current.animate).toEqual({});
    expect((result.current.transition as { duration: number }).duration).toBe(0);
  });

  it("returns the real preset when prefers-reduced-motion is false", () => {
    useReducedMotionMock.mockReturnValue(false);
    const { result } = renderHook(() => useMotionPreset("cardEnter"));
    expect(result.current).toBe(presets.cardEnter);
  });

  it("returns the real preset when useReducedMotion returns null (no preference)", () => {
    useReducedMotionMock.mockReturnValue(null);
    const { result } = renderHook(() => useMotionPreset("modalEnter"));
    expect(result.current).toBe(presets.modalEnter);
  });
});

describe("useMotionPreset — name routing", () => {
  it("routes each preset name to its tokens.ts entry when motion is enabled", () => {
    useReducedMotionMock.mockReturnValue(false);
    for (const name of Object.keys(presets) as Array<keyof typeof presets>) {
      const { result } = renderHook(() => useMotionPreset(name));
      expect(result.current).toBe(presets[name]);
    }
  });
});
