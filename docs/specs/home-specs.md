# Landing Page & Join Flow Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**:
- UI: `src/app/page.tsx` (landing), `src/app/join/page.tsx` (join flow), `src/app/layout.tsx` (skip nav)
- Tests: `tests/e2e/landing-page.spec.ts`, `tests/e2e/attention-banner.spec.ts`, `tests/e2e/join-club.spec.ts`, `tests/e2e/login.spec.ts`, `tests/integration/join-flow.test.ts`, `tests/unit/join-flow.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Landing Page State

The landing (`/`) is an editorial composition built around a library borrower's card — display-only except two links. Top to bottom: masthead → serif hero → asymmetric CTAs → borrower's card → dog-ear annotation → conditions of membership → Ex Libris bookplate.

State: masthead — display + nothing actionable (DogEarMark + "DOGEAR" wordmark left, "EST. 2026" right, hairline rule under)
State: hero — display only (serif headline + subhead)
State: CTAs — buttons shown: "Get your library card" (primary pill), "Log in" (quiet underlined link) — transitions: → /join (primary), → /login (Log in)
State: borrower's card — display only (header + three checkout rows with due-date stamps + dog-ear corner)
State: conditions / bookplate — display only

## Join Page State

(See auth-specs.md for full state breakdown across step 1 / 2 / 3a / 3b / 4.)

## Landing Page — Masthead & Hero

- `[x]` **HOME-UI-015**: The landing SHALL open with a masthead — the `LogoIcon` dog-ear mark (~28px) + "DOGEAR" wordmark (display font, weight 900, uppercase, letter-spacing ~0.16em) on the left, "EST. 2026" (mono) on the right — above a full-width hairline rule. (`page.tsx`)
- `[x]` **HOME-UI-016**: The hero SHALL render a Newsreader serif `h1` (~32px, line-height ~1.2) reading "A small, private library for" followed by an `<em>` "the people you read with." in italic primary color, and a serif subhead constrained to ~32ch ("Choose the next book together…"). (`page.tsx`)
- `[x]` **HOME-UI-005**: The primary CTA SHALL navigate to `/join`. (`page.tsx`)
- `[x]` **HOME-UI-006**: The log-in link SHALL navigate to `/login`. (`page.tsx`)
- `[x]` **HOME-UI-CTA-PRIMARY-001**: The primary CTA SHALL be a full-width terracotta pill reading "Get your library card", linking to `/join`, identified by `data-testid="hero-signup"`. (`page.tsx`)
- `[x]` **HOME-UI-CTA-SECONDARY-001**: Below the primary CTA, a centered "Already a member?" line SHALL render "Log in" as a quiet underlined primary-colored link to `/login`, identified by `data-testid="hero-login"`. (`page.tsx`)

## Landing Page — Borrower's Card

- `[x]` **HOME-UI-CARD-001**: The page SHALL render a borrower's card (rotated ~−1.3°) whose header shows "DOGEAR LENDING LIBRARY" (mono, wide tracking), "Borrower's Card" (display font), and "CAT. 813.54" (mono) on a shared baseline, followed by column heads "THE CLUB CAN —" / "DATE DUE". (`page.tsx`)
- `[x]` **HOME-UI-CARD-002**: The card SHALL list exactly three checkout rows separated by dashed hairlines, each a display-font title + serif-italic gloss: "Choose the next read" (tallies sealed until reveal), "Stay a chapter ahead" (notes tagged by chapter), "Meet without the maybe" (RSVP postcards). (`page.tsx`)
- `[x]` **HOME-UI-CARD-003**: Each checkout row SHALL carry a mono due-date stamp with a 1.5px terracotta border, rotated −5° / +3° / −5° respectively, reading "APR 02" / "APR 16" / "MAY 07". The stamp dates are content (visible text), not decoration. (`page.tsx`)
- `[x]` **HOME-UI-CARD-004**: The card's top-right corner SHALL render a 34px two-triangle dog-ear fold (paper triangle over a terracotta crease). The fold is purely decorative and SHALL be `aria-hidden="true"` (`data-testid="card-dogear"`). (`page.tsx`)
- `[x]` **HOME-UI-ANNOT-001**: Below the card, a serif-italic annotation SHALL explain the dog-ear metaphor and include the phrase "here's where I stopped". (`page.tsx`)

## Landing Page — Conditions & Bookplate

- `[x]` **HOME-UI-TERMS-001**: The page SHALL render a "CONDITIONS OF MEMBERSHIP" mono eyebrow over three ruled rows numbered 01/02/03 (terracotta mono numerals) communicating, in order: (a) only email and a name are asked, (b) no passwords, (c) no ads / no algorithm / no strangers. Identified by `data-testid="privacy-banner"`, `aria-label="Conditions of membership"`. (`page.tsx`)
- `[x]` **HOME-UI-PLATE-001**: The page SHALL end with a bordered Ex Libris bookplate — "· EX LIBRIS ·" (mono eyebrow) over "For people who finish the book." in serif-italic primary color. (`page.tsx`)

## Landing Page — Layout

- `[x]` **HOME-UI-018**: At every width the composition SHALL render in a single centered editorial column (`data-testid="landing-column"`, max-width ~620px) on the flat paper background (`bg-bg`); section order is identical on mobile and desktop. (`page.tsx`)

## Join Page — Layout

- `[x]` **JOIN-UI-001**: Header SHALL contain logo and "Dogear" wordmark.
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
- `[x]` **HOME-A11Y-004**: Purely decorative landing chrome SHALL be hidden from assistive tech — specifically the borrower's-card dog-ear corner fold (`data-testid="card-dogear"`, `aria-hidden="true"`). The due-date stamps are content (visible dates) and are NOT hidden. (`page.tsx`)

## Deferred

- `[D]` **HOME-UI-012**: "Pricing" and "About" pages with real content. **Links hidden from nav today** — restore once content pages exist.
- `[D]` **HOME-UI-013**: Footer "Privacy", "Terms", and "Changelog" pages with real content. **Links hidden from footer today** — restore once content pages exist.
- `[D]` **HOME-UI-014**: Legal disclaimer ("By continuing you agree to our Terms and Privacy Policy") on /join Step 1. **Hidden today** — restore once Terms and Privacy Policy pages exist.
- `[x]` **JOIN-UI-018**: A "Sign in" returning-user flow that skips the code/identity steps. **Now covered by two complementary mechanisms**: (1) the dedicated `/login` route — see `AUTH-UI-LOGIN-001..003` in `auth-specs.md` — and (2) smart detection on `/join` — see `AUTH-UI-004`. A user with a valid session who lands on `/clubs` directly is also routed correctly by `getServerCaller`.
