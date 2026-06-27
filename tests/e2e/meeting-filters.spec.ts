// @spec MEET-UI-006, MEET-UI-008, MEET-UI-PROP-001, MEET-UI-LIST-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getDb } from "./helpers";

test.describe("Meeting List Filters", () => {
  // @spec MEET-UI-006
  test("shows filter tabs for meeting statuses", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    await expect(page.getByTestId("filter-all")).toBeVisible();
    await expect(page.getByTestId("filter-proposed")).toBeVisible();
    await expect(page.getByTestId("filter-confirmed")).toBeVisible();
  });

  // @spec MEET-UI-006
  test("filter tabs filter the meeting list", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // Click proposed filter
    await page.getByTestId("filter-proposed").click();
    // Should still see meetings list (proposed ones)
    await expect(page.getByTestId("meetings-list")).toBeVisible();
  });

  // @spec MEET-UI-PROP-001
  test("meeting cards show status badge", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/meetings`);

    // The seeded meeting is proposed
    await expect(page.getByText("proposed").first()).toBeVisible();
  });

  // @spec MEET-UI-LIST-001
  test("cancelled meetings are excluded from the list (cancelled-only club shows empty state)", async ({ page }) => {
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    // Isolated club so a cancelled-only history doesn't collide with seed meetings.
    const code = `MCANCEL${Date.now().toString().slice(-5)}`;
    const club = await db.club.create({
      data: {
        name: "Meeting-Cancel Club",
        code,
        createdBy: alice.id,
        memberships: { create: { userId: alice.id, role: "owner" } },
      },
    });
    await db.meeting.create({
      data: {
        clubId: club.id,
        title: "Cancelled Book Chat",
        status: "cancelled",
        createdBy: alice.id,
      },
    });

    try {
      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${club.id}/meetings`);

      // Cancelled meetings are hidden from the list (MEET-UI-LIST-001) — a
      // cancelled-only club renders the same empty state as a zero-meeting club.
      await expect(page.getByTestId("no-meetings")).toBeVisible();
      await expect(page.getByText("Cancelled Book Chat")).toHaveCount(0);
      await expect(page.getByTestId("meetings-list")).toHaveCount(0);
    } finally {
      await db.meeting.deleteMany({ where: { clubId: club.id } });
      await db.membership.deleteMany({ where: { clubId: club.id } });
      await db.club.delete({ where: { id: club.id } });
    }
  });
});
