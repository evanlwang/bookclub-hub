# Identity and Sessions

## Context and Design Philosophy

Identity in BookClub Hub is designed for maximum frictionlessness. There is no account creation flow, no passwords, no OAuth, and no third-party authentication. A user's identity is their email address. They enter it once when they first join a club, along with a display name. The system creates a long-lived session and the user is done.

The email serves as a cross-device, cross-club identity anchor. If a user opens the app on a new device, they enter their email and are recognized — all their clubs appear. No verification step, no magic link, no password. This is a deliberate trade-off: anyone who knows your email could claim to be you. For a book club app among friends, this is acceptable. The threat model is "people who know each other," not "adversarial strangers."

Traces to the HLD's Identity key design decision (email + display name, no password or OAuth).

## How It Works

### First Visit (New User)

1. User navigates to the app or opens a club join page
2. User enters: club code, email, display name
3. Server looks up email — no existing user found
4. Server creates User record, creates Membership, creates session
5. Session token stored in HttpOnly cookie (30-day expiry, sliding)
6. User lands in the club

### Return Visit (Same Device)

1. Session cookie is present and valid
2. User goes straight to their dashboard — no login step at all

### Return Visit (New Device)

1. No session cookie
2. User enters email on a "Welcome back" screen
3. Server finds existing user, creates new session
4. User sees all their clubs

### First Visit to a New Club (Existing User)

1. User is already logged in (has session)
2. User enters club code
3. Server adds membership, redirects to club

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

## API Endpoints

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/auth/enter` | POST | `{ "email": "...", "display_name": "..." }` | 200 `{ user }` (set session cookie). Creates user if new, updates display_name if changed. |
| `/auth/me` | GET | - | 200 `{ user, clubs }` or 401 |
| `/auth/logout` | POST | - | 200 (clear session cookie) |

The `/auth/enter` endpoint is the only "login" flow. It is idempotent: calling it with an existing email returns that user; calling it with a new email creates one. The display_name is updated to the latest value provided (so a user can change their name by re-entering).

## Session Management

Sessions are server-side, stored in the database or cache store. Session ID is a cryptographically random string stored in an HttpOnly, Secure, SameSite=Lax cookie. Expiration: 30 days, sliding (refreshed on each request). This means a weekly-active user never has to re-enter their email.

Logout destroys the server-side session and clears the cookie.

## Visual Layout

### New User / New Device

```
┌──────────────────────────────────────┐
│          BookClub Hub                │
│                                      │
│   Email: [________________________]  │
│   Name:  [________________________]  │
│                                      │
│   [Continue]                         │
│                                      │
│   Already have a session? You'll be  │
│   signed in automatically.           │
└──────────────────────────────────────┘
```

### Joining a Club (Logged In)

```
┌──────────────────────────────────────┐
│   Join a Book Club                   │
│                                      │
│   Club code: [____________]          │
│                                      │
│   [Join]                             │
└──────────────────────────────────────┘
```

### Joining a Club (Not Logged In)

```
┌──────────────────────────────────────┐
│   Join a Book Club                   │
│                                      │
│   Club code: [____________]          │
│   Email:     [____________]          │
│   Name:      [____________]          │
│                                      │
│   [Join]                             │
└──────────────────────────────────────┘
```

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

## References

- `docs/high-level-design.md`
- `docs/specs/auth-specs.md`
