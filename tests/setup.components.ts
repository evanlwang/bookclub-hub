// Component-test setup. Registers @testing-library/jest-dom matchers on Vitest's
// `expect`. Only applied to tests/unit/components/** (per vitest.config.ts
// environmentMatchGlobs). Backend tests stay unaffected.
//
// Prerequisite npm deps (add via `npm i -D`):
//   @testing-library/react @testing-library/jest-dom @testing-library/user-event
//   jsdom vitest-axe
//
// Until those are installed, the component tests will fail at import resolution.
// Design-system tests (tests/unit/design-system/**) need no extra deps.

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL doesn't auto-clean under Vitest the way it does under Jest. Without
// this, every test's render() leaks into the next, so screen.getByRole hits
// multiple matches. Register cleanup once for the whole component test suite.
afterEach(() => {
  cleanup();
});
