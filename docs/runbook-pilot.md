# Pilot Operations Runbook

How to run the Dogear friends pilot. Identity is email-OTP-verified signup plus passkeys (FaceID/Touch ID) — there is no shared passcode.

## URLs

- **Production**: set the canonical URL here once the Vercel project is provisioned (e.g., `https://bookclub-hub.vercel.app` or the custom domain).
- **Vercel project dashboard**: link the project page here.
- **Health probe**: `/api/health` — public, returns `200 { status, commit, db }`. Wire an external uptime monitor (UptimeRobot, BetterUptime) to this URL.

## Required production env

Set in Vercel **Project Settings → Environment Variables → Production**. The app fails fast at boot if any of these are missing:

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes (prod) | Neon pooled URL (PgBouncer). |
| `DIRECT_URL` | yes (prod) | Neon direct URL — Prisma uses this for migrations. |
| `CRON_SECRET` | yes (prod) | Random 32+ char secret. Vercel injects this as `Authorization: Bearer <value>` when invoking cron endpoints. |
| `WEBAUTHN_RP_ID` | yes (prod) | Registrable domain for passkeys (e.g. the Vercel/custom domain; `localhost` in dev). The browser enforces that the page origin matches; a mismatch fails the passkey ceremony. |
| `WEBAUTHN_ORIGIN` | yes (prod) | Full origin used as `expectedOrigin` during WebAuthn verification (e.g. `https://<domain>` in prod, `http://localhost:3000` in dev). |
| `WEBAUTHN_RP_NAME` | yes (prod) | Human-readable relying-party display name (e.g. "Dogear"). |
| `RESEND_API_KEY` | yes (prod) | Resend API key. **Load-bearing in production: it delivers the OTP sign-in code.** If unset, OTP emails become silent no-ops and no one can verify their email to sign in. |
| `OPEN_LIBRARY_BASE_URL` | optional | Defaults to `https://openlibrary.org`. |

Validation logic lives in `src/env.ts` (`INFRA-ENV-VALIDATION-001`). Pull current values for comparison with:

```
vercel env pull .env.production.local --environment=production
```

## How identity works

There is no shared secret. A user proves they own their email by entering a 6-digit one-time code (OTP), then is offered a passkey for fast returning logins:

- **First sign-in / new device:** enter email → receive a 6-digit OTP by email (delivered via Resend) → enter the code → session created. The code is hashed at rest, single-use, and expires after ~10 minutes.
- **Returning login:** a passkey (FaceID/Touch ID) logs the user in with one tap, no code needed. Passkeys are encouraged but never required.
- **Recovery / fallback:** the OTP path never goes away. A user who loses their device, switches browsers, or is on a WebAuthn-incapable browser can always re-verify by email and (re)register a passkey. Nobody gets locked out.
- **Dev bypass:** in any non-production environment the fixed code `000000` always verifies, so local and E2E runs don't need a live mailbox. This bypass is disabled in production.

**Nothing to rotate.** Because there is no shared passcode, there is no secret to change or redistribute. To remove a specific person's access you would delete their account (account-level deletion is still deferred — see "What is NOT yet wired"); to remove someone from a single club, see "Force-remove a member from a club" below.

## Crons

Configured in `vercel.json` and visible in the Vercel dashboard under **Crons**:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/hard-delete-clubs` | `0 3 * * *` (daily 03:00 UTC) | Hard-deletes clubs that have been soft-deleted for ≥30 days. |
| `/api/cron/voting-deadline-reminder` | `0 * * * *` (hourly) | Emails non-voters when a voting deadline is within 24h. |

Both endpoints check `Authorization: Bearer ${CRON_SECRET}`. Vercel sets this header automatically — no manual configuration per cron.

Read recent cron logs in the Vercel dashboard: **Functions → /api/cron/... → Logs**.

## Rate limits (in-process, per Vercel instance)

`src/lib/auth/rate-limit.ts` enforces:

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `auth.requestOtp`, `auth.verifyOtp` | 5 attempts | 1 minute | per source IP AND per normalized email |
| `auth.startPasskeyLogin`, `auth.finishPasskeyLogin` | 30 attempts | 1 minute | per source IP (higher ceiling — these fire on every login-page load via passkey autofill) |

Per-OTP brute force is additionally capped: each issued code dies after 5 verification attempts. In development the rate limits are effectively disabled so a shared-IP local/E2E run isn't locked out.

State is in-process — resets on cold start, doesn't span Vercel instances. Adequate for pilot scale (≤20 clubs); revisit if traffic grows.

## Common pilot operations

### Add a pilot club

Clubs are admin-of-club, not admin-of-platform — any authenticated user can create one. To "add" a club to the pilot: the new admin signs up with their email (verify the OTP), creates the club via the UI, and invites members with the club code. Members join the same way — sign up with email + OTP, then enter the club code.

### Remove a pilot club

Two options, depending on whether you want data preserved.

**Soft delete** (recoverable for 30 days, then cron hard-deletes):

```sql
UPDATE clubs SET status = 'deleted', deleted_at = NOW() WHERE code = '<CODE>';
```

**Hard delete now** (cascades to memberships, rounds, meetings, etc. per the schema):

```sql
DELETE FROM clubs WHERE code = '<CODE>';
```

### Force-remove a member from a club

```sql
DELETE FROM memberships WHERE club_id = '<club_id>' AND user_id = '<user_id>';
```

### List active pilot clubs (no UI surface yet)

```sql
SELECT code, name, created_at, (
  SELECT count(*) FROM memberships WHERE club_id = clubs.id
) AS member_count
FROM clubs
WHERE status = 'active'
ORDER BY created_at DESC;
```

## Security headers

Set globally by `next.config.ts` (`headers()`): HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. CSP is intentionally **not** set in the pilot — to add it later, fingerprint Next.js inline scripts and Tailwind first.

Verify on the deployed URL:

```
curl -I https://<your-pilot-url>/
```

Expect all five headers in the response.

## What is NOT yet wired (deferred to post-pilot)

These are tracked in `docs/pilot-launch-readiness-plan.md` under "Out of Scope":

- Prisma migrations directory (uses `db push`).
- DB indices on hot columns.
- CI workflow (no automated test/lint/typecheck on PRs).
- Sentry / structured logger / observability dashboards.
- Email retry queue and delivery-failure alerting.
- Account-enumeration polish in `clubs.join` error messages (the OTP path already returns an identical `requestOtp` response whether or not the email maps to a user).
- Per-user clubs cap, per-club members cap.
- CSP header.

If any of these become urgent during the pilot, lift the plan and prioritize.
