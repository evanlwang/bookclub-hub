// @spec DSYS-MOTION-MODAL-001, DSYS-MOTION-CARD-001, DSYS-MOTION-002
//
// Lightweight smoke for the Phase 2 motion primitives. Verifies that the
// motion-driven modal mounts, plays its exit, and fully unmounts on close —
// regression risk is "AnimatePresence misconfigured → modal stays in DOM" or
// "motion hydration throws → silent console error on load".
import { test, expect, type Page } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

async function openSwitcherModal(page: Page) {
  const iconButton = page.getByTestId("sidebar-add-club-icon");
  if (await iconButton.count()) {
    await iconButton.click();
  } else {
    await page.getByTestId("sidebar-club-switcher").click();
    await page.getByTestId("sidebar-add-club").click();
  }
  await expect(page.getByTestId("club-switcher-modal")).toBeVisible();
}

test.describe("Motion primitives smoke", () => {
  test("dashboard loads with no console errors (motion hydration is clean)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${club.id}`);
    await expect(page.getByTestId("club-name")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("club-switcher modal mounts and fully unmounts via AnimatePresence", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${club.id}`);

    await openSwitcherModal(page);
    await page.getByTestId("club-switcher-modal-close").click();

    // AnimatePresence keeps the panel mounted during the exit transition.
    // Playwright's toHaveCount(0) polls until the element is truly removed.
    await expect(page.getByTestId("club-switcher-modal")).toHaveCount(0);
  });

  test("reduced-motion: modal opens and closes without rejecting the contract", async ({
    browser,
  }) => {
    // Emulate prefers-reduced-motion at the browser level. useMotionPreset
    // returns a zero-duration empty preset, so the modal jumps to its end
    // state and exits without an animated transition.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${club.id}`);

    await openSwitcherModal(page);
    await page.getByTestId("club-switcher-modal-close").click();
    await expect(page.getByTestId("club-switcher-modal")).toHaveCount(0);

    await context.close();
  });
});
