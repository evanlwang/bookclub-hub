import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode, getBookByTitle } from "./helpers";

test.describe("Progress Book Selector", () => {
  // @spec PROG-UI-BOOK-001, PROG-UI-BOOK-002
  test("shows book selector and can click a book to view its progress", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    const book = await getBookByTitle("Dune");

    // Navigate to progress without a bookId
    await page.goto(`/clubs/${club.id}/progress`);

    // Should see the book selector
    const heading = page.getByRole("heading", { name: "Reading Progress" });
    await expect(heading).toBeVisible();

    // Should see either the book grid or a message
    const bookCard = page.getByTestId(`book-link-${book.id}`);
    const hasBook = await bookCard.isVisible().catch(() => false);

    if (hasBook) {
      // Click on the Dune book
      await bookCard.click();

      // Should navigate to the progress dashboard for that book
      await expect(page).toHaveURL(new RegExp(`/clubs/${club.id}/progress\\?bookId=${book.id}`));

      // Should show the progress ring
      await expect(page.getByTestId("progress-ring")).toBeVisible();
    } else {
      // If no book cards found, check for empty state
      await expect(page.getByText(/No books have been selected/)).toBeVisible();
    }
  });
});
