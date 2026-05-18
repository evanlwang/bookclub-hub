// @spec DSYS-FOCUS-001, DSYS-FOCUS-002, DSYS-FOCUS-003
//
// Structural assertion that the global :focus-visible rule exists in globals.css
// with the expected outline/offset/radius. The rule is a single source of truth
// for every focusable element; per-component overrides are LLD-documented
// exceptions (e.g., DateTimePicker per COMP-DATE-TIME-PICKER-A11Y-006).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf-8");

describe("focus contract (DSYS-FOCUS-*)", () => {
  it("defines a global :focus-visible rule (DSYS-FOCUS-001, DSYS-FOCUS-003)", () => {
    // Match the rule block; allow either :focus-visible or :focus-visible (with selector).
    const m = css.match(/:focus-visible\s*\{[^}]+\}/);
    expect(m, "no :focus-visible rule found").not.toBeNull();
    expect(m![0]).toContain("outline:");
    expect(m![0]).toContain("var(--color-primary)");
  });

  it("uses 2px solid outline at 2px offset on the focus ring", () => {
    const m = css.match(/:focus-visible\s*\{([^}]+)\}/);
    const body = m?.[1] ?? "";
    expect(body).toMatch(/outline\s*:\s*2px\s+solid/);
    expect(body).toMatch(/outline-offset\s*:\s*2px/);
  });

  it("rounds the focus ring at 4px border-radius", () => {
    const m = css.match(/:focus-visible\s*\{([^}]+)\}/);
    expect(m?.[1] ?? "").toMatch(/border-radius\s*:\s*4px/);
  });

  it("the rule targets :focus-visible (keyboard focus), not :focus (pointer focus)", () => {
    // Ensure no broad `:focus { outline: ... }` overrides exist.
    expect(css).not.toMatch(/:focus\s*\{[^}]*outline\s*:\s*2px/);
  });
});
