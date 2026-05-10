# Landing Page & Join Flow Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**:
- UI: `src/app/page.tsx` (landing), `src/app/join/page.tsx` (join flow), `src/app/layout.tsx` (skip nav)
- Tests: `tests/e2e/landing-page.spec.ts`, `tests/e2e/attention-banner.spec.ts`, `tests/e2e/join-club.spec.ts`, `tests/e2e/login.spec.ts`, `tests/integration/join-flow.test.ts`, `tests/unit/join-flow.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Landing Page State

State: top nav — buttons shown: logo home link, "Log in", "Sign up" — transitions: → /login (Log in), → /join (Sign up)
State: hero — buttons shown: "Sign up" (primary), "Log in" (secondary) — transitions: → /join (Sign up), → /login (Log in)
State: feature row — display only (no buttons)
State: footer — display only (logo + tagline; Privacy/Terms/Changelog deferred — see `HOME-UI-013`)

## Join Page State

(See auth-specs.md for full state breakdown across step 1 / 2 / 3a / 3b / 4.)

## Landing Page — Navigation

- `[x]` **HOME-UI-001**: Top nav SHALL contain: logo, "BookClub Hub" wordmark, "Log in" ghost-style link → `/login`, "Sign up" primary button → `/join`. ("Pricing" and "About" links removed — see `HOME-UI-012`.) (`page.tsx:19-40`)
- `[x]` **HOME-UI-005**: "Sign up" links/buttons SHALL navigate to `/join`. (`page.tsx:33-40, 71-79`)
- `[x]` **HOME-UI-006**: "Log in" link SHALL navigate to `/login`. (`page.tsx:27-32`)

## Landing Page — Hero

- `[x]` **HOME-UI-002**: Two-column hero with text/CTA on left and decorative collage on right (collage `aria-hidden="true"`). (`page.tsx:49-181`)
- `[x]` **HOME-UI-003**: Below the `lg` breakpoint, the collage column SHALL be hidden (`hidden lg:block` on `page.tsx:103`).
- `[x]` **HOME-UI-004**: Hero h1 SHALL use display font at 72px, letter-spacing -0.03em, line-height 1.0, with "finally" rendered in italic primary color. (`page.tsx:61-68`)
- `[x]` **HOME-UI-009**: Main element SHALL apply a paper radial-gradient background using oklch colors. (`page.tsx:12-17`)
- `[x]` **HOME-UI-010**: Hero SHALL render a social-proof row with AvatarStack and "2,400+ readers · 340 active clubs". (`page.tsx:93-99`)
- `[x]` **HOME-UI-011**: Hero eyebrow pill SHALL contain a dot + "Spoiler-safe by default" with accent-soft background and accent-ink text. (`page.tsx:55-59`)
- `[x]` **HOME-UI-CTA-PRIMARY-001**: Hero CTA: "Sign up" with right chevron icon, primary variant, links to `/join`. Identified by `data-testid="hero-signup"`. (`page.tsx:71-79`)
- `[x]` **HOME-UI-CTA-SECONDARY-001**: Hero CTA: "Log in", secondary border variant, links to `/login`. Identified by `data-testid="hero-login"`. (`page.tsx:80-86`)

## Landing Page — Privacy Callout

- `[x]` **HOME-UI-PRIVACY-CALLOUT-001**: A full-width "promises" section (`data-testid="privacy-banner"`, `aria-label="Privacy guarantees"`) SHALL render between the hero and the feature row. It SHALL include a centered eyebrow ("Our promises") flanked by short horizontal rules, a display-font headline with an italicized primary-colored emphasis word, a muted subhead, and a three-up grid of promise cards. Each card SHALL render an icon well (primary-soft background, primary-ink icon) plus a display-font title and a one-line body. The three claims SHALL communicate, in this order: (a) no personal data ("No personal data"), (b) only email and display name are required ("Just email and display name"), (c) no ads, ever ("No ads, ever"). Cards SHALL use the same FeatureCard visual rhythm as the row below (radius, icon well, typography) but at smaller scale. (`page.tsx`)

## Landing Page — Features & Footer

- `[x]` **HOME-UI-007**: Three-column feature row with cards "Approval voting" / "Meeting scheduling" / "Spoiler-safe threads", each with a 40×40 icon container and a 19px display-font title. (`page.tsx:184-199, 214-234`)
- `[x]` **HOME-UI-008**: Footer SHALL contain logo, wordmark, and tagline "For people who finish the book." (Privacy/Terms/Changelog links removed — see `HOME-UI-013`.) (`page.tsx:201-208`)

## Join Page — Layout

- `[x]` **JOIN-UI-001**: Header SHALL contain logo and "BookClub Hub" wordmark.
- `[x]` **JOIN-UI-002**: Card SHALL constrain content to maxWidth 440px with padding 32px.

## Join Page — Stepper

- `[x]` **JOIN-UI-003**: 3-dot stepper renders with step 1 active by default, connected by lines. (`join/page.tsx:45-64`)
- `[x]` **JOIN-UI-004**: Active step dot: 24×24 circle with primary border + primary step number.
- `[x]` **JOIN-UI-005**: Done step dot: 24×24 filled primary circle with white check icon.
- `[x]` **JOIN-UI-006**: Inactive step dot: 24×24 circle with line-strong border + ink-3 step number.

## Join Page — Step 1: Identity

- `[x]` **JOIN-UI-IDENTITY-EMAIL-001**: Email input (type=email, required).
- `[x]` **JOIN-UI-IDENTITY-NAME-001**: Display name input (required).
- `[x]` **JOIN-UI-IDENTITY-CONTINUE-001**: Button: "Continue" — disabled when `!identityValid || signingIn`.

(See auth-specs.md for handler details.)

## Join Page — Step 2: Path Choice

- `[x]` **JOIN-UI-PATH-JOIN-001**: PathCard "Join an existing club".
- `[x]` **JOIN-UI-PATH-CREATE-001**: PathCard "Create a new club".
- `[x]` **JOIN-UI-PATH-BACK-001**: Button: "Back" returns to step 1.

## Join Page — Step 3a: Join Branch

- `[x]` **JOIN-UI-007**: Club code input SHALL use monospace font, letter-spacing 0.08em, uppercase transform, and right padding for the lookup spinner.
- `[x]` **JOIN-UI-008**: While `clubs.lookup` is in-flight, an inline 16×16 spinner SHALL render inside the input.
- `[x]` **JOIN-UI-009**: On valid lookup, a "club found" panel SHALL render with primary-soft background, primary icon, club name, member count, and check icon.
- `[x]` **JOIN-UI-010**: On lookup failure or no match, an error box SHALL render with danger-soft background, danger text, borderRadius 10px, role="alert", aria-live="assertive".
- `[x]` **JOIN-UI-011**: Button: "Continue" / "Join {clubName}" SHALL be disabled until a valid club is found.

## Join Page — Step 2/3a: Identity-After-Code Variant

- `[x]` **JOIN-UI-012**: When the user clicks "Continue" on Step 1 with a valid club found (legacy variant), the flow advanced to a profile step. **Today the flow is identity-first then code, so this transition is via Step 1 → Step 2 → Step 3a.** Mark as alignment note rather than gap.
- `[x]` **JOIN-UI-013**: Step 3a SHALL display Buttons: "Back" (ghost) and "Join the club" (primary).
- `[x]` **JOIN-UI-014**: Both halves now satisfied via the sub-ID below.
  - `[x]` **JOIN-UI-JOINING-LABEL-001**: The Step-3a join Button SHALL render the label "Joining…" while `joiningClub` is true AND SHALL set `aria-busy={joiningClub}` so assistive tech announces the busy state. (`src/app/join/page.tsx`)

## Join Page — Step 3b: Create Branch

- `[x]` **JOIN-UI-CREATE-NAME-001**: Club name input (required, min 3 chars).
- `[x]` **JOIN-UI-CREATE-CODE-001**: Auto-derived invite code input (uppercase, alphanumeric, max 10 chars; user can override).
- `[x]` **JOIN-UI-CREATE-CADENCE-001**: Voting cadence radio buttons (monthly / six_weeks / flexible) on the create branch SHALL pass the chosen value as a typed `cadence` argument to `clubs.create` (and the in-place switcher modal does the same). Persistence is via the typed `Club.votingCadence` enum column — see `auth-specs.md` `AUTH-UI-STEP3B-CADENCE-DATA-001` for the data-layer detail. (`src/app/join/page.tsx`, `src/components/club/club-switcher-modal.tsx`)
- `[x]` **JOIN-UI-CREATE-BACK-001**: Button: "Back" returns to step 2.
- `[x]` **JOIN-UI-CREATE-SUBMIT-001**: Button: "Create club" — disabled when `!createReady || creatingClub`.

## Join Page — Step 4: Success

- `[x]` **JOIN-UI-015**: On successful join, the system SHALL render a 64×64 success check circle (role="img", aria-label="Success"), "Welcome to {clubName}!" heading, and "Redirecting you now…" body. Auto-redirect after 1500ms.
- `[x]` **JOIN-UI-COPY-001**: For the create branch, the invite code is rendered prominently with a "Copy" Button that calls `navigator.clipboard.writeText`.

## Join Page — Accessibility

- `[x]` **JOIN-UI-016**: All `label` elements SHALL have `htmlFor` attributes matching the `id` of their input.
- `[x]` **JOIN-UI-017**: All error messages SHALL have `role="alert"` and `aria-live="assertive"`.

## Accessibility (App-wide)

- `[x]` **HOME-A11Y-001**: The root layout SHALL render a "Skip to content" link as the first focusable element pointing to `#main-content`, visible only on keyboard focus. (`layout.tsx:30-33`)
- `[x]` **HOME-A11Y-002**: The landing page main element SHALL have `id="main-content"`. (`page.tsx:17`)
- `[x]` **HOME-A11Y-003**: The join page main element SHALL have `id="main-content"`. (`join/page.tsx:431`)
- `[x]` **HOME-A11Y-004**: The decorative hero collage SHALL have `aria-hidden="true"`. (`page.tsx:103`)

## Deferred

- `[D]` **HOME-UI-012**: "Pricing" and "About" pages with real content. **Links hidden from nav today** — restore once content pages exist.
- `[D]` **HOME-UI-013**: Footer "Privacy", "Terms", and "Changelog" pages with real content. **Links hidden from footer today** — restore once content pages exist.
- `[D]` **HOME-UI-014**: Legal disclaimer ("By continuing you agree to our Terms and Privacy Policy") on /join Step 1. **Hidden today** — restore once Terms and Privacy Policy pages exist.
- `[x]` **JOIN-UI-018**: A "Sign in" returning-user flow that skips the code/identity steps. **Now covered by two complementary mechanisms**: (1) the dedicated `/login` route — see `AUTH-UI-LOGIN-001..003` in `auth-specs.md` — and (2) smart detection on `/join` — see `AUTH-UI-004`. A user with a valid session who lands on `/clubs` directly is also routed correctly by `getServerCaller`.
