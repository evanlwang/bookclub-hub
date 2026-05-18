# Card Component Specs

**LLD**: docs/llds/components-card.md
**Implementing artifacts**:
- Component: `src/components/ui/card.tsx`
- Tests: forthcoming (`tests/unit/components/card.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API & Token Map

- `[x]` **COMP-CARD-001**: The Card primitive SHALL render as a `<div>` with `{ background: --color-bg, border: 1px solid --color-line, border-radius: --radius-lg, box-shadow: --shadow-sm }`.
- `[x]` **COMP-CARD-002**: The Card primitive SHALL pass through all native `<div>` attributes (including `className`, `onClick`, `data-testid`, `aria-*`).
- `[x]` **COMP-CARD-003**: The Card primitive SHALL NOT apply default padding; callers SHALL apply spacing via `className`.
- `[x]` **COMP-CARD-004**: The Card primitive SHALL NOT carry hover, focus, or pressed state styling. (Interactive cards wrap their contents in `<Link>` or `<button>`, which carry their own focus ring per `DSYS-FOCUS-001`.)

## Deferred

- `[D]` **COMP-CARD-005**: An `as` prop selecting the semantic element (e.g., `article`, `section`, `div`).
- `[D]` **COMP-CARD-006**: A documented "clickable card" composition pattern; relevant when an `<a>` or `<button>` wraps the whole card.
