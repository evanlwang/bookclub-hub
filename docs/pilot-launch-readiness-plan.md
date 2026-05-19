# Production Readiness + Security: Pilot Launch

## Context

Dogear is ready to invite a small group of book clubs as a passcode-gated pilot. The application logic is well-structured (tRPC + Prisma + Next.js App Router with strong test coverage, sliding-session auth, role-based authorization), but a focused audit surfaced one tenant-isolation bug, a defense-in-depth email gap, and several thin-but-load-bearing infra pieces that are missing or unverified. The user's pilot model is "any friend with the shared passcode can sign up" (keep `PILOT_PASSCODE` as-is). The bar for shipping is **critical security + minimal infra** — defer CI workflows, Prisma migrations, DB indices, Sentry-style observability, and email retries to post-pilot.

This plan delivers the smallest set of changes that closes the real cross-tenant exposure, hardens the perimeter (rate limits, HTTP headers, email escaping), validates env at boot, and gives operations a heartbeat — without slowing the launch.

## Out of Scope (Deferred to Post-Pilot)

- Prisma migrations directory (currently `db push`)
- Hot-column DB indices (no measured slowness yet)
- GitHub Actions CI for tests/lint/typecheck
- Sentry / Datadog / structured logger
- Email retry queue, delivery-failure alerting
- Account-enumeration polish in `signIn` / `clubs.join` error messages
- Per-user clubs cap, per-club members cap (passcode is already a meaningful gate; revisit after pilot)
- Vercel function timeout / region overrides
- Email allowlist or pre-created-clubs-only mode

## Tracks

Each track is independently committable. Tracks A–D are security; E–G are infra. Recommended order: A → B → C → E → F → D → G.

---

### A. Fix cross-club tenant bypass in `nominations.delete` (CRITICAL)

**File:** `src/server/routers/nominations.ts:62-89`

**Bug:** The procedure looks up the nomination by `nominationId`, then derives admin/author privilege from `ctx.membership` — which is the caller's membership in `input.clubId`, not in the nomination's actual club. An admin of club A who knows a nomination ID from club B can delete it by passing `{ clubId: <their-club>, nominationId: <victim-club's-nomination> }`. Compare to `threads.get` (`src/server/routers/threads.ts:151-153`) and `rounds.advance` (`src/server/routers/rounds.ts:148-150`) which already verify `resource.clubId === input.clubId`.

**Change:**
- After loading the nomination, assert `nomination.round.clubId === input.clubId`; throw `NOT_FOUND` if mismatched (consistent with `rounds.ts` pattern).
- Add `// @spec` annotation citing a new spec ID.

**Spec / LLD:**
- `docs/specs/vote-specs.md` — add `VOTE-API-NOMDELETE-XCLUB-001`: nominations.delete SHALL verify the nomination's round belongs to `input.clubId` before authorization checks; cross-club requests SHALL throw NOT_FOUND.
- `docs/llds/book-selection-and-voting.md` — reference under the nominations API table.

**Test:**
- New integration test in `tests/integration/voting-lifecycle.test.ts` (or a new `nominations-security.test.ts`): user is admin of club A, attempts to delete a nomination from club B, expects `NOT_FOUND`. Mirror the pattern in `tests/integration/meetings-security.test.ts`.

---

### B. Escape user input in email HTML templates

**File:** `src/server/services/email.ts:43-79`

**Risk:** `clubName`, `bookTitle`, `title`, and `location` are interpolated into HTML email bodies raw. Email clients sandbox aggressively, so this is defense-in-depth, not an active XSS — but a `clubName` of `<b>HACKED</b>` or a meeting title with quotes renders broken markup at minimum.

**Change:**
- Add a small `escapeHtml(s: string)` helper at the top of `email.ts` (5 lines, replaces `&<>"'`). Do **not** pull in `isomorphic-dompurify` here — overkill for fixed templates with known interpolation points.
- Wrap every interpolated user-supplied value: `${escapeHtml(clubName)}`, `${escapeHtml(bookTitle)}`, etc. Leave subjects (text/plain) unwrapped.

**Test:**
- Unit test next to `email.ts` (new `email.test.ts`): call each method with an interpolation value containing `<`, `&`, `"`; assert the recorded `EmailCall.body` contains the escaped form.

**No spec change needed** — escaping is an implementation detail of the existing "send notification" specs.

---

### C. Basic rate limiting on auth + join endpoints

**Files:** `src/server/routers/auth.ts` (`signIn`, `enter`), `src/server/routers/clubs.ts` (`join` unauthenticated branch)

**Risk:** A passcode-guessing or email-enumeration script faces no throttle. The passcode is 1 shared secret across the pilot — guessable iff brute-forced fast.

**Change:**
- Add a lightweight in-memory token-bucket per IP + per email (separately), used only at these three entry points. New file `src/lib/auth/rate-limit.ts` exporting `checkRateLimit(key: string, limit: number, windowMs: number)`. In-memory `Map` is fine for pilot; document the trade-off (resets on deploy; doesn't span Vercel instances) in the file header.
- Apply: 5 attempts per minute per IP and per email on `signIn`/`enter`; 10 per minute per IP on `clubs.join`. On exceed, throw `TOO_MANY_REQUESTS`.
- Extract the caller IP from `ctx` — verify `src/app/api/trpc/[trpc]/route.ts` or `src/trpc/server.ts` already forwards `req.headers['x-forwarded-for']`; if not, plumb it through context.

**Spec:**
- `docs/specs/auth-specs.md` — add `AUTH-API-RATELIMIT-001`: the system SHALL throttle signIn/enter to 5 attempts per minute per IP and per email; throw TOO_MANY_REQUESTS on exceed.

**Test:**
- Unit test for `rate-limit.ts` (token-bucket behavior).
- Integration test: 6 sequential `signIn` calls from the same IP — 6th throws.

---

### D. HTTP security headers

**File:** `next.config.ts` (currently 12 lines, no headers)

**Change:**
- Add a `headers()` async export to `nextConfig` with the following on `source: '/(.*)'`:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Skip CSP for the pilot — Next.js inline scripts + Tailwind make a tight CSP error-prone. Add as a deferred item; for the pilot rely on the other headers.

**Test:**
- One Playwright assertion in any existing e2e spec: navigate to `/`, check `response.headers()` includes the five headers above. Or a tiny dedicated `tests/e2e/security-headers.spec.ts`.

---

### E. Validate environment at boot

**New file:** `src/env.ts`

**Risk:** `process.env.PILOT_PASSCODE`, `RESEND_API_KEY`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL` are read inline at call sites. A missing value surfaces only when that code path runs (lazy failure). `passcode.ts` already does fail closed in production for `PILOT_PASSCODE` — but the rest are silent.

**Change:**
- Create `src/env.ts` exporting a Zod-validated `env` object covering: `DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`, `CRON_SECRET`, `PILOT_PASSCODE`, `NODE_ENV`, `OPEN_LIBRARY_BASE_URL`. Required-in-production fields use `.refine()` keyed off `NODE_ENV`.
- Import once at the top of `src/lib/db.ts` (which is the de-facto early entry) so any missing env triggers a clear error at boot, not in a request.
- Replace inline `process.env.X` reads at the three sites that matter most (`email.ts`, `passcode.ts`, both cron routes) with `env.X`. Don't churn other call sites for the pilot.

**Test:**
- Unit test on `env.ts`: invalid env throws with a readable message. Skip mutating `process.env` in CI — use Zod schema directly.

---

### F. Add `/api/health` endpoint

**New file:** `src/app/api/health/route.ts`

**Purpose:** External uptime monitor (UptimeRobot / BetterUptime / a manual cron) needs something to ping. Without it the only "is it up?" signal is the homepage, which depends on the auth flow.

**Change:**
- `GET /api/health` returns `200 { status: "ok", commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown", db: "ok" | "down" }`.
- Run a single `await prisma.$queryRaw\`SELECT 1\`` with a 2s timeout to surface DB unreachable. Catch and return `503` with `db: "down"`.
- Do **not** include any auth — health is open. Do not include any PII or env values.

**Test:**
- Integration test: `GET /api/health` returns 200 with `status: "ok"` against the test DB.

---

### G. Confirm Vercel cron wiring + production env

**Files:** `vercel.json` (new), `.env.example` (already exists)

**Risk:** Two cron endpoints exist (`src/app/api/cron/hard-delete-clubs/`, `src/app/api/cron/voting-deadline-reminder/`), both protected by `CRON_SECRET` header validation. But there's no `vercel.json` or `vercel.ts` declaring the cron schedules — they will never fire unless wired in the Vercel dashboard.

**Change:**
- Add `vercel.json` (simpler than `vercel.ts` for a static schedule) with:
  ```
  {
    "crons": [
      { "path": "/api/cron/hard-delete-clubs", "schedule": "0 3 * * *" },
      { "path": "/api/cron/voting-deadline-reminder", "schedule": "0 * * * *" }
    ]
  }
  ```
- Confirm `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`, `PILOT_PASSCODE`, `OPEN_LIBRARY_BASE_URL` are set in Vercel Production env. The `vercel:env` skill can pull current values for comparison.
- Document the pilot URL, passcode hand-off process, and "how to add/remove a pilot club" in a short runbook (new `docs/runbook-pilot.md`).

**Note:** Vercel automatically injects `CRON_SECRET` validation via the `Authorization: Bearer ${CRON_SECRET}` header; check that the existing cron route handlers expect that exact header format and not a custom one. The current implementation uses `process.env.CRON_SECRET` comparison — verify the header parsing matches Vercel's convention before relying on the wiring.

---

## Critical Files to Modify

| File | Track | Change |
|---|---|---|
| `src/server/routers/nominations.ts` | A | Add cross-club guard in `delete` |
| `src/server/services/email.ts` | B | Add `escapeHtml`, wrap interpolations |
| `src/server/routers/auth.ts` | C | Apply rate-limit to `signIn`, `enter` |
| `src/server/routers/clubs.ts` | C | Apply rate-limit to unauth `join` branch |
| `src/lib/auth/rate-limit.ts` | C | NEW — in-memory token bucket |
| `next.config.ts` | D | Add `headers()` export |
| `src/env.ts` | E | NEW — Zod-validated env |
| `src/lib/db.ts` | E | Import `src/env.ts` for boot-time validation |
| `src/app/api/health/route.ts` | F | NEW — health probe |
| `vercel.json` | G | NEW — cron schedules |
| `docs/specs/vote-specs.md` | A | Add `VOTE-API-NOMDELETE-XCLUB-001` |
| `docs/specs/auth-specs.md` | C | Add `AUTH-API-RATELIMIT-001` |
| `docs/llds/book-selection-and-voting.md` | A | Note cross-club guard in nominations table |
| `docs/runbook-pilot.md` | G | NEW — pilot operations runbook |

## Reuse Notes

- Cross-club guard pattern: copy from `src/server/routers/rounds.ts:148-150` (`if (round.clubId !== input.clubId) throw NOT_FOUND`) and `src/server/routers/threads.ts:151-153`.
- Test pattern for cross-club: `tests/integration/meetings-security.test.ts` already implements this exactly for meetings — mirror its structure for nominations.
- Passcode `timingSafeEqual` pattern in `src/lib/auth/passcode.ts:13-24` is the model for any constant-time comparison the rate-limit code might need.
- Email recording test helper: `getEmailCalls()` and `resetEmailCalls()` in `src/server/services/email.ts:83-89` — reuse for the escape-html test.

## Verification

1. **Unit + integration tests** (every track adds tests):
   ```
   npm run test:unit
   npm run test:integration
   ```
2. **Type + lint:**
   ```
   npm run typecheck
   npm run lint
   ```
3. **End-to-end:** spin up the full stack and exercise the pilot flow end-to-end.
   ```
   make up
   npx playwright test tests/e2e/voting-round.spec.ts tests/e2e/voting-close.spec.ts
   ```
4. **Manual security smoke (post-deploy to a Vercel preview URL):**
   - `curl -i https://<preview>/api/health` — expect 200 with `db: "ok"`.
   - `curl -I https://<preview>/` — verify the five security headers are present.
   - Try `signIn` with wrong passcode 6 times in a row from the same IP — 6th should return `TOO_MANY_REQUESTS`.
   - From an admin account in club A, attempt `nominations.delete` via the tRPC URL with a nominationId from club B — expect `NOT_FOUND`.
   - Create a club with name `<b>X</b>` and trigger a round-start email; inspect the recorded body (in test mode) or the actual email — verify `&lt;b&gt;X&lt;/b&gt;`.
5. **Cron sanity:** in the Vercel dashboard, confirm both crons appear under "Crons" with the expected schedules and a successful most-recent run.

## Exit Criteria for Pilot Launch

- Tracks A–G merged to `main`.
- Vercel production deploy green; `/api/health` returns 200 from the production URL.
- Five security headers verified on production.
- Both crons visible in Vercel dashboard with at least one successful invocation logged.
- Pilot passcode generated, set in Vercel env, and recorded only in your password manager.
- Runbook (`docs/runbook-pilot.md`) lists: pilot URL, passcode, how to rotate the passcode, how to archive a pilot club, how to read the recent voting-deadline-reminder cron logs.
