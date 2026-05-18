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
- `[ ]` **COMP-ICONS-LOGO-001**: The `LogoIcon` SHALL reference design tokens (`--color-primary`, `--color-bg`, `--color-accent`) via CSS bridging (e.g., `<g style="color: var(--color-primary)" stroke="currentColor">` for each color group) rather than hard-coded `oklch` literal `fill`/`stroke` values. Active gap (see `DSYS-TOKEN-003`).

## Accessibility

- `[x]` **COMP-ICONS-005**: Decorative icons SHALL set `aria-hidden="true"` by default (enforced via `IconBase`).
- `[x]` **COMP-ICONS-006**: When an icon stands alone as the sole label for a button or interactive element, callers SHALL provide `aria-label` on the parent (the icon itself remains `aria-hidden`).

## Deferred

- `[D]` **COMP-ICONS-007**: `SpinnerIcon` promoted from the Button inline spinner (currently inlined in `button.tsx`).
- `[D]` **COMP-ICONS-008**: Generic `<Icon path="..." />` wrapper for ad-hoc SVG path data — intentionally not provided to discourage one-off additions outside the curated set.
- `[D]` **COMP-ICONS-009**: Additional icons mentioned in legacy design-system documentation (`Pin`, `Bell`, `Spark`, `Copy`) — add only if a feature surfaces a real need.
