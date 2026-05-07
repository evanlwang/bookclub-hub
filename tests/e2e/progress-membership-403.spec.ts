import { test, expect } from "@playwright/test";
import { loginAs, getDb } from "./helpers";

// @spec PROG-ERR-002, PROG-ERR-003
test.describe("Progress page non-member 403 handling", () => {
  test.describe.configure({ mode: "serial" });

  // We need a user who is NOT a member of the target club. SCIFI42 (bob's club)
  // has alice/bob/dave/carol/etc, but eve is only in WEDREADS — perfect.
  // Verify by computing fixtures from the seeded DB.

  async function getNonMemberSetup() {
    const db = getDb();
    const scifi = await db.club.findUniqueOrThrow({ where: { code: "SCIFI42" } });
    const eve = await db.user.findUniqueOrThrow({ where: { email: "eve@example.com" } });
    const eveMembership = await db.membership.findUnique({
      where: { clubId_userId: { clubId: scifi.id, userId: eve.id } },
    });
    if (eveMembership) {
      throw new Error("Test precondition broken: eve is a member of SCIFI42");
    }
    return { clubId: scifi.id };
  }

  // @spec PROG-ERR-003
  test("progress.list returns FORBIDDEN for non-members (procedure-level)", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const { clubId } = await getNonMemberSetup();

    const res = await page.request.get(
      `/api/trpc/progress.list?input=${encodeURIComponent(
        JSON.stringify({ clubId, bookId: "00000000-0000-0000-0000-000000000000" })
      )}`
    );
    // tRPC returns 403 for FORBIDDEN errors.
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain("Not a club member");
  });

  // @spec PROG-ERR-002
  test("progress page renders the error message when load fails for non-members", async ({ page }) => {
    await loginAs(page, "eve@example.com");
    const { clubId } = await getNonMemberSetup();

    await page.goto(`/clubs/${clubId}/progress`);

    // The page surfaces the FORBIDDEN message via the selections-error testid
    // (selections.list is the first call in the load chain and is also gated by memberProcedure).
    const err = page.getByTestId("selections-error");
    await expect(err).toBeVisible();
    await expect(err).toContainText("Not a club member");
  });
});
