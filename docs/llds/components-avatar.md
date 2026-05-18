# Avatar

## Context and Design Philosophy

Avatar represents a person by either a 1-2 letter initial circle or a photo. It is used in member rosters, comment headers, reading progress avatars, and avatar stacks (see `components-avatar-stack.md`). The default initial-circle path is the common case — the project has no avatar upload feature today. Implementation: `src/components/ui/avatar.tsx`.

## API

```ts
interface AvatarProps {
  name?: string;                          // used for initials + deterministic palette pick
  size?: "sm" | "md" | "lg" | "xl";       // default: "md"
  src?: string;                           // optional photo URL; when present, replaces initials
  decorative?: boolean;                   // when true: aria-hidden container + alt="" on <img>
}
```

When `name` is empty/unset and no `src` is provided, the avatar renders a `?` placeholder on the first palette color.

When `decorative={true}`, the Avatar suppresses screen-reader announcement so a caller can place it next to a visible name label without the name being announced twice. The flag is opt-in — default is decorative=false (announce normally).

## Size matrix

| Size | Diameter | Font size |
|------|----------|-----------|
| `sm` | 24px | 10px |
| `md` | 32px | 12px |
| `lg` | 44px | 15px |
| `xl` | 64px | 22px |

All sizes are perfect circles (`rounded-full`), `font-semibold`, and `shrink-0` (won't collapse inside flex parents).

## Initial extraction

`name.split(/\s+/)` → take up to 2 words → first character of each → uppercase. "Marisol Ortega" → `"MO"`. "Alice" → `"A"`. Empty → `"?"`.

## Palette assignment (active gap)

Five hard-coded `{ bg, ink }` literal oklch palettes in `avatar.tsx`. Index is `hashStr(name) % 5`, so the same name always renders in the same color across the app, but different names diverge.

**Gap**: the five palettes are functionally identical to the chip palette tokens (`--color-chip-1` through `--color-chip-5` plus their `-ink` companions). Avatar should consume the chip tokens instead of duplicating literal oklch values — closes the inline-literal ban. The `palettes` array becomes a list of token-name pairs:

```ts
const palettes = [
  { bg: "var(--color-chip-1)", ink: "var(--color-chip-1-ink)" },
  // ...
];
```

Or, preferably, generate the class string and use Tailwind utility classes (`bg-chip-1 text-chip-1-ink`) for grep-discoverability.

## Photo path

When `src` is provided, an `<img>` fills the circle (`object-cover`, `rounded-full`). `alt` is set to `name`. No loading state, no fallback to initials on error today — gap.

## Visual reference

`docs/bookclub-hub-designs/project/artboards/design-system.jsx` (Avatars section) and `progress.jsx` (avatars at scale).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Default rendering | Initials circle | Profile-photo-or-fallback; generic silhouette | The project has no upload flow; initials are always available; circles read as "person." [inferred] |
| Palette picker | `hashStr(name) % 5` | Random; first-letter-bucket; fixed | Deterministic per name = stable identity; modulo 5 matches chip-token count. [inferred] |
| Palette source | Hard-coded oklch literals *(gap)* | Reuse `--color-chip-*` tokens | Currently violates the inline-literal ban; should migrate. |
| Initial cap | Up to 2 characters | Always 1; always 2 | "MO" reads more identifiable than "M" for two-word names. [inferred] |
| Photo error fallback | None *(gap)* | `onError` → fall back to initials | Broken image URLs render as the browser's default broken-image glyph. |
| Size count | 4 (`sm`-`xl`) | 3 (`sm`/`md`/`lg`); `xs` micro size | 4 covers inline (sm), comment headers (md), profile (lg), hero (xl). [inferred] |

## Open Questions

### Resolved
1. ✅ Deterministic palette per name.
2. ✅ Initial-first, photo-when-`src`-provided.

### Deferred / Active gaps
1. **Migrate palette to chip tokens.** Closes the inline-literal ban. Spec: `COMP-AVATAR-TOKEN-001`.
2. **`<img>` `onError` fallback.** Photo path silently breaks today. Spec: `COMP-AVATAR-IMG-001`.
3. **`alt=""` for decorative use cases.** When an avatar appears next to its owner's name, the `alt={name}` becomes a duplicate announcement for screen readers. Consider an `aria-hidden` opt-in.
4. **Photo + initials hybrid** during image load. Not committed.

## References

- `src/components/ui/avatar.tsx` — implementation.
- `docs/llds/components-avatar-stack.md` — composes Avatar.
- `docs/llds/design-system.md` — chip palette tokens.
- `docs/specs/comp-avatar-specs.md` — forthcoming.
