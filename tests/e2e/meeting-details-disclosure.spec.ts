import { test, expect } from "@playwright/test";
import { loginAs, getDb } from "./helpers";

// @spec MEET-UI-DETAILS-DISCLOSURE-001
test.describe("Confirmed-meeting details disclosure", () => {
  test.describe.configure({ mode: "serial" });

  let clubId: string;
  let meetingId: string;

  test.beforeAll(async () => {
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({
      where: { email: "alice@example.com" },
    });
    const bob = await db.user.findUniqueOrThrow({
      where: { email: "bob@example.com" },
    });

    // Isolated club so parallel tests don't see this meeting count change.
    // bob = owner; alice = member.
    const code = `MDD${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const club = await db.club.create({
      data: { name: "Details Disclosure Test Club", code, createdBy: bob.id },
    });
    clubId = club.id;

    await db.membership.createMany({
      data: [
        { clubId: club.id, userId: bob.id, role: "owner" },
        { clubId: club.id, userId: alice.id, role: "member" },
      ],
    });

    // Pre-confirmed meeting — straight to the state we care about.
    const meeting = await db.meeting.create({
      data: {
        clubId: club.id,
        title: "Details-Disclosure Confirmed Meeting",
        location: "Library backroom",
        createdBy: bob.id,
        status: "confirmed",
        confirmedTime: new Date("2026-09-15T19:00:00Z"),
      },
    });
    meetingId = meeting.id;
  });

  test.afterAll(async () => {
    const db = getDb();
    if (clubId) {
      await db.club.deleteMany({ where: { id: clubId } });
    }
  });

  test("admin sees Details toggle; edit and cancel hidden by default", async ({
    page,
  }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);

    const meetingCard = page.getByTestId(`meeting-${meetingId}`);
    await expect(meetingCard).toBeVisible();

    const toggle = meetingCard.getByTestId(
      `meeting-details-toggle-${meetingId}`
    );
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await expect(
      meetingCard.getByTestId(`edit-meeting-${meetingId}`)
    ).toHaveCount(0);
    await expect(
      meetingCard.getByTestId(`cancel-meeting-${meetingId}`)
    ).toHaveCount(0);
  });

  test("clicking Details reveals edit and cancel; clicking again hides them", async ({
    page,
  }) => {
    await loginAs(page, "bob@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);

    const meetingCard = page.getByTestId(`meeting-${meetingId}`);
    const toggle = meetingCard.getByTestId(
      `meeting-details-toggle-${meetingId}`
    );

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      meetingCard.getByTestId(`edit-meeting-${meetingId}`)
    ).toBeVisible();
    await expect(
      meetingCard.getByTestId(`cancel-meeting-${meetingId}`)
    ).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      meetingCard.getByTestId(`edit-meeting-${meetingId}`)
    ).toHaveCount(0);
    await expect(
      meetingCard.getByTestId(`cancel-meeting-${meetingId}`)
    ).toHaveCount(0);
  });

  test("plain member sees no Details toggle, no edit, no cancel", async ({
    page,
  }) => {
    await loginAs(page, "alice@example.com");
    await page.goto(`/clubs/${clubId}/meetings`);

    const meetingCard = page.getByTestId(`meeting-${meetingId}`);
    await expect(meetingCard).toBeVisible();

    await expect(
      meetingCard.getByTestId(`meeting-details-toggle-${meetingId}`)
    ).toHaveCount(0);
    await expect(
      meetingCard.getByTestId(`edit-meeting-${meetingId}`)
    ).toHaveCount(0);
    await expect(
      meetingCard.getByTestId(`cancel-meeting-${meetingId}`)
    ).toHaveCount(0);
  });
});
