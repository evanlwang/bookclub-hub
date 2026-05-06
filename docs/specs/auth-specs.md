# Identity and Session Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Entry Flow (4-step join or create)

- `[x]` **AUTH-UI-001**: The system SHALL display an identity form (email + display name) as the first step of the join flow.
- `[x]` **AUTH-UI-002**: After identity entry, the system SHALL present a choice between joining an existing club and creating a new one.
- `[x]` **AUTH-UI-003**: The system SHALL create a session immediately on Step 1 completion (when `auth.enter` succeeds) so subsequent steps can use authenticated procedures (e.g., `clubs.create`).
- `[ ]` **AUTH-UI-004**: After Step 1 succeeds, the system SHALL fetch the user's club list via `auth.me`. If the user has one or more memberships AND the request did not include an explicit `?path=` query parameter, the system SHALL redirect to `/clubs` and skip Step 2 (path choice). Users with zero memberships SHALL continue to Step 2. If `auth.me` fails, the system SHALL fall through to Step 2 (graceful degradation).

## User Identity

- `[x]` **AUTH-DATA-001**: The system shall store user identity as email (unique, lowercase-normalized) and display_name.
- `[x]` **AUTH-DATA-002**: The system shall enforce email uniqueness case-insensitively (e.g., "Evan@Example.com" and "evan@example.com" resolve to the same user).
- `[x]` **AUTH-API-001**: When a user calls `auth.enter` with email and display_name, the system SHALL create a new user if the email does not exist, or return the existing user if it does.
- `[x]` **AUTH-API-002**: When an existing user calls `auth.enter` with a different display_name, the system SHALL update the display_name to the new value.

## Sessions

- `[ ]` **AUTH-BE-001**: The system shall create a server-side session with a cryptographically random ID (64+ characters) stored in an HttpOnly, Secure, SameSite=Lax cookie.
- `[ ]` **AUTH-BE-002**: Sessions shall expire after 30 days of inactivity (sliding expiration refreshed on each authenticated request).
- `[ ]` **AUTH-API-003**: When a user calls `auth.logout`, the system SHALL destroy the server-side session and clear the session cookie.
- `[ ]` **AUTH-API-004**: When a request includes a valid session cookie, `auth.me` SHALL return the user's data and club list without requiring re-authentication.
- `[ ]` **AUTH-API-005**: When a request includes an invalid or expired session cookie, `auth.me` SHALL throw an unauthorized error.

## No Third-Party Auth

- `[ ]` **AUTH-BE-003**: The system shall NOT require any OAuth provider, third-party authentication service, or password for user identification.

## Deferred

- `[D]` **AUTH-BE-004**: Where email verification is enabled, the system shall send a magic link and require click-through before creating the session.
- `[D]` **AUTH-API-006**: The system shall enforce rate limiting of max 3 `auth.enter` calls per email per hour to prevent abuse.
- `[D]` **AUTH-DATA-003**: The system shall support account deletion with cascading removal of all associated memberships, votes, and comments.
