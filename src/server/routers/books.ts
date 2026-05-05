// @spec VOTE-API-009, VOTE-BE-004
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
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

        // Cache results locally
        const books = await Promise.all(
          results.map(async (r) => {
            return ctx.db.book.upsert({
              where: {
                id: (
                  await ctx.db.book.findFirst({
                    where: { openLibraryId: r.openLibraryId },
                  })
                )?.id ?? "00000000-0000-0000-0000-000000000000",
              },
              update: {},
              create: {
                title: r.title,
                author: r.author,
                isbn: r.isbn,
                coverUrl: r.coverUrl,
                pageCount: r.pageCount,
                openLibraryId: r.openLibraryId,
                description: r.description,
              },
            });
          })
        );

        return books;
      } catch {
        // API unavailable — return empty, user can enter manually
        return [];
      }
    }),
});
