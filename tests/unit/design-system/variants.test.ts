// @spec DSYS-VAR-001, DSYS-VAR-002, DSYS-VAR-003
//
// Cross-component contract assertions. The detailed per-primitive state
// behavior lives in each component's test file; this file locks the principles
// the system-wide spec asserts (state-priority order, loading-implies-disabled,
// focus-is-orthogonal).

import { describe, it } from "vitest";

describe("variant composition (DSYS-VAR-*)", () => {
  it.todo(
    "every primitive that supports a `loading` state also sets the native `disabled` attribute while loading (DSYS-VAR-002) — verified in per-component tests (currently: button.test.tsx)",
  );

  it.todo(
    "state priority `disabled > loading > hover > default` is applied consistently across primitives (DSYS-VAR-001) — verified per primitive",
  );

  it.todo(
    "the global :focus-visible ring composes on top of every state (DSYS-VAR-003) — verified per primitive once jsdom focus-visible polyfill is wired",
  );
});
