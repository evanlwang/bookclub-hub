// @spec PROG-DASH-UPDATED-001

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Render a short relative-time string ("just now", "5m ago", "3h ago",
 * "4d ago", "3w ago"). Deliberately tiny — adding date-fns / dayjs just for
 * the progress dashboard would be overkill, and the dashboard's resolution
 * needs are intentionally coarse (organisers care about days, not seconds).
 *
 * The `now` parameter exists so tests can pin time without monkey-patching
 * `Date.now`.
 */
export function relativeTimeShort(
  value: Date | string,
  now: number = Date.now()
): string {
  const then = value instanceof Date ? value.getTime() : new Date(value).getTime();
  const diff = Math.max(0, now - then);

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  return `${Math.floor(diff / WEEK)}w ago`;
}
