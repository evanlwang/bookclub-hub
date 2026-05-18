// @spec DSYS-TOKEN-001, DSYS-TOKEN-002, DSYS-TOKEN-005, DSYS-TOKEN-006, DSYS-TOKEN-007
//
// Structural assertions about the token catalog in src/app/globals.css.
// These tests parse the CSS as text — no rendering, no DOM. They lock the
// token names, prefixes, and shape of the catalog so renames are deliberate.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf-8");

function hasToken(name: string): boolean {
  return new RegExp(`^\\s*${name.replace(/-/g, "\\-")}\\s*:`, "m").test(css);
}

describe("design tokens — catalog (DSYS-TOKEN-*)", () => {
  it("defines an @theme block in globals.css (DSYS-TOKEN-001)", () => {
    expect(css).toMatch(/@theme\s*\{/);
  });

  it("uses one of the four category prefixes for every token (DSYS-TOKEN-002)", () => {
    const tokenLines = css.match(/^\s*--[a-z-]+\s*:/gm) ?? [];
    expect(tokenLines.length).toBeGreaterThan(0);
    for (const line of tokenLines) {
      const name = line.trim().replace(/:.*/, "");
      expect(name).toMatch(/^--(?:color|radius|shadow|font)-/);
    }
  });

  it("uses mode-agnostic token names (no -light / -dark suffix) (DSYS-TOKEN-005)", () => {
    const tokenNames = (css.match(/^\s*--[a-z-]+\s*:/gm) ?? []).map((l) =>
      l.trim().replace(/:.*/, ""),
    );
    for (const name of tokenNames) {
      expect(name).not.toMatch(/-(light|dark)$/);
    }
  });

  it("defines the required neutral surfaces", () => {
    for (const t of [
      "--color-bg",
      "--color-bg-soft",
      "--color-bg-sunken",
      "--color-ink",
      "--color-ink-2",
      "--color-ink-3",
      "--color-ink-4",
      "--color-line",
      "--color-line-strong",
    ]) {
      expect(hasToken(t), `missing ${t}`).toBe(true);
    }
  });

  it("defines primary with its -hover, -soft, -ink siblings", () => {
    for (const t of [
      "--color-primary",
      "--color-primary-hover",
      "--color-primary-soft",
      "--color-primary-ink",
    ]) {
      expect(hasToken(t), `missing ${t}`).toBe(true);
    }
  });

  it("defines a -hover variant for every interactive color token (DSYS-TOKEN-006) — active gap", () => {
    // Active gap: --color-danger-hover and --color-accent-hover do not exist.
    // This test should FAIL until DSYS-TOKEN-006 is closed by the Phase 6 cascade.
    expect(hasToken("--color-danger-hover")).toBe(true);
    expect(hasToken("--color-accent-hover")).toBe(true);
  });

  it("defines --color-warning-ink (DSYS-TOKEN-007) — active gap", () => {
    // Active gap: Badge's warning tone inlines a literal because this token doesn't exist.
    expect(hasToken("--color-warning-ink")).toBe(true);
  });

  it("defines the chip palette: --color-chip-{1..5} and -ink companions", () => {
    for (let i = 1; i <= 5; i++) {
      expect(hasToken(`--color-chip-${i}`), `missing chip ${i}`).toBe(true);
      expect(hasToken(`--color-chip-${i}-ink`), `missing chip ${i} ink`).toBe(true);
    }
  });

  it("defines the radius scale", () => {
    for (const t of ["--radius-sm", "--radius-md", "--radius-lg", "--radius-xl"]) {
      expect(hasToken(t)).toBe(true);
    }
  });

  it("defines the shadow scale", () => {
    for (const t of ["--shadow-sm", "--shadow-md", "--shadow-lg"]) {
      expect(hasToken(t)).toBe(true);
    }
  });

  it("defines the font stacks", () => {
    for (const t of ["--font-display", "--font-ui", "--font-mono"]) {
      expect(hasToken(t)).toBe(true);
    }
  });
});
