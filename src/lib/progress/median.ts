// @spec PROG-DASH-MEDIAN-001

interface ProgressLike {
  percentage: number;
  status: string;
}

/**
 * Compute the median percentage across members who have actually started
 * reading. Members in `not_started` are excluded so the headline number on
 * the dashboard reflects the people who are engaging with the book, not a
 * club average dragged down by everyone who hasn't opened it yet.
 *
 * Returns 0 when no member has started reading (so the ring renders empty
 * rather than NaN or undefined).
 */
export function medianOfReading(records: ReadonlyArray<ProgressLike>): number {
  const started = records.filter((r) => r.status !== "not_started");
  if (started.length === 0) return 0;

  const sorted = started.map((r) => r.percentage).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
