# Identity and Sessions

## Context and Design Philosophy

Identity in Dogear is an **email address, proven by a one-time code, and thereafter unlocked by a passkey**. There are no passwords, no OAuth, and no third-party authentication.

The two halves solve two distinct problems:

- **Bootstrap (who are you the first time?)** — A user enters their email and receives a 6-digit one-time code (OTP). Entering the code proves they control the inbox. Only then is a `User` created or matched and a session opened. This closes the impersonation hole of the earlier shared-passcode design, where anyone who knew one shared string could claim *any* email.
- **Returning login (it's you again, prove it cheaply)** — After verifying once, the user is offered a **passkey** (WebAuthn / FaceID / Touch ID). Returning logins are then a single biometric tap with no shared secret on the wire — phishing-resistant and frictionless.

The OTP path never goes away: it is the **permanent recovery and fallback** route. A user who loses their device, switches browsers, or is on a WebAuthn-incapable browser can always re-verify by email and (re)register a passkey. Nobody gets locked out.

The email remains the cross-device, cross-club identity anchor. The threat model widens from the prior "people who know each other" to "email ownership is the trust boundary" — the data is still book opinions, not banking, so inbox compromise is the accepted residual risk.

> **Migration note (auth v2):** This LLD previously described unverified email-only identity (`auth.enter` / `auth.signIn`), and the shipped code additionally carried a shared **pilot passcode** that was never reflected here — a pre-existing HLD/LLD divergence. Auth v2 removes the passcode entirely and replaces `enter`/`signIn` with the OTP + passkey procedures below. No passcode artifacts remain.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Editorial Landing Composition

The marketing landing (`/`) is a **server component** (links only, no client JS) styled as a library borrower's card rather than a SaaS hero+feature-grid. It renders as a single **centered editorial column** (`data-testid="landing-column"`, max-width ~620px) on the flat paper background at every width — the 390px handoff scales up by centering, not by re-spreading into multiple columns. Section order (identical mobile/desktop), per `home-specs.md`:

1. **Masthead** (`HOME-UI-015`) — `LogoIcon` dog-ear mark + "DOGEAR" wordmark left, "EST. 2026" mono right, hairline rule under.
2. **Serif hero** (`HOME-UI-016`) — Newsreader `h1` with italic-primary emphasis + ≤32ch subhead.
3. **Asymmetric CTAs** (`HOME-UI-CTA-PRIMARY-001` / `-SECONDARY-001`) — full-width terracotta pill "Get your library card" → `/join` (`hero-signup`), then a quiet underlined "Log in" → `/login` (`hero-login`). No top nav.
4. **Borrower's card** (`HOME-UI-CARD-001..004`) — rotated −1.3° card: header + three checkout rows (features) with rotated due-date stamps and a decorative dog-ear corner (token-bridged inline SVG, `aria-hidden`).
5. **Dog-ear annotation** (`HOME-UI-ANNOT-001`) — serif-italic metaphor gloss.
6. **Conditions of Membership** (`HOME-UI-TERMS-001`) — numbered fine print carrying the privacy promises (keeps `data-testid="privacy-banner"`).
7. **Ex Libris bookplate** (`HOME-UI-PLATE-001`) — bordered plate, "For people who finish the book."

## Two-Path Entry Architecture

The two CTA destinations and the smart-detection safety net:

- **Log in** → `/login`. For returning users. Passkey-first (conditional UI / autofill); the page also offers "email me a code instead" as the fallback to the OTP flow.
- **Sign up** → `/join` (multi-step wizard with smart detection). For new users + create/join branching. Step 1 runs the email → OTP → optional passkey setup sub-flow.

These are distinct routes with distinct intents, but they meet at the same destination (`/clubs`) for users with memberships. The `/join` smart detection acts as a safety net for users who pick the wrong door.

```
Landing (/)
  ├─ "Log in"  → /login → passkey (FaceID)         → /clubs (has clubs)
  │                     └ "email me a code" → OTP   → /clubs (has clubs)
  │                                              └─ /join?welcome=1 (no clubs)
  └─ "Sign up" → /join → email → OTP → (optional passkey) → smart detection
                                  ├─ /clubs (has clubs)
                                  └─ Step 2 → 3a/3b → Step 4 → /clubs/{id}
```

## Identity Sub-Flow (Step 1)

Step 1 of `/join` (and the whole of `/login`) is itself a small state machine that establishes a session before any club action:

```
email-entry → otp-entry → [verified: session created]
                                   ├─ offer passkey → register → continue
                                   └─ skip passkey → continue
email-entry → passkey-prompt (login route, if the browser has a discoverable credential)
```

State: **email-entry** — input: email; button "Send code" → calls `auth.requestOtp`; on success advances to otp-entry.
State: **otp-entry** — input: 6-digit code (+ display name on the join route); buttons "Verify" → `auth.verifyOtp`, "Resend code", "Use a different email" (back). On success a session cookie is set.
State: **passkey-offer** (post-verify, when `window.PublicKeyCredential` is available and the user has no passkey yet) — buttons "Set up FaceID" → `auth.startPasskeyRegistration` + browser ceremony + `auth.finishPasskeyRegistration`; "Not now" → skip. Skipping is always allowed; passkeys are strongly encouraged, never required.

On the login route, when the browser can offer a discoverable passkey, the FaceID prompt is presented first (conditional UI) and a successful assertion logs the user in via `auth.finishPasskeyLogin` without ever entering the OTP branch.

## Entry Flow State (club steps, unchanged)

After Step 1 establishes a session, the club-join/create wizard is unchanged:

```
step 1 (identity) → step 2 → step 3a → step 4
step 1 (identity) → step 2 → step 3b → step 4
step 1 (identity) → /clubs (smart detection: clubs.length > 0)
step 1 (identity) → step 3a (?path=join)
step 1 (identity) → step 3b (?path=create)
step 4 → /clubs/{id}  (auto-redirect after 1500ms)
```

State: step 2 (Path) — buttons: "Join an existing club", "Create a new club", "Back" — transitions: → step 3a / step 3b / step 1
State: step 3a (Join) — buttons: code input, "Back", "Join the club" — transitions: → step 4 / step 2
State: step 3b (Create) — buttons: name, code, cadence radios, "Back", "Create club" — transitions: → step 4 / step 2
State: step 4 (Success) — buttons: "Copy" (create branch only) — transitions: auto-redirect

## Button Inventory

Step 1 (identity sub-flow):
- Button: email input — `/join` Step 1 / `/login` — required, type=email, `autoComplete="email webauthn"`.
- Button: "Send code" — handler: `auth.requestOtp`; disabled until email shape valid; advances to otp-entry.
- Button: 6-digit OTP input — `inputMode="numeric"`, `autoComplete="one-time-code"`, 6 chars.
- Button: display name input (join route only) — required, captured alongside the code so `verifyOtp` can create the user.
- Button: "Verify" — handler: `auth.verifyOtp`; disabled until code is 6 digits (and, on join, displayName present).
- Button: "Resend code" — re-calls `auth.requestOtp` (rate-limited; shows a cooldown).
- Button: "Use a different email" / "Back" — returns to email-entry.
- Button: "Set up FaceID" (passkey-offer) — handler: `auth.startPasskeyRegistration` → `@simplewebauthn/browser` `startRegistration` → `auth.finishPasskeyRegistration`.
- Button: "Not now" (passkey-offer) — skip; proceeds to smart detection / Step 2.
- Button: "Email me a code instead" (`/login`) — falls back from passkey prompt to the OTP flow.

Club steps (unchanged from prior LLD; line anchors re-established after the Step 1 rewrite):
- Buttons for Step 2/3a/3b/4 (path cards, club code input + debounced `clubs.lookup`, join/create submit, cadence radios, copy) are as specified in `auth-specs.md` (`AUTH-UI-STEP2-*`, `-STEP3A-*`, `-STEP3B-*`, `-STEP4-*`).
- Button: "Sign out" (club sidebar footer) — `src/app/clubs/[clubId]/sidebar.tsx` — handler: `auth.logout` → clear `session_id` cookie → `router.push("/")`. The only sign-out surface.

Device management:
- "Your devices" view (account/settings) — lists the user's passkeys (`auth.listCredentials`: device name, created, last used) each with a "Remove" button → `auth.revokeCredential`. Revoking the last passkey is allowed; the user can still log in via OTP.

## Smart Detection

After Step 1 establishes a session (`auth.verifyOtp` set the cookie), the client immediately calls `auth.me` to fetch the user's clubs. The flow then branches:

- If `clubs.length > 0` AND no `?path=` override → `router.push("/clubs/{firstClubId}")`. This is the invisible "login" path.
- If `clubs.length === 0` → continue to Step 2 (path choice).
- If the URL had `?path=join` or `?path=create` → skip detection, advance to Step 3 with branch pre-selected.
- If `auth.me` fails (network error) → fall through to Step 2 (graceful degradation).

## Login Route (`/login`)

A dedicated minimal page for returning users:

1. On load, if `window.PublicKeyCredential` and conditional-mediation are available, the page requests a passkey assertion (`auth.startPasskeyLogin` → browser → `auth.finishPasskeyLogin`). A successful assertion creates a session and routes by `auth.me` (`/clubs/{firstClubId}` if any club, else `/join?welcome=1`).
2. The page always also offers "email me a code": email input → `auth.requestOtp` → OTP entry → `auth.verifyOtp`. This is the fallback when no passkey exists or the platform can't run WebAuthn.
3. Unknown email on the OTP path is **not** an error surface that reveals account existence — `requestOtp` responds the same whether or not the email maps to a user (anti-enumeration); a brand-new email that verifies is routed to `/join?welcome=1` to pick a club.

Why a separate route: returning users get a one-tap (passkey) or one-field (email) form; the login-vs-signup separation lets the landing advertise both clearly.

## Return Visit (Same Device)

Valid session cookie present → straight to dashboard, no login step.

## Return Visit (New Device)

No session cookie → `/login` offers the passkey if one is synced to the device (e.g. iCloud Keychain) → FaceID → in. Otherwise email → OTP → in, then optionally register a device-local passkey.

## Data Model

```
User {
  id: UUID (PK)
  email: string (unique, lowercase-normalized)
  display_name: string (max 100 chars)
  created_at: timestamp
  updated_at: timestamp
}

Session {
  id: string (PK, cryptographically random)
  user_id: UUID (FK -> User)
  expires_at: timestamp
  created_at: timestamp
}

Credential {                         // a registered passkey
  id: UUID (PK)
  user_id: UUID (FK -> User, cascade delete)
  credential_id: string (unique, base64url)   // the authenticator's credential ID
  public_key: bytes                            // COSE public key
  counter: int                                 // signature counter, monotonic
  transports: string[]                         // e.g. ["internal","hybrid"]
  device_name: string                          // user-facing label
  created_at: timestamp
  last_used_at: timestamp (nullable)
  // index on user_id
}

EmailOtp {                           // a pending one-time code (not tied to a User row)
  id: UUID (PK)
  email: string (indexed, lowercase-normalized)
  code_hash: string                  // hash of the 6-digit code; raw code never stored
  expires_at: timestamp              // ~10 min TTL
  consumed_at: timestamp (nullable)  // single-use
  attempts: int                      // verification attempts, capped
  created_at: timestamp
}

WebAuthnChallenge {                  // server-issued, single-use ceremony challenge
  id: UUID (PK)
  user_id: UUID (FK -> User, nullable)   // null for discoverable-credential login
  challenge: string                       // base64url random
  type: enum (register | login)
  expires_at: timestamp                   // short TTL (~5 min)
  consumed_at: timestamp (nullable)
  created_at: timestamp
}
```

No OAuthConnection table, no password hash. The shared-passcode gate (`PILOT_PASSCODE`, `src/lib/auth/passcode.ts`) is removed.

### Why a `WebAuthnChallenge` table (not a cookie)

WebAuthn registration and authentication each require a server-issued, single-use, short-lived challenge that the server later verifies against the authenticator's signed response. A dedicated table makes consumption auditable and atomic (mark `consumed_at` in the same transaction that verifies), and naturally supports the discoverable-credential login case where no user is known when the challenge is issued. A signed httpOnly cookie was considered (no extra table) but rejected: it complicates the discoverable-login case and makes single-use enforcement across concurrent tabs harder. Revisit only if the table proves to be a hotspot.

## API Contracts

| Procedure | Input | Output / Behavior |
|-----------|-------|-------------------|
| `auth.requestOtp` | `{ email }` | `{ ok: true }` always (anti-enumeration). Generates a 6-digit code, stores its hash with a ~10-min TTL, emails it via `emailService.sendOtpCode`. Rate-limited per IP and per email. |
| `auth.verifyOtp` | `{ email, code, displayName? }` | `{ user, sessionId }` (sets cookie) on a valid, unexpired, unconsumed code within the attempt cap. Creates the user if new (using `displayName`, required when the email is unknown), matches existing otherwise. Marks the OTP consumed. Throws `UNAUTHORIZED` on wrong/expired/exhausted code. |
| `auth.startPasskeyRegistration` | — (protected) | `{ options }` — WebAuthn `PublicKeyCredentialCreationOptions` with a fresh stored challenge, `excludeCredentials` = the user's existing passkeys. |
| `auth.finishPasskeyRegistration` | `{ attestation, deviceName? }` (protected) | `{ credential }` — verifies attestation against the stored challenge, persists a `Credential`, consumes the challenge. |
| `auth.startPasskeyLogin` | `{ email? }` | `{ options }` — WebAuthn `PublicKeyCredentialRequestOptions` with a fresh challenge; `allowCredentials` scoped to the email's passkeys when provided, empty for discoverable-credential (usernameless) login. |
| `auth.finishPasskeyLogin` | `{ assertion }` | `{ user, sessionId }` (sets cookie). Verifies the assertion against the stored challenge and the matching `Credential`'s public key, **rejects a non-increasing signature counter** (cloned-authenticator guard), updates `counter` + `last_used_at`, creates a session. |
| `auth.listCredentials` | — (protected) | `{ credentials: [{ id, deviceName, createdAt, lastUsedAt }] }`. |
| `auth.revokeCredential` | `{ id }` (protected) | `{ ok: true }`. Deletes one of the caller's passkeys. Allowed even if it is the last one (OTP remains a login path). |
| `auth.me` | — | `{ user, clubs }` or 401. |
| `auth.logout` | — | `{ success: true }`. Deletes the server session row (if present) and emits a clearing `Set-Cookie`. Idempotent (publicProcedure). |

`auth.enter` and `auth.signIn` are **removed**.

## Sessions

Sessions are server-side, stored in PostgreSQL (Neon). The session ID is a cryptographically random string (`generateSessionId`, 32 random bytes hex) in an HttpOnly cookie. Set on `auth.verifyOtp` and `auth.finishPasskeyLogin` success via `sessionSetCookieHeader` (`src/lib/auth/session.ts`) with `HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` and `Secure` in production. Sliding expiration refreshes `expires_at` on every authenticated request (route handler + RSC caller). The clearing cookie in `auth.logout` mirrors the same attributes. (Unchanged from auth v1 — `AUTH-BE-001`, `AUTH-BE-002`, `AUTH-BE-SESSION-001`.)

## WebAuthn Relying-Party Configuration

`src/lib/auth/webauthn.ts` wraps `@simplewebauthn/server` and reads:
- `WEBAUTHN_RP_ID` — registrable domain (e.g. `localhost` in dev, the Vercel domain in prod). The browser enforces that the page origin matches; a mismatch fails the ceremony.
- `WEBAUTHN_ORIGIN` — full origin (`http://localhost:3000` / `https://<domain>`) used as `expectedOrigin` during verification.
- `WEBAUTHN_RP_NAME` — display name ("Dogear").

Both env vars are added to the `src/env` validation schema. Mismatched RP config is surfaced as a clear server error rather than a silent ceremony failure.

## Rate Limiting

`auth.requestOtp` and `auth.verifyOtp` reuse the in-process limiter (`src/lib/auth/rate-limit.ts`): per-IP and per-email windows on requests, plus a per-OTP attempt cap enforced via `EmailOtp.attempts`. `clubs.join` (unauthenticated branch) retains its limit. The passkey ceremonies are challenge-gated and additionally IP-limited. (Carries forward `AUTH-API-RATELIMIT-001`, retargeted from `signIn`/`enter` to the OTP procedures.)

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Identity bootstrap | Email OTP (6-digit, hashed, single-use, ~10-min TTL) | Shared pilot passcode; magic link; trust-on-first-use | Proves email ownership, closing impersonation. Code (not link) keeps the user in one browser tab for the WebAuthn ceremony. |
| Returning login | WebAuthn passkey (FaceID/Touch ID), OTP fallback | OTP every time; password; OAuth | Passkeys are phishing-resistant and one-tap; OTP fallback means no lockout on incapable browsers. |
| Passkey requirement | Strongly encouraged, not required | Mandatory passkey; purely optional | Maximizes adoption without locking anyone out; OTP stays a first-class path. |
| Multiple passkeys | Allowed (phone + laptop) | One per user | Reduces single-device dependence; standard WebAuthn affordance. |
| WebAuthn challenge store | Dedicated `WebAuthnChallenge` table, single-use | Signed httpOnly cookie | Auditable, atomic consumption, supports discoverable-credential login cleanly. |
| WebAuthn library | `@simplewebauthn/server` + `/browser` | Hand-rolled CBOR/COSE verification | Avoids re-implementing attestation/assertion crypto and the encoding minefield. |
| Anti-enumeration | `requestOtp` returns `{ ok: true }` regardless of account existence | Distinguish known/unknown email | Prevents probing which emails have accounts. |
| Session duration | 30 days, sliding | 7 days; permanent | Weekly users rarely re-authenticate. Unchanged. |

## Open Questions

### Resolved
1. ✅ Email ownership verified via OTP (was deferred "magic-link verification").
2. ✅ Passwordless returning login via passkeys.
3. ✅ Shared pilot passcode removed.
4. ✅ Smart detection branching after Step 1 (unchanged).

### Deferred
1. **Display name per club.**
2. **Account deletion** (cascade memberships, votes, comments).
3. **Cross-device passkey UX beyond platform sync** (iCloud Keychain / Google Password Manager handle the common case).
4. **Redis-backed rate limiting** for multi-instance correctness (still in-process; pre-existing).
5. **Skip Step 1 when a valid session cookie is already present** (existing-user-creates-second-club flow).

## References

- `docs/specs/auth-specs.md`
- `docs/llds/club-management.md`
- `docs/high-level-design.md`
- `@simplewebauthn` — https://simplewebauthn.dev
