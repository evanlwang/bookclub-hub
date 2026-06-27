# Auth v2 rollout: email OTP + passkeys, then Vercel/Neon/Resend deploy

> **Status:** Auth v2 (email one-time-code + WebAuthn passkeys) is shipped in
> code. The shared pilot passcode is removed. Phases B and C below are the
> deployment handoff, kept for when the user revisits going live.

## Context

The app's identity layer is email-verified: a 6-digit one-time code (OTP)
proves email ownership on first contact, and a WebAuthn passkey (FaceID/Touch
ID) gives one-tap returning logins. OTP remains the permanent recovery/fallback
so no one is locked out. This replaced the earlier shared-passcode gate, which
let anyone who knew one string log in as any email — see
`docs/llds/auth-and-accounts.md` and the `AUTH-OTP-*` / `AUTH-PASSKEY-*` /
`AUTH-RECOVERY-*` families in `docs/specs/auth-specs.md`.

Hosting target unchanged: Vercel (Hobby) + Neon (free) + Resend (free), $0/month
at pilot scale.

## Environment variables (production)

Required in production (validated in `src/env.ts`): `DATABASE_URL`, `DIRECT_URL`,
`CRON_SECRET`.

Auth v2 additions:
- `WEBAUTHN_RP_ID` — the registrable production domain (e.g. `dogear.vercel.app`
  or a custom domain). Passkeys are bound to this; it must match the site origin.
- `WEBAUTHN_ORIGIN` — full origin, e.g. `https://dogear.vercel.app`.
- `WEBAUTHN_RP_NAME` — display name shown in the OS passkey prompt (`Dogear`).
- `RESEND_API_KEY` — now load-bearing: it sends the OTP email. Without a real
  key (unset / `re_mock*` / `test`) the OTP is recorded but not delivered, so
  production MUST have a real key or no one can receive a code.

There is no longer a `PILOT_PASSCODE`. In **development** the fixed OTP code
`000000` always verifies (dev bypass) so `make up`, the seeded accounts, and
E2E work without an inbox; this is strictly gated to `NODE_ENV !== "production"`.

Passkeys are bound to `WEBAUTHN_RP_ID`, so they only assert on the stable
production domain. Vercel **preview** deployments have different hostnames and
therefore fall back to the OTP path — expected, not a bug.

## Phase B — Human pre-handoff checklist (DEFERRED)

~30 min, only the user can do these.

1. **Create accounts** at github.com, vercel.com, neon.tech, resend.com — same
   email everywhere; verify each; complete any 2FA.
2. **(Optional) Add payment to Vercel.** Hobby doesn't require a card until you
   exceed free-tier limits.
3. **Domain decision.** Free: use the `*.vercel.app` URL (and set
   `WEBAUTHN_RP_ID` to it). Custom: buy a domain (~$10/yr) and point
   `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` at it. Decide BEFORE registering
   passkeys, since changing the RP ID invalidates existing passkeys (users just
   re-register via OTP, but avoid churn).
4. **Resend domain.** Verify a sending domain in Resend (DKIM/SPF) so OTP emails
   don't land in spam; until then OTPs may be flaky.
5. **Push the repo to GitHub** from the laptop:
   `gh repo create bookclub-hub --private --source=. --push`.
6. **Log into all four services in the same Chrome profile** the deploy agent
   will use. Don't paste secrets into chat — let it inherit sessions.

## Phase C — Deploy handoff prompt (DEFERRED, paste-ready)

Replace bracketed values before pasting. Don't paste connection strings or keys
into chat — copy them directly between tabs.

```
You're deploying a Next.js + Prisma + tRPC app to Vercel + Neon + Resend.
Repo: https://github.com/[your-username]/bookclub-hub
I'm logged into GitHub, Vercel, Neon, and Resend in this browser.

Hard rules:
- Don't echo any connection string or API key back to me.
- Copy values directly between tabs; never paste them into chat.
- Don't run `make seed` / anything that calls seedDev against production — it wipes every table.
- Don't change source files.
- If a step fails twice, stop and summarize.

Steps in order:

1. Neon → New project "bookclub-hub-prod", closest US region. Copy the POOLED
   connection string for DATABASE_URL and the DIRECT one for DIRECT_URL.

2. Resend → Create + verify a sending domain, then create an API key named
   "bookclub-hub-prod". Copy as RESEND_API_KEY.

3. Vercel → Import the GitHub repo. Framework: Next.js. BEFORE first deploy set
   these env vars (Production + Preview + Development unless noted):
     DATABASE_URL        (step 1, pooled)
     DIRECT_URL          (step 1, direct)
     RESEND_API_KEY      (step 2)
     CRON_SECRET         (generate a random string)
     WEBAUTHN_RP_ID      (the production hostname, no scheme — e.g. dogear.vercel.app) [Production only]
     WEBAUTHN_ORIGIN     (https://<that host>) [Production only]
     WEBAUTHN_RP_NAME    (Dogear)
   Save.

4. Vercel → Build & Development Settings → set Build Command to:
     npx prisma db push --accept-data-loss && next build
   ⚠ ONE-SHOT, FIRST DEPLOY ONLY (safe against the brand-new empty DB). After
   the first green deploy, flip it back to `next build` and apply future schema
   changes via `npx prisma db push` from the laptop against the prod string (or
   adopt `prisma/migrations/` + `prisma migrate deploy && next build`).

5. Wait for green deploy. Open the production URL.

6. Smoke test on the live site:
   a. Visit / and confirm the landing page loads.
   b. "Sign up" → /join → enter your email → receive the 6-digit code by email →
      enter it + a display name → optionally set up a passkey → create a club.
   c. Log out, then /login → "Sign in with a passkey" (FaceID) OR "Email me a
      code" → confirm session works.
   d. /account → confirm the passkey appears under "Your devices" and can be removed.
   If any step 500s, copy the Vercel runtime log line and stop.

7. Report back: production URL, smoke-test results, confirmation no secrets are
   visible in any screenshot.
```

## Verification (automated, after code changes)

- `npx tsc --noEmit` — zero errors.
- `npm run test` — unit + integration green.
- `npx playwright test tests/e2e/login.spec.ts` — OTP login flow green.

## Manual local sanity (before any push)

- `make up` → /login → "Email me a code" → enter `000000` (dev bypass) → in.
- /join → email → `000000` → name → skip or set up a passkey → create a club.
- /account → add a passkey (needs a real authenticator or the browser's
  virtual authenticator) → confirm it lists, then remove it.

## Post-launch

- Watch Vercel runtime logs for the first hour, especially OTP email sends
  (Resend dashboard) and any WebAuthn verification errors (usually an RP-ID /
  origin mismatch).
- Soft-launch the URL to two friends; broaden once they report success.
