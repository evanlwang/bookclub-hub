# LID Design Overlay — Plan

Multi-phase plan to apply linked-intent development to the design system (tokens, primitives, and behavior). Anchored in the HLD's new **Design System** section.

## Confirmed choices

- **Arrow placement**: parallel overlay. `design-system` cluster of segments in `docs/arrows/index.yaml`; feature segments do **not** declare `blockedBy` on design.
- **LLD granularity**: one LLD per primitive (`docs/llds/components-{name}.md`) plus a system-wide `docs/llds/design-system.md`.
- **Templates**: deferred. Page-level layouts stay inline until template extraction is a real refactor.
- **Tokens**: stay in `src/app/globals.css` (Tailwind v4 `@theme`). Specs reference token *names*, never values.
- **EARS prefixes**: `DSYS-*` for system-wide rules (token taxonomy, focus, motion, a11y); `COMP-{NAME}-*` per primitive.
- **Existing `docs/design-system.md`**: deleted after migration. Mutation, not accumulation.

## Phase ordering

Each phase ends with a user-review stop. Within-segment cascade (one LLD → its specs → its tests → its code) proceeds freely once a segment is approved.

| Phase | Output |
|-------|--------|
| 1 | HLD update (✅ done — new Design System section, three Decision rows, References additions). |
| 2 | LLDs: `design-system.md` first (token taxonomy, focus/motion/a11y contracts, variant composition), then `components-button.md`. Confirm the LLD shape before fanning out to the remaining primitives. |
| 2b | Remaining component LLDs: `components-badge.md`, `components-card.md`, `components-avatar.md`, `components-avatar-stack.md`, `components-book-cover.md`, `components-chapter-chip.md`, `components-progress-bar.md`, `components-date-time-picker.md`, `components-icons.md`. |
| 2c | Delete `docs/design-system.md` once migration is complete. |
| 3 | EARS specs: `dsys-specs.md` + one `comp-{name}-specs.md` per primitive. |
| 4 | Intent-narrowing edge audit (cross-spec ambiguity, especially variant × state matrix gaps, `loading` semantics, icon-only buttons, `prefers-reduced-motion`). |
| 5 | Tests-first: component tests (Vitest + Testing Library) with `@spec` annotations. Computed-style assertions, focus-visible behavior, motion-preference media-query mocks. |
| 6 | Code: add `@spec` annotations to existing primitive entry-points in `src/components/ui/`. Implement any gaps the tests surface. |
| 6b | Update `docs/arrows/index.yaml` — add `design-system` taxonomy cluster + per-primitive segments; run coherence verification. |

## Notes for future sessions

- The HLD already commits to: tokens-as-data, oklch single light theme, mode-agnostic token names.
- Brownfield: every component LLD is reverse-engineered from current code. Decisions rows that come from observation (not authored intent) carry `[inferred]` in the Rationale column until confirmed.
- Don't create template LLDs (TPL-*) speculatively. Wait for the refactor that extracts them.
