// @spec CAT-UI-PAGE-001, CAT-UI-SEARCH-001, CAT-UI-RESULTS-001,
//        CAT-UI-DETAIL-001, CAT-UI-NOM-001, CAT-UI-NOM-002,
//        CAT-UI-EMPTY-001, CAT-UI-ERROR-001, CAT-UI-PAGER-001
import { test, expect, type Page } from "@playwright/test";
import { loginAs, getClubByCode, getDb } from "./helpers";

// ---------- Mock Open Library payloads (returned via tRPC HTTP intercept) ----------

const duneCard = {
  openLibraryKey: "/works/OL45804W",
  title: "Dune",
  authorNames: ["Frank Herbert"],
  firstPublishYear: 1965,
  coverUrl: "https://covers.openlibrary.org/b/id/9259-M.jpg",
  isbn: "0441172717",
  pageCount: 412,
};

const leftHandCard = {
  openLibraryKey: "/works/OL453825W",
  title: "The Left Hand of Darkness",
  authorNames: ["Ursula K. Le Guin"],
  firstPublishYear: 1969,
  coverUrl: "https://covers.openlibrary.org/b/id/8231180-M.jpg",
  isbn: "0441478123",
  pageCount: 304,
};

const duneDetail = {
  ...duneCard,
  coverUrl: "https://covers.openlibrary.org/b/id/9259-L.jpg",
  description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides.",
  subjects: ["Science fiction", "Politics", "Ecology"],
  isbns: [],
};

// ---------- tRPC mock helpers ----------

async function mockCatalog(page: Page) {
  await page.route(/\/api\/trpc\/catalog\.search/, async (route) => {
    const url = new URL(route.request().url());
    const input = JSON.parse(decodeURIComponent(url.searchParams.get("input") ?? "{}"));
    const q = (input.query ?? "").toLowerCase();
    const page_ = input.page ?? 1;

    let results: typeof duneCard[] = [];
    if (q.includes("dune")) results = [duneCard, leftHandCard];
    else if (q.includes("zzz")) results = []; // empty-state trigger
    else if (q.includes("__error__")) {
      // Error trigger
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          error: { message: "Catalog temporarily unavailable", data: { code: "BAD_GATEWAY" } },
        }),
      });
      return;
    } else results = [duneCard];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: {
            results,
            page: page_,
            limit: 20,
            totalEstimate: results.length,
            source: "open-library",
          },
        },
      }),
    });
  });

  await page.route(/\/api\/trpc\/catalog\.getDetail/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { data: duneDetail } }),
    });
  });
}

async function ensureNominatingRound(clubId: string, createdByEmail: string): Promise<string> {
  const db = getDb();
  // Reuse an existing nominating round if present; otherwise create one.
  const existing = await db.votingRound.findFirst({
    where: { clubId, status: "nominating" },
  });
  if (existing) return existing.id;

  // Avoid colliding with an existing voting round (one active round per club).
  await db.votingRound.updateMany({
    where: { clubId, status: "voting" },
    data: { status: "cancelled" },
  });

  const creator = await db.user.findUniqueOrThrow({ where: { email: createdByEmail } });
  const round = await db.votingRound.create({
    data: {
      clubId,
      status: "nominating",
      maxApprovalsPerMember: 3,
      createdBy: creator.id,
    },
  });
  return round.id;
}

// ---------- Tests ----------

test.describe("Book search catalog", () => {
  // @spec CAT-UI-PAGE-001
  test("sidebar link navigates to /clubs/{id}/catalog", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}`);
    await page.getByTestId("sidebar-nav-browse books").click();

    await expect(page).toHaveURL(`/clubs/${club.id}/catalog`);
    await expect(page.getByTestId("catalog-search-input")).toBeVisible();
  });

  // @spec CAT-UI-SEARCH-001, CAT-UI-RESULTS-001
  test("typing a query returns a grid of result cards", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}/catalog`);
    await page.getByTestId("catalog-search-input").fill("dune");

    const grid = page.getByTestId("catalog-results-grid");
    await expect(grid).toBeVisible();
    const cards = grid.getByTestId("catalog-result-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText("Dune");
    await expect(cards.first()).toContainText("Frank Herbert");
  });

  // @spec CAT-UI-EMPTY-001
  test("zero-result query shows the empty state", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}/catalog`);
    await page.getByTestId("catalog-search-input").fill("zzz");

    await expect(page.getByTestId("catalog-empty-state")).toBeVisible();
    // UI uses curly quotes (&ldquo;/&rdquo;), so just match the verb + the query.
    await expect(page.getByTestId("catalog-empty-state")).toContainText("No books matched");
    await expect(page.getByTestId("catalog-empty-state")).toContainText("zzz");
  });

  // @spec CAT-UI-ERROR-001
  test("BAD_GATEWAY surfaces an inline retry banner", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}/catalog`);
    await page.getByTestId("catalog-search-input").fill("__error__");

    await expect(page.getByTestId("catalog-error-banner")).toBeVisible();
    await expect(page.getByTestId("catalog-error-retry")).toBeVisible();
  });

  // @spec CAT-UI-DETAIL-001
  test("clicking Details opens the slide-out panel with description and subjects", async ({ page }) => {
    await loginAs(page, "alice@example.com");
    const club = await getClubByCode("WEDREADS");
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}/catalog`);
    await page.getByTestId("catalog-search-input").fill("dune");
    await page.getByTestId("catalog-result-card").first().getByTestId("catalog-card-details").click();

    const panel = page.getByTestId("catalog-detail-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Dune");
    await expect(panel).toContainText("Set on the desert planet Arrakis");
    await expect(panel).toContainText("Science fiction");
  });

  // @spec CAT-UI-NOM-002
  test("Nominate button is hidden when there is no active nominating round", async ({ page }) => {
    // Cancel any active rounds for SCIFI42 to guarantee no nominating round.
    const club = await getClubByCode("SCIFI42");
    const db = getDb();
    await db.votingRound.updateMany({
      where: { clubId: club.id, status: { in: ["nominating", "voting"] } },
      data: { status: "cancelled" },
    });

    await loginAs(page, "bob@example.com"); // owner of SCIFI42
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}/catalog`);
    await page.getByTestId("catalog-search-input").fill("dune");

    await expect(page.getByTestId("catalog-no-active-round")).toBeVisible();
    await expect(page.getByTestId("catalog-card-nominate")).toHaveCount(0);
  });

  // @spec CAT-UI-NOM-001 — golden path: search → detail → nominate → confirm
  test("nominating from the catalog imports the book and creates a nomination", async ({ page }) => {
    const club = await getClubByCode("WEDREADS");
    const roundId = await ensureNominatingRound(club.id, "alice@example.com");

    // Clear any prior nominations of this book in this round so the test is
    // idempotent across reruns.
    const db = getDb();
    const existingBook = await db.book.findFirst({
      where: { openLibraryId: duneCard.openLibraryKey },
    });
    if (existingBook) {
      await db.nomination.deleteMany({
        where: { roundId, bookId: existingBook.id },
      });
    }

    await loginAs(page, "alice@example.com");
    await mockCatalog(page);

    await page.goto(`/clubs/${club.id}/catalog`);
    await page.getByTestId("catalog-search-input").fill("dune");

    // Nominate from the card.
    await page
      .getByTestId("catalog-result-card")
      .first()
      .getByTestId("catalog-card-nominate")
      .click();

    // Inline success confirmation appears with link to vote.
    const success = page.getByTestId("catalog-nominate-success");
    await expect(success).toBeVisible();
    await expect(success).toContainText("Dune");

    // DB side effect: a Book row exists for the openLibraryKey, and a
    // Nomination row links it to the active round.
    const book = await db.book.findFirstOrThrow({
      where: { openLibraryId: duneCard.openLibraryKey },
    });
    const nom = await db.nomination.findFirst({
      where: { roundId, bookId: book.id },
    });
    expect(nom).not.toBeNull();
  });
});
