# Icons

## Context and Design Philosophy

Icons are uniformly-styled SVG glyphs delivered as React components. They share a base wrapper (`IconBase`) that fixes stroke weight, line caps, viewBox, and accessibility defaults so every icon in the app reads as visually consistent. The icon set is **fixed** — there is no on-demand SVG loader, no icon-name-as-string indirection, and no third-party icon font. Adding an icon is adding a new exported function. Implementation: `src/components/ui/icons.tsx`.

## API

```ts
interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;  // default: 16
}
```

Every icon (except `LogoIcon`) accepts `IconProps` and forwards extras to the `<svg>`. Color is inherited via `stroke="currentColor"`, so the icon takes on the surrounding text color — wrap in a `text-primary` parent for a teal icon, `text-danger` for red.

`aria-hidden="true"` is set on the base wrapper. Icons are decorative by default. When an icon stands alone as the meaning (icon-only button), callers must add an `aria-label` to the *parent* button — not the icon itself.

## Icon inventory

| Export | Visual | Used for |
|--------|--------|----------|
| `BookIcon` | open book | Books, library, reading |
| `VoteIcon` | check mark | Voting, approval |
| `CalendarIcon` | calendar | Meetings, scheduling |
| `ChatIcon` | speech bubble | Discussions, threads |
| `TrendIcon` | line graph | Reading progress |
| `SearchIcon` | magnifying glass | Search |
| `PlusIcon` | plus | Add, create |
| `CheckIcon` | check | Confirm, success |
| `XIcon` | x | Close, dismiss, error |
| `UserIcon` | single person | Single member |
| `UsersIcon` | group of people | Multiple members |
| `ClockIcon` | clock | Time, schedule |
| `EditIcon` | pencil | Edit, modify |
| `TrashIcon` | trash can | Delete |
| `ReplyIcon` | arrow + line | Reply |
| `ChevronLeftIcon` | < | Previous, back |
| `ChevronRightIcon` | > | Next, expand |
| `ChevronDownIcon` | v | Collapse, dropdown |
| `FilterIcon` | filter funnel | Filter, refine |
| `MenuIcon` | hamburger | Menu, navigation |
| `LogoIcon` | branded mark | App logo |

Compared with `docs/design-system.md`, the previously-listed icons `Pin`, `Pin2`, `Bell`, `Spark`, `Copy` are not present in the implementation. Either the list was aspirational or those have been retired. The new LLD reflects what exists; if any are needed, they're a forward gap.

## Default styling (IconBase)

| Property | Value |
|----------|-------|
| viewBox | `0 0 24 24` |
| `fill` | none |
| `stroke` | `currentColor` |
| `stroke-width` | 1.6 |
| `stroke-linecap` / `stroke-linejoin` | round |
| `aria-hidden` | true |

`LogoIcon` is the **exception** to IconBase: it's the Dogear brand mark (`COMP-ICONS-LOGO-002`), not a stroke glyph. `viewBox="0 0 64 64"`, `size` prop default 22, `aria-hidden="true"`. It draws a rounded square (rx ~15) filled `var(--color-primary)` with a dog-eared top-right corner — a paper triangle (`var(--color-bg)`, its outer corner rounded to follow the card edge) over a crease triangle (`var(--color-primary-hover)`) plus a crease stroke. Colors bridge through design tokens via `var(--token-name)` in the SVG `fill`/`stroke` attributes (`COMP-ICONS-LOGO-001`) — no oklch literals. Drawn as plain `<rect>` + `<path>` elements with **no `clipPath`**, so multiple instances on one page introduce no duplicate `id`. Geometry mirrors `landing_handoff_dogear/assets/dogear-mark.svg`.

The shipped static icon assets (favicon, apple-touch, PWA 16/192/512) all derive from this mark (`COMP-ICONS-ASSET-001`): `src/app/icon.svg` is a copy of the transparent mark; the PNGs are rasterized from the mark (16/32) and the pre-padded maskable cream variant (180/192/512). Regenerate with `npx --yes sharp-cli` against `landing_handoff_dogear/assets/dogear-mark.svg` / `dogear-icon-maskable.svg` (commands in the plan); files are committed so CI never runs the tool.

## Visual reference

`docs/bookclub-hub-designs/project/primitives.jsx` shows the icon grid.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Delivery | React components per icon | Sprite sheet; icon font; runtime SVG loader | Tree-shakable, type-checked, easy to add ad-hoc icons. [inferred] |
| Coloring | `currentColor` inheritance | Per-icon color prop; CSS variable per icon | Lets callers control color via standard text-color utilities; works with `:hover`/`:disabled` propagation. [inferred] |
| Stroke width | 1.6 | 2 (Lucide default); 1.5 | Slightly lighter than Lucide; matches the warm-paper aesthetic without thin-line fragility. [inferred] |
| Default size | 16px | 20px; 24px | 16px is the size most icons render at in the UI; callers up-size as needed. [inferred] |
| Accessibility default | `aria-hidden="true"` | Per-icon `role="img"` + `aria-label` | Most icons are decorative; the few that aren't need a parent `aria-label` anyway (icon-only buttons). [inferred] |
| `LogoIcon` mark | Dog-ear fold (terracotta square, folded corner) | Teal book glyph (retired); wordmark only | The dog-ear IS the product's namesake gesture; one brand mark app-wide. Colors token-bridged via `var(--token)` SVG attrs. |
| `LogoIcon` corner clip | Plain paths, rounded-corner page triangle | `<clipPath>` element | A `clipPath` needs a unique `id`; multiple `LogoIcon`s on a page would collide. Precomputed paths avoid `id`s entirely. |

## Open Questions

### Resolved
1. ✅ Fixed icon set, one component per icon.
2. ✅ `currentColor` for coloring, `aria-hidden` by default.

### Deferred / Active gaps
1. **Missing icons from old design-system.md list** (Pin, Pin2, Bell, Spark, Copy). If used, add; if not, the design-system doc was stale.
3. **`Icon` wrapper for arbitrary SVG path data.** Today every icon is a named component. A generic `<Icon path="..." />` is intentionally not provided to discourage ad-hoc additions.
4. **Loading-spinner icon** is currently inlined in Button. Could be promoted to a shared `SpinnerIcon` for reuse.

## References

- `src/components/ui/icons.tsx` — implementation.
- `docs/llds/design-system.md` — color, focus, motion contracts.
- `docs/specs/comp-icons-specs.md` — forthcoming.
