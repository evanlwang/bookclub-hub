// @spec DSYS-A11Y-005
//
// Cross-primitive contrast verification via axe-core. Expected to be a meta-test
// that imports each primitive, renders a representative variant combination, and
// asserts axe finds no contrast violations.
//
// Active gap: vitest-axe is not yet installed. Until it is, this file will fail
// at import resolution — which is the intended failure mode per Phase 5's
// "tests fail in the expected way" guidance.

import { describe, it } from "vitest";

describe("design-system contrast (DSYS-A11Y-005) — active gap", () => {
  it.todo(
    "renders every primitive in every documented variant and asserts axe-core finds no contrast violations (requires vitest-axe install)",
  );
});
