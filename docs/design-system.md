# BookClub Hub Design System

**Version:** 1.0  
**Last updated:** 2026-05-05  
**Source:** `docs/bookclub-hub-designs/` (interactive prototypes)

## Design Philosophy

BookClub Hub uses a **warm, literary design system** that reflects the quiet intensity of reading and discussion. The visual language prioritizes clarity, accessibility, and a paper-like texture that feels closer to a book than a typical app.

**Three core principles:**
1. **Warm paper aesthetic** — neutral backgrounds evoke the color of book pages
2. **Literary typographic hierarchy** — serif display faces for headlines, humanist sans for UI
3. **Earned accents** — deep teal (primary) and warm amber (accent) are used intentionally, not decoratively

---

## Color Palette

All colors use **oklch()** notation for perceptual uniformity across monitors.

### Neutrals (Paper + Ink)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `oklch(0.985 0.006 80)` | Page background (warm paper white) |
| `--bg-soft` | `oklch(0.965 0.01 80)` | Card backgrounds, alt rows |
| `--bg-sunken` | `oklch(0.945 0.012 80)` | Inset/secondary surfaces (e.g., tab background) |
| `--ink` | `oklch(0.22 0.012 60)` | Primary text (nearly black, warm) |
| `--ink-2` | `oklch(0.42 0.012 60)` | Secondary text (medium gray) |
| `--ink-3` | `oklch(0.62 0.01 60)` | Tertiary / muted (light gray) |
| `--ink-4` | `oklch(0.78 0.008 60)` | Disabled / very muted |
| `--line` | `oklch(0.91 0.008 70)` | Hairline borders, dividers |
| `--line-strong` | `oklch(0.84 0.01 70)` | Stronger borders (inputs, cards) |

### Primary (Deep Teal)

The anchor color. Used for interactive states, primary actions, and semantic links.

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `oklch(0.42 0.06 195)` | Primary buttons, links, active states |
| `--primary-hover` | `oklch(0.36 0.065 195)` | Hover state (darker) |
| `--primary-soft` | `oklch(0.94 0.025 195)` | Tinted backgrounds (badges, avatar bg) |
| `--primary-ink` | `oklch(0.32 0.06 195)` | Text on `--primary` backgrounds |

### Accent (Warm Amber)

Sparingly used for affirmation, delight, and forward momentum. Appears in CTAs, completion states, and occasional highlights.

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `oklch(0.78 0.13 75)` | Accent buttons, highlights |
| `--accent-soft` | `oklch(0.95 0.04 75)` | Tinted backgrounds |
| `--accent-ink` | `oklch(0.55 0.13 75)` | Text on `--accent` backgrounds |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `oklch(0.62 0.10 155)` | Positive confirmations, completed states |
| `--success-soft` | `oklch(0.94 0.035 155)` | Light tinted success background |
| `--warning` | `oklch(0.72 0.13 70)` | Cautionary states |
| `--warning-soft` | `oklch(0.95 0.04 70)` | Light tinted warning background |
| `--danger` | `oklch(0.55 0.16 25)` | Destructive actions, errors |
| `--danger-soft` | `oklch(0.95 0.04 25)` | Light tinted danger background |

### Chapter Chip Palette (for spoiler tags)

Five rotating colors for chapter-based content filtering. Each chapter tag cycles through these:

| Token | Value | Usage |
|-------|-------|-------|
| `--chip-1` | `oklch(0.92 0.05 75)` / `--chip-1-ink` | Amber chip |
| `--chip-2` | `oklch(0.92 0.05 145)` / `--chip-2-ink` | Sage chip |
| `--chip-3` | `oklch(0.92 0.045 220)` / `--chip-3-ink` | Slate-blue chip |
| `--chip-4` | `oklch(0.92 0.05 320)` / `--chip-4-ink` | Mauve chip |
| `--chip-5` | `oklch(0.92 0.05 30)` / `--chip-5-ink` | Terracotta chip |

---

## Typography

### Font Stack

| Category | Font | Fallback |
|----------|------|----------|
| Display/Headline | Newsreader (serif) | Iowan Old Style, Georgia |
| UI/Body | Geist (sans) | -apple-system, BlinkMacSystemFont, Segoe UI |
| Mono/Code | JetBrains Mono | ui-monospace |

All three fonts are loaded from Google Fonts.

### Type Scale

| Name | Size | Weight | Letter-spacing | Line-height | Usage |
|------|------|--------|---|---|---|
| Display | 56px | 600 | -0.025em | 1.05 | Page titles, hero headlines |
| Headline | 32px | 600 | -0.02em | (serif default) | Section headings |
| Title | 20px | 600 | — | (serif default) | Card titles, component headers |
| Body | 15px | 400 | — | 1.55 | Primary content text |
| Caption | 12px | 400 | — | (default) | Metadata, timestamps, hints |
| Mono | 12px | 400 | — | (default) | Club codes, chapter tags |

### Type Classes

CSS classes available for reuse:

```css
.t-display  /* Serif, bold, tight tracking */
.t-serif    /* Serif font without weight/tracking rules */
.t-mono     /* Monospace font */
```

---

## Spacing & Sizing

### Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small buttons, inline elements |
| `--radius` | 10px | Standard buttons, inputs, tabs |
| `--radius-lg` | 14px | Cards, larger components |
| `--radius-xl` | 20px | Large modals, hero elements |

### Shadows

| Token | Value | Depth |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 0 [..], 0 1px 2px [..]` | Flat/button-like |
| `--shadow` | `0 1px 0 [..], 0 6px 18px [..]` | Standard card elevation |
| `--shadow-lg` | `0 1px 0 [..], 0 18px 36px [..]` | Modal / overlay elevation |

### Gap / Padding Guidelines

No strict grid system; use semantic gaps:
- **Between sections:** 40px
- **Between components in a section:** 16–24px
- **Within components:** 8–14px
- **Card padding:** 16–20px (small), 24–32px (large)

---

## Components

All components are defined in `docs/bookclub-hub-designs/project/primitives.jsx` and available as React primitives.

### Button

**Variants:** `primary`, `secondary`, `accent`, `ghost`, `danger`  
**Sizes:** `sm` (30px), `md` (38px), `lg` (46px)

```jsx
<Button variant="primary" size="md" icon={<I.plus />}>Save</Button>
<Button variant="secondary" size="lg" disabled>Cancel</Button>
```

**Styling notes:**
- Primary buttons have solid teal background + white text
- Secondary buttons inherit page background, strong border, small shadow
- Accent buttons use warm amber
- Ghost buttons are transparent with no border
- All buttons use 150ms ease transitions for hover/active states
- Disabled state reduces opacity to 0.5

### Badge / Status Chip

**Tones:** `neutral`, `primary`, `accent`, `success`, `warning`, `danger`  
**Optional dot indicator:** pass `dot` prop

```jsx
<Badge tone="primary" dot>Nominating</Badge>
<Badge tone="success">Decided</Badge>
```

Used for inline status labels, permission levels, and phase indicators.

### Card

Wrapper component for grouped content.

```jsx
<Card style={{ padding: 20 }}>
  <p>Content goes here</p>
</Card>
```

**Default styling:**
- White background (`--bg`)
- Subtle border (`--line`)
- `--radius-lg` corners
- `--shadow-sm` elevation
- No padding (set via `style` prop)

### Book Cover

Placeholder component for book titles. Comes in 6 color variants.

```jsx
<BookCover 
  title="Sea of Tranquility" 
  author="Mandel" 
  variant="teal"  // teal, rust, sage, mauve, amber, ink
  size="lg"       // sm, md, lg, xl
/>
```

**Sizes:** sm (48×70), md (80×116), lg (132×192), xl (180×260)

### Avatar

User initial circles. Auto-assigned color palette per user.

```jsx
<Avatar name="Marisol Ortega" size="lg" />
```

**Sizes:** `sm` (24px), `md` (32px), `lg` (44px), `xl` (64px)

**Color assignment:** Five rotating tones (p, a, s, m, r) assigned deterministically by name hash.

### Chapter Chip

Color-coded tag for chapter ranges in discussions.

```jsx
<ChapterChip tag="Ch. 5–8" chapter={2} />
```

Auto-colors based on chapter number (cycles through 5-color palette).

### Input Fields

Standard form controls (input, textarea, select).

```jsx
<Field label="Email" hint="Your registered email">
  <input className="input" type="email" />
</Field>
```

**Styling:**
- 14px font, inherit font-family
- Primary border (`--line-strong`)
- Focus: teal border + 3px oklch highlight
- Placeholder: `--ink-4` (very muted)

### Tabs

Segmented control for switching views.

```jsx
<Tabs 
  value={activeTab} 
  onChange={setActiveTab}
  options={[
    { value: 'list', label: 'List' },
    { value: 'board', label: 'Board', count: 8 }
  ]}
/>
```

**Styling:**
- Inline-flex, rounded container
- Inactive: transparent bg, muted text
- Active: paper background, strong shadow, full opacity

---

## Interaction & Animation

### Transitions

All interactive elements use `transition: all 150ms ease` for:
- Background color
- Text color
- Border color
- Box shadow
- Transform (hover lifts)
- Opacity (fade states)

### Animations

| Name | Duration | Timing | Usage |
|------|----------|--------|-------|
| `barFill` | 0.5s | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Progress bar fill (stagger per row) |
| `toastIn` | 150ms | ease | Toast notification slide + fade |

### Hover & Focus

- **Buttons:** 2% brightness shift, slight scale transform
- **Links:** underline on hover
- **Cards:** shadow/elevation on hover (optional, context-dependent)
- **Focus ring:** 2px solid teal, 2px offset, 4px border-radius

---

## Design Principles in Practice

### Spoiler Safety

Chapter chip colors are used throughout discussions to tag content by chapter range. Use `<ChapterChip>` with chapter number for automatic hue rotation.

**Pattern in discussions:** Show chapter tag prominently, filter by reader progress before displaying thread in feed.

### Reading Progress

The progress bar (`--progress-track`, `--progress-fill`) is used to visualize:
- Pages read vs. total (primary color)
- Finished books (accent color)
- Not started (disabled color)

### Empty States

Use a centered card with a 64px icon box (teal background, primary-ink icon), followed by a headline and supportive text, then a CTA button.

```jsx
<Card style={{ padding: 48, textAlign: 'center' }}>
  <div style={{ 
    width: 64, height: 64, margin: '0 auto 16px',
    borderRadius: 16, background: 'var(--primary-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--primary-ink)',
  }}>
    <Icon/>
  </div>
  <h2 className="t-display">No results yet</h2>
  <p>Supporting copy here</p>
  <Button>Take action</Button>
</Card>
```

### Paper Texture

Used on hero sections and landing pages (`className="paper"`). Adds subtle radial gradient overlays in warm and rust tones for visual interest without compromising readability.

---

## Icons

All icons are Lucide-style, 1.6px stroke weight. Available set:

| Icon | Name | Usage |
|------|------|-------|
| 📖 | `I.book` | Books, library, reading |
| ✓ | `I.vote` | Voting, approval |
| 📅 | `I.calendar` | Meetings, scheduling |
| 💬 | `I.chat` | Discussions, threads |
| 📈 | `I.trend` | Progress, reading status |
| 🔍 | `I.search` | Search, find |
| ➕ | `I.plus` | Add, create |
| ✔ | `I.check` | Confirm, complete |
| ✕ | `I.x` | Close, delete |
| 👤 | `I.user` | Single user |
| 👥 | `I.users` | Multiple users, group |
| 📌 | `I.pin` | Pinned, important |
| 🕐 | `I.clock` | Time, duration |
| 📍 | `I.pin2` | Location, address |
| ✏️ | `I.edit` | Edit, modify |
| 🗑️ | `I.trash` | Delete, remove |
| ↩️ | `I.reply` | Reply, respond |
| › | `I.chev` | Expand, next (right) |
| ‹ | `I.chevDown` | Collapse (down) |
| ⚙️ | `I.filter` | Filter, refine |
| 🔔 | `I.bell` | Notifications, alerts |
| ✨ | `I.spark` | Magic, new, highlight |
| ☰ | `I.menu` | Menu, navigation |
| 📋 | `I.copy` | Copy, duplicate |
| 📖 | `I.logo` | BookClub Hub logo |

---

## Reference Implementations

For visual reference, see the design files:

- **Overall system:** `docs/bookclub-hub-designs/project/artboards/design-system.jsx`
- **Landing & join:** `docs/bookclub-hub-designs/project/artboards/landing-join.jsx`
- **Dashboard:** `docs/bookclub-hub-designs/project/artboards/dashboard.jsx`
- **Voting:** `docs/bookclub-hub-designs/project/artboards/voting.jsx`
- **Meetings:** `docs/bookclub-hub-designs/project/artboards/meetings.jsx`
- **Discussions:** `docs/bookclub-hub-designs/project/artboards/discussions.jsx`
- **Progress:** `docs/bookclub-hub-designs/project/artboards/progress.jsx`

These are interactive React prototypes. Open `docs/bookclub-hub-designs/project/BookClub Hub UI.html` in a browser to explore all screens and patterns.

---

## Gradients & Special Effects

### Book Cover Gradients

Six preset color schemes for book cover placeholders:

```css
.book-cover.cv-teal   { background: linear-gradient(160deg, oklch(0.55 0.07 195), oklch(0.32 0.06 215)); }
.book-cover.cv-rust   { background: linear-gradient(160deg, oklch(0.62 0.12 35), oklch(0.40 0.09 25)); }
.book-cover.cv-sage   { background: linear-gradient(160deg, oklch(0.62 0.06 145), oklch(0.40 0.05 155)); }
.book-cover.cv-mauve  { background: linear-gradient(160deg, oklch(0.55 0.08 320), oklch(0.32 0.07 310)); }
.book-cover.cv-amber  { background: linear-gradient(160deg, oklch(0.78 0.13 75), oklch(0.55 0.10 60)); }
.book-cover.cv-ink    { background: linear-gradient(160deg, oklch(0.32 0.02 250), oklch(0.18 0.015 250)); }
```

Each has a subtle spine effect (inset shadow) and simulated texture.

### Hero Tick Tooltip

Small interactive elements (like availability dots) with hover-reveal tooltips:

```jsx
<div className="hero-tick">
  <div className="hero-tick-tip">Thu 7pm</div>
</div>
```

---

## Accessibility Notes

- All interactive elements have focus rings (`outline: 2px solid var(--primary)`)
- Color choices meet WCAG AA contrast ratios for body text
- Icons are decorative (aria-hidden) unless semantically important
- Buttons and links are keyboard navigable
- Form labels are always associated with inputs via `<label>`
- Disabled states are visually distinct (opacity + cursor change)

---

## File Structure

```
src/
├── styles/
│   └── globals.css          # Compiled from design tokens, includes base styles
├── components/
│   └── ui/
│       ├── Button.tsx       # Button component
│       ├── Badge.tsx        # Badge / status chip
│       ├── Card.tsx         # Card wrapper
│       ├── Avatar.tsx       # User avatar
│       ├── BookCover.tsx    # Book cover placeholder
│       ├── ChapterChip.tsx  # Chapter tag
│       ├── Field.tsx        # Form field wrapper
│       ├── Tabs.tsx         # Segmented control
│       └── Icon.tsx         # Icon renderer

tailwind.config.ts          # Tailwind tokens (optional, if using Tailwind)
```

---

## Updates & Maintenance

- **Design source of truth:** `docs/bookclub-hub-designs/` (HTML/CSS/JS prototypes)
- **Token export:** Colors and sizing are defined in `styles.css` as CSS custom properties
- **Component evolution:** When adding features, first update the design prototypes, then sync component code to match
- **QA checklist:** Before shipping a feature, compare rendered component against the corresponding artboard in the design canvas

---

## Questions?

Refer to the HLD (`docs/high-level-design.md`) for broader product context, or the feature-specific LLDs for component-level design contracts.
