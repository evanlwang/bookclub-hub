# Pilot Operations Runbook

How to run the BookClub Hub passcode-gated friends pilot.

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
| `PILOT_PASSCODE` | recommended | The shared friends-pilot passcode. **If unset in production, the app fails closed and no one can sign up.** Generate a random 12–16 char string and share it with the pilot group. |
| `RESEND_API_KEY` | recommended | Resend API key. If unset, all email sends become no-ops (silent). |
| `OPEN_LIBRARY_BASE_URL` | optional | Defaults to `https://openlibrary.org`. |

Validation logic lives in `src/env.ts` (`INFRA-ENV-VALIDATION-001`). Pull current values for comparison with:

```
vercel env pull .env.production.local --environment=production
```

## Pilot passcode

- The passcode is the only gate on signup. Treat it like a shared secret.
- Hand it to pilot members directly (DM, encrypted note) — never in a public channel.
- Rotation: change `PILOT_PASSCODE` in Vercel Production env, then redeploy. All in-flight sessions stay valid (sessions don't rely on the passcode); only new signups are affected.

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
| `auth.signIn`, `auth.enter` | 5 attempts | 1 minute | per source IP AND per normalized email |
| `clubs.join` (unauth branch) | 10 attempts | 1 minute | per source IP |

State is in-process — resets on cold start, doesn't span Vercel instances. Adequate for pilot scale (≤20 clubs); revisit if traffic grows.

## Common pilot operations

### Add a pilot club

Clubs are admin-of-club, not admin-of-platform — any authenticated user can create one. To "add" a club to the pilot: share the passcode with the new admin, they sign up, create the club via the UI, and invite members with the club code.

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

### Rotate the pilot passcode

1. Generate a new random string.
2. `vercel env rm PILOT_PASSCODE production` then `vercel env add PILOT_PASSCODE production` and paste the new value.
3. Redeploy: `vercel --prod` (or push to main if linked to git).
4. Distribute the new passcode to the pilot group.

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
- Account-enumeration polish in `signIn` / `clubs.join` error messages.
- Per-user clubs cap, per-club members cap.
- CSP header.

If any of these become urgent during the pilot, lift the plan and prioritize.
