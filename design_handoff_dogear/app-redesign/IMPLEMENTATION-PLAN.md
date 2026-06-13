# Implementation Plan — suggested order for Claude Code

Work in vertical slices so every phase ends in something visibly cozy. Each phase lists the files to reference and a definition of done.

## Phase 0 — Tokens + fonts (half a day)
- Swap values in `src/app/globals.css` `@theme` using `tokens.css` (names mostly already exist; NEW tokens marked).
- Load Nunito / Newsreader / Courier Prime via `next/font`; retire Geist; add `--font-serif`.
- Add the global `prefers-reduced-motion` suppression rule (closes `DSYS-MOTION-002`).
- **Done when:** the existing app runs with no teal anywhere, paper backgrounds, and Nunito headlines — ugly spacing is fine at this stage.

## Phase 1 — Primitives (1 day)
Restyle per README § Component restyle specs: Button (pills, new heights), Badge (uppercase + new solid LIVE style), Card, Avatar (chip-token palette), BookCover (warm cloth variants), ChapterChip, ProgressBar (new status colors), Toast, inputs.
- **Done when:** the design-system artboard (or a Storybook-style page) matches `dogear-components.jsx` rendering.

## Phase 2 — App shell (1 day)
BottomTabBar (5 tabs, LIVE + unread badges, safe-area padding), mobile BottomSheet primitive, club switcher header, PWA checklist items (manifest, theme-color, dvh, overscroll).
- **Done when:** installable on a phone; navigation feels like an app, not a site.

## Phase 3 — Progress (the hero feature, 1–2 days)
Summary card (ring + distribution), member list w/ staggered bars, history shelf, the update BottomSheet with BookmarkSlider ⇄ page input, DogEarCorner + undoable toast on save.
- Reference: `dogear-progress.jsx`. **The save moment must feel as good as the prototype — this is the soul of the redesign.**

## Phase 4 — Dashboard (1 day)
Attention banner, Currently Reading hero with BookmarkEdge (tappable member bookmarks), three preview cards, empty states.
- Reference: `dogear-dashboard.jsx`.

## Phase 5 — Voting (1–2 days)
RecommendationSlip, SlipFold dog-ear picking + EarGlyph indicator, sealed-tally copy, three-state submit, nominate sheet, decided shelf moment, admin controls.
- Reference: `dogear-voting.jsx`. Test all three phases plus the returning-voter state.

## Phase 6 — Notes + Meetings (2 days)
SpoilerFilterBar, margin-note cards, thread detail, compose w/ mismatch detection; meeting list tabs, RSVPSlotControl respond view, DateStamp/RubberStamp, admin heatmap + confirm.
- References: `dogear-notes.jsx`, `dogear-meetings.jsx`.

## Phase 7 — Entry flow (1 day)
Landing, login, join wizard (lookup states, cadence cards), LibraryCard success with pocket + stamp, auto-redirect.
- Reference: `dogear-join.jsx`.

## Suggested kickoff prompt for Claude Code

> Read `design_handoff_dogear/app-redesign/README.md` in full, then `tokens.css`. This is a visual + interaction redesign of the existing app: keep all features, flows, and data contracts; replace the skin and interaction patterns. The HTML/JSX files in the folder are high-fidelity design references — recreate them with our existing stack and conventions, but where the redesign diverges from current implementation (bottom tab bar, bottom sheets, pill buttons, font roles — see README § Intentional divergences), the redesign wins. Work through IMPLEMENTATION-PLAN.md phase by phase, starting with Phase 0. After each phase, show me the result before continuing.

## Testing notes (Vitest + Playwright)
- Token application tests per the existing pattern (`getComputedStyle` → token resolution) still apply — update expected values.
- New interaction tests worth writing: dog-ear save → toast → undo restores prior progress; spoiler filter hides ch > N and show-all reveals; vote picking caps at max; RSVP save disabled until all slots answered; reduced-motion suppresses the fold/stamp animations.
- Playwright mobile viewport: 390×844, and assert no horizontal overflow per screen.
