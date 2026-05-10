import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";

export interface TestBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  pageCount?: number;
  openLibraryId?: string;
}

export function createBook(overrides?: Partial<TestBook>): TestBook {
  const id = overrides?.id || randomUUID();
  return {
    id,
    title: overrides?.title || "Test Book",
    author: overrides?.author || "Test Author",
    isbn: overrides?.isbn,
    coverUrl: overrides?.coverUrl,
    description: overrides?.description,
    pageCount: overrides?.pageCount,
    openLibraryId: overrides?.openLibraryId,
  };
}

// Classic sci-fi and fantasy novels with real metadata.
// openLibraryId values verified against openlibrary.org search.json on 2026-05-10
// — the "View on Open Library" CTA in vote-round.tsx links to /works/<id>, so
// these must be the canonical work keys (not edition keys or look-alike IDs).
export const dune = createBook({
  title: "Dune",
  author: "Frank Herbert",
  isbn: "978-0441172719",
  pageCount: 412,
  openLibraryId: "/works/OL893415W",
  description: "An epic tale of politics, ecology, and mysticism on the planet Arrakis.",
});

export const leftHand = createBook({
  title: "The Left Hand of Darkness",
  author: "Ursula K. Le Guin",
  isbn: "978-0441478125",
  pageCount: 304,
  openLibraryId: "/works/OL59800W",
  description: "A groundbreaking exploration of gender and society.",
});

export const kindred = createBook({
  title: "Kindred",
  author: "Octavia Butler",
  isbn: "978-0807083697",
  pageCount: 264,
  openLibraryId: "/works/OL35616W",
  description: "A powerful tale of time travel and slavery.",
});

export const hailMary = createBook({
  title: "Project Hail Mary",
  author: "Andy Weir",
  isbn: "978-0593135204",
  pageCount: 476,
  openLibraryId: "/works/OL21745884W",
  description: "A gripping near-future science fiction adventure.",
});

export const piranesi = createBook({
  title: "Piranesi",
  author: "Susanna Clarke",
  isbn: "978-1635575996",
  pageCount: 272,
  openLibraryId: "/works/OL20893680W",
  description: "A mysterious tale set in a house of infinite staircases.",
});

export const exhalation = createBook({
  title: "Exhalation: Stories",
  author: "Ted Chiang",
  isbn: "978-0525513230",
  pageCount: 512,
  openLibraryId: "/works/OL20149336W",
  description: "A collection of thought-provoking science fiction stories.",
});

export const theMartian = createBook({
  title: "The Martian",
  author: "Andy Weir",
  isbn: "978-0553418026",
  pageCount: 369,
  openLibraryId: "/works/OL17091839W",
  description: "A survival story set on Mars.",
});

export const foundationSeries = createBook({
  title: "Foundation",
  author: "Isaac Asimov",
  isbn: "978-0553293357",
  pageCount: 255,
  openLibraryId: "/works/OL46125W",
  description: "The beginning of an epic science fiction saga.",
});

export const allBooks = [dune, leftHand, kindred, hailMary, piranesi, exhalation, theMartian, foundationSeries];

export async function insertBook(db: PrismaClient, book: TestBook) {
  return db.book.create({
    data: {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      coverUrl: book.coverUrl,
      description: book.description,
      pageCount: book.pageCount,
      openLibraryId: book.openLibraryId,
    },
  });
}

export async function insertAllBooks(db: PrismaClient, books: TestBook[] = allBooks) {
  for (const book of books) {
    await insertBook(db, book);
  }
}
