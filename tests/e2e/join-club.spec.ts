// @spec CLUB-API-003, CLUB-API-004, AUTH-API-001
import { test, expect } from "@playwright/test";

test.describe("Join Club Flow", () => {
  test("new user can join via code + email + name", async ({ page }) => {
    await page.goto("/join");

    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("email-input").fill("newcomer@example.com");
    await page.getByTestId("name-input").fill("New Person");
    await page.getByTestId("join-button").click();

    // Should navigate to club page
    await expect(page).toHaveURL(/\/clubs\//);
    await expect(page.getByTestId("club-name")).toContainText(
      "Wednesday Night Reads"
    );
  });

  test("shows error for invalid club code", async ({ page }) => {
    await page.goto("/join");

    await page.getByTestId("code-input").fill("INVALID");
    await page.getByTestId("email-input").fill("someone@example.com");
    await page.getByTestId("name-input").fill("Someone");
    await page.getByTestId("join-button").click();

    await expect(page.getByTestId("error-message")).toBeVisible();
  });

  test("existing member gets idempotent join", async ({ page }) => {
    await page.goto("/join");

    await page.getByTestId("code-input").fill("WEDREADS");
    await page.getByTestId("email-input").fill("alice@example.com");
    await page.getByTestId("name-input").fill("Alice Chen");
    await page.getByTestId("join-button").click();

    // Should still navigate to club page (idempotent)
    await expect(page).toHaveURL(/\/clubs\//);
  });

  test("landing page has navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Join a Club" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Clubs" })).toBeVisible();
  });
});
