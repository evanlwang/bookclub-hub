// @spec VOTE-API-009, VOTE-BE-004, VOTE-API-009-MANUAL, PROG-UI-BOOK-001
import { z } from "zod";
import { router, protectedProcedure, memberProcedure } from "../trpc";
import { searchBooks as searchOpenLibrary } from "../services/open-library";

export const booksRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Check local cache first
      const cached = await ctx.db.book.findMany({
        where: {
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { author: { contains: input.query, mode: "insensitive" } },
            { isbn: input.query },
          ],
        },
        take: 10,
      });

      if (cached.length > 0) {
        return cached;
      }

      // Query Open Library
      try {
        const results = await searchOpenLibrary(input.query);

        // Cache results locally using proper findFirst → create/update logic
        const books = await Promise.all(
          results.map(async (r) => {
            const existing = await ctx.db.book.findFirst({
              where: { openLibraryId: r.openLibraryId },
            });

            if (existing) {
              // Update existing record with latest metadata
              return ctx.db.book.update({
                where: { id: existing.id },
                data: {
                  title: r.title,
                  author: r.author,
                  isbn: r.isbn,
                  coverUrl: r.coverUrl,
                  pageCount: r.pageCount,
                  description: r.description,
                },
              });
            } else {
              // Create new record
              return ctx.db.book.create({
                data: {
                  title: r.title,
                  author: r.author,
                  isbn: r.isbn,
                  coverUrl: r.coverUrl,
                  pageCount: r.pageCount,
                  openLibraryId: r.openLibraryId,
                  description: r.description,
                },
              });
            }
          })
        );

        return books;
      } catch {
        // API unavailable — return empty, user can enter manually
        return [];
      }
    }),

  // @spec VOTE-API-009-MANUAL
  createManual: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        author: z.string().min(1).max(500),
        isbn: z.string().optional(),
        pageCount: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const book = await ctx.db.book.create({
        data: {
          title: input.title,
          author: input.author,
          isbn: input.isbn,
          pageCount: input.pageCount,
          // openLibraryId deliberately omitted — null for manual entries
        },
      });

      return { book };
    }),

  // @spec PROG-UI-BOOK-001
  listForClub: memberProcedure
    .input(z.object({ clubId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const selections = await ctx.db.bookSelection.findMany({
        where: { clubId: input.clubId },
        include: { book: true },
        orderBy: { selectedAt: "desc" },
      });

      return selections.map((s) => s.book);
    }),
});
