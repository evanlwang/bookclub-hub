# Identity and Sessions

## Context and Design Philosophy

Identity in BookClub Hub is designed for maximum frictionlessness. There is no account creation flow, no passwords, no OAuth, and no third-party authentication. A user's identity is their email address. They enter it once when they first join a club, along with a display name. The system creates a long-lived session and the user is done.

The email serves as a cross-device, cross-club identity anchor. If a user opens the app on a new device, they enter their email and are recognized — all their clubs appear. No verification step, no magic link, no password. This is a deliberate trade-off: anyone who knows your email could claim to be you. For a book club app among friends, this is acceptable. The threat model is "people who know each other," not "adversarial strangers."

Traces to the HLD's Identity key design decision (email + display name, no password or OAuth).

## How It Works

### New Entry Flow (4-step: Join or Create)

**Step 1 — Identity**
1. User navigates to `/join`
2. User enters email + display name
3. On "Continue", server calls `auth.enter` → creates User (if new), creates Session → sets cookie
4. User advances to Step 2 (path choice)

**Step 2 — Path Choice**
1. User sees two options: "Join an existing club" or "Create a new club"
2. Click one to advance to Step 3

**Step 3a — Join Branch**
1. User enters club code
2. Debounced `clubs.lookup` validates the code
3. On valid code, user submits with `clubs.join` (already authenticated from Step 1)
4. Server adds Membership, user advances to success

**Step 3b — Create Branch**
1. User enters club name
2. Auto-derived invite code (from club name, editable)
3. Selects voting cadence (monthly / 6 weeks / flexible)
4. On submit, `clubs.create` creates Club + Membership (already authenticated from Step 1)
5. User advances to success with invite code displayed

**Step 4 — Success**
1. Join branch: "Welcome to [Club]!" → redirects to `/clubs/[id]`
2. Create branch: "[Club] is live!" + invite code chip with copy button → redirects to `/clubs/[id]`

**Key difference from old flow**: Session created at Step 1 (when identity is confirmed), not at final submit. This enables the create branch to use authenticated procedures downstream.

### Smart Detection (Returning Users)

After Step 1 succeeds, the client immediately calls `auth.me` with the new session cookie to fetch the user's clubs. The flow then branches:

- If `clubs.length > 0`, the user is a returning member. The wizard skips Step 2 entirely and redirects to `/clubs` (the dashboard). This is the invisible "login" path: a returning user just types email + name and lands home.
- If `clubs.length === 0`, the user is new (or has no memberships yet). The wizard continues to Step 2 (path choice) as in the new-user flow.

The redirect is bypassed when the user arrives with an explicit `?path=join` or `?path=create` query parameter — for example, an existing member creating a second club. In that case the explicit intent wins and the wizard advances directly to Step 3 with the requested branch pre-selected.

If `auth.me` fails (network error), the wizard falls through to Step 2. The user can still proceed; the smart-detection check is best-effort.

### Return Visit (Same Device)

1. Session cookie is present and valid
2. User goes straight to their dashboard — no login step at all

### Return Visit (New Device)

1. No session cookie
2. User navigates to `/join` (directly, or bounced from a club page)
3. Enters email + name in Step 1
4. `auth.enter` creates a session; smart detection (`auth.me`) finds existing memberships
5. Wizard auto-redirects to `/clubs` — no path-choice step

### First Visit to a New Club (Existing User)

1. User is already logged in (has session)
2. User navigates to `/join` with a club code
3. Skips Steps 1–2, goes straight to Step 3a (join branch)
4. Or from dashboard, clicks "Create a club" → goes to Step 2, then Step 3b

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
  id: string (PK, cryptographically random, 64 chars)
  user_id: UUID (FK -> User)
  expires_at: timestamp
  created_at: timestamp
}
```

That's it. No OAuthConnection table, no MagicLinkToken table, no password hash. The User table is two meaningful fields: email and display_name.

## API Contracts

Endpoints below are logical contracts. The implementation uses tRPC procedures (e.g., `auth.enter(...)`) rather than REST routes.

| Procedure | Input | Output |
|-----------|-------|--------|
| `auth.enter` | `{ email, display_name }` | `{ user }` (set session cookie). Creates user if new, updates display_name if changed. |
| `auth.me` | - | `{ user, clubs }` or 401 |
| `auth.logout` | - | (clear session cookie) |

`auth.enter` is the only "login" flow. It is idempotent: calling it with an existing email returns that user; calling it with a new email creates one. The display_name is updated to the latest value provided (so a user can change their name by re-entering).

## Session Management

Sessions are server-side, stored in PostgreSQL (Neon). Session ID is a cryptographically random string stored in an HttpOnly, Secure, SameSite=Lax cookie. Expiration: 30 days, sliding (refreshed on each request). This means a weekly-active user never has to re-enter their email.

Logout destroys the server-side session and clears the cookie.

## Security Considerations

This auth model is intentionally weak by traditional standards. The trade-offs:

- **No email verification.** Anyone can enter any email. Mitigation: this is a private app for friend groups. If someone impersonates another member, the group notices immediately.
- **No password.** Anyone who knows your email can access your clubs on a new device. Mitigation: they'd also need to know which clubs you're in. The data is book opinions and meeting availability, not financial records.
- **Session hijacking.** Standard cookie security (HttpOnly, Secure, SameSite) mitigates the main vectors. Sessions are server-side so they can be revoked.

If security needs escalate later (e.g., the app grows beyond trusted friend groups), email verification via magic link can be added as a layer on top of `/auth/enter` without changing the data model.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Identity mechanism | Email address (unverified) | OAuth; email + password; magic links; anonymous/cookie-only | Email is the minimum cross-device identity. No password means zero friction. No OAuth means no third-party dependency. Cookie-only would lose identity on device switch. |
| Display name | Entered with email, updatable | Fixed at creation; per-club names; no display name | Updatable is simplest. Per-club names add complexity ("which name am I in this club?"). No display name makes discussions impersonal. |
| Session duration | 30 days, sliding | 7 days; permanent; session-only | 30 days with sliding means weekly users never re-authenticate. Permanent sessions are a security risk if the device is shared. Session-only forces re-entry too often. |
| User creation | Implicit on first `/auth/enter` | Explicit registration step; admin-created accounts | Implicit creation removes any concept of "signing up." You join a club and a user record is created as a side effect. Zero friction. |

## Open Questions & Future Decisions

### Resolved

1. ✅ Email-only identity, no password or OAuth.
2. ✅ 30-day sliding sessions.
3. ✅ Implicit user creation.

### Deferred

1. **Email verification (magic link upgrade).** If the app needs to prevent impersonation, add an optional magic link verification step. The data model doesn't change — add a `verified_at` timestamp to User.
2. **Display name per club.** Some users might want different names in different clubs. Requires moving display_name to Membership. Not needed for v1.
3. **Account deletion.** Delete User and cascade through memberships, votes, comments. Needed for GDPR if the app grows. Simple cascade from User.id.

## Design Reference

**Visual implementation:** See `docs/bookclub-hub-designs/project/artboards/landing-join.jsx` (Join Flow section, 4 interactive steps).

**Design tokens & components:**
- Form inputs: `--input` styling with focus ring (primary border + oklch highlight)
- Button variants: `btn-primary` for "Join", `btn-secondary` for secondary options
- Field labels: `label` class (13px, medium weight, secondary ink color)
- Hints: `hint` class (12px, tertiary ink, 6px margin-top)
- Typography: Body text at 15px with 1.55 line-height for instructions

**Key patterns:**
- Paper background (`--bg`) for maximum contrast on form inputs
- Clear visual hierarchy with display serif for headings
- Generous vertical spacing between form sections (16–24px)
- Toast notifications for async feedback (e.g., "Session created")

## References

- `docs/high-level-design.md`
- `docs/specs/auth-specs.md`
- `docs/design-system.md` — design tokens, typography, components
