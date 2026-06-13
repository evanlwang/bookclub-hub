# Handoff: Dogear Landing Page + Icon

A focused package to rebuild **just the marketing landing page (`/`)** and the **new app icon** in the Dogear codebase (Next.js 15 · React 19 · Tailwind 4). This is a **visual redesign only** — the routes, copy intent, and auth flow are unchanged.

## Run the reference

Open **`Landing Page.html`** in a browser (needs the sibling files + network for Google Fonts). It renders the landing at the 390px mobile target. The two CTAs are wired so you can click through into the join wizard / login screens for context, but **only the landing page (`/`) and the icon are in scope for this handoff.**

Open **`assets/icon-preview.html`** to see the icon at favicon → app-tile sizes, on light and dark, with the palette.

## Files

| File | What it is |
|---|---|
| `Landing Page.html` | Standalone runnable reference — mounts the landing in a 390px column |
| `dogear-join.jsx` | Contains `LandingScreen` + `DogEarMark` (the icon as a React component). Login/JoinWizard included for click-through context only |
| `dogear-components.jsx` | `DgButton`, `DgBadge` etc. — the landing uses the primary button |
| `dogear.css` | Design tokens (paper/terracotta/amber palette, Nunito/Newsreader/Courier Prime, radii, shadows, motion) |
| `assets/dogear-mark.svg` | **The icon** — transparent-background glyph for favicon / inline use |
| `assets/dogear-icon-maskable.svg` | 512×512 PWA **maskable** version (mark on cream, 40% safe margin) |
| `assets/icon-preview.html` | Size + palette reference sheet |

## The design direction (why it looks the way it does)

The brief's thesis: Dogear should feel like *something a person who loves books made for their friends* — not a SaaS dashboard. The landing is therefore an **editorial composition built around one real physical object — a library borrower's card** — rather than a centered-hero + feature-grid template. Concretely:

1. **Left-aligned masthead**, not a centered logo lockup — the icon + `DOGEAR` wordmark on the left, an `EST. 2026` catalog detail on the right, under a hairline rule.
2. **A large literary *serif* hero** ("A small, private library for *the people you read with.*") set in **Newsreader** — the warm, bookish voice. This is the one place the marketing surface departs from the chunky-Nunito app UI, on purpose.
3. **Asymmetric CTAs** — a single terracotta pill ("Get your library card" → `/join`) with **"Log in" as a quiet underlined text link** (→ `/login`), not a second equal-weight button.
4. **The three features are stamped checkout rows** on a slightly-tilted borrower's card: each row is a club capability with an italic gloss and a **rotated due-date rubber stamp** (APR 02 / APR 16 / MAY 07). The card has a dog-eared corner.
5. **The dog-ear explainer** is set as an italic annotation beneath the card, not a boxed callout.
6. **Privacy promises → numbered "Conditions of Membership"** fine print (01/02/03 with terracotta numerals on ruled lines) — reads like the back of a real library card.
7. **The tagline → an "Ex Libris" bookplate**: a bordered plate with `· EX LIBRIS ·` over *"For people who finish the book."* in serif italic.

Everything is intentionally **asymmetric, ruled, and stamped** — that's what reads as hand-made rather than generated. Match the spacing, rotations, type sizes, and copy in the reference closely.

### Tokens used (full set in `dogear.css`)
- Paper `#F7F0E2` page / `#FFFBF1` card · ink `#3D2F24` / soft `#6B5A4A` / faint `#9A8772`
- Terracotta `#C75B39` (primary) / deep `#A84A2C` · amber `#DD9A33` (not used on this screen)
- Display/UI: **Nunito** 800–900 · Prose: **Newsreader** (incl. italic) · Mono: **Courier Prime**
- Card radius 22px · pill buttons · warm layered shadows

## Build notes (Next.js)

- Build as a server component at `app/page.tsx`; the only interactivity is two links (`<Link href="/join">`, `<Link href="/login">`) — no client JS needed for the landing itself.
- Use `next/font` for Nunito, Newsreader, Courier Prime (weights above, `display: swap`, preload) so the serif hero doesn't flash.
- The reference uses inline styles for clarity; translate to your Tailwind v4 token classes. The **due-date stamps** are `font-mono`, a 1.5px terracotta border, ~`-5deg`/`+3deg` rotation. The **dog-eared corner** is two CSS triangles (see `DogEarMark` / the card in `dogear-join.jsx`).
- **No backend change.** Same `/`, `/join`, `/login` routes and the same two-path entry architecture described in `docs/llds/auth-and-accounts.md`. Copy is consistent with that doc (email + display name, no passwords, no ads).
- Respect `prefers-reduced-motion` (already handled by the token CSS).

## Icon spec

A clothbound book spine (rounded square, terracotta `#C75B39`) with the **top-right corner dog-eared** — the page (`#F7EFDF`) peeking through, a deeper crease (`#A84A2C`) for the fold. It is the app's namesake gesture as a mark.

**Ship it as:**
- `favicon.svg` ← `dogear-mark.svg` (transparent; scales clean to 16px)
- `apple-touch-icon.png` 180×180 — export `dogear-mark.svg` on a cream `#F7F0E2` rounded tile
- `icon-192.png` / `icon-512.png` + **maskable** 512 ← `dogear-icon-maskable.svg` (already padded for the safe zone)
- Manifest: `theme_color` and `background_color` = `#F7F0E2`

The same mark is available as the `<DogEarMark size={n} />` React component in `dogear-join.jsx` if you want it inline (e.g. in the masthead) without an `<img>`.

## Kickoff prompt for Claude Code

> Rebuild the Dogear landing page (`/`) and app icon from `design_handoff_dogear/landing/`. Open `Landing Page.html` and `assets/icon-preview.html` as the visual reference. This is a visual redesign only — keep the `/`, `/join`, `/login` routes and the existing auth flow (`docs/llds/auth-and-accounts.md`) exactly. Match the editorial layout described in README.md § The design direction: left-aligned masthead, large Newsreader serif hero, asymmetric CTAs (terracotta pill + quiet "Log in" link), the borrower's-card feature list with due-date stamps, numbered Conditions of Membership, and the Ex Libris bookplate. Use `next/font` for Nunito/Newsreader/Courier Prime and translate the inline styles to our Tailwind v4 tokens. Wire the icon SVGs into `app/icon` + the web manifest. Show me the result before moving on.
