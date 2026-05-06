// @spec CLUB-NAV-MODAL-001, CLUB-NAV-MODAL-002, CLUB-NAV-MODAL-003, CLUB-NAV-MODAL-004, CLUB-NAV-MODAL-005, CLUB-NAV-MODAL-006, CLUB-NAV-MODAL-007, CLUB-NAV-MODAL-008, CLUB-NAV-MODAL-010
import { test, expect, type Page } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

async function openSwitcherModal(page: Page) {
  // Open the sidebar dropdown by clicking the club header switcher button.
  // The header button is the first button inside the aside.
  await page.locator("aside button").first().click();
  await page.getByTestId("sidebar-add-club").click();
  await expect(page.getByTestId("club-switcher-modal")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("Switcher Create/Join Modal", () => {
  // @spec CLUB-NAV-MODAL-001, CLUB-NAV-MODAL-010
  test("clicking 'Create or join a club' opens the centered modal in place", async ({ page }) => {
    await loginAs(page, "carol@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);

    // Modal is up; URL has not changed to /clubs.
    await expect(page).toHaveURL(new RegExp(`/clubs/${wedreads.id}`));
    // Switcher dropdown closed when modal opened.
    await expect(page.getByTestId("sidebar-add-club")).toHaveCount(0);
  });

  // @spec CLUB-NAV-MODAL-002
  test("modal exposes Join and Create tabs, defaulting to Join", async ({ page }) => {
    await loginAs(page, "carol@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);

    await expect(page.getByTestId("modal-tab-join")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("modal-tab-create")).toHaveAttribute("aria-selected", "false");
    await expect(page.getByTestId("modal-code-input")).toBeVisible();
  });

  // @spec CLUB-NAV-MODAL-003, CLUB-NAV-MODAL-004
  test("joining a club via the modal navigates and refreshes the sidebar", async ({ page }) => {
    // Carol is in WEDREADS only — she joins SCIFI42 from inside WEDREADS.
    await loginAs(page, "carol@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    const scifi = await getClubByCode("SCIFI42");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);
    await page.getByTestId("modal-code-input").fill("SCIFI42");
    await expect(page.getByTestId("modal-club-found")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("modal-join-submit").click();

    await page.waitForURL(new RegExp(`/clubs/${scifi.id}`), { timeout: 10000 });

    // Sidebar list now contains both clubs (verify via the dropdown's link rows).
    await page.locator("aside button").first().click();
    const aside = page.locator("aside");
    await expect(aside.getByRole("link", { name: /Sci-Fi Explorers/i })).toBeVisible();
    await expect(aside.getByRole("link", { name: /Wednesday Night Reads/i })).toBeVisible();
  });

  // @spec CLUB-NAV-MODAL-005
  test("joining a club the user already belongs to surfaces 'already a member' + Go to club", async ({ page }) => {
    // Alice is already in WEDREADS.
    await loginAs(page, "alice@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);
    await page.getByTestId("modal-code-input").fill("WEDREADS");
    await expect(page.getByTestId("modal-club-found")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("modal-join-submit").click();

    await expect(page.getByTestId("modal-already-member")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("modal-already-member")).toContainText(/already a member/i);

    await page.getByTestId("modal-go-to-club").click();
    await page.waitForURL(new RegExp(`/clubs/${wedreads.id}`), { timeout: 10000 });
  });

  // @spec CLUB-NAV-MODAL-006, CLUB-NAV-MODAL-007
  test("creating a club via the modal shows the invite code, then routes to the new club", async ({ page }) => {
    await loginAs(page, "carol@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);
    await page.getByTestId("modal-tab-create").click();

    const ts = Date.now();
    const newName = `Switcher Test ${ts}`;

    await page.getByTestId("modal-club-name").fill(newName);
    // Derived code should auto-populate.
    const codeInput = page.getByTestId("modal-club-code");
    const derived = await codeInput.inputValue();
    expect(derived.length).toBeGreaterThan(0);
    expect(derived).toMatch(/^[A-Z0-9]+$/);

    await page.getByRole("button", { name: /Monthly/i }).click();
    await page.getByTestId("modal-create-submit").click();

    // Success view inside the modal.
    await expect(page.getByText(/is live!/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Invite code", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy/i })).toBeVisible();

    // Dismissal navigates into the new club.
    await page.getByTestId("created-club-go").click();
    await expect(page).not.toHaveURL(new RegExp(`/clubs/${wedreads.id}$`), { timeout: 10000 });
    await expect(page).toHaveURL(/\/clubs\/[a-f0-9-]+$/);
  });

  // @spec CLUB-NAV-MODAL-008
  test("Escape closes the modal", async ({ page }) => {
    await loginAs(page, "carol@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("club-switcher-modal")).toHaveCount(0);
  });

  // @spec CLUB-NAV-MODAL-008
  test("backdrop click closes the modal", async ({ page }) => {
    await loginAs(page, "carol@example.com");
    const wedreads = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${wedreads.id}`);

    await openSwitcherModal(page);
    // Click the backdrop (click at top-left corner of the dialog wrapper, outside the Card)
    const dialog = page.getByTestId("club-switcher-modal");
    const box = await dialog.boundingBox();
    if (!box) throw new Error("dialog has no bounding box");
    await page.mouse.click(box.x + 5, box.y + 5);
    await expect(page.getByTestId("club-switcher-modal")).toHaveCount(0);
  });
});
