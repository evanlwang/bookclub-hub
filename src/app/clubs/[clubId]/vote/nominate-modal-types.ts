export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  pageCount?: number;
  coverUrl?: string | null;
}

export interface FormErrors {
  title?: string;
  author?: string;
  pageCount?: string;
}

export const NOMINATE_INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-md border bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20";

export const NOMINATE_FIELD_ERROR_CLASS = "text-xs text-danger mt-1";
