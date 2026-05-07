// @spec CAT-API-001, CAT-API-002, CAT-API-003, CAT-API-004
//
// Book Search Catalog router — discovery surface over Open Library.
// Distinct from `books.ts`: catalog procedures do NOT persist to the local
// `Book` table. Persistence happens only when a user explicitly imports a
// catalog result via `books.importFromCatalog` (CAT-BE-002), which is a
// separate procedure on the existing books router.
//
// Spec: docs/specs/catalog-specs.md
// LLD:  docs/llds/book-search-catalog.md (TBD)
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  searchPaged,
  getByIsbn,
  getWorkDetail,
  type CatalogBook,
  type CatalogBookDetail,
} from "../services/open-library";

// Re-export the response types for client consumers (UI props, hooks).
export type { CatalogBook, CatalogBookDetail } from "../services/open-library";

export interface CatalogSearchResponse {
  results: CatalogBook[];
  page: number;
  limit: number;
  totalEstimate: number;
  source: "open-library" | "cache";
}

// ---------- Input schemas ----------

const searchInput = z.object({
  query: z.string().trim().min(1).max(200),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

const isbnInput = z.object({
  // 10 or 13 digits after stripping hyphens; transform normalizes.
  isbn: z
    .string()
    .transform((s) => s.replace(/-/g, ""))
    .pipe(z.string().regex(/^(\d{10}|\d{13})$/, "ISBN must be 10 or 13 digits")),
});

const detailInput = z.object({
  // e.g. "/works/OL45804W"
  openLibraryKey: z.string().regex(/^\/works\/OL\d+W$/),
});

// ---------- Router ----------

export const catalogRouter = router({
  // @spec CAT-API-001, CAT-BE-001, CAT-BE-CACHE-001, CAT-BE-FAIL-001, CAT-BE-TIMEOUT-001
  search: protectedProcedure
    .input(searchInput)
    .query(async ({ input }): Promise<CatalogSearchResponse> => {
      const { result, fromCache } = await searchPaged({
        query: input.query,
        page: input.page,
        limit: input.limit,
      });
      return {
        results: result.results,
        page: input.page,
        limit: input.limit,
        totalEstimate: result.totalEstimate,
        source: fromCache ? "cache" : "open-library",
      };
    }),

  // @spec CAT-API-002, CAT-BE-FAIL-002
  searchByIsbn: protectedProcedure
    .input(isbnInput)
    .query(async ({ input }): Promise<CatalogBook | null> => {
      return getByIsbn(input.isbn);
    }),

  // @spec CAT-API-003, CAT-BE-FAIL-002
  getDetail: protectedProcedure
    .input(detailInput)
    .query(async ({ input }): Promise<CatalogBookDetail> => {
      return getWorkDetail(input.openLibraryKey);
    }),
});
