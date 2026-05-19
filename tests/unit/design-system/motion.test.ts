// @spec DSYS-MOTION-001, DSYS-MOTION-002, DSYS-MOTION-003, DSYS-MOTION-004, DSYS-MOTION-005, DSYS-MOTION-006
//
// Locks the CSS-path motion contract: keyframe names + token-aligned
// durations + the canonical `outQuint` easing. Numeric values mirror the JS
// tokens in src/lib/motion/tokens.ts (DSYS-MOTION-006) — divergence between
// the two paths is a defect.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf-8");

// outQuint cubic-bezier from src/lib/motion/tokens.ts — the UI default easing.
const OUT_QUINT = /cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/;

describe("motion contract (DSYS-MOTION-*)", () => {
  it("defines bar-fill at slow duration (0.35s) with outQuint (DSYS-MOTION-003)", () => {
    expect(css).toMatch(/@keyframes\s+bar-fill\s*\{/);
    expect(css).toMatch(
      new RegExp(
        String.raw`\.bar-anim\s*\{[^}]*animation:\s*bar-fill\s+0\.35s\s+` +
          OUT_QUINT.source,
      ),
    );
  });

  it("defines toast-in at fast duration (0.15s) with outQuint (DSYS-MOTION-004)", () => {
    expect(css).toMatch(/@keyframes\s+toast-in\s*\{/);
    expect(css).toMatch(
      new RegExp(
        String.raw`animate-toast-in\s*\{[^}]*animation:\s*toast-in\s+0\.15s\s+` +
          OUT_QUINT.source,
      ),
    );
  });

  it("defines fade-in at fast duration (0.15s) with outQuint (DSYS-MOTION-004)", () => {
    expect(css).toMatch(/@keyframes\s+fade-in\s*\{/);
    expect(css).toMatch(
      new RegExp(
        String.raw`animate-fade-in\s*\{[^}]*animation:\s*fade-in\s+0\.15s\s+` +
          OUT_QUINT.source,
      ),
    );
  });

  it("defines slide-down at base duration (0.2s) with outQuint (DSYS-MOTION-005)", () => {
    expect(css).toMatch(/@keyframes\s+slide-down\s*\{/);
    expect(css).toMatch(
      new RegExp(
        String.raw`animate-slide-down\s*\{[^}]*animation:\s*slide-down\s+0\.2s\s+` +
          OUT_QUINT.source,
      ),
    );
  });

  it("suppresses all CSS animations and transitions under prefers-reduced-motion (DSYS-MOTION-002)", () => {
    expect(css).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[^}]*animation-duration\s*:\s*0\.01ms/,
    );
    expect(css).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[^}]*transition-duration\s*:\s*0\.01ms/,
    );
  });
});
