# Icons Component Specs

**LLD**: docs/llds/components-icons.md
**Implementing artifacts**:
- Components: `src/components/ui/icons.tsx`
- Tests: forthcoming (`tests/unit/components/icons.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Inventory & Shape

- `[x]` **COMP-ICONS-001**: The Icons module SHALL export one React component per icon: `BookIcon`, `VoteIcon`, `CalendarIcon`, `ChatIcon`, `TrendIcon`, `SearchIcon`, `PlusIcon`, `CheckIcon`, `XIcon`, `UserIcon`, `UsersIcon`, `ClockIcon`, `EditIcon`, `TrashIcon`, `ReplyIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `ChevronDownIcon`, `FilterIcon`, `MenuIcon`, `LogoIcon`.
- `[x]` **COMP-ICONS-002**: Every icon except `LogoIcon` SHALL share the `IconBase` wrapper with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.6"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `aria-hidden="true"`.
- `[x]` **COMP-ICONS-003**: The `size` prop SHALL default to `16` (rendered as both `width` and `height`).

## Coloring

- `[x]` **COMP-ICONS-004**: Icons SHALL inherit color from the surrounding text color via `currentColor`; callers control color via standard text-color utility classes (`text-primary`, `text-danger`, etc.).
- `[x]` **COMP-ICONS-LOGO-001**: The `LogoIcon` SHALL reference design tokens (`--color-primary`, `--color-primary-hover`, `--color-bg`) via direct `var(--token-name)` values in the SVG `fill`/`stroke` attributes (CSS Custom Properties are supported by every modern browser for SVG presentation attributes).
- `[x]` **COMP-ICONS-LOGO-002**: The `LogoIcon` SHALL render the Dogear brand mark — a rounded square (`viewBox="0 0 64 64"`, rx ~15) filled `var(--color-primary)`, with a dog-eared top-right corner: a paper triangle (`var(--color-bg)`, rounded to follow the card corner) over a crease triangle (`var(--color-primary-hover)`) plus a crease stroke. Drawn as plain SVG paths (no `clipPath` element, so multiple instances on a page carry no duplicate `id`). Keeps the `size` prop (default 22) and `aria-hidden="true"`. Mirrors `landing_handoff_dogear/assets/dogear-mark.svg`. (`src/components/ui/icons.tsx`)
- `[x]` **COMP-ICONS-ASSET-001**: The shipped favicon / touch / PWA icon assets — `src/app/icon.svg`, `src/app/icon.png` (32), `src/app/apple-icon.png` (180, on cream), `public/icons/icon-16.png`, `icon-192.png`, `icon-512.png` — SHALL all derive from the dog-ear mark artwork (16/32/favicon from the transparent mark; 180/192/512 from the pre-padded maskable cream variant). (`src/app/icon.svg`, `public/icons/`)

## Accessibility

- `[x]` **COMP-ICONS-005**: Decorative icons SHALL set `aria-hidden="true"` by default (enforced via `IconBase`).
- `[x]` **COMP-ICONS-006**: When an icon stands alone as the sole label for a button or interactive element, callers SHALL provide `aria-label` on the parent (the icon itself remains `aria-hidden`).

## Deferred

- `[D]` **COMP-ICONS-007**: `SpinnerIcon` promoted from the Button inline spinner (currently inlined in `button.tsx`).
- `[D]` **COMP-ICONS-008**: Generic `<Icon path="..." />` wrapper for ad-hoc SVG path data — intentionally not provided to discourage one-off additions outside the curated set.
- `[D]` **COMP-ICONS-009**: Additional icons mentioned in legacy design-system documentation (`Pin`, `Bell`, `Spark`, `Copy`) — add only if a feature surfaces a real need.
