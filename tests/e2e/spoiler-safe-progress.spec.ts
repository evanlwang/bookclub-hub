// @spec DISC-UI-PROGRESS-AUTOFILTER-001, DISC-UI-PROGRESS-AUTOFILTER-002, DISC-UI-DASH-FEED-AUTOFILTER-001
import { test, expect } from "@playwright/test";
import { loginAs, getClubByCode } from "./helpers";

/**
 * The standard scenario seeds 4 Dune threads tagged Ch.3, Ch.5, Ch.10, and one
 * untagged. Reading progress for WEDREADS members is:
 *   alice ch.12  bob ch.6  carol ch.22  dave ch.10  eve ch.15  frank null.
 * "Spoiler-safe by default" means the discussion surfaces filter by the
 * viewer's currentChapter automatically, with show-all as a per-session escape.
 */

test.describe("Spoiler-safe filtering by reading progress", () => {
  // @spec DISC-UI-PROGRESS-AUTOFILTER-001
  test("discussions page prefills the chapter input from viewer progress", async ({ page }) => {
    // Bob is at chapter 6 — Ch.10 thread should be hidden by default.
    await loginAs(page, "bob@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await expect(page.getByTestId("threads-list")).toBeVisible();

    // Input is prefilled with bob's current chapter (6).
    await expect(page.getByTestId("max-chapter-input")).toHaveValue("6");

    // Visible: untagged + Ch.3 + Ch.5 = 3. Hidden: Ch.10 = 1.
    await expect(page.getByTestId("threads-list").locator("li")).toHaveCount(3);
    await expect(page.getByTestId("hidden-count")).toContainText("1");
  });

  // @spec DISC-UI-PROGRESS-AUTOFILTER-002
  test("discussions page shows all threads when viewer has no progress", async ({ page }) => {
    // Frank has no progress recorded — no spoiler filter applied.
    await loginAs(page, "frank@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}/discussions`);
    await expect(page.getByTestId("threads-list")).toBeVisible();

    // Input remains empty; all 4 threads visible; no hidden-count chip.
    await expect(page.getByTestId("max-chapter-input")).toHaveValue("");
    await expect(page.getByTestId("threads-list").locator("li")).toHaveCount(4);
    await expect(page.getByTestId("hidden-count")).toHaveCount(0);
  });

  // @spec DISC-UI-DASH-FEED-AUTOFILTER-001
  test("dashboard Recent Discussions hides spoiler threads above viewer progress", async ({ page }) => {
    // Bob is at chapter 6 — the Ch.10 thread (body: "Paul's visions are a bit much")
    // must NOT appear in the recent feed even though it's one of the three most-recent.
    // (Dashboard renders thread.body, not thread.title.)
    await loginAs(page, "bob@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    // Expect the spoiler thread to be absent from the dashboard.
    await expect(page.getByText("Paul's visions are a bit much")).toHaveCount(0);

    // Other threads at or below ch.6, plus the untagged thread, can appear.
    // The untagged "favorite quotes" thread body is rendered.
    await expect(page.getByText("Share your favorite quotes")).toBeVisible();
  });

  // @spec DISC-UI-DASH-FEED-AUTOFILTER-001
  test("dashboard Recent Discussions shows higher-chapter threads to readers past that chapter", async ({ page }) => {
    // Eve is at chapter 15 — every tagged thread (3, 5, 10) is fair game.
    // Dashboard renders thread.body, so match on body text.
    await loginAs(page, "eve@example.com");
    const club = await getClubByCode("WEDREADS");

    await page.goto(`/clubs/${club.id}`);

    await expect(page.getByText("Paul's visions are a bit much")).toBeVisible();
  });
});
