import { test, expect } from "@playwright/test";
import { loginAs, getDb } from "./helpers";

const TEST_TITLE = "Confirm-Flow E2E Meeting";

// @spec MEET-UI-CONFIRM-BTN-001, MEET-UI-CONFIRM-HEATMAP-001, MEET-UI-CONFIRM-BADGE-001
test.describe("Admin meeting confirm flow", () => {
  test.describe.configure({ mode: "serial" });

  let clubId: string;
  let meetingId: string;
  let slotAId: string;
  let slotBId: string;
  let aliceId: string;
  let daveId: string;

  test.beforeAll(async () => {
    const db = getDb();
    // Create an isolated test club so we don't collide with parallel tests
    // that assume SCIFI42 / WEDREADS have a known meeting count.
    // Members: bob=owner, alice=member, dave=member.
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const bob = await db.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const dave = await db.user.findUniqueOrThrow({ where: { email: "dave@example.com" } });

    aliceId = alice.id;
    daveId = dave.id;

    const code = `CFT${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const club = await db.club.create({
      data: {
        name: "Confirm Flow Test Club",
        code,
        createdBy: bob.id,
      },
    });
    clubId = club.id;

    await db.membership.createMany({
      data: [
        { clubId: club.id, userId: bob.id, role: "owner" },
        { clubId: club.id, userId: alice.id, role: "member" },
        { clubId: club.id, userId: dave.id, role: "member" },
      ],
    });

    const meeting = await db.meeting.create({
      data: {
        clubId,
        title: TEST_TITLE,
        createdBy: bob.id,
        status: "proposed",
        slots: {
          create: [
            { proposedTime: new Date("2026-09-15T19:00:00Z"), durationMinutes: 60 },
            { proposedTime: new Date("2026-09-22T19:00:00Z"), durationMinutes: 60 },
          ],
        },
      },
      include: { slots: { orderBy: { proposedTime: "asc" } } },
    });
    meetingId = meeting.id;
    slotAId = meeting.slots[0].id;
    slotBId = meeting.slots[1].id;

    // Slot A: alice=available, dave=available → 2 available.
    // Slot B: alice=available → 1 available.
    // ⇒ Slot A is the "most available" slot.
    await db.availabilityResponse.createMany({
      data: [
        { slotId: slotAId, userId: alice.id, status: "available" },
        { slotId: slotAId, userId: dave.id, status: "available" },
        { slotId: slotBId, userId: alice.id, status: "available" },
      ],
    });
  });

  test.afterAll(async () => {
    const db = getDb();
    if (clubId) {
      // Cascade deletes meeting → slots → responses, plus memberships.
      await db.club.deleteMany({ where: { id: clubId } });
    }
  });

  // @spec MEET-UI-CONFIRM-BTN-001
  test("admin sees the admin-confirm-section with a Confirm button per slot", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    await expect(page.getByTestId("admin-confirm-section")).toBeVisible();
    await expect(page.getByTestId(`confirm-slot-${slotAId}`)).toBeVisible();
    await expect(page.getByTestId(`confirm-slot-${slotBId}`)).toBeVisible();
  });

  // @spec MEET-UI-CONFIRM-BTN-001
  test("plain member does NOT see the admin-confirm-section", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    // Confirm respond UI is open (so we know the expand worked) but admin section is hidden.
    await expect(page.getByTestId("respond-meeting")).toBeVisible();
    await expect(page.getByTestId("admin-confirm-section")).toHaveCount(0);
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  test('"Most available" badge appears on the slot with the most available responses', async ({ page }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    const badge = page.getByTestId("most-available-badge");
    await expect(badge).toBeVisible();
    // Badge should live inside slot A (2 available beats slot B's 1 available).
    const slotARow = page.getByTestId(`admin-slot-${slotAId}`);
    await expect(slotARow.getByTestId("most-available-badge")).toBeVisible();
    // Slot B should NOT carry a badge.
    const slotBRow = page.getByTestId(`admin-slot-${slotBId}`);
    await expect(slotBRow.getByTestId("most-available-badge")).toHaveCount(0);
  });

  // @spec MEET-UI-CONFIRM-HEATMAP-001
  test("heatmap renders one colored cell per (responder, slot)", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    await expect(page.getByTestId("availability-heatmap")).toBeVisible();
    // Alice available on slot A.
    await expect(
      page.getByTestId(`heatmap-cell-${aliceId}-${slotAId}`)
    ).toHaveAttribute("data-status", "available");
    // Dave available on slot A.
    await expect(
      page.getByTestId(`heatmap-cell-${daveId}-${slotAId}`)
    ).toHaveAttribute("data-status", "available");
    // Alice available on slot B.
    await expect(
      page.getByTestId(`heatmap-cell-${aliceId}-${slotBId}`)
    ).toHaveAttribute("data-status", "available");
    // Dave didn't respond to slot B.
    await expect(
      page.getByTestId(`heatmap-cell-${daveId}-${slotBId}`)
    ).toHaveAttribute("data-status", "none");
  });

  // @spec MEET-UI-CONFIRM-BTN-001 (the actual mutation)
  test("clicking Confirm transitions the meeting to confirmed", async ({ page }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    // Confirm slot B (the non-most-available one — proves it isn't auto-picked).
    await page.getByTestId(`confirm-slot-${slotBId}`).click();

    // After optimistic update + refresh, the meeting moves to the Confirmed list.
    // Filter to Confirmed and assert it appears there with our title.
    await page.getByTestId("filter-confirmed").click();
    await expect(
      page.locator(`[data-testid="meeting-${meetingId}"]`)
    ).toContainText(TEST_TITLE);

    // DB-level assertion to be definitive.
    const db = getDb();
    const fresh = await db.meeting.findUniqueOrThrow({
      where: { id: meetingId },
      select: { status: true, confirmedTime: true },
    });
    expect(fresh.status).toBe("confirmed");
    expect(fresh.confirmedTime?.toISOString()).toBe(
      "2026-09-22T19:00:00.000Z"
    );
  });
});
