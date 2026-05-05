# Landing Page & Join Flow Specs

**LLD**: docs/llds/auth-and-accounts.md
**Implementing artifacts**: src/app/page.tsx, src/app/join/page.tsx, src/app/layout.tsx

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Landing Page — Navigation

- `[x]` **HOME-UI-001**: When the landing page loads, the system SHALL render a top navigation bar containing the logo, "BookClub Hub" wordmark, "Pricing" and "About" nav links, a "Sign in" ghost button, and a "Join a club" primary button.
- `[x]` **HOME-UI-005**: When a user clicks "Join a club" in the top nav or hero CTA, the system SHALL navigate to /join.
- `[x]` **HOME-UI-006**: When a user clicks "Sign in" in the top nav, the system SHALL navigate to /join.

## Landing Page — Hero

- `[x]` **HOME-UI-002**: When the landing page loads, the system SHALL render a two-column hero section with headline, body copy, CTA row, and social proof on the left, and a decorative collage (aria-hidden) on the right.
- `[x]` **HOME-UI-003**: When the viewport is narrower than the lg breakpoint, the system SHALL hide the hero collage column and display only the left (text/CTA) column.
- `[x]` **HOME-UI-004**: When the landing page loads, the hero h1 SHALL use the display font at 72px with letter-spacing -0.03em and line-height 1.0, with the word "finally" rendered in italic primary color.
- `[x]` **HOME-UI-009**: When the landing page loads, the main element SHALL apply a paper radial-gradient background using oklch color values.
- `[x]` **HOME-UI-010**: When the landing page loads, the hero section SHALL render a social proof row containing an AvatarStack and the text "2,400+ readers · 340 active clubs".
- `[x]` **HOME-UI-011**: When the landing page loads, the hero eyebrow pill SHALL contain a dot indicator and the text "Spoiler-safe by default" with accent-soft background and accent-ink text color.

## Landing Page — Features & Footer

- `[x]` **HOME-UI-007**: When the landing page loads, the system SHALL render a three-column feature row with cards for "Approval voting", "Meeting scheduling", and "Spoiler-safe threads", each containing a 40×40 icon container and a title in display font at 19px.
- `[x]` **HOME-UI-008**: When the landing page loads, the system SHALL render a footer containing the logo, wordmark, tagline "For people who finish the book.", and "Privacy", "Terms", "Changelog" links.

---

## Join Page — Layout

- `[x]` **JOIN-UI-001**: When the join page loads, the system SHALL render a header containing the logo and "BookClub Hub" wordmark.
- `[x]` **JOIN-UI-002**: When the join page loads, the system SHALL render a Card (maxWidth 440px, padding 32px) containing the join flow.

## Join Page — Stepper

- `[x]` **JOIN-UI-003**: When the join page loads on step 1, the system SHALL render a 3-dot stepper with step 1 active, step 2 inactive, and step 3 inactive, connected by lines.
- `[x]` **JOIN-UI-004**: When a step dot is in the "active" state, the system SHALL render it as a 24×24 circle with a primary-colored border and primary-colored step number.
- `[x]` **JOIN-UI-005**: When a step dot is in the "done" state, the system SHALL render it as a 24×24 filled primary circle with a white check icon.
- `[x]` **JOIN-UI-006**: When a step dot is in the "inactive" state, the system SHALL render it as a 24×24 circle with a line-strong border and ink-3 step number.

## Join Page — Step 1: Club Code

- `[x]` **JOIN-UI-007**: When the join page is on step 1, the system SHALL render the club code input with monospace font, letter-spacing 0.08em, uppercase transform, and right padding for the lookup spinner.
- `[x]` **JOIN-UI-008**: While the club code lookup fetch is in-flight, the system SHALL render a 16×16 inline spinner inside the right side of the code input.
- `[x]` **JOIN-UI-009**: When a valid club code is entered and the lookup succeeds, the system SHALL render a "club found" panel with primary-soft background, a primary icon, club name, member count, and a check icon.
- `[x]` **JOIN-UI-010**: When the club code lookup fails or returns no match, the system SHALL render an error box with danger-soft background, danger text color, borderRadius 10px, and role="alert" aria-live="assertive".
- `[x]` **JOIN-UI-011**: When the club code step has no valid club found, the "Continue" button SHALL be disabled.

## Join Page — Step 2: Profile

- `[x]` **JOIN-UI-012**: When the user clicks "Continue" on step 1 with a valid club found, the system SHALL transition to step 2 showing Email and Display Name fields.
- `[x]` **JOIN-UI-013**: When step 2 renders, the system SHALL display a "Back" ghost button (returning to step 1) and a "Join the club" primary button.
- `[x]` **JOIN-UI-014**: When the join form is submitting, the "Join the club" button SHALL display "Joining…" text and aria-busy="true".

## Join Page — Step 3: Success

- `[x]` **JOIN-UI-015**: When the join succeeds, the system SHALL transition to step 3 showing a 64×64 success check circle (role="img" aria-label="Success"), "Welcome to {clubName}!" heading, and "Redirecting you now…" body text.

## Join Page — Accessibility

- `[x]` **JOIN-UI-016**: All label elements in the join form SHALL have htmlFor attributes matching the id of their associated input elements.
- `[x]` **JOIN-UI-017**: All error messages in the join form SHALL have role="alert" and aria-live="assertive".

---

## Accessibility

- `[x]` **HOME-A11Y-001**: The root layout SHALL render a skip-navigation link as the first focusable element with text "Skip to content" pointing to #main-content, visible only on keyboard focus.
- `[x]` **HOME-A11Y-002**: The main content element on the landing page SHALL have id="main-content".
- `[x]` **HOME-A11Y-003**: The main content element on the join page SHALL have id="main-content".
- `[x]` **HOME-A11Y-004**: The decorative hero collage on the landing page SHALL have aria-hidden="true".

---

## Deferred

- `[D]` **HOME-UI-012**: The "Pricing" and "About" nav links shall navigate to corresponding content pages (placeholder # links for now).
- `[D]` **JOIN-UI-018**: The join page shall support a "Sign in" returning-user flow that skips the code step if the user has a valid session.
