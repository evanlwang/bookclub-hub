# Voting Page Design Polish: Real Covers + Dog-Ear Sidebar Glyphs

## Context

An external visual comparison of the voting page against the Dogear redesign claimed five gaps. Verification against the design handoff source (`design_handoff_dogear/app-redesign/dogear-voting.jsx`, `dogear-components.jsx`, `tokens.css`) showed **three of the five claims are wrong** — the current build already matches the handoff exactly on those points:

- Slips fold a dog-ear **only when picked** (`<SlipFold folded={selected} />` in the handoff; same in `slip.tsx:113-136`); unpicked slips have a transparent border by design. **Do not add resting-state folds/borders** — that would diverge from the handoff.
- The header "N/M dog-eared" tracker's empty state **is** a plain square in the handoff (`DgEarGlyph`: paper-edge bg, 3px radius, triangle only when filled); `src/components/ui/ear-glyph.tsx` is a faithful port. **No change.**
- Radius/shadow/animation tokens all match (22px cards, warm shadows, `cubic-bezier(0.34,1.56,0.64,1)` fold). **No change.**

Two real items remain, both confirmed with the user:

1. **Book covers** render the cloth placeholder everywhere because seeded books never populate `Book.coverUrl` — `BookCover` (`src/components/ui/book-cover.tsx`) already renders real images when `coverUrl` exists. Decision: add a **render-time ISBN fallback** (derive the Open Library cover URL from ISBN when `coverUrl` is null, exactly like the handoff's `DgBookCover`), with the cloth render as the on-error fallback, **plus** populate `coverUrl` in seed data for determinism.
2. **Desktop sidebar "You've approved" indicator** uses circles-with-checkmarks (our own desktop adaptation; the handoff is mobile-only and silent). Decision: swap to **`EarGlyph` folds** for motif consistency, keeping the existing `approval-dot`/`data-filled` testids to minimize test churn.

Branch: `feature/voting-cover-glyph-polish` stacked on `feature/live-updates` (PR #8 touches `voting-phase.tsx`; rebase onto main if PR #8 merges first). LID full workflow applies.

## Phase 0 — LID docs cascade

- `docs/specs/comp-book-cover-specs.md`: new **COMP-BOOK-COVER-ISBN-FALLBACK-001** — WHEN `coverUrl` is null AND the book has an ISBN, BookCover SHALL render the Open Library cover (`https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg`); IF the image fails to load it SHALL fall back to the cloth typographic render. Requires a client boundary for the `onError` state (the handoff's `DgBookCover` pattern) — note this resolves the same-class issue flagged as open drift on `components-avatar` (COMP-AVATAR-IMG-001); mention but don't fix avatar here.
- `docs/llds/components-book-cover.md`: record the fallback chain (coverUrl → ISBN-derived OL URL → cloth) and the client-boundary decision.
- `docs/specs/vote-specs.md`: re-spec **VOTE-UI-005** / **VOTE-UI-009** sidebar sentence — the 28px circles-with-checks become 28px `EarGlyph` folds (intentional re-spec for motif consistency; testids unchanged). New ID **VOTE-UI-SIDEBAR-EARGLYPH-001** if cleaner than mutating VOTE-UI-005.
- Seed/factory data isn't spec'd (test fixture) — no EARS needed for coverUrl seeding.
- Arrow overlay: `components-book-cover` + `voting` entries updated in the same cascade.

## Phase 1 — Tests first

- `tests/unit/components/book-cover.test.tsx` (extend existing): renders `<img>` with stored `coverUrl` when present; derives the OL URL from `isbn` when `coverUrl` null; cloth fallback when neither; cloth fallback after simulated `img` error event (`fireEvent.error`). `@spec COMP-BOOK-COVER-ISBN-FALLBACK-001`.
- Voting sidebar: existing `tests/e2e/voting-sidebar.spec.ts` asserts `approval-dot` + `data-filled` — keep selectors working; add/adjust an assertion that the filled glyph is the EarGlyph (e.g. `data-glyph="ear"`). Unit-level: small render test asserting the sidebar maps EarGlyphs with correct filled count. `@spec VOTE-UI-SIDEBAR-EARGLYPH-001`.

## Phase 2 — Implementation

1. `src/components/ui/book-cover.tsx`: add optional `isbn` prop; `"use client"` + failed-image state (mirror handoff `DgBookCover`); URL chain `coverUrl ?? (isbn && olCoverUrl(isbn))`; use `?default=false` so missing OL covers 404 into the cloth fallback instead of a blank image.
2. Pass `isbn` through at call sites that have it: `slip.tsx`, `nominate-modal.tsx` results, progress page book card, dashboard current-book card (audit call sites with grep; pattern is one prop addition each).
3. `voting-phase.tsx`: replace the sidebar circle divs (`approval-dots` block, ~lines 384-409) with `<EarGlyph size={28} filled={...}>` wrapped in the existing `approval-dot` testid/data attributes.
4. Seed data: `tests/factories/books.ts` — add deterministic `coverUrl` values (OL URLs from each book's ISBN) so dev/e2e environments render real covers without depending on the render-time fallback.

## Verification

1. `npm run typecheck && npm run test:unit` (new book-cover + sidebar tests green, no regressions).
2. `npx playwright test tests/e2e/voting-sidebar.spec.ts tests/e2e/vote-*.spec.ts tests/e2e/voting-*.spec.ts` — sidebar selectors and voting flows intact.
3. Manual: `make seed && make dev`, open the voting page — real covers on slips, EarGlyph folds in the sidebar filling as picks toggle; check 390px width for overflow; verify cloth fallback by nominating a manual book without ISBN.
4. LID closeout: `@spec` annotations, mark new EARS `[x]`, arrow entries re-stamped.

## Explicitly out of scope (verified non-gaps)

- Resting-state dog-ear folds or terracotta borders on unpicked slips (contradicts handoff).
- Header pick-tracker glyph changes (already pixel-faithful).
- Eyebrow tag / avatar chip token changes (tokens verified matching).
