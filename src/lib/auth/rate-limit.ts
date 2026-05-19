// @spec AUTH-API-RATELIMIT-001
//
// In-memory fixed-window rate limiter. State lives in process memory and is
// therefore (a) wiped on Vercel cold-start and (b) NOT shared across server
// instances. For the pilot's scale (~20 clubs, single-region deployment) this
// is the cheapest defense that still blunts naive brute-force scripts. When
// the pilot ends and the app moves to multi-instance or higher attack risk,
// swap this for a Redis/Upstash-backed token bucket — call sites use the
// `checkRateLimit` signature only, so the substitution is mechanical.

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { ok: boolean; remaining: number; resetMs: number } {
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    // Fresh window: first hit consumes one token.
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (existing.count >= limit) {
    const resetMs = windowMs - (now - existing.windowStart);
    return { ok: false, remaining: 0, resetMs };
  }

  existing.count += 1;
  const remaining = limit - existing.count;
  const resetMs = windowMs - (now - existing.windowStart);
  return { ok: true, remaining, resetMs };
}

/** Test helper — wipes all rate-limit state. */
export function _resetRateLimits(): void {
  buckets.clear();
}
