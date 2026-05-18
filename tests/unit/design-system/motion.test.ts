// @spec DSYS-MOTION-001, DSYS-MOTION-002, DSYS-MOTION-003, DSYS-MOTION-004, DSYS-MOTION-005
//
// Locks the motion contract: keyframe names + durations + easings, and the
// (currently absent) prefers-reduced-motion suppression rule.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf-8");

describe("motion contract (DSYS-MOTION-*)", () => {
  it("defines the bar-fill keyframe with 500ms cubic-bezier (DSYS-MOTION-003)", () => {
    expect(css).toMatch(/@keyframes\s+bar-fill\s*\{/);
    expect(css).toMatch(
      /\.bar-anim\s*\{[^}]*animation:\s*bar-fill\s+0\.5s\s+cubic-bezier\(0\.2,\s*0\.7,\s*0\.2,\s*1\)/,
    );
  });

  it("defines the toast-in keyframe at 150ms ease (DSYS-MOTION-004)", () => {
    expect(css).toMatch(/@keyframes\s+toast-in\s*\{/);
    expect(css).toMatch(/animate-toast-in\s*\{[^}]*animation:\s*toast-in\s+150ms\s+ease/);
  });

  it("defines fade-in at 150ms ease (DSYS-MOTION-004)", () => {
    expect(css).toMatch(/@keyframes\s+fade-in\s*\{/);
    expect(css).toMatch(/animate-fade-in\s*\{[^}]*animation:\s*fade-in\s+150ms\s+ease/);
  });

  it("defines slide-down at 200ms ease (DSYS-MOTION-005)", () => {
    expect(css).toMatch(/@keyframes\s+slide-down\s*\{/);
    expect(css).toMatch(/animate-slide-down\s*\{[^}]*animation:\s*slide-down\s+200ms\s+ease/);
  });

  it("suppresses all CSS animations and transitions under prefers-reduced-motion (DSYS-MOTION-002) — active gap", () => {
    // Active gap: rule not present in globals.css today. This test should FAIL
    // until the Phase 6 cascade adds the global @media block.
    expect(css).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[^}]*animation-duration\s*:\s*0\.01ms/,
    );
    expect(css).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[^}]*transition-duration\s*:\s*0\.01ms/,
    );
  });
});
