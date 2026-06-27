# Arrow: auth

Identity, sessions, the join/login flow, and the marketing landing page.

## Status

**OK (auth v2)** — 2026-06-26. The identity layer was rebuilt: the shared pilot passcode is removed and replaced with email-OTP verification + WebAuthn passkeys (FaceID/Touch ID). Full cascade landed — HLD → LLD → EARS → tests → code. All non-deferred auth specs are `[x]` implemented and tested (unit: `otp`/`webauthn`; integration: `auth.test.ts` OTP+passkey+recovery, `auth-ratelimit.test.ts`; E2E: `login.spec.ts`, `join-club.spec.ts`). Session machinery (`AUTH-BE-001/002`), sign-out, and landing specs unchanged and remain `[x]`.

**Resolved divergence:** the prior "OK / 0 divergences" status was inaccurate — the shipped pilot passcode (`AUTH-API-PASSCODE-*`, `src/lib/auth/passcode.ts`) lived in specs and code but was never reflected in the HLD or LLD. Auth v2 removes the passcode outright, eliminating that drift.

## References

### HLD
- `docs/high-level-design.md` (identity, sessions, "people who know each other" threat model)

### LLD
- `docs/llds/auth-and-accounts.md` — single-LLD source for both auth-specs and home-specs

### EARS
- `docs/specs/auth-specs.md`
- `docs/specs/home-specs.md`

### Tests
- `tests/integration/auth.test.ts` — OTP request/verify, passkey roundtrip, recovery, impersonation
- `tests/integration/join-flow.test.ts`
- `src/lib/auth/otp.test.ts` — AUTH-OTP-* (hash, single-use, expiry, attempts)
- `src/lib/auth/webauthn.test.ts` — AUTH-PASSKEY-COUNTER-001, challenge single-use
- `tests/e2e/login.spec.ts`
- `tests/e2e/logout.spec.ts`
- `tests/e2e/join-club.spec.ts`
- `tests/e2e/landing-page.spec.ts`
- `tests/unit/auth/session.test.ts` — AUTH-BE-001, AUTH-BE-002
- `tests/unit/validation/email.test.ts` — AUTH-DATA-001, AUTH-DATA-002

### Code
- `src/server/routers/auth.ts` — `requestOtp`, `verifyOtp`, passkey register/login, `listCredentials`, `revokeCredential`, `me`, `logout`
- `src/lib/auth/otp.ts` — OTP generation/hashing/verification
- `src/lib/auth/webauthn.ts` — `@simplewebauthn` wrappers + RP config + challenge store
- `src/lib/auth/credentials.ts` — passkey DB helpers
- `src/lib/auth/session.ts` — `sessionSetCookieHeader`, `generateSessionId`
- `src/lib/auth/rate-limit.ts` — OTP + ceremony throttling
- `src/server/services/email.ts` — `sendOtpCode`
- `src/lib/validation/email.ts` — AUTH-DATA-001, AUTH-DATA-002
- `src/app/page.tsx` — landing page
- `src/app/login/page.tsx` — login (passkey-first, OTP fallback)
- `src/app/join/page.tsx` — join flow (email → OTP → optional passkey)
- `src/app/layout.tsx` — root layout, skip-nav
- (removed) `src/lib/auth/passcode.ts`

## Architecture

**Purpose:** Email-verified identity — email is the cross-device anchor, ownership proven by a one-time code; WebAuthn passkeys (FaceID/Touch ID) give phishing-resistant one-tap returning logins, with OTP as the permanent recovery/fallback. No passwords, no OAuth, no shared secret on the wire. A long-lived session is created after verification.

**Key Components:**
1. `auth` router — OTP request/verify, passkey register/login, credential management, session creation, smart-detection of existing memberships
2. `src/lib/auth/` — OTP (`otp.ts`), WebAuthn wrappers + challenge store (`webauthn.ts`), credential helpers (`credentials.ts`), session cookie (`session.ts`), rate limiting (`rate-limit.ts`)
3. Join flow — multi-step state machine (Identity sub-flow: email → OTP → optional passkey → Path → Join/Create → Success)
4. Login route — passkey-first, OTP fallback for returning users
5. Landing page — marketing-style entry with two distinct CTAs (Log in / Sign up)

## Spec Coverage

Auth v2 cascade complete. All non-deferred `auth-specs.md` specs (identity/login/session + the new `AUTH-OTP-*`, `AUTH-PASSKEY-*`, `AUTH-RECOVERY-*` families) are `[x]` implemented and tested; `home-specs.md` is untouched. Deferred: `AUTH-DATA-003` (account deletion), `AUTH-DATA-004` (per-club names), `AUTH-API-007` (Redis rate limiting). Removed this change: `AUTH-API-PASSCODE-*`, `AUTH-API-SIGNIN-001`, `AUTH-UI-LOGIN-PASSCODE-HINT-001`, deferred `AUTH-BE-004` (magic-link, now realized as the OTP family).

**Spec families:** AUTH-API, AUTH-API-LOGOUT, AUTH-OTP-*, AUTH-PASSKEY-*, AUTH-RECOVERY-*, AUTH-BE, AUTH-BE-SESSION, AUTH-DATA, AUTH-UI, AUTH-UI-LOGIN, AUTH-UI-LOGOUT, AUTH-UI-PATH-OVERRIDE, AUTH-UI-STEP1-*, AUTH-UI-STEP2-*, AUTH-UI-STEP3A-*, AUTH-UI-STEP3B-*, AUTH-UI-STEP4-*, LANDING-UI, HOME-UI, HOME-UI-CTA-PRIMARY, HOME-UI-CTA-SECONDARY, HOME-A11Y, JOIN-UI, JOIN-UI-CREATE-*, JOIN-UI-COPY.

## Key Findings

1. **Auth v2 replaces passcode with OTP + passkeys.** Email ownership proven by a hashed, single-use, time-bounded 6-digit code; returning logins via WebAuthn passkeys with a server-issued single-use challenge store; OTP is the permanent recovery/fallback so no lockout.
2. **Pre-existing divergence resolved.** The shipped pilot passcode was never in the HLD/LLD; removing it eliminates the drift rather than papering over it.
3. **Session machinery unchanged.** `AUTH-BE-001/002` (server-side `Set-Cookie`, sliding expiration) and sign-out specs carry forward as-is; the new session-creating procedures reuse `sessionSetCookieHeader`.
4. **Cadence persistence** — voting cadence remains a typed `VotingCadence` enum on `Club.votingCadence`.

## Work Required

None — auth v2 shipped and verified (typecheck, lint, build, unit, integration, E2E all green; `passcode`/`PILOT_PASSCODE` purged from `src/ tests/`). Maintain coherence on future changes.

Known pre-existing (out-of-segment, NOT auth): two `landing-page.spec.ts` visual assertions fail on a curly-vs-straight apostrophe in unchanged `src/app/page.tsx` (home segment) — independent of this change.
