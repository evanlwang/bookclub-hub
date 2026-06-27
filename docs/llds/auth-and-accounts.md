# Identity and Sessions

## Context and Design Philosophy

Identity in Dogear is designed for maximum frictionlessness. There is no account creation flow, no passwords, no OAuth, and no third-party authentication. A user's identity is their email address. They enter it once when they first join a club, along with a display name. The system creates a long-lived session and the user is done.

The email serves as a cross-device, cross-club identity anchor. If a user opens the app on a new device, they enter their email and are recognized — all their clubs appear. No verification step, no magic link, no password. The threat model is "people who know each other," not "adversarial strangers."

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

- **Log in** → `/login` (dedicated, email-only). For returning users.
- **Sign up** → `/join` (4-step wizard with smart detection). For new users + create/join branching.

These are distinct routes with distinct intents, but they meet at the same destination (`/clubs`) for users with memberships. The `/join` smart detection acts as a safety net for users who pick the wrong door.

```
Landing (/)
  ├─ "Log in"  → /login → auth.signIn → /clubs (has clubs)
  │                                  └─ /join?welcome=1 (no clubs OR not found)
  └─ "Sign up" → /join → auth.enter → smart detection
                                  ├─ /clubs (has clubs)
                                  └─ Step 2 → 3a/3b → Step 4 → /clubs/{id}
```

## Entry Flow State

ASCII state diagram:

```
step 1 → step 2 → step 3a → step 4
step 1 → step 2 → step 3b → step 4
step 1 → /clubs (smart detection: clubs.length > 0)
step 1 → step 3a (?path=join)
step 1 → step 3b (?path=create)
step 4 → /clubs/{id}  (auto-redirect after 1500ms)
```

State: step 1 (Identity) — buttons: email, display name, pilot passcode, "Continue" — transitions: → step 2; → /clubs (smart); → step 3 (?path)
State: step 2 (Path) — buttons: "Join an existing club", "Create a new club", "Back" — transitions: → step 3a / step 3b / step 1
State: step 3a (Join) — buttons: code input, "Back", "Join the club" — transitions: → step 4 / step 2
State: step 3b (Create) — buttons: name, code, cadence radios, "Back", "Create club" — transitions: → step 4 / step 2
State: step 4 (Success) — buttons: "Copy" (create branch only) — transitions: auto-redirect

## Button Inventory

The `/join` wizard is composed of a controller page (`src/app/join/page.tsx` — all state, handlers, mutations, `identityValid`/routing) plus per-step presentational components (`_step1-identity.tsx`, `_step2-path.tsx`, `_step3-join.tsx`, `_step3-create.tsx`, `_step4-success.tsx`, with `_stepper.tsx`/`_shared.tsx` helpers). The refs below point at the step component for markup and at `page.tsx` for state/handlers.

Button: email input — `_step1-identity.tsx:43-56` — type=email
Button: display name input — `_step1-identity.tsx:58-70`
Button: pilot passcode input — `_step1-identity.tsx:72-84` — type=password; non-empty value feeds identityValid and is passed to `auth.enter`
Button: "Continue" — `_step1-identity.tsx:92-102` — enabled: identityValid (email contains @ AND displayName.trim() ≥ 1 AND passcode.length > 0, `join/page.tsx:53-54`) — handler: `handleIdentityContinue` (`join/page.tsx:103-137`) → `auth.enter` then smart detection or step 2
Button: "Join an existing club" PathCard — `_step2-path.tsx:15-21` — handler: onChoose("join") → `handlePathChoice` (`join/page.tsx:139`), step 3
Button: "Create a new club" PathCard — `_step2-path.tsx:22-28` — handler: onChoose("create") → `handlePathChoice`, step 3
Button: "Back" (step 2 → 1) — `_step2-path.tsx:29-34`
Button: club code input (join) — `_step3-join.tsx:33-50` — debounced, normalized to uppercase; `handleCodeChange` calls `clubs.lookup` after 4 chars (`join/page.tsx:146-173`)
Button: "Back" (step 3a → 2) — `_step3-join.tsx:80-89`
Button: "Join {clubName}" / "Join the club" — `_step3-join.tsx:90-100` — enabled: joinReady AND !joiningClub AND !alreadyMember — handler: `handleJoinSubmit` (`join/page.tsx:176-194`) → `clubs.join`
Button: club name input (create) — `_step3-create.tsx:50-63` — required, min 3 chars
Button: invite code input (create) — `_step3-create.tsx:65-102` — defaulted from `derivedCode` (`join/page.tsx:58-62`); auto-uppercases; live uniqueness status
Button: voting cadence radio "Monthly" / "6 weeks" / "Flexible" — `_step3-create.tsx:104-125` — values: monthly / six_weeks / flexible
Button: "Back" (step 3b → 2) — `_step3-create.tsx:133-142`
Button: "Create club" — `_step3-create.tsx:143-152` — enabled: createReady (name.trim() ≥ 3) AND !creatingClub AND codeStatus ≠ "taken" — handler: `handleCreateSubmit` (`join/page.tsx:209-233`) → `validateClubCode` then `clubs.create`
Button: invite-code copy control (step 4, create branch) — `_step4-success.tsx:72-85` — handler: `copyToClipboard` (`join/page.tsx:244-246`) → `navigator.clipboard.writeText(successClubCode)`
Button: "Sign out" (club sidebar footer) — `src/app/clubs/[clubId]/sidebar.tsx` — handler: POST `/api/trpc/auth.logout` → clear `session_id` cookie → `router.push("/")` — the only sign-out surface (the legacy `/clubs` page header variant was removed when the standalone `/clubs` index went away)

## Smart Detection

After Step 1 succeeds (`auth.enter` returns sessionId, cookie is set), the client immediately calls `auth.me` to fetch the user's clubs. The flow then branches:

- If `clubs.length > 0` AND no `?path=` override → `router.push("/clubs/{firstClubId}")` (the user is dropped straight into their first club). This is the invisible "login" path.
- If `clubs.length === 0` → continue to Step 2 (path choice).
- If the URL had `?path=join` or `?path=create` → skip detection, advance to Step 3 with branch pre-selected.
- If `auth.me` fails (network error) → fall through to Step 2 (graceful degradation).

## Login Route (`/login`)

A dedicated minimal page for returning users. Unlike `/join`, it:

- Asks only for email (no display name).
- Calls `auth.signIn` (a strict-find variant of `auth.enter`).
- Refuses to create new User records — unknown emails get a NOT_FOUND error.

Flow:

1. User enters email → "Log in" button.
2. Client POSTs `auth.signIn({ email })`.
   - **Success** (user exists): cookie is set with the new sessionId. Client then calls `auth.me`.
     - `clubs.length > 0` → `router.push("/clubs/{firstClubId}")` (the user lands straight inside a club).
     - `clubs.length === 0` → `router.push("/join?welcome=1")`. The /join page displays a welcome banner so the user understands why they were bounced.
   - **NOT_FOUND** (no User record): `router.push("/join?welcome=1&email=…")`. The email is carried through and pre-filled on /join's Step 1.
   - **BAD_REQUEST** (malformed email): inline error on /login.

Why a separate route:

- Returning users get a 1-field form; no friction.
- The semantic separation (login vs sign-up) lets the landing page advertise both with clarity.
- `auth.signIn`'s strict-find behavior prevents typo-induced ghost user records.

## Return Visit (Same Device)

Session cookie present and valid → user goes straight to dashboard. No login step.

## Return Visit (New Device)

No session cookie → `/join` → Step 1 → smart detection finds existing memberships → auto-redirect to `/clubs`.

## Existing User Creating Second Club

Already logged in. Navigate to `/join?path=create` → skip Steps 1–2 (smart detection bypassed by override) → land on Step 3b. (Note: with a valid session cookie, Step 1 is still rendered — `?path=` is read after Step 1 completes. A future improvement could skip Step 1 when a valid session is already present.)

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
```

No OAuthConnection table, no MagicLinkToken table, no password hash.

## API Contracts

| Procedure | Input | Output |
|-----------|-------|--------|
| `auth.enter` | `{ email, displayName, passcode }` | `{ user, sessionId }` (sets cookie). Idempotent: creates user if new, updates displayName if changed. Throws UNAUTHORIZED on wrong passcode (see AUTH-API-PASSCODE-001). |
| `auth.signIn` | `{ email, passcode }` | `{ user, sessionId }` if user exists. Throws NOT_FOUND otherwise — never creates a User record. Throws UNAUTHORIZED on wrong passcode. |
| `auth.me` | - | `{ user, clubs }` or 401 |
| `auth.logout` | - | `{ success: true }`. Deletes the server session row (if present) and emits a `Set-Cookie: session_id=; Path=/; Max-Age=0` response header. Idempotent — safe to call without an active session (publicProcedure). |

## Voting Cadence Field

The voting cadence radios in Step 3b (`_step3-create.tsx:104-125`) store the chosen value (`monthly`/`six_weeks`/`flexible`) and pass it to `clubs.create` as a structured `cadence` argument (`join/page.tsx:219-224`), persisted to the typed `Club.votingCadence` enum column. See `AUTH-UI-STEP3B-CADENCE-DATA-001`. The earlier "embed in description" hack has been removed.

## Session Management

Sessions are server-side, stored in PostgreSQL (Neon). Session ID is a cryptographically random string stored in a cookie. The cookie is set server-side via `Set-Cookie` on `auth.enter`/`auth.signIn` success with `Max-Age=2592000` (30 days). `sessionSetCookieHeader` in `src/lib/auth/session.ts` is the single source of truth for the cookie format and emits `HttpOnly; Path=/; SameSite=Lax` (plus `Secure` in production). See `AUTH-BE-001`.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Identity mechanism | Email address (unverified) | OAuth; email + password; magic link | Email is the minimum cross-device identity. No password = zero friction. |
| Display name | Entered with email, updatable | Fixed at creation; per-club names | Updatable is simplest. |
| Session duration | 30 days, sliding (target) | 7 days; permanent; session-only | Weekly users never re-authenticate. |
| User creation | Implicit on first `auth.enter` | Explicit registration | Removes the concept of "signing up." |
| Smart detection | Branch on existing memberships | Always show step 2 | Returning users get a true zero-step login. |

## Open Questions

### Resolved

1. ✅ Email-only identity, no password or OAuth.
2. ✅ Implicit user creation.
3. ✅ Smart detection branching after Step 1.

### Deferred

1. **Magic-link email verification.**
2. **Display name per club.**
3. **Account deletion.**
4. **Persist voting cadence as a structured Club field.**
5. **Skip Step 1 when a valid session cookie is already present** (existing-user-creates-second-club flow).

## References

- `docs/specs/auth-specs.md`
- `docs/llds/club-management.md`
- `docs/high-level-design.md`
