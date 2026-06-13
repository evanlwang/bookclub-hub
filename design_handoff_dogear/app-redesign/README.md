# Handoff: Dogear Cozy Redesign

A full visual + interaction redesign of Dogear (book club coordination app): same features and flows, completely new skin and feel. Direction: **cozy, human, tactile** — warm paper, one confident terracotta, chunky friendly type, and a physical book/library metaphor carried through every surface.

## About the design files

The files in this bundle are **design references created in HTML/React** — interactive prototypes showing intended look and behavior, not production code to copy. The task is to **recreate these designs in the Dogear codebase** (Next.js 15, Tailwind v4, tRPC) using its established patterns.

**Important framing from the design owner:** existing *features and flows* are the fixed points; the existing *implementation* is not. Do not contort the redesign to fit current component APIs, the desktop sidebar, or centered-dialog patterns. Where the redesign diverges (see § Intentional divergences), the redesign wins. The repo's `docs/llds/*` remain valuable as feature/state inventories and for the open gaps this redesign deliberately closes (reduced-motion, warning-ink token, button hover asymmetry).

## Fidelity

**High-fidelity.** Colors, type, spacing, radii, shadows, copy, and motion in the prototype are intentional and should be matched closely. The prototype is mobile (390px); desktop adaptation guidance is in § Responsive.

## Files in this bundle

| File | Contents |
|---|---|
| `Dogear Redesign.html` | Entry point — open in a browser (needs the sibling files + network for fonts/covers) |
| `dogear.css` | **The design system**: tokens, button/badge/chip/input/bar recipes, keyframes |
| `tokens.css` | Drop-in `@theme` value swap for `src/app/globals.css`, annotated |
| `dogear-components.jsx` | Primitives: Button, Badge, Avatar, AvatarStack, BookCover, ChapterChip, ProgressBar, DgEarGlyph |
| `dogear-app.jsx` | App shell: bottom tab bar, toast, screen routing |
| `dogear-dashboard.jsx` | Reading nook: club switcher, attention banner, bookmark hero, preview cards |
| `dogear-progress.jsx` | Progress dashboard + **the bookmark-slider update sheet + dog-ear save** |
| `dogear-voting.jsx` | All three vote phases: slips, dog-ear picking, decided/shelf moment |
| `dogear-notes.jsx` | Discussions: spoiler filter, margin-note cards, thread detail, compose w/ mismatch detection |
| `dogear-meetings.jsx` | Meetings: list, RSVP postcard respond view, admin heatmap |
| `dogear-join.jsx` | Landing, login, 4-step join wizard, **stamped library card moment** |
| `dogear-data.js` | Mock content (carry this real-feeling copy style into seeds/fixtures) |

Ignore `ios-frame.jsx` and `tweaks-panel.jsx` (presentation scaffolding) and the Tweaks panel itself — it is a design-review tool, not a product feature.

## Design language

### Color (full values in `tokens.css`)

- **Paper, not screen.** Page `#F7F0E2`, cards `#FFFBF1`, sunken wells `#EADFC9`. No pure white anywhere. Ink is warm brown-black `#3D2F24`, never gray.
- **Terracotta `#C75B39` is the one confident accent** — primary CTAs, headlines, active states, key stats, the user's own bookmark. Replaces teal everywhere.
- **Amber `#DD9A33` is celebration** — finished states, "Now Reading" reveal, pinned threads, gold checks. Never use it for primary actions.
- Semantics re-derived warm: olive success, amber warning, brick danger. **No cool tones anywhere.**

### Typography

| Role | Font | Usage |
|---|---|---|
| Display / UI | **Nunito** 800–900, letter-spacing −0.022em | Headlines, buttons, labels, names, stats. Chunky and confident at large sizes |
| Prose | **Newsreader** (incl. italic) | Discussion bodies, pitches, descriptive/empty-state lines. Italic serif = the app's "human voice" |
| Mono | **Courier Prime** | Club codes, stamps ("FINISHED MAR 2026", "PAST", date stamps), catalog moments only |

Pattern used everywhere: a Nunito headline with a one-line italic Newsreader subtitle under it.

### Shape & depth

- Cards 22px radius, inputs 14px, sheets 28px top corners, **buttons full pills**.
- Warm layered shadows (see tokens); primary/accent buttons get a `0 2px 0` darker bottom edge — slightly "pressable."
- Stamps (joined/finished/past/date blocks) are mono type in a 2px border, rotated −7° to −2°, like rubber stamps.

## Component restyle specs

Existing primitives keep their semantic APIs (variants/tones/sizes/statuses); the rendering changes:

- **Button** (5 variants × 3 sizes): pill shape, Nunito 800. Primary = terracotta w/ bottom-edge shadow; accent = amber w/ dark-amber text; secondary = card bg + 2px terracotta-soft inset ring (hover: full terracotta ring); ghost = ink-2 text, sunken hover; danger = brick. New min-heights: sm 36 / md 44 / lg 52 (mobile hit targets ≥44px for md+). Loading spinner unchanged. Use the new `--color-accent-hover`/`--color-danger-hover` tokens (closes the brightness-filter gap).
- **Badge** (6 tones + dot): now uppercase 11px Nunito 800, letter-spacing .04em, pill. Tone→token map unchanged; `warning` uses new `--color-warning-ink`. **New "solid" style** used for the LIVE badge on voting (terracotta bg, cream text) — either a 7th tone or a `solid` boolean.
- **Card**: bg-soft surface, 22px radius, `--shadow-md`, 1px warm border at 5% ink.
- **Avatar / AvatarStack**: same geometry; palette switches to the five warm chip tokens (closes the literal-palette gap). Stack overlap −30%, 2px card-color ring.
- **BookCover**: keep both render paths. Re-derive the six cloth variants warm (rust, olive, terracotta, bronze, clay, sienna — kill the teal variant); cream title band, italic serif author at foot, spine ridge. Component-private values remain the documented exception.
- **ChapterChip**: rotation logic unchanged; five warm chip tokens; mono 11px; "CH. N" uppercase.
- **ProgressBar**: status colors → reading = terracotta, finished = amber, not_started = ink-4; track = bg-sunken. Fill transition 700ms `cubic-bezier(.22,1,.36,1)`. Keep `animate`/`delay` stagger API (60ms × row used on Progress).
- **Toast**: dark ink bg, paper text, amber Undo action, 16px radius, springy pop-in, bottom-anchored above the tab bar, 4s auto-dismiss.
- **Inputs**: 2px line-strong border, 14px radius, bg-soft fill, Nunito 700 text; focus = terracotta border + 4px primary-soft halo. Code inputs: mono, uppercase, letter-spaced, centered.
- **DateTimePicker**: restyle per tokens; quarter-hour times and calendar popover behavior unchanged.

## New components (build these)

| Component | What it is | Reference |
|---|---|---|
| **BottomTabBar** | Mobile nav: 5 tabs (Nook, Voting, Meetings, Notes, Progress), outline icons, LIVE pill on Voting, unread count on Notes | `dogear-app.jsx` |
| **BottomSheet** | Replaces centered dialogs on mobile: 28px top radius, drag handle, scrim `rgba(61,47,36,.42)`, 320ms slide-up | `dogear-progress.jsx` UpdateSheet |
| **DogEarCorner** | The save reward: a 34px corner fold animating onto a card (scale 0 → 1.25 → 1 w/ spring, 500ms) | `dogear-progress.jsx` |
| **BookmarkSlider** | Page-edge slider: faux page w/ text lines + striped page-edge track; draggable terracotta ribbon w/ tail; bidirectionally synced with page number input | `dogear-progress.jsx` |
| **BookmarkEdge** | Dashboard hero: horizontal page-edge bar, median fill, one tappable bookmark per member at their depth; tap → ink tooltip "name · ch. N" | `dogear-dashboard.jsx` |
| **RecommendationSlip** | Nomination card: cover + title + pitch on a slightly rotated paper slip + nominator byline; in voting phase, tap dog-ears a 44px corner (SlipFold) | `dogear-voting.jsx` |
| **EarGlyph picks indicator** | "2/3 dog-eared" — N tiny folded-corner squares filling up | `dogear-components.jsx` |
| **DateStamp** | THU/18/JUN block, 2px terracotta border, −2° rotation; muted variant for past | `dogear-meetings.jsx` |
| **RubberStamp** | Mono text in rotated bordered box: "FINISHED MAR 2026", "PAST", "JOINED JUN 10 2026" (stamp-press entrance on the library card) | several files |
| **RSVPSlotControl** | Three-state postcard checkboxes (Available ✓ olive / Maybe ? amber / Can't ✗ brick), dashed-border idle state | `dogear-meetings.jsx` |
| **AvailabilityHeatmap** | Admin grid: member rows × slot columns, soft semantic cells w/ ✓?✗ marks, "Most ✓" badge | `dogear-meetings.jsx` |
| **LibraryCard** | Join success: card slides out of an amber pocket (clip-path chevron), stamp presses on after 550ms | `dogear-join.jsx` |
| **SpoilerFilterBar** | "You're on chapter N" + "{N} notes waiting past your bookmark" + show-all toggle | `dogear-notes.jsx` |

## Motion contract (new)

| Interaction | Duration | Easing |
|---|---|---|
| Hover/state color changes | 150ms | ease |
| Button press | scale .96, 180ms | spring `cubic-bezier(.34,1.56,.64,1)` |
| Dog-ear fold (save, vote pick) | 320–500ms | spring |
| Bottom sheet in / scrim | 320ms / 200ms | `cubic-bezier(.22,1,.36,1)` / ease |
| Toast / tooltip pop | 180–300ms | spring |
| Stamp press | 450ms (after 550ms delay on library card) | ease-out, scale 2.2→0.94→1 at −7° |
| Library card slide-from-pocket | 600ms | `cubic-bezier(.22,1,.36,1)` |
| Progress fills (bar, ring, distribution) | 700–900ms | `cubic-bezier(.22,1,.36,1)` |
| Member list bars | stagger 60ms × index | — |

**Honor `prefers-reduced-motion`** with the global suppression rule — this closes the repo's open `DSYS-MOTION-002` gap. The prototype also exposes a motion-intensity switch; only reduced-motion handling ships.

## Surfaces (states covered in the prototype)

1. **Reading nook (dashboard)** — club switcher w/ unread dots + admin entries, dashed club-code chip w/ 1.5s copy confirmation, attention banner (amber tint, per-item CTAs), Currently Reading hero (cover, 3 stats, BookmarkEdge), Active Vote / Next Meeting / Margin Notes preview cards.
2. **Voting** — all 3 phases (prototype Tweaks → "Vote phase"): nominating (slips, nominate sheet w/ search + pitch + manual fallback, admin advance/cancel w/ ≥2 helper), voting (dog-ear picking max 3, sealed-tally copy, turnout, submit → ✓ saved → save changes, prior-picks hint), decided (shelf moment w/ amber gradient + ink shelf, ranked tallies w/ vote bars, admin new round).
3. **Progress** — summary card (animated ring, segmented distribution, human summary line), "Where everyone is" (staggered bars, Done/Reading/Waiting badges, gold finisher checks, timestamps), history shelf (Current badge, FINISHED stamps), update sheet (3 status radio cards, BookmarkSlider ⇄ page input, chapter input w/ "sets what discussions you see" note, live preview) → **dog-ear + undoable toast on save. This is the most satisfying animation in the app.**
4. **Notes** — spoiler filter (auto-init from recorded chapter), margin-note cards (±0.6° rotation, chip, excerpt, reply pill), pinned = amber tint, sort toggle, thread detail (serif prose, one-level nesting w/ accent left border, sticky composer w/ "be kind to readers behind you"), compose w/ live chapter-mention mismatch detection ("Resolve spoiler warning" disabled state).
5. **Meetings** — filter chips w/ counts, proposed rows (response progress amber→green), confirmed rows (DateStamp, attendee stack), past rows (muted + PAST stamp), RSVP respond view (per-slot tallies, save → ✓ Saved, "Still waiting on…"), admin heatmap + recommend banner + confirm.
6. **Entry** (prototype Tweaks → Surface "entry") — landing (wordmark = dog-eared square, two CTAs, why-Dogear card w/ folded corner, features, privacy promises, "FOR PEOPLE WHO FINISH THE BOOK" footer), login (email + passcode), join wizard (identity celebrating no-password, path choice, join branch w/ debounced lookup + librarian-found preview + error state, create branch w/ derived code + availability + cadence radio cards, **library card success** w/ pocket + stamp + copy-code, auto-advance).

Admin-only UI (advance/close/cancel round, heatmap/confirm, Members/Settings) is toggled via the prototype's "Admin view" tweak.

## Intentional divergences from the current implementation

1. **Mobile nav is a bottom tab bar**, not a hamburger/sidebar. Desktop keeps a (restyled) sidebar.
2. **Mobile modals are bottom sheets**, not centered dialogs (update progress, nominate, compose).
3. **Buttons are pills** with new size heights (36/44/52); radius tokens get rounder across the board.
4. **Font roles change**: Newsreader moves from display to prose (`--font-serif`, new token); Nunito takes display + UI (Geist retired); Courier Prime for mono warmth.
5. **Member progress on the dashboard hero** renders as bookmarks at depth (BookmarkEdge), replacing the avatar-tick overlay (`DASH-UI-HERO-TICKS-001`).
6. **LIVE badge** needs a solid badge style that doesn't exist today.
7. **Springy motion** (150–320ms) joins the 150ms-ease family; reduced-motion support added globally.
8. BookCover cloth variants re-derived warm; Avatar palette consolidates onto chip tokens.

## State management notes

No new data requirements — every screen renders existing tRPC-served state. New client-only state: bottom-sheet open/close, dog-ear/toast triggers with 4s undo window (keep the pre-save snapshot client-side), spoiler-filter show-all override, RSVP selections before save.

## Accessibility

- Hit targets ≥44px on mobile (tab bar buttons, RSVP controls, status cards all comply in the prototype).
- Global `:focus-visible` ring moves to terracotta.
- BookmarkEdge bookmarks are real buttons with `aria-label="{name}, {pct}%"`; the slider should gain keyboard arrows + `role="slider"` in production.
- Body text pairs meet AA on cream; verify cream-on-terracotta for primary buttons (passes at 800 weight ≥15px).
- Good moment to close the repo's open `aria-busy` / `progressbar` role gaps while touching these components.

## Native-feel PWA checklist (no stack change required)

The design targets an installable, native-feeling mobile web app. The existing stack (Next.js App Router, Tailwind 4) handles all of it; add:

1. **Web app manifest** — `name: "Dogear"`, `display: "standalone"`, `background_color: #F7F0E2`, `theme_color: #F7F0E2`, maskable icons (the dog-eared-square wordmark from `dogear-join.jsx` is the icon source). Plus `<meta name="theme-color" content="#F7F0E2">` so browser chrome blends into the paper.
2. **Viewport + safe areas** — `viewport-fit=cover` in the viewport meta; pad the bottom tab bar with `env(safe-area-inset-bottom)` (the prototype's 26px bottom padding stands in for this) and top headers with `env(safe-area-inset-top)`. Use `100dvh`, never `100vh`.
3. **Touch behavior** — `-webkit-tap-highlight-color: transparent` globally (prototype already does); `overscroll-behavior-y: contain` on the app shell to kill pull-to-refresh fighting with bottom sheets; `touch-action: none` on the BookmarkSlider drag surface (prototype does); `user-select: none` on tab bar and controls.
4. **Fixed shell, scrolling content** — tab bar and sheets are layout siblings of one scroll container (see `dogear-app.jsx`); don't let the body scroll. `position: fixed` bottom bar on iOS standalone.
5. **Service worker** (Serwist or next-pwa) — precache the app shell + fonts so cold launch from the home screen paints paper, not white. Data stays online-only (tRPC); a cream offline page with the wordmark is enough.
6. **iOS standalone niceties** — `apple-mobile-web-app-status-bar-style: default` on the cream theme; 180px apple-touch-icon; test bottom-sheet drag vs. Safari's bottom bar in standalone mode.
7. **No SSR flash** — fonts via `next/font` (Nunito, Newsreader, Courier Prime) with `display: swap` and preload to avoid layout pop on the chunky headlines.

## Assets

- **Fonts** (Google Fonts): Nunito 600–900, Newsreader (+italics), Courier Prime 400/700.
- **Covers**: Open Library (`covers.openlibrary.org/b/isbn/{isbn}-{S|M|L}.jpg`) with clothbound fallback — already the app's pattern.
- **Icons**: 2px-stroke outline set drawn inline in the prototype (book, check-circle, calendar, speech bubble, bookmark). Any consistent 2px rounded outline set works; filled bookmark = active tab.
- No raster assets required.
