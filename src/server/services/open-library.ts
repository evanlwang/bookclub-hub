// Open Library API client for book metadata lookup

export interface OpenLibraryBook {
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  openLibraryId: string;
  description: string | null;
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_sentence?: { value: string }[];
}

const BASE_URL = process.env.OPEN_LIBRARY_BASE_URL || "https://openlibrary.org";

export async function searchBooks(query: string): Promise<OpenLibraryBook[]> {
  const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,isbn,cover_i,number_of_pages_median,first_sentence`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data = (await response.json()) as { docs: OpenLibraryDoc[] };

  return data.docs.map((doc) => ({
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    isbn: doc.isbn?.[0] ?? null,
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    pageCount: doc.number_of_pages_median ?? null,
    openLibraryId: doc.key,
    description: doc.first_sentence?.[0]?.value ?? null,
  }));
}
