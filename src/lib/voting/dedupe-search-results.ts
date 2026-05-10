// @spec VOTE-API-009-DEDUP
export interface SearchResultRow {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
}

function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function titleAuthorKey(row: SearchResultRow): string {
  return `${normalizeText(row.title)}|${normalizeText(row.author)}`;
}

export function dedupeSearchResults<T extends SearchResultRow>(rows: T[]): T[] {
  const seenIds = new Set<string>();
  const seenIsbns = new Set<string>();
  const seenTitleAuthor = new Set<string>();
  const out: T[] = [];

  for (const row of rows) {
    if (seenIds.has(row.id)) continue;

    const normIsbn = row.isbn ? normalizeIsbn(row.isbn) : null;
    if (normIsbn && seenIsbns.has(normIsbn)) continue;

    // Only collapse by title+author when neither side asserted a *different*
    // ISBN. Distinct ISBNs mean distinct editions — keep them separate.
    const taKey = titleAuthorKey(row);
    if (!normIsbn && seenTitleAuthor.has(taKey)) continue;

    seenIds.add(row.id);
    if (normIsbn) seenIsbns.add(normIsbn);
    seenTitleAuthor.add(taKey);
    out.push(row);
  }

  return out;
}
