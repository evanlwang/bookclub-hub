// @spec PROG-UI-MODAL-OPEN-001, PROG-UI-001, PROG-UI-MODAL-PAGE-001, PROG-UI-003, PROG-UI-007, PROG-API-001, PROG-BE-001, PROG-BE-006, PROG-UI-MODAL-PCT-EDIT-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

test.describe("Progress Update Modal", () => {
  // @spec PROG-UI-MODAL-OPEN-001, PROG-UI-MODAL-PAGE-001
  test("opens modal and shows current progress fields", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    // Get book ID for progress page
    const res = await page.request.get(
      `/api/trpc/selections.list?input=${encodeURIComponent(JSON.stringify({ clubId: club.id }))}`
    );
    const data = await res.json();
    const bookId = data.result?.data?.find((s: any) => s.isCurrent)?.bookId;

    await page.goto(`/clubs/${club.id}/progress?bookId=${bookId}`);

    await page.getByTestId("update-progress-btn").click();
    await expect(page.getByTestId("progress-modal")).toBeVisible();
    await expect(page.getByTestId("page-input")).toBeVisible();
    await expect(page.getByTestId("percentage-input")).toBeVisible();
  });

  // @spec PROG-BE-001, PROG-UI-MODAL-PAGE-001
  test("entering page number updates percentage live", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    const res = await page.request.get(
      `/api/trpc/selections.list?input=${encodeURIComponent(JSON.stringify({ clubId: club.id }))}`
    );
    const data = await res.json();
    const bookId = data.result?.data?.find((s: any) => s.isCurrent)?.bookId;

    await page.goto(`/clubs/${club.id}/progress?bookId=${bookId}`);
    await page.getByTestId("update-progress-btn").click();

    // Enter page 206 (50% of 412)
    await page.getByTestId("page-input").fill("206");
    await expect(page.getByTestId("percentage-input")).toHaveValue("50");
  });

  // @spec PROG-UI-001, PROG-UI-003, PROG-BE-006
  test("selecting Finished sets percentage to 100%", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");

    const res = await page.request.get(
      `/api/trpc/selections.list?input=${encodeURIComponent(JSON.stringify({ clubId: club.id }))}`
    );
    const data = await res.json();
    const bookId = data.result?.data?.find((s: any) => s.isCurrent)?.bookId;

    await page.goto(`/clubs/${club.id}/progress?bookId=${bookId}`);
    await page.getByTestId("update-progress-btn").click();

    await page.getByTestId("status-finished").click();
    await expect(page.getByTestId("percentage-input")).toHaveValue("100");
  });

  // @spec PROG-UI-007, PROG-API-001
  test("submitting progress closes modal", async ({ page }) => {
    await loginAs(page, "dave@example.com");
    const club = await getClubByCode("WEDREADS");

    const res = await page.request.get(
      `/api/trpc/selections.list?input=${encodeURIComponent(JSON.stringify({ clubId: club.id }))}`
    );
    const data = await res.json();
    const bookId = data.result?.data?.find((s: any) => s.isCurrent)?.bookId;

    await page.goto(`/clubs/${club.id}/progress?bookId=${bookId}`);
    await page.getByTestId("update-progress-btn").click();

    await page.getByTestId("status-reading").click();
    await page.getByTestId("page-input").fill("300");
    await page.getByTestId("save-progress-btn").click();

    // Modal should close
    await expect(page.getByTestId("progress-modal")).not.toBeVisible({ timeout: 10000 });
  });
});
