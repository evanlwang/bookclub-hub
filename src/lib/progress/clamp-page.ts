// @spec PROG-API-VALID-001, PROG-UI-MODAL-PAGE-CLAMP-001

/**
 * Clamp a user-entered page value to the valid integer range.
 *
 * - When `totalPages` is a positive integer, the result is bounded to
 *   `[0, totalPages]`. This is the primary guard against UI states like
 *   "page 500 / 412 pages → 121%" leaking through to the server.
 * - When `totalPages` is null (book has no known page count), only the lower
 *   bound is enforced — any non-negative integer is acceptable because the
 *   server stores percentage-only progress in that case.
 * - Non-integer or NaN input is normalised to a safe integer (NaN → 0,
 *   fractional values floored). This matches the `<input type="number">`
 *   behaviour where typing partial text emits NaN to the change handler.
 */
export function clampPage(value: number, totalPages: number | null): number {
  if (!Number.isFinite(value)) return 0;
  const floored = Math.floor(value);
  if (totalPages == null) {
    return Math.max(0, floored);
  }
  if (floored < 0) return 0;
  if (floored > totalPages) return totalPages;
  return floored;
}
