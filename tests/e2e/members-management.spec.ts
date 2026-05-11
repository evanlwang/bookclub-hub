// @spec CLUB-UI-MEMBERS-002, CLUB-UI-MEMBERS-003, CLUB-UI-MEMBERS-004, CLUB-UI-MEMBERS-005, CLUB-UI-MEMBERS-006, CLUB-NAV-MEMBERS-001, CLUB-UI-OWNERSHIP-002, CLUB-UI-OWNERSHIP-003, CLUB-UI-MEMBERS-LEAVE-001, CLUB-API-OWNERSHIP-001, CLUB-BE-LEAVE-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getDb, restoreSeedMembershipGraph } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("Members Management", () => {
  // Reset WEDREADS membership state before each test so they don't bleed,
  // and strip any test-created joiners that survived earlier files.
  test.beforeEach(restoreSeedMembershipGraph);
  test.afterAll(restoreSeedMembershipGraph);

  // @spec CLUB-NAV-MEMBERS-001
  test("admin sees Members nav link; member does not", async ({ page, browser }) => {
    const wedreads = await getClubByCode("WEDREADS");

    // Carol is admin → sees the link
    await loginAs(page, "carol@example.com");
    await page.goto(`/clubs/${wedreads.id}`);
    await expect(page.getByTestId("sidebar-nav-members")).toBeVisible();

    // Dave is a member → does not see the link
    const ctx = await browser.newContext();
    const memberPage = await ctx.newPage();
    await loginAs(memberPage, "dave@example.com");
    await memberPage.goto(`/clubs/${wedreads.id}`);
    await expect(memberPage.getByTestId("sidebar-nav-members")).toHaveCount(0);
    await ctx.close();
  });

  // @spec CLUB-UI-MEMBERS-002
  test("members page renders all rows with role badges; member is forbidden", async ({ page, browser }) => {
    const wedreads = await getClubByCode("WEDREADS");
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${wedreads.id}/members`);

    // Owner row visually marked
    await expect(page.locator('[data-role="owner"]')).toHaveCount(1);
    // Admins (bob, carol)
    await expect(page.locator('[data-role="admin"]')).toHaveCount(2);
    // Members (dave, eve, frank)
    await expect(page.locator('[data-role="member"]')).toHaveCount(3);

    // Members route gives a member viewer an authorization error.
    const ctx = await browser.newContext();
    const memberPage = await ctx.newPage();
    await loginAs(memberPage, "dave@example.com");
    await memberPage.goto(`/clubs/${wedreads.id}/members`);
    await expect(memberPage.getByTestId("members-error")).toBeVisible();
    await ctx.close();
  });

  // @spec CLUB-UI-MEMBERS-005
  test("owner row shows no Remove or Demote actions", async ({ page }) => {
    const wedreads = await getClubByCode("WEDREADS");
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${wedreads.id}/members`);

    const ownerRow = page.getByTestId(`member-row-${alice.id}`);
    await expect(ownerRow).toBeVisible();
    await expect(page.getByTestId(`remove-${alice.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`demote-${alice.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`leave-${alice.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`owner-leave-hint-${alice.id}`)).toBeVisible();
  });

  // @spec CLUB-UI-MEMBERS-003, CLUB-UI-MEMBERS-006
  test("admin can remove a member with confirmation", async ({ page }) => {
    const wedreads = await getClubByCode("WEDREADS");
    const db = getDb();
    const eve = await db.user.findUniqueOrThrow({ where: { email: "eve@example.com" } });

    await loginAs(page, "carol@example.com"); // admin
    await page.goto(`/clubs/${wedreads.id}/members`);

    await page.getByTestId(`remove-${eve.id}`).click();
    await expect(page.getByTestId("member-action-dialog")).toBeVisible();
    await expect(page.getByTestId("member-action-dialog")).toContainText(/Remove Eve/i);
    await page.getByTestId("member-action-confirm").click();

    await expect(page.getByTestId("member-action-dialog")).toHaveCount(0);
    await expect(page.getByTestId(`member-row-${eve.id}`)).toHaveCount(0);
  });

  // @spec CLUB-UI-MEMBERS-004
  test("owner can promote a member then demote them", async ({ page }) => {
    const wedreads = await getClubByCode("WEDREADS");
    const db = getDb();
    const frank = await db.user.findUniqueOrThrow({ where: { email: "frank@example.com" } });

    await loginAs(page, "alice@example.com"); // owner
    await page.goto(`/clubs/${wedreads.id}/members`);

    // Promote
    await page.getByTestId(`promote-${frank.id}`).click();
    await page.getByTestId("member-action-confirm").click();
    await expect(page.getByTestId(`member-row-${frank.id}`)).toHaveAttribute("data-role", "admin", { timeout: 10000 });

    // Demote
    await page.getByTestId(`demote-${frank.id}`).click();
    await page.getByTestId("member-action-confirm").click();
    await expect(page.getByTestId(`member-row-${frank.id}`)).toHaveAttribute("data-role", "member", { timeout: 10000 });
  });

  // @spec CLUB-UI-MEMBERS-004
  test("admin does not see promote/demote actions", async ({ page }) => {
    const wedreads = await getClubByCode("WEDREADS");
    const db = getDb();
    const dave = await db.user.findUniqueOrThrow({ where: { email: "dave@example.com" } });
    const carol = await db.user.findUniqueOrThrow({ where: { email: "carol@example.com" } });

    await loginAs(page, "bob@example.com"); // admin (not owner)
    await page.goto(`/clubs/${wedreads.id}/members`);

    await expect(page.getByTestId(`promote-${dave.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`demote-${carol.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`transfer-${carol.id}`)).toHaveCount(0);
  });

  // @spec CLUB-UI-OWNERSHIP-002, CLUB-UI-OWNERSHIP-003, CLUB-API-OWNERSHIP-001
  test("owner can transfer ownership with typed confirmation", async ({ page }) => {
    const wedreads = await getClubByCode("WEDREADS");
    const db = getDb();
    const bob = await db.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${wedreads.id}/members`);

    await page.getByTestId(`transfer-${bob.id}`).click();
    await expect(page.getByTestId("transfer-confirm-input")).toBeVisible();

    // Wrong text → blocked
    await page.getByTestId("transfer-confirm-input").fill("wrong");
    await page.getByTestId("member-action-confirm").click();
    await expect(page.getByTestId("member-action-dialog")).toContainText(/Type "Bob Martinez" to confirm/);

    // Correct text → succeeds
    await page.getByTestId("transfer-confirm-input").fill("Bob Martinez");
    await page.getByTestId("member-action-confirm").click();

    await expect(page.getByTestId("member-action-dialog")).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByTestId(`member-row-${bob.id}`)).toHaveAttribute("data-role", "owner", { timeout: 10000 });
    await expect(page.getByTestId(`member-row-${alice.id}`)).toHaveAttribute("data-role", "admin");
  });

  // @spec CLUB-UI-MEMBERS-LEAVE-001, CLUB-BE-LEAVE-001
  test("non-owner can leave their only club; redirects to onboarding", async ({ page }) => {
    const wedreads = await getClubByCode("WEDREADS");
    const db = getDb();
    const carol = await db.user.findUniqueOrThrow({ where: { email: "carol@example.com" } });

    await loginAs(page, "carol@example.com");
    await page.goto(`/clubs/${wedreads.id}/members`);

    await page.getByTestId(`leave-${carol.id}`).click();
    await expect(page.getByTestId("member-action-dialog")).toContainText(/Leave this club/i);
    await page.getByTestId("member-action-confirm").click();

    // Carol is only in WEDREADS, so she lands on /join after leaving.
    await page.waitForURL(/\/join(\?.*)?$/, { timeout: 10000 });

    // Membership removed
    const m = await db.membership.findUnique({
      where: { clubId_userId: { clubId: wedreads.id, userId: carol.id } },
    });
    expect(m).toBeNull();
  });
});
