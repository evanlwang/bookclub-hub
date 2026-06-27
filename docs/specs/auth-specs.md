# Identity and Session Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**:
- API: `src/server/routers/auth.ts`
- Auth lib: `src/lib/auth/otp.ts`, `src/lib/auth/webauthn.ts`, `src/lib/auth/credentials.ts`, `src/lib/auth/session.ts`, `src/lib/auth/rate-limit.ts`
- Email: `src/server/services/email.ts` (`sendOtpCode`)
- UI: `src/app/join/page.tsx`, `src/app/login/page.tsx`, `src/app/page.tsx` (landing CTAs), device-management view
- Tests: `tests/e2e/login.spec.ts`, `tests/e2e/join-club.spec.ts`, `tests/integration/auth.test.ts`, `tests/integration/join-flow.test.ts`, `src/lib/auth/otp.test.ts`, `src/lib/auth/webauthn.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Entry Flow State

State: step 1 (Identity) — sub-flow: email-entry → otp-entry → optional passkey-offer. Buttons shown: email input, "Send code", then 6-digit code input + display name input + "Verify" + "Resend code", then optional "Set up FaceID" / "Not now" — transitions: → step 2 (no clubs); → /clubs (smart detection: user has clubs); → step 3 (explicit `?path=join|create`)
State: step 2 (Path) — buttons shown: "Join an existing club" card, "Create a new club" card, "Back" — transitions: → step 3a (Join); → step 3b (Create); → step 1 (Back)
State: step 3a (Join) — buttons shown: club code input, "Back", "Join the club" — transitions: → step 4; → step 2 (Back)
State: step 3b (Create) — buttons shown: club name input, club code input, voting cadence radios, "Back", "Create club" — transitions: → step 4; → step 2 (Back)
State: step 4 (Success) — buttons shown: invite code "Copy" (create branch only) — transitions: auto-redirect to `/clubs/{id}` after 1500ms

## Landing Page CTAs

- `[x]` **LANDING-UI-001**: The marketing landing page (`/`) SHALL expose two distinct actions: "Get your library card" → `/join` (new users) and "Log in" → `/login` (returning users), identified by `data-testid="hero-signup"` and `data-testid="hero-login"`. (The editorial redesign has no top nav — both actions live in the CTA block; see `HOME-UI-CTA-PRIMARY-001` / `-SECONDARY-001`.) (`src/app/page.tsx`)

## Login Route (Returning Users)

- `[ ]` **AUTH-UI-LOGIN-001**: The `/login` page SHALL be passkey-first: WHEN `window.PublicKeyCredential` and conditional mediation are available, it SHALL request a passkey assertion via `auth.startPasskeyLogin` and complete login with `auth.finishPasskeyLogin` without requiring email entry. It SHALL always also render an "email me a code" affordance as the fallback. (`src/app/login/page.tsx`)
- `[ ]` **AUTH-UI-LOGIN-002**: On a successful login (passkey assertion OR verified OTP), the page SHALL call `auth.me`; if the user has one or more memberships, it SHALL `router.push("/clubs/{firstClubId}")` so the user lands directly inside a club (the standalone `/clubs` index page was removed). (`src/app/login/page.tsx`)
- `[ ]` **AUTH-UI-LOGIN-003**: WHEN a login completes for a user with zero memberships OR `verifyOtp` returns `isNewUser: true`, the page SHALL `router.push("/join?welcome=1[&email=…]")`. The `/join` page SHALL render a welcome banner above Step 1 and pre-fill the email field; a newly-created user (provisional name) can edit the display name there. (`src/app/login/page.tsx`, `src/app/join/page.tsx`)
- `[x]` **AUTH-UI-LOGIN-EMAIL-HINT-001**: When the email field is non-empty AND fails the basic `@`+`.` shape check, the `/login` page SHALL render an inline helper-text error ("Enter a valid email like name@example.com.") below the input and set `aria-invalid="true"` on the input. The helper SHALL NOT appear while the field is empty. (`src/app/login/page.tsx`)
- `[ ]` **AUTH-UI-LOGIN-AUTOCOMPLETE-001**: The `/login` email input SHALL set `autoComplete="email webauthn"` so both password managers and the platform passkey picker recognize the form, and the OTP code input SHALL set `autoComplete="one-time-code"` and `inputMode="numeric"` so the platform offers the emailed code for autofill. (`src/app/login/page.tsx`)

## Entry Flow

- `[ ]` **AUTH-UI-001**: The system SHALL display an identity sub-flow as the first step of the join flow: an email input that, on "Send code", calls `auth.requestOtp`, followed by a 6-digit code input plus a display-name input that, on "Verify", calls `auth.verifyOtp`. (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-002**: After identity entry (and when smart detection finds no existing memberships), the system SHALL present a choice between joining an existing club and creating a new one. (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-003**: The system SHALL create a session immediately when `auth.verifyOtp` (or `auth.finishPasskeyLogin`) succeeds so subsequent steps can use authenticated procedures. (`src/app/join/page.tsx`, `src/server/routers/auth.ts`)
- `[x]` **AUTH-UI-004**: After Step 1 succeeds, the system SHALL fetch the user's clubs via `auth.me`. If `clubs.length > 0` AND the request did NOT include `?path=join` or `?path=create`, the system SHALL `router.push("/clubs/{firstClubId}")` (drop the user straight into their first club). Otherwise it advances to Step 2. If `auth.me` fails, the system falls through to Step 2 (graceful degradation). (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-PATH-OVERRIDE-001**: When the URL includes `?path=join` or `?path=create`, the system SHALL skip Step 2 and route directly to the corresponding Step 3 branch. (`src/app/join/page.tsx`)

## Step 1 Buttons (Identity Sub-Flow)

- `[ ]` **AUTH-UI-STEP1-EMAIL-001**: Email input (type=email, required, `autoComplete="email webauthn"`, htmlFor matches input id) shown in the email-entry state. (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-STEP1-SENDCODE-001**: Button "Send code" — disabled until the email passes the `@`+`.` shape check or while a request is in flight — handler: `auth.requestOtp`; on success advances to otp-entry. (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-STEP1-OTP-001**: 6-digit code input (`inputMode="numeric"`, `autoComplete="one-time-code"`, maxLength 6) shown in the otp-entry state. (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-STEP1-NAME-001**: Display name input (required) shown in the otp-entry state so a new user is named at verify time. (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-STEP1-VERIFY-001**: Button "Verify" — disabled unless the code is 6 digits AND displayName is non-empty AND no request is in flight — handler: `auth.verifyOtp` (sets session cookie, then smart detection). (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-STEP1-RESEND-001**: Button "Resend code" — re-calls `auth.requestOtp`; the system SHALL show a cooldown and SHALL be subject to the same rate limit. (`src/app/join/page.tsx`)
- `[ ]` **AUTH-UI-STEP1-PASSKEY-OFFER-001**: After a successful verify, WHEN `window.PublicKeyCredential` is available AND the user has no passkey, the system SHALL present a "Set up FaceID" prompt that runs the WebAuthn registration ceremony (`auth.startPasskeyRegistration` → browser → `auth.finishPasskeyRegistration`), with a "Not now" control that skips. Skipping SHALL always be permitted. (`src/app/join/page.tsx`)

## Step 2 Buttons

- `[x]` **AUTH-UI-STEP2-PATHCARD-JOIN-001**: PathCard "Join an existing club" — handler: `handlePathChoice("join")` → step 3.
- `[x]` **AUTH-UI-STEP2-PATHCARD-CREATE-001**: PathCard "Create a new club" — handler: `handlePathChoice("create")` → step 3.
- `[x]` **AUTH-UI-STEP2-BACK-001**: Button: "Back" — handler: returns to step 1.

## Step 3a Buttons (Join Branch)

- `[x]` **AUTH-UI-STEP3A-CODE-001**: Club code input (uppercase normalized, monospace, debounced lookup). On change ≥4 chars, calls `clubs.lookup`. (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-STEP3A-BACK-001**: Button: "Back" — handler: returns to step 2.
- `[x]` **AUTH-UI-STEP3A-JOIN-001**: Button: "Join {clubName}" / "Join the club" — disabled when `!joinReady || joiningClub` — handler: `handleJoinSubmit` calls `clubs.join`. (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-STEP3A-ALREADY-MEMBER-001**: When `clubs.join` returns `{ alreadyMember: true }`, Step 3a SHALL render an in-flow informational banner ("You're already in {clubName}.") with a link "Open it →" that navigates to `/clubs/{id}`. The Join button SHALL be disabled while the banner is visible, and editing the code SHALL clear the banner. The system SHALL NOT advance to Step 4 in this case. (`src/app/join/page.tsx`, `src/app/join/_step3-join.tsx`)

## Step 3b Buttons (Create Branch)

- `[x]` **AUTH-UI-STEP3B-NAME-001**: Club name input (required, min 3 chars). (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-STEP3B-CODE-001**: Club code input, defaulted from auto-derived `derivedCode` (alphanumeric, uppercase, max 10). User can override; uppercased on input. (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-STEP3B-CADENCE-001**: Voting cadence radio buttons — three options labeled "Monthly" / "Six Weeks" / "Flexible" (values: `monthly`, `six_weeks`, `flexible`). (`src/app/join/page.tsx`)
  - `[x]` **AUTH-UI-STEP3B-CADENCE-DATA-001**: Voting cadence persists as a typed `VotingCadence` enum column (`monthly | six_weeks | flexible`, default `monthly`) on the `clubs.voting_cadence` field. `clubs.create` and `clubs.update` accept a `cadence` argument and persist directly. (`prisma/schema.prisma` `VotingCadence`, `Club.votingCadence`; `src/server/routers/clubs.ts` `create`/`update`)
- `[x]` **AUTH-UI-STEP3B-BACK-001**: Button: "Back" — handler: returns to step 2.
- `[x]` **AUTH-UI-STEP3B-CREATE-001**: Button: "Create club" — disabled when `!createReady || creatingClub` — handler: `handleCreateSubmit` validates code via `clubs.lookup` then calls `clubs.create`. (`src/app/join/page.tsx`)

## Step 4 Buttons (Success)

- `[x]` **AUTH-UI-STEP4-WELCOME-001**: For join branch, the system SHALL display "Welcome to {clubName}!" with a 64×64 success check icon (role="img", aria-label="Success"). Auto-redirects to `/clubs/{id}` after 1500ms. (`src/app/join/page.tsx`)
- `[x]` **AUTH-UI-STEP4-COPY-001**: For create branch, the system SHALL display the invite code prominently with a Button: "Copy" that calls `navigator.clipboard.writeText(successClubCode)`. (`src/app/join/page.tsx`)

## User Identity

- `[x]` **AUTH-DATA-001**: User identity stored as email (unique, lowercase-normalized) and `display_name`.
- `[x]` **AUTH-DATA-002**: Email uniqueness is case-insensitive ("Evan@Example.com" and "evan@example.com" resolve to the same user).
- `[ ]` **AUTH-API-001**: `auth.verifyOtp` SHALL create a new user when the verified email does not exist — using the supplied `displayName` when present (the `/join` route) or a provisional display name derived from the email local-part when absent (the `/login` route) — or match and return the existing user when it does. It MUST NOT create a user until the OTP is verified. The result SHALL include `isNewUser`. (`src/server/routers/auth.ts`)
- `[ ]` **AUTH-API-002**: WHEN an existing user verifies an OTP and supplies a `displayName` that differs from the stored one, the system SHALL update the display name. (`src/server/routers/auth.ts`)

## Email One-Time Code (OTP)

- `[ ]` **AUTH-OTP-REQUEST-001**: `auth.requestOtp({ email })` SHALL generate a 6-digit numeric code, persist only its hash with a ~10-minute expiry, and send the code to the email via `emailService.sendOtpCode`. (`src/server/routers/auth.ts`, `src/lib/auth/otp.ts`, `src/server/services/email.ts`)
- `[ ]` **AUTH-OTP-REQUEST-ENUM-001**: `auth.requestOtp` SHALL return the same `{ ok: true }` response whether or not the email maps to an existing user, so the endpoint does not reveal account existence. (`src/server/routers/auth.ts`)
- `[ ]` **AUTH-OTP-HASH-001**: The system SHALL never store or log the raw OTP — only a one-way hash (`code_hash`) is persisted, and verification compares hashes in constant time. (`src/lib/auth/otp.ts`)
- `[ ]` **AUTH-OTP-VERIFY-001**: `auth.verifyOtp({ email, code, displayName? })` SHALL accept the code only when it matches the stored hash, is unexpired, and is unconsumed; on success it SHALL mark the OTP consumed and create a session. (`src/server/routers/auth.ts`, `src/lib/auth/otp.ts`)
- `[ ]` **AUTH-OTP-SINGLE-USE-001**: A consumed OTP SHALL NOT verify a second time; replaying a previously-accepted code SHALL throw `UNAUTHORIZED`. (`src/lib/auth/otp.ts`)
- `[ ]` **AUTH-OTP-EXPIRY-001**: An OTP presented after its `expires_at` SHALL be rejected with `UNAUTHORIZED` and SHALL NOT create a session. (`src/lib/auth/otp.ts`)
- `[ ]` **AUTH-OTP-ATTEMPTS-001**: The system SHALL cap verification attempts per issued OTP (incrementing `attempts`); once the cap is exceeded the code SHALL be rejected even if later presented correctly, and the user must request a new code. (`src/lib/auth/otp.ts`)
- `[ ]` **AUTH-OTP-LATEST-001**: WHEN a new OTP is requested for an email, the system SHALL mark any prior unconsumed OTP for that email consumed before issuing the new code, so only the most recently requested code can verify. (`src/server/routers/auth.ts`, `src/lib/auth/otp.ts`)
- `[ ]` **AUTH-OTP-MAGNITUDES-001**: The OTP SHALL expire 10 minutes after issuance, and the per-code verification attempt cap SHALL be 5. (`src/lib/auth/otp.ts`)

## Passkeys (WebAuthn)

- `[ ]` **AUTH-PASSKEY-REG-001**: `auth.startPasskeyRegistration` (protected) SHALL return `PublicKeyCredentialCreationOptions` carrying a freshly stored single-use challenge and `excludeCredentials` listing the user's existing passkeys, and `auth.finishPasskeyRegistration({ attestation, deviceName? })` SHALL verify the attestation against that challenge, persist a `Credential` (public key, counter, transports, device name), and consume the challenge. (`src/server/routers/auth.ts`, `src/lib/auth/webauthn.ts`, `src/lib/auth/credentials.ts`)
- `[ ]` **AUTH-PASSKEY-LOGIN-001**: `auth.startPasskeyLogin({ email? })` SHALL return `PublicKeyCredentialRequestOptions` with a fresh challenge (`allowCredentials` scoped to the email's passkeys when provided, empty for discoverable-credential login), and `auth.finishPasskeyLogin({ assertion })` SHALL verify the assertion against the stored challenge and the matching credential's public key and create a session. (`src/server/routers/auth.ts`, `src/lib/auth/webauthn.ts`)
- `[ ]` **AUTH-PASSKEY-COUNTER-001**: On login the system SHALL reject an assertion whose signature counter is not greater than the stored `counter` when the authenticator reports a non-zero counter (cloned-authenticator guard), and otherwise SHALL update the stored `counter` and `last_used_at`. (`src/lib/auth/webauthn.ts`, `src/lib/auth/credentials.ts`)
- `[ ]` **AUTH-PASSKEY-UNKNOWN-001**: WHEN `finishPasskeyLogin` presents an assertion for a `credentialId` that is not in the store, the system SHALL throw `UNAUTHORIZED` and SHALL NOT create a session. (`src/server/routers/auth.ts`)
- `[ ]` **AUTH-PASSKEY-MULTI-001**: A user MAY register multiple passkeys; each registration adds a distinct `Credential` and re-registering the same authenticator SHALL be prevented via `excludeCredentials`. (`src/server/routers/auth.ts`, `src/lib/auth/credentials.ts`)
- `[ ]` **AUTH-PASSKEY-LIST-001**: `auth.listCredentials` (protected) SHALL return the caller's passkeys (id, device name, created, last used) for the device-management view. (`src/server/routers/auth.ts`)
- `[ ]` **AUTH-PASSKEY-REVOKE-001**: `auth.revokeCredential({ id })` (protected) SHALL delete one of the caller's own passkeys and SHALL refuse to delete a credential belonging to another user. (`src/server/routers/auth.ts`)
- `[ ]` **AUTH-PASSKEY-CHALLENGE-001**: Every WebAuthn ceremony SHALL use a server-issued challenge persisted in `WebAuthnChallenge` that is single-use (consumed on verification) and time-bounded; a missing, expired, or already-consumed challenge SHALL fail the ceremony. (`src/lib/auth/webauthn.ts`)
- `[ ]` **AUTH-PASSKEY-RP-001**: WebAuthn verification SHALL use `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` from validated env; a mismatch between the request origin and the configured origin SHALL fail with a clear error rather than silently. (`src/lib/auth/webauthn.ts`, `src/env`)

## Account Recovery / Fallback

- `[ ]` **AUTH-RECOVERY-001**: A user without a usable passkey (new device, lost device, or WebAuthn-incapable browser) SHALL be able to authenticate via the email OTP path and reach the same session state as a passkey login. (`src/app/login/page.tsx`, `src/server/routers/auth.ts`)
- `[ ]` **AUTH-RECOVERY-002**: Revoking a user's last remaining passkey SHALL be permitted and SHALL leave the account loginable via OTP (no lockout). (`src/server/routers/auth.ts`)

## Sessions

- `[ ]` **AUTH-BE-SESSION-001**: The system SHALL create a server-side session and set a `session_id` cookie with 30-day max-age on `auth.verifyOtp` and `auth.finishPasskeyLogin` success. (`src/server/routers/auth.ts`, `src/lib/auth/session.ts`)
- `[x]` **AUTH-BE-001**: The session cookie is emitted server-side via `Set-Cookie` from the session-creating procedures and the unauthenticated `clubs.join` path with `HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` and `Secure` appended in production. The helper `sessionSetCookieHeader` in `src/lib/auth/session.ts` is the single source of truth for the cookie format. The clearing cookie in `auth.logout` mirrors the same attributes.
- `[x]` **AUTH-BE-002**: Sliding expiration runs on every authenticated request: the route handler at `src/app/api/trpc/[trpc]/route.ts` and the RSC server caller at `src/trpc/server.ts` both refresh `Session.expiresAt` via `db.session.update({ expiresAt: computeNewExpiry() })` when a valid session is loaded. The HTTP path additionally emits a fresh `Set-Cookie` so the browser's `Max-Age` rolls forward.
- `[x]` **AUTH-API-003**: `auth.logout` SHALL destroy the server-side session and clear the cookie. Both halves are implemented in the same `auth.logout` mutation: server-side row delete + clearing `Set-Cookie`. AUTH-API-LOGOUT-001/002 below cover the response-header form. (`src/server/routers/auth.ts`)
- `[x]` **AUTH-API-004**: When a request includes a valid session cookie, `auth.me` SHALL return the user's data and club list without re-authentication.
- `[x]` **AUTH-API-005**: When a request includes an invalid or expired session cookie, `auth.me` SHALL throw an unauthorized error.

## Sign Out

- `[x]` **AUTH-UI-LOGOUT-001**: The club sidebar (`src/app/clubs/[clubId]/sidebar.tsx`) SHALL render a "Sign out" button in the user footer. Clicking it calls `auth.logout`, clears the `session_id` cookie client-side, and `router.push("/")`.
- `[x]` **AUTH-UI-LOGOUT-INVALIDATE-001**: After `auth.logout` resolves, the sidebar SHALL call `utils.invalidate()` so the React Query cache drops every cached query. (`src/app/clubs/[clubId]/sidebar.tsx`)
- `[x]` **AUTH-UI-LOGOUT-003**: After sign-out, navigating back to a protected route (e.g. `/clubs/{clubId}`) SHALL render the unauthenticated state — `auth.me` throws UNAUTHORIZED and the per-club page shows its error view (`data-testid="club-error"`).
- `[x]` **AUTH-API-LOGOUT-001**: `auth.logout` SHALL emit a `Set-Cookie: session_id=; Path=/; Max-Age=0` response header so the browser drops the cookie even if the client-side clear is skipped (defense in depth).
- `[x]` **AUTH-API-LOGOUT-002**: `auth.logout` called without a valid session SHALL return `{ success: true }` (idempotent) rather than throwing — the procedure is a `publicProcedure` so a stale or missing cookie still completes sign-out.

## No Third-Party Auth

- `[x]` **AUTH-BE-003**: The system SHALL NOT require any OAuth provider, third-party authentication service, or password. (WebAuthn passkeys are first-party credentials, not a third-party auth service.)

## Rate Limiting

- `[ ]` **AUTH-API-RATELIMIT-001**: `auth.requestOtp` and `auth.verifyOtp` SHALL throttle to a bounded number of attempts per minute per source IP AND per normalized email. `clubs.join` SHALL throttle per source IP (unauthenticated branch only). The passkey ceremony procedures SHALL additionally be IP-throttled. On exceed, SHALL throw TOO_MANY_REQUESTS. State is in-process memory (acceptable for pilot scale, resets on cold-start). (`src/server/routers/auth.ts`, `src/server/routers/clubs.ts`, `src/lib/auth/rate-limit.ts`)

## Deferred

- `[D]` **AUTH-DATA-003**: Account deletion with cascading removal of memberships, votes, comments.
- `[D]` **AUTH-DATA-004**: Per-club display names.
- `[D]` **AUTH-API-007**: Redis-backed rate limiting for multi-instance correctness (currently in-process).
