# Large-display zoom + fill (fluid)

**Date:** 2026-05-10
**Status:** shipped
**Target display class:** any width ≥1280px; trigger was QHD/2560×1440

## Problem

On a 2560×1440 display, the authenticated club shell wasted roughly half the viewport. Sidebar was fixed at `w-60` (240px); main content was capped at `max-w-3xl`/`max-w-4xl` (768–896px). After ~80px of main padding the total used was ~1216px, leaving ~1344px of dead gutter to the right.

A first attempt fixed this with Tailwind breakpoint tiers (`2xl:`, `3xl:`) — but that just moves the cliff. Between breakpoints nothing scales. The user's actual ask was *dynamic with screen size* — continuous scaling at every pixel of viewport change.

## Approach

**Fluid layout via `clamp()` and viewport-relative units.** Replace fixed pixel widths and Tailwind breakpoint tiers with viewport-aware arbitrary values that grow continuously between a minimum (mobile/laptop) and maximum (large displays).

Tailwind v4 JIT accepts arbitrary CSS values in `w-[]`, `p-[]`, `max-w-[]`, `text-[]`, so no config changes are needed — no new breakpoint, no `@theme` token.

## What shipped

Three layers of edits:

### Layer 1 — shell

`src/app/clubs/[clubId]/sidebar.tsx`:
```diff
- <aside className="w-60 shrink-0 ...">
+ <aside className="w-[clamp(240px,18vw,360px)] shrink-0 ...">
```

`src/app/clubs/[clubId]/layout.tsx`:
```diff
- <main className="flex-1 min-w-0 p-6 md:p-10">
+ <main className="flex-1 min-w-0 p-[clamp(1rem,2.5vw,3.5rem)]">
```

### Layer 2 — page wrappers

Sweep across 13 files (page + matching loading.tsx files) under `src/app/clubs/[clubId]/`:

| Old | New |
|---|---|
| `max-w-2xl` (settings) | `w-full max-w-[1200px]` |
| `max-w-3xl` (progress, meetings, discussions list) | `w-full max-w-[1600px]` |
| `max-w-3xl` (thread detail — narrower for prose) | `w-full max-w-[900px]` |
| `max-w-4xl` (dashboard, vote, members) | `w-full max-w-[1600px]` |

The `w-full` is required because without it the wrapper's `width: auto` shrinks to fit content and the max-width never engages.

The narrower `900px` cap on `discussions/[threadId]/page.tsx` keeps comment prose at a readable line length on huge monitors.

### Layer 3 — sidebar internals

Replace fixed-px text utilities in `sidebar.tsx` with `clamp()`-based fluid sizes so sidebar contents scale with the viewport (and therefore with the now-wider sidebar):

| Element | Old | New |
|---|---|---|
| Club name (both branches) | `text-[15px]` | `text-[clamp(15px,0.4vw+9px,18px)]` |
| Club count ("2 clubs") | `text-[11px]` | `text-[clamp(11px,0.15vw+9px,13px)]` |
| Nav item links | `text-sm` | `text-[clamp(14px,0.3vw+10px,16px)]` |
| User row name | `text-sm` | `text-[clamp(14px,0.3vw+10px,16px)]` |
| Code chip | `text-[11px]` | `text-[clamp(11px,0.15vw+9px,13px)]` |

Icon sizes (`LogoIcon size={24}`, nav `Icon size={16}`) left unchanged — the surrounding padding and text scaling carry the visual weight; rescaling icons would have required dual renders gated by media queries.

## Behavior at key widths

| Viewport | Sidebar | Main padding | Content max |
|---|---|---|---|
| 1280px (laptop) | 240px (clamped low) | 32px | 1280 − 240 − 64 = ~976px (no cap hit) |
| 1700px | ~306px | ~43px | ~1350px (cap not yet hit) |
| 1920px | ~346px | ~48px | ~1526px (cap not yet hit) |
| 2560px (target) | 360px (clamped high) | 56px (clamped high) | 1600px (cap hit), gutter ~544px |

The right gutter at 2560px exists by design — `max-w-[1600px]` keeps card layouts visually balanced and prose readable. To eliminate the gutter entirely, raise that cap.

## Out of scope (intentionally untouched)

- Marketing pages: `src/app/page.tsx`, `src/app/login/**`, `src/app/join/**`. Center-cardded by design.
- Modals/dialogs (`*-dialog.tsx`, `*-modal.tsx`, `progress/update-modal.tsx`). Intentional narrow widths.
- Mobile/tablet (<768px). All `clamp()` lower bounds preserve current behavior.

## Verification

- `npm run typecheck` — clean.
- `npm run lint` — 19 pre-existing warnings, 0 errors. None introduced by this change.
- `npm run build` — full build succeeds; Tailwind JIT picked up every `clamp()` and `min()` arbitrary value without complaint.

Visual verification at 1280px, 1700px, 2560px is on the user (resize the browser; the changes are entirely CSS, so HMR isn't required).

## Files touched

```
src/app/clubs/[clubId]/layout.tsx
src/app/clubs/[clubId]/sidebar.tsx
src/app/clubs/[clubId]/page.tsx
src/app/clubs/[clubId]/loading.tsx
src/app/clubs/[clubId]/vote/page.tsx
src/app/clubs/[clubId]/vote/loading.tsx
src/app/clubs/[clubId]/progress/page.tsx
src/app/clubs/[clubId]/progress/loading.tsx
src/app/clubs/[clubId]/discussions/page.tsx
src/app/clubs/[clubId]/discussions/loading.tsx
src/app/clubs/[clubId]/discussions/[threadId]/page.tsx
src/app/clubs/[clubId]/meetings/meetings-client.tsx
src/app/clubs/[clubId]/meetings/loading.tsx
src/app/clubs/[clubId]/members/page.tsx
src/app/clubs/[clubId]/settings/page.tsx
```

15 files, 3 commits (shell / page wrappers / sidebar internals).
