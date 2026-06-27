# Identity and Session Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**:
- API: `src/server/routers/auth.ts`
- UI: `src/app/join/page.tsx`, `src/app/login/page.tsx`, `src/app/page.tsx` (landing CTAs)
- Tests: `tests/e2e/login.spec.ts`, `tests/e2e/join-club.spec.ts`, `tests/integration/auth.test.ts`, `tests/integration/join-flow.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Entry Flow State

State: step 1 (Identity) — buttons shown: email input, display name input, "Continue" — transitions: → step 2 (no clubs); → /clubs (smart detection: user has clubs); → step 3 (explicit `?path=join|create`)
State: step 2 (Path) — buttons shown: "Join an existing club" card, "Create a new club" card, "Back" — transitions: → step 3a (Join); → step 3b (Create); → step 1 (Back)
State: step 3a (Join) — buttons shown: club code input, "Back", "Join the club" — transitions: → step 4; → step 2 (Back)
State: step 3b (Create) — buttons shown: club name input, club code input, voting cadence radios, "Back", "Create club" — transitions: → step 4; → step 2 (Back)
State: step 4 (Success) — buttons shown: invite code "Copy" (create branch only) — transitions: auto-redirect to `/clubs/{id}` after 1500ms

## Landing Page CTAs

- `[x]` **LANDING-UI-001**: The marketing landing page (`/`) SHALL expose two distinct actions: "Get your library card" → `/join` (new users) and "Log in" → `/login` (returning users), identified by `data-testid="hero-signup"` and `data-testid="hero-login"`. (The editorial redesign has no top nav — both actions live in the CTA block; see `HOME-UI-CTA-PRIMARY-001` / `-SECONDARY-001`.) (`src/app/page.tsx`)

## Login Route (Returning Users)

- `[x]` **AUTH-UI-LOGIN-001**: The `/login` page SHALL render a single email input and a "Log in" button — no display-name prompt. The button is disabled until the email contains `@` and `.`. (`src/app/login/page.tsx`)
- `[x]` **AUTH-UI-LOGIN-002**: On submit, the system SHALL call `auth.signIn` with the email. On success, it calls `auth.me`; if the user has one or more memberships, it SHALL `router.push("/clubs/{firstClubId}")` so the user lands directly inside a club (the standalone `/clubs` index page was removed). (`src/app/login/page.tsx`)
- `[x]` **AUTH-UI-LOGIN-003**: When `auth.signIn` returns NOT_FOUND OR the user has zero memberships, the system SHALL `router.push("/join?welcome=1[&email=…]")`. The `/join` page SHALL render a welcome banner above Step 1 and pre-fill the email field. (`src/app/login/page.tsx`, `src/app/join/page.tsx`)
- `[x]` **AUTH-UI-LOGIN-EMAIL-HINT-001**: When the email field is non-empty AND fails the basic `@`+`.` shape check, the `/login` page SHALL render an inline helper-text error ("Enter a valid email like name@example.com.") below the input and set `aria-invalid="true"` on the input. The helper SHALL NOT appear while the field is empty. (`src/app/login/page.tsx`)
- `[x]` **AUTH-UI-LOGIN-PASSCODE-HINT-001**: The pilot passcode input on `/login` SHALL render a small helper text ("Contact your organizer if you don't have the passcode.") beneath the field so a returning user has a recovery path. (`src/app/login/page.tsx`)
- `[x]` **AUTH-UI-LOGIN-AUTOCOMPLETE-001**: The `/login` email input SHALL set `autoComplete="email"` and the passcode input SHALL set `autoComplete="current-password"` so password managers recognize the form. (`src/app/login/page.tsx`)

## Entry Flow

- `[x]` **AUTH-UI-001**: The system SHALL display an identity form (email + display name) as the first step of the join flow. (`join/page.tsx:466-526`)
- `[x]` **AUTH-UI-002**: After identity entry (and when smart detection finds no existing memberships), the system SHALL present a choice between joining an existing club and creating a new one. (`join/page.tsx:530-552`)
- `[x]` **AUTH-UI-003**: The system SHALL create a session immediately on Step 1 completion (when `auth.enter` succeeds) so subsequent steps can use authenticated procedures. (`join/page.tsx:198-254`)
- `[x]` **AUTH-UI-004**: After Step 1 succeeds, the system SHALL fetch the user's clubs via `auth.me`. If `clubs.length > 0` AND the request did NOT include `?path=join` or `?path=create`, the system SHALL `router.push("/clubs/{firstClubId}")` (drop the user straight into their first club). Otherwise it advances to Step 2. If `auth.me` fails, the system falls through to Step 2 (graceful degradation). (`join/page.tsx:226-249`)
- `[x]` **AUTH-UI-PATH-OVERRIDE-001**: When the URL includes `?path=join` or `?path=create`, the system SHALL skip Step 2 and route directly to the corresponding Step 3 branch (`pathOverride` in `join/page.tsx:158, 226-232`).

## Step 1 Buttons

- `[x]` **AUTH-UI-STEP1-EMAIL-001**: Email input (type=email, required, htmlFor matches input id). (`join/page.tsx:472-480`)
- `[x]` **AUTH-UI-STEP1-NAME-001**: Display name input (required). (`join/page.tsx:487-495`)
- `[x]` **AUTH-UI-STEP1-CONTINUE-001**: Button: "Continue" (`join/page.tsx:503-512`) — disabled when `!identityValid || signingIn` (`identityValid = email.includes("@") && displayName.trim().length > 0`) — handler: `handleIdentityContinue` (calls `auth.enter`, sets session cookie, runs smart detection).

## Step 2 Buttons

- `[x]` **AUTH-UI-STEP2-PATHCARD-JOIN-001**: PathCard "Join an existing club" — handler: `handlePathChoice("join")` → step 3.
- `[x]` **AUTH-UI-STEP2-PATHCARD-CREATE-001**: PathCard "Create a new club" — handler: `handlePathChoice("create")` → step 3.
- `[x]` **AUTH-UI-STEP2-BACK-001**: Button: "Back" — handler: returns to step 1.

## Step 3a Buttons (Join Branch)

- `[x]` **AUTH-UI-STEP3A-CODE-001**: Club code input (uppercase normalized, monospace, debounced lookup). On change ≥4 chars, calls `clubs.lookup`. (`join/page.tsx:265-297`)
- `[x]` **AUTH-UI-STEP3A-BACK-001**: Button: "Back" — handler: returns to step 2.
- `[x]` **AUTH-UI-STEP3A-JOIN-001**: Button: "Join {clubName}" / "Join the club" (`join/page.tsx:595-604`) — disabled when `!joinReady || joiningClub` — handler: `handleJoinSubmit` calls `clubs.join`.
- `[x]` **AUTH-UI-STEP3A-ALREADY-MEMBER-001**: When `clubs.join` returns `{ alreadyMember: true }`, Step 3a SHALL render an in-flow informational banner ("You're already in {clubName}.") with a link "Open it →" that navigates to `/clubs/{id}`. The Join button SHALL be disabled while the banner is visible, and editing the code SHALL clear the banner. The system SHALL NOT advance to Step 4 in this case. (`src/app/join/page.tsx`, `src/app/join/_step3-join.tsx`)

## Step 3b Buttons (Create Branch)

- `[x]` **AUTH-UI-STEP3B-NAME-001**: Club name input (required, min 3 chars). (`join/page.tsx:616-624`)
- `[x]` **AUTH-UI-STEP3B-CODE-001**: Club code input, defaulted from auto-derived `derivedCode` (alphanumeric, uppercase, max 10). User can override; uppercased on input. (`join/page.tsx:631-638`)
- `[x]` **AUTH-UI-STEP3B-CADENCE-001**: Voting cadence radio buttons — implemented; the divergence note below documents what older spec text omitted. Three options labeled "Monthly" / "Six Weeks" / "Flexible" (values: `monthly`, `six_weeks`, `flexible`). (`join/page.tsx:646-666`) The chosen cadence is appended to the club description on create as "Voting cadence: {cadence}". The cadence is **not** stored as a structured field on Club today.
  - `[x]` **AUTH-UI-STEP3B-CADENCE-DATA-001**: Voting cadence persists as a typed `VotingCadence` enum column (`monthly | six_weeks | flexible`, default `monthly`) on the `clubs.voting_cadence` field. `clubs.create` and `clubs.update` accept a `cadence` argument and persist directly. The previous "embed in description" hack is removed from `src/app/join/page.tsx` and `src/components/club/club-switcher-modal.tsx`. (`prisma/schema.prisma` `VotingCadence`, `Club.votingCadence`; `src/server/routers/clubs.ts` `create`/`update`)
- `[x]` **AUTH-UI-STEP3B-BACK-001**: Button: "Back" — handler: returns to step 2.
- `[x]` **AUTH-UI-STEP3B-CREATE-001**: Button: "Create club" (`join/page.tsx:685-694`) — disabled when `!createReady || creatingClub` — handler: `handleCreateSubmit` validates code via `clubs.lookup` then calls `clubs.create`.

## Step 4 Buttons (Success)

- `[x]` **AUTH-UI-STEP4-WELCOME-001**: For join branch, the system SHALL display "Welcome to {clubName}!" with a 64×64 success check icon (role="img", aria-label="Success"). Auto-redirects to `/clubs/{id}` after 1500ms. (`join/page.tsx:700-734`)
- `[x]` **AUTH-UI-STEP4-COPY-001**: For create branch, the system SHALL display the invite code prominently with a Button: "Copy" that calls `navigator.clipboard.writeText(successClubCode)`. (`join/page.tsx:723-730`)

## User Identity

- `[x]` **AUTH-DATA-001**: User identity stored as email (unique, lowercase-normalized) and `display_name`.
- `[x]` **AUTH-DATA-002**: Email uniqueness is case-insensitive ("Evan@Example.com" and "evan@example.com" resolve to the same user).
- `[x]` **AUTH-API-001**: `auth.enter` SHALL create a new user if email does not exist, or return the existing user if it does.
- `[x]` **AUTH-API-002**: When an existing user calls `auth.enter` with a different display name, the system SHALL update the display name.
- `[x]` **AUTH-API-SIGNIN-001**: `auth.signIn({ email })` SHALL look up the user by normalized email. If the user exists, it creates a session and returns `{ user, sessionId }`. If not, it throws NOT_FOUND. Unlike `auth.enter`, it MUST NOT create a new user record. (`src/server/routers/auth.ts:8-43`)

## Sessions

- `[x]` **AUTH-BE-SESSION-001**: The system SHALL create a server-side session and set a `session_id` cookie with 30-day max-age. (`join/page.tsx:224`, `auth.ts`)
- `[x]` **AUTH-BE-001**: The session cookie is now emitted server-side via `Set-Cookie` from `auth.signIn`, `auth.enter`, and the unauthenticated `clubs.join` path with `HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` and `Secure` appended in production. The client-side `document.cookie` writes in `src/app/join/page.tsx` and `src/app/login/page.tsx` are removed; the helper `sessionSetCookieHeader` in `src/lib/auth/session.ts` is the single source of truth for the cookie format. The clearing cookie in `auth.logout` mirrors the same attributes.
- `[x]` **AUTH-BE-002**: Sliding expiration runs on every authenticated request: the route handler at `src/app/api/trpc/[trpc]/route.ts` and the RSC server caller at `src/trpc/server.ts` both refresh `Session.expiresAt` via `db.session.update({ expiresAt: computeNewExpiry() })` when a valid session is loaded. The HTTP path additionally emits a fresh `Set-Cookie` so the browser's `Max-Age` rolls forward; the RSC path lets the next tRPC HTTP call refresh the cookie because `Set-Cookie` from RSC trees isn't supported by Next.js. The previously-dead `src/server/context.ts` remains as an unused helper — it will be removed in a future clean-up.
- `[x]` **AUTH-API-003**: `auth.logout` SHALL destroy the server-side session and clear the cookie. Both halves are implemented in the same `auth.logout` mutation: server-side row delete + clearing `Set-Cookie` (`src/server/routers/auth.ts:113-124`). AUTH-API-LOGOUT-001/002 below cover the response-header form.
- `[x]` **AUTH-API-004**: When a request includes a valid session cookie, `auth.me` SHALL return the user's data and club list without re-authentication.
- `[x]` **AUTH-API-005**: When a request includes an invalid or expired session cookie, `auth.me` SHALL throw an unauthorized error.

## Sign Out

- `[x]` **AUTH-UI-LOGOUT-001**: The club sidebar (`src/app/clubs/[clubId]/sidebar.tsx`) SHALL render a "Sign out" button in the user footer. Clicking it calls `auth.logout`, clears the `session_id` cookie client-side, and `router.push("/")`.
- `[x]` **AUTH-UI-LOGOUT-INVALIDATE-001**: After `auth.logout` resolves, the sidebar SHALL call `utils.invalidate()` so the React Query cache drops every cached query. Without this, other open tabs (or the same tab if the user navigates back via cached data) would render stale signed-in state until each query independently re-fetched. (`src/app/clubs/[clubId]/sidebar.tsx`)
- `[x]` **AUTH-UI-LOGOUT-003**: After sign-out, navigating back to a protected route (e.g. `/clubs/{clubId}`) SHALL bounce the now-unauthenticated viewer to `/login` — the club layout's seed fetch throws UNAUTHORIZED and the layout server-side `redirect()`s rather than rendering the `club-error` view. (Redirect behavior owned by `CLUB-UI-ACCESS-GUARD-001` in `club-specs.md`.)
- `[x]` **AUTH-API-LOGOUT-001**: `auth.logout` SHALL emit a `Set-Cookie: session_id=; Path=/; Max-Age=0` response header so the browser drops the cookie even if the client-side clear is skipped (defense in depth: both server and client clear).
- `[x]` **AUTH-API-LOGOUT-002**: `auth.logout` called without a valid session SHALL return `{ success: true }` (idempotent) rather than throwing — the procedure becomes a `publicProcedure` so a stale or missing cookie still completes sign-out.

## No Third-Party Auth

- `[x]` **AUTH-BE-003**: The system SHALL NOT require any OAuth provider, third-party authentication service, or password.

## Pilot Passcode Gate

- `[x]` **AUTH-API-PASSCODE-001**: Every entry point that creates a `User` or `Session` for an unauthenticated caller (`auth.signIn`, `auth.enter`, the unauthenticated branch of `clubs.join`) SHALL require a `passcode` input and SHALL throw `UNAUTHORIZED` with message "Wrong passcode" before any mutation when `process.env.PILOT_PASSCODE` is set and the input does not constant-time match. The gate is implemented as `passcodeOk` in `src/lib/auth/passcode.ts`.
- `[x]` **AUTH-API-PASSCODE-002**: When `PILOT_PASSCODE` is unset, `passcodeOk` SHALL accept any input in development/test (`NODE_ENV !== "production"`) and SHALL reject every input in production (`NODE_ENV === "production"`). This makes a forgotten production env var fail closed (no one can log in) instead of fail open (anyone can log in). (`src/lib/auth/passcode.ts`)

## Rate Limiting

- `[x]` **AUTH-API-RATELIMIT-001**: `auth.signIn` and `auth.enter` SHALL throttle to 5 attempts per minute per source IP AND 5 per minute per normalized email. `clubs.join` SHALL throttle to 10 per minute per source IP (unauthenticated branch only). On exceed, SHALL throw TOO_MANY_REQUESTS. State is in-process memory — acceptable for pilot scale, resets on cold-start. (`auth.ts`, `clubs.ts`, `src/lib/auth/rate-limit.ts`)

## Deferred

- `[D]` **AUTH-BE-004**: Magic-link email verification.
- `[D]` **AUTH-API-006**: Rate limiting on `auth.enter` (max 3 per email per hour).
- `[D]` **AUTH-DATA-003**: Account deletion with cascading removal of memberships, votes, comments.
