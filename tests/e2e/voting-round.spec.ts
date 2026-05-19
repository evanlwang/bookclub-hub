// @spec VOTE-UI-001, VOTE-UI-002
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, restoreSeedMembershipGraph, getDb } from "./helpers";

test.describe("Voting Round", () => {
  test.beforeEach(restoreSeedMembershipGraph);
  test("authenticated user sees voting rounds page", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/vote`);

    // The golden dataset has at least one decided round
    await expect(page.getByTestId("rounds-list")).toBeVisible();
    await expect(page.getByTestId("round-status").first()).toBeVisible();
  });

  test("unauthenticated user gets error on voting page", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    await page.goto(`/clubs/${club.id}/vote`);

    await expect(page.getByTestId("vote-error")).toBeVisible();
  });

  test("member of different club gets access error", async ({ page }) => {
    // Carol is only in WEDREADS, not SCIFI42
    await loginAs(page, "carol@example.com");
    const otherClub = await getClubByCode("SCIFI42");

    await page.goto(`/clubs/${otherClub.id}/vote`);

    await expect(page.getByTestId("vote-error")).toBeVisible();
  });

  // @spec VOTE-UI-NONE-001, VOTE-UI-LIST-001
  test("admin sees start-new-round CTA and no history list after cancelling the only round", async ({ page }) => {
    const db = getDb();
    const alice = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    // Isolated club so cancelled-only history doesn't collide with seed rounds.
    const code = `CANCEL${Date.now().toString().slice(-6)}`;
    const club = await db.club.create({
      data: {
        name: "Cancel-Only Club",
        code,
        createdBy: alice.id,
        memberships: { create: { userId: alice.id, role: "owner" } },
      },
    });
    await db.votingRound.create({
      data: {
        clubId: club.id,
        status: "cancelled",
        maxApprovalsPerMember: 3,
        createdBy: alice.id,
      },
    });

    try {
      await loginAs(page, "alice@example.com");
      await page.goto(`/clubs/${club.id}/vote`);

      // Cancelled rounds are hidden from the history list (VOTE-UI-LIST-001).
      await expect(page.getByTestId("rounds-list")).toHaveCount(0);
      await expect(page.getByTestId("no-active-round")).toBeVisible();

      // And the admin can start a new round despite the cancelled history.
      await expect(page.getByTestId("start-new-round-btn")).toBeVisible();
    } finally {
      await db.votingRound.deleteMany({ where: { clubId: club.id } });
      await db.membership.deleteMany({ where: { clubId: club.id } });
      await db.club.delete({ where: { id: club.id } });
    }
  });
});
