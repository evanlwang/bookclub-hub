# Identity and Sessions

## Context and Design Philosophy

Identity in BookClub Hub is designed for maximum frictionlessness. There is no account creation flow, no passwords, no OAuth, and no third-party authentication. A user's identity is their email address. They enter it once when they first join a club, along with a display name. The system creates a long-lived session and the user is done.

The email serves as a cross-device, cross-club identity anchor. If a user opens the app on a new device, they enter their email and are recognized — all their clubs appear. No verification step, no magic link, no password. The threat model is "people who know each other," not "adversarial strangers."

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Two-Path Entry Architecture

The marketing landing page (`/`) presents two clear actions:

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

State: step 1 (Identity) — buttons: email, display name, "Continue" — transitions: → step 2; → /clubs (smart); → step 3 (?path)
State: step 2 (Path) — buttons: "Join an existing club", "Create a new club", "Back" — transitions: → step 3a / step 3b / step 1
State: step 3a (Join) — buttons: code input, "Back", "Join the club" — transitions: → step 4 / step 2
State: step 3b (Create) — buttons: name, code, cadence radios, "Back", "Create club" — transitions: → step 4 / step 2
State: step 4 (Success) — buttons: "Copy" (create branch only) — transitions: auto-redirect

## Button Inventory

Button: email input — `join/page.tsx:472-480` — required, type=email
Button: display name input — `join/page.tsx:487-495` — required
Button: "Continue" — `join/page.tsx:503-512` — enabled: identityValid (email contains @ AND displayName.trim() ≥ 1) — handler: `auth.enter` then smart detection or step 2
Button: "Join an existing club" PathCard — `join/page.tsx:532-537` — handler: setPath("join"), step 3
Button: "Create a new club" PathCard — `join/page.tsx:539-544` — handler: setPath("create"), step 3
Button: "Back" (step 2 → 1) — `join/page.tsx:546-550`
Button: club code input (join) — `join/page.tsx:563-572` — debounced, normalized to uppercase, calls `clubs.lookup` after 4 chars
Button: "Back" (step 3a → 2) — `join/page.tsx:586-593`
Button: "Join {clubName}" / "Join the club" — `join/page.tsx:595-604` — enabled: joinReady AND !joiningClub — handler: `clubs.join`
Button: club name input (create) — `join/page.tsx:616-624` — required, min 3 chars
Button: invite code input (create) — `join/page.tsx:631-638` — defaulted from derivedCode; auto-uppercases
Button: voting cadence radio "Monthly" / "Six Weeks" / "Flexible" — `join/page.tsx:646-666` — values: monthly / six_weeks / flexible
Button: "Back" (step 3b → 2) — `join/page.tsx:676-682`
Button: "Create club" — `join/page.tsx:685-694` — enabled: createReady (name.trim() ≥ 3) AND !creatingClub — handler: `validateClubCode` then `clubs.create`
Button: "Copy" (step 4, create branch) — `join/page.tsx:723-730` — handler: `navigator.clipboard.writeText(successClubCode)`
Button: "Sign out" (club sidebar footer) — `src/app/clubs/[clubId]/sidebar.tsx` — handler: POST `/api/trpc/auth.logout` → clear `session_id` cookie → `router.push("/")`
Button: "Sign out" (/clubs page header) — `src/app/clubs/page.tsx` — same handler as the sidebar variant

## Smart Detection

After Step 1 succeeds (`auth.enter` returns sessionId, cookie is set), the client immediately calls `auth.me` to fetch the user's clubs. The flow then branches:

- If `clubs.length > 0` AND no `?path=` override → `router.push("/clubs")`. This is the invisible "login" path.
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
     - `clubs.length > 0` → `router.push("/clubs")`.
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
| `auth.enter` | `{ email, displayName }` | `{ user, sessionId }` (sets cookie). Idempotent: creates user if new, updates displayName if changed. |
| `auth.signIn` | `{ email }` | `{ user, sessionId }` if user exists. Throws NOT_FOUND otherwise — never creates a User record. |
| `auth.me` | - | `{ user, clubs }` or 401 |
| `auth.logout` | - | `{ success: true }`. Deletes the server session row (if present) and emits a `Set-Cookie: session_id=; Path=/; Max-Age=0` response header. Idempotent — safe to call without an active session (publicProcedure). |

## Voting Cadence Field (gap)

The voting cadence radios in Step 3b store the chosen value (`monthly`/`six_weeks`/`flexible`) and pass it as `description: "Voting cadence: {cadence}"` to `clubs.create` (`join/page.tsx:369`). There is **no structured field** on Club for cadence today. Recommendation: add `voting_cadence` enum to Club and stop overloading description.

## Session Management

Sessions are server-side, stored in PostgreSQL (Neon). Session ID is a cryptographically random string stored in a cookie. The cookie is set on `auth.enter` success with `max-age=30 days` (`join/page.tsx:224`). Cookie hardening flags (HttpOnly/Secure/SameSite) need verification against the actual cookie write path on the server side.

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
