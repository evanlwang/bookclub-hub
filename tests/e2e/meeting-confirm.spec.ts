import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getDb } from "./helpers";

const TEST_TITLE = "Confirm-Flow E2E Meeting";

// @spec MEET-UI-CONFIRM-BTN-001, MEET-UI-CONFIRM-HEATMAP-001, MEET-UI-CONFIRM-BADGE-001
test.describe("Admin meeting confirm flow", () => {
  test.describe.configure({ mode: "serial" });

  let clubId: string;
  let meetingId: string;
  let slotAId: string;
  let slotBId: string;
  let bobId: string;
  let eveId: string;

  test.beforeAll(async () => {
    const db = getDb();
    const club = await db.club.findUniqueOrThrow({ where: { code: "WEDREADS" } });
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const bob = await db.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const eve = await db.user.findUniqueOrThrow({ where: { email: "eve@example.com" } });
    const dave = await db.user.findUniqueOrThrow({ where: { email: "dave@example.com" } });

    clubId = club.id;
    bobId = bob.id;
    eveId = eve.id;

    // Clean any leftover from a prior failed run.
    const stale = await db.meeting.findMany({ where: { clubId, title: TEST_TITLE } });
    for (const m of stale) await db.meeting.delete({ where: { id: m.id } });

    const meeting = await db.meeting.create({
      data: {
        clubId,
        title: TEST_TITLE,
        createdBy: alice.id,
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

    // Slot A: bob=available, dave=available, eve=maybe → 2 available, 1 maybe.
    // Slot B: eve=available → 1 available.
    // ⇒ Slot A is the "most available" slot.
    await db.availabilityResponse.createMany({
      data: [
        { slotId: slotAId, userId: bob.id, status: "available" },
        { slotId: slotAId, userId: dave.id, status: "available" },
        { slotId: slotAId, userId: eve.id, status: "maybe" },
        { slotId: slotBId, userId: eve.id, status: "available" },
      ],
    });
  });

  test.afterAll(async () => {
    const db = getDb();
    if (meetingId) {
      await db.meeting.deleteMany({ where: { id: meetingId } });
    }
  });

  // @spec MEET-UI-CONFIRM-BTN-001
  test("admin sees the admin-confirm-section with a Confirm button per slot", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    await expect(page.getByTestId("admin-confirm-section")).toBeVisible();
    await expect(page.getByTestId(`confirm-slot-${slotAId}`)).toBeVisible();
    await expect(page.getByTestId(`confirm-slot-${slotBId}`)).toBeVisible();
  });

  // @spec MEET-UI-CONFIRM-BTN-001
  test("plain member does NOT see the admin-confirm-section", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    // Confirm respond UI is open (so we know the expand worked) but admin section is hidden.
    await expect(page.getByTestId("respond-meeting")).toBeVisible();
    await expect(page.getByTestId("admin-confirm-section")).toHaveCount(0);
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  test('"Most available" badge appears on the slot with the most available responses', async ({ page }) => {
    await loginAs(page, "alice@example.com");
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
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);
    await page.getByTestId(`meeting-toggle-${meetingId}`).click();

    await expect(page.getByTestId("availability-heatmap")).toBeVisible();
    await expect(
      page.getByTestId(`heatmap-cell-${bobId}-${slotAId}`)
    ).toHaveAttribute("data-status", "available");
    // Eve maybe on slot A.
    await expect(
      page.getByTestId(`heatmap-cell-${eveId}-${slotAId}`)
    ).toHaveAttribute("data-status", "maybe");
    // Eve available on slot B.
    await expect(
      page.getByTestId(`heatmap-cell-${eveId}-${slotBId}`)
    ).toHaveAttribute("data-status", "available");
    // Bob did not respond to slot B.
    await expect(
      page.getByTestId(`heatmap-cell-${bobId}-${slotBId}`)
    ).toHaveAttribute("data-status", "none");
  });

  // @spec MEET-UI-CONFIRM-BTN-001 (the actual mutation)
  test("clicking Confirm transitions the meeting to confirmed", async ({ page }) => {
    await loginAs(page, "alice@example.com");
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
