// @spec DSYS-TOOL-001
//
// Asserts the ESLint configuration includes a rule banning inline `style`
// literals for color/font/radius/shadow values. Today the rule does not exist —
// the test should FAIL until the Phase 6 cascade adds it to eslint.config.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inline-literal lint rule (DSYS-TOOL-001) — active gap", () => {
  it("an ESLint rule banning inline style color/font/radius/shadow literals is registered", () => {
    // Look for either a custom rule name (e.g., 'design/no-inline-token-literals') or a
    // configured 'no-restricted-syntax' selector targeting style={{}} literals.
    let eslintConfig = "";
    for (const candidate of [
      "eslint.config.ts",
      "eslint.config.js",
      "eslint.config.mjs",
      ".eslintrc.cjs",
      ".eslintrc.js",
      ".eslintrc.json",
    ]) {
      try {
        eslintConfig += readFileSync(candidate, "utf-8");
      } catch {
        // file not present; skip
      }
    }

    const hasInlineLiteralBan =
      /no-inline-token-literals/.test(eslintConfig) ||
      /style=\{\{[^}]*background:\s*['"`]oklch/.test(eslintConfig) ||
      /(no-restricted-syntax|no-restricted-properties)[^}]*style[^}]*oklch/.test(eslintConfig);

    expect(hasInlineLiteralBan, "no inline-literal lint rule found in eslint config").toBe(true);
  });
});
