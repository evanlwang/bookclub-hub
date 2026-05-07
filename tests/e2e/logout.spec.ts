// @spec AUTH-UI-LOGOUT-001, AUTH-UI-LOGOUT-003
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

async function getSessionCookie(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "session_id");
}

test.describe("Sign Out", () => {
  // @spec AUTH-UI-LOGOUT-001
  test("sidebar Sign out clears session and redirects to /", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const wedReads = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${wedReads.id}`);
    await expect(await getSessionCookie(page)).toBeTruthy();

    await page
      .getByRole("complementary")
      .getByRole("button", { name: /sign out/i })
      .click();

    await page.waitForURL("**/", { timeout: 10000 });
    expect(new URL(page.url()).pathname).toBe("/");
    expect(await getSessionCookie(page)).toBeUndefined();
  });

  // @spec AUTH-UI-LOGOUT-003
  test("revisiting a club after sign-out shows the unauthenticated state", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const wedReads = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${wedReads.id}`);
    await page
      .getByRole("complementary")
      .getByRole("button", { name: /sign out/i })
      .click();
    await page.waitForURL("**/", { timeout: 10000 });

    await page.goto(`/clubs/${wedReads.id}`);
    await expect(page.getByTestId("club-error")).toBeVisible({ timeout: 10000 });
  });
});
