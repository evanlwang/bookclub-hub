# DateTimePicker

## Context and Design Philosophy

DateTimePicker is a custom calendar + time popover replacing the native `<input type="datetime-local">` in the meeting-create form. The native control's look is browser/OS-specific and clashed with the system's warm-paper aesthetic; replacing it gives the meeting flow consistent typography (Newsreader display headers), the oklch palette, and the rounded geometry used everywhere else.

The component **preserves the native input's data contract** — the `value` and `onChange` work in the same `"YYYY-MM-DDTHH:MM"` local-ISO format the native input emits. A hidden native input is rendered alongside the custom popover so Playwright `fill()` calls and any no-JS form fallback still work. This back-compat is a deliberate choice to make the swap-in transparent to callers.

Implementation: `src/components/ui/date-time-picker.tsx`. Currently carries `@spec MEET-UI-CREATE-002`.

## API

```ts
interface DateTimePickerProps {
  value: string;                              // "YYYY-MM-DDTHH:MM" local-ISO; "" when empty
  onChange: (value: string) => void;
  min?: string;                               // earliest allowed; same local-ISO format
  placeholder?: string;                       // trigger placeholder text, default "Pick a date & time"
  "data-testid"?: string;                     // forwarded to the hidden native input
}
```

## State model

- **Trigger** — a `<button>` styled like an input. Shows the formatted selected datetime ("Thu, Sep 12 · 7:00 PM") or the placeholder.
- **Closed** — only the trigger is rendered.
- **Open** — a `role="dialog"` popover anchors below the trigger:
  - Month navigation header (prev / month-year / next)
  - Single-letter weekday row (Sun-first)
  - 6×7 day grid (`buildMonthGrid` returns 42 days including leading/trailing month fillers)
  - Time row: hour input (12-hr), minute select (00/15/30/45), AM/PM toggle
  - Footer: "Clear" (sets `value=""`, closes) and "Done" (closes)

The popover closes on `Escape`, on click outside (mousedown listener on `window`), and on the Done/Clear buttons. It does not close on day-click or time-change — the user keeps editing until they confirm via Done.

## Day cell state precedence

For each day, color/state is picked in this order (later wins):

1. Base: in-month → `text-ink`; out-of-month → `text-ink-4`.
2. Today (and not selected) → `text-primary font-semibold ring-1 ring-inset ring-primary/40`.
3. Selected → `bg-primary text-white font-semibold`.
4. Disabled (before `min`) → `text-ink-4 cursor-not-allowed opacity-50`.

Selected wins over today; disabled wins over everything.

## Time row

- Hour input is a `<input type="number">` constrained to 1-12; invalid input is silently dropped (no error UI).
- Minute is a `<select>` of `[0, 15, 30, 45]` — quarter-hour granularity matches typical book-club scheduling.
- AM/PM is a two-button toggle with `aria-pressed`. Clicking the inactive side flips meridiem; clicking the active side is a no-op.

When `value` is empty, time defaults to 7:00 PM (book clubs meet in the evening). When `value` is set, time reflects the parsed hour/minute.

## Focus styling (intentional override)

The trigger button, hour input, minute select, and AM/PM toggle each apply per-control focus classes (`focus:border-primary focus:ring-2 focus:ring-primary/15`) in addition to the global `:focus-visible` ring. This is a documented exception to `DSYS-FOCUS-002` (which discourages per-component focus): the picker is composed of multiple controls inside a single dialog, and the per-control focus integrates focus into each control's chrome so the picker reads as a unified form rather than a list of floating outlines. Spec: `COMP-DATE-TIME-PICKER-A11Y-006`.

## Visual reference

`design_handoff_dogear_redesign/dogear-meetings.jsx` (the create-meeting modal hosts the picker).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Replace native input | Custom popover, hidden native fallback | Use native everywhere; CSS-style the native | Native styling is browser/OS-specific and inconsistent with the system's aesthetic; back-compat shim preserves test/no-JS paths. |
| Local-ISO contract | Preserve native format `"YYYY-MM-DDTHH:MM"` | New ISO-UTC contract; Date object | Drop-in swap with the previous native input means no caller changes. |
| Minute granularity | 4 steps (00/15/30/45) | 1-minute resolution; 5/10-minute steps | Book clubs schedule on quarter hours; the constraint guides callers toward usable times. [inferred] |
| Default time | 7:00 PM | Now; noon; previously-selected | Evening default matches the most common book-club meeting time. [inferred] |
| Week starts on | Sunday | Monday; locale-aware | US-default; locale-aware is a future improvement. [inferred] |
| Calendar grid size | 6×7 (always 42 cells) | Variable rows per month | Fixed grid prevents the popover from resizing month-to-month. [inferred] |
| Disabled detection | End-of-day comparison vs `min` | Same-instant comparison | A day is "disabled" only if its entire window is before `min`, so `min = "2026-05-18T10:00"` doesn't disable May 18. [inferred] |
| Internal export | `__testing` object | Module-private only; full export | Lets the unit test cover `buildMonthGrid`, `sameDay`, `toIso`, `parseIso` without making them public API. |

## Open Questions

### Resolved
1. ✅ Custom popover with hidden native fallback.
2. ✅ Quarter-hour minute steps; 7 PM default.
3. ✅ Day cell state precedence: selected > today > disabled > base.

### Deferred / Active gaps
1. **Locale-aware week start and date format.** Hard-coded `Sun`-first and `toLocaleDateString(undefined, ...)` (which respects locale but only for the trigger label). Calendar header months are English-only.
2. **Keyboard navigation inside the day grid.** Today only the buttons are tab-able; no arrow-key navigation between days, no Home/End, no PageUp/PageDown for month change.
3. **Time-input validation feedback.** Invalid hour (>12 or <1) silently does nothing — no error message.
4. **`aria-activedescendant`** or roving tabindex pattern for the day grid.
5. **Min + max** — only `min` is supported; a `max` prop would round out the constraint API.
6. **Touch optimizations** — the popover width is fixed at `19.5rem`, which crowds mobile viewports.

## References

- `src/components/ui/date-time-picker.tsx` — implementation (carries `@spec MEET-UI-CREATE-002`).
- `docs/llds/design-system.md` — token, motion, focus contracts.
- `docs/llds/meeting-scheduling.md` — feature LLD that drove the primitive.
- `docs/specs/comp-date-time-picker-specs.md` — forthcoming.
