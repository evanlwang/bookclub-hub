# Identity and Session Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## User Identity

- `[ ]` **AUTH-DATA-001**: The system shall store user identity as email (unique, lowercase-normalized) and display_name.
- `[ ]` **AUTH-DATA-002**: The system shall enforce email uniqueness case-insensitively (e.g., "Evan@Example.com" and "evan@example.com" resolve to the same user).
- `[ ]` **AUTH-API-001**: When a user calls `auth.enter` with email and display_name, the system SHALL create a new user if the email does not exist, or return the existing user if it does.
- `[ ]` **AUTH-API-002**: When an existing user calls `auth.enter` with a different display_name, the system SHALL update the display_name to the new value.

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
