# Pilot rollout: passcode gate + future Vercel/Neon/Resend deploy

> **Status:** Phase A (passcode gate) is the active scope. Phases B and C are
> kept as reference for when the user revisits deployment.

## Context

The app is locally complete enough to share with friends, but `auth.enter` and
`auth.signIn` are passwordless and unverified — anyone who types a valid
friend's email gets logged in as them. That's a hard blocker for sharing the
URL. The intended pilot lives on Vercel + Neon (already referenced in
`CLAUDE.md`) + Resend (already in stack), with Claude Chrome
(browser-driving agent) doing the click-through deploy work after the human
handles the parts only a human can do.

Decisions captured:
- **Auth gate = shared passcode** stored as a `PILOT_PASSCODE` env var.
  Cheapest to ship, zero ongoing cost, easy to swap for magic-link later.
  Phone-OTP was considered and ruled out (Twilio isn't free; Clerk is free up
  to 10k MAU but adds a dependency and a refactor).
- **Hosting target** = Vercel (Hobby) + Neon (free) + Resend (free). $0/month
  at pilot scale.
- **Handoff model** = the CLI Claude ships the code change. The human does
  the human-only setup. Claude Chrome handles every browser click after that.

## Phase A — Passcode gate (active scope)

Goal: a single `PILOT_PASSCODE` env var that gates both account creation and
login. Wrong passcode → `UNAUTHORIZED` error. No effect on session shape,
cookie flow, or the rest of the app.

### Server (`src/server/routers/auth.ts`)
- Add a constant-time string compare helper at the top: `function passcodeOk(input: string): boolean`.
  Reads `process.env.PILOT_PASSCODE`. If the env var is unset (local dev),
  accept any input — preserves the existing `make up` flow. If set, require
  exact match.
- Extend the Zod input schemas of `auth.signIn` and `auth.enter` with a
  required `passcode: z.string().min(1)` field.
- Inside both handlers, call `passcodeOk(input.passcode)` immediately after
  email validation; throw `TRPCError({ code: "UNAUTHORIZED", message: "Wrong passcode" })`
  on mismatch. Return BEFORE creating any user/session.

### Login UI (`src/app/login/page.tsx`)
- Add a passcode `<input type="password">` below the email field.
- Include the value in the POST body as `{ email, passcode }`.
- Reuse the existing `ErrorBox` for the new "Wrong passcode" error path. The
  "no account → /join" branch stays unchanged.

### Signup UI (`src/app/join/page.tsx`)
- Add the passcode field to Step 1 alongside email + displayName.
- Pass `passcode` into the `auth.enter` call. Track it in component state
  alongside the existing `email` / `displayName`.

### Tests
- `tests/integration/auth.test.ts`: every `signIn` / `enter` call needs to
  pass `passcode: "test-passcode"` in the input. Default behavior:
  `PILOT_PASSCODE` unset, dev bypass takes over (the bypass is itself a
  behavior worth testing once).
- `tests/integration/join-flow.test.ts`: same — add `passcode` arg to every
  `auth.enter` call.
- `tests/e2e/login.spec.ts` and `tests/e2e/join-club.spec.ts`: fill the new
  passcode input.

### Out of scope
- Magic-link replacement (deferred — passcode is the friend-pilot stopgap).
- Rate-limiting / lockout (overkill for ~10 friends; Vercel's edge already
  drops obvious abuse).
- Per-user 2FA, password reset, anything resembling real auth.

## Phase B — Human pre-handoff checklist (DEFERRED)

For when deployment is unblocked. ~30 min, only the user can do these.

1. **Create accounts** at github.com, vercel.com, neon.tech, resend.com —
   same email everywhere; verify each via email; complete any 2FA setup.
2. **Add payment to Vercel.** Hobby plan won't bill at this scale, but a
   card on file is required.
3. **Domain decision.** Free path: skip and use the `*.vercel.app` URL.
   Custom path: buy at Cloudflare/Namecheap (~$10/yr).
4. **Pick a passcode.** Something memorable — e.g. `wedreads-2026`. Save it
   where you'll text friends from.
5. **Push the repo to GitHub** from the laptop:
   `gh repo create bookclub-hub --private --source=. --push` (or use the
   GitHub UI). This is the only step that uses local creds.
6. **Log into all four services in the same Chrome profile** Claude Chrome
   will run in. Don't paste passwords into Claude's prompt — let it inherit
   sessions.

## Phase C — Claude Chrome handoff prompt (DEFERRED, paste-ready)

Replace the bracketed values before pasting. Don't paste real connection
strings or the passcode anywhere in the prompt — Claude Chrome will copy
values directly between tabs.

```
You're deploying a Next.js + Prisma + tRPC app to Vercel + Neon + Resend.
Repo: https://github.com/[your-username]/bookclub-hub
I'm logged into GitHub, Vercel, Neon, and Resend in this browser.
The pilot passcode is set in my password manager under "bookclub-hub PILOT_PASSCODE".

Hard rules:
- Don't echo the passcode or any connection string back to me.
- Copy values directly between tabs; never paste them into chat.
- Don't run `make seed` or anything that calls `seedDev` against production — it wipes every table.
- Don't change auth code or any other source files.
- If a step fails twice, stop and summarize.

Steps in order:

1. Neon → New project "bookclub-hub-prod", closest US region. Copy the
   POOLED connection string for DATABASE_URL and the DIRECT one for DIRECT_URL.
   Hold them in tabs.

2. Resend → Create an API key named "bookclub-hub-prod". Copy as RESEND_API_KEY.

3. Vercel → Import the GitHub repo `bookclub-hub`. Framework: Next.js.
   BEFORE first deploy, set these env vars (Production + Preview + Development):
     DATABASE_URL        (from step 1, pooled)
     DIRECT_URL          (from step 1, direct)
     RESEND_API_KEY      (from step 2)
     PILOT_PASSCODE      (from my password manager)
   Save.

4. Vercel → Settings → Build & Development Settings → set Build Command to:
     npx prisma generate && npx prisma db push --accept-data-loss && next build
   Redeploy. (Prisma's first-build failure on a fresh DB is the standard
   Vercel + Prisma gotcha; this is the canonical fix.)

5. Wait for green deploy. Open the production URL.

6. Smoke test on the live site:
   a. Visit / and confirm landing page loads.
   b. Click "Sign up" → /join → enter your test email + display name + the passcode.
   c. Confirm you can create a club and see its dashboard.
   d. Log out, then /login with the same email + passcode → confirm session works.
   e. Try wrong passcode → confirm "Wrong passcode" error.
   If any step 500s, copy the Vercel runtime log line and stop. Don't guess.

7. Report back with:
   - The production URL
   - Smoke-test results
   - Confirmation no secrets are visible in any screenshot you took
```

## Critical files (Phase A — shipped)

- `src/lib/auth/passcode.ts` — new shared `passcodeOk` helper (constant-time compare; dev-bypass when env is unset).
- `src/server/routers/auth.ts` — extend `signIn` and `enter` Zod schemas with required `passcode`; gate after email validation.
- `src/server/routers/clubs.ts` — **scope expansion discovered during implementation:** `clubs.join`'s unauthenticated branch upserts a User + creates a Session, so it had to be gated too. Added optional `passcode` to its Zod schema; required only when `ctx.user` is null.
- `src/app/login/page.tsx` — passcode `<input type="password">` + button-disabled gate on both fields.
- `src/app/join/page.tsx` — passcode field added to Step 1 alongside email + display name; identityValid checks all three.
- `tests/integration/auth.test.ts` — passcode arg added to every `signIn`/`enter`; new `PILOT_PASSCODE gate` describe with three tests (rejects wrong passcode for both procedures + asserts dev-bypass when unset).
- `tests/integration/join-flow.test.ts` — passcode arg added to every `auth.enter` call and to the unauth `clubs.join` call.
- `tests/e2e/login.spec.ts`, `tests/e2e/join-club.spec.ts` — fill `#passcode`; updated button-disabled assertions to require all fields.
- `.env.example` — documented `PILOT_PASSCODE` with a comment explaining the dev-bypass.

## Implementation note: why the helper is shared

The original plan only touched `auth.ts`, but the unauthenticated branch of `clubs.join` also creates Users + Sessions, so leaving it ungated would have been a back door around the gate. Both routers now import `passcodeOk` from `src/lib/auth/passcode.ts`. If a future entry point accepts unauthenticated User/Session creation, gate it with the same helper.

## Reusable bits

- `validateEmail` / `normalizeEmail` at `src/lib/validation/email.ts` — keep
  using for email; passcode validation is just non-empty + env compare.
- `ErrorBox` already used at `src/app/login/page.tsx` — reuse for the new
  "Wrong passcode" path.
- The session/cookie flow (server returns `sessionId`, client sets
  `document.cookie`) is unchanged. Adding a passcode is purely an
  input-schema gate before user/session creation.

## Verification

### Automated (after Phase A code changes)
- `npx tsc --noEmit` — zero new errors.
- `npx vitest run` — all unit tests pass.
- `npx vitest run --config vitest.config.integration.ts tests/integration/auth.test.ts tests/integration/join-flow.test.ts`
  — both pass.

### Manual local sanity (before any push)
- `make up` → log in as `alice@example.com` with NO `PILOT_PASSCODE` set in
  env → still works (dev bypass).
- Set `PILOT_PASSCODE=local-test` in `.env.local`, restart server → log in
  attempts without the passcode field reject; with the right passcode accept.

### Production smoke (Claude Chrome step 6, when deployment resumes)
- Landing page renders.
- `/join` with right passcode creates account; `/join` with wrong passcode rejects.
- `/login` with right passcode + existing email creates session; logout clears cookie.
- Creating a club, voting, posting a thread all round-trip without 500s.

### Post-launch
- Watch Vercel runtime logs for the first hour.
- Send the URL + passcode + a club code to two friends as a soft launch;
  broaden once they report success.
