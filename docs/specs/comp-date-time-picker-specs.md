# DateTimePicker Component Specs

**LLD**: docs/llds/components-date-time-picker.md
**Implementing artifacts**:
- Component: `src/components/ui/date-time-picker.tsx` (also annotated `@spec MEET-UI-CREATE-002`)
- Tests: forthcoming (`tests/unit/components/date-time-picker.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API & Data Contract

- `[x]` **COMP-DATE-TIME-PICKER-001**: The DateTimePicker SHALL accept `value` (required string), `onChange` (required `(value: string) => void`), `min` (optional string), `placeholder` (optional, default `"Pick a date & time"`), and `data-testid` (optional).
- `[x]` **COMP-DATE-TIME-PICKER-002**: The `value` and `min` contract SHALL be the local-ISO string `"YYYY-MM-DDTHH:MM"` or the empty string; this matches the native `<input type="datetime-local">` contract so the custom popover is a drop-in replacement.
- `[x]` **COMP-DATE-TIME-PICKER-003**: The primitive SHALL render a hidden native `<input type="datetime-local">` alongside the custom popover with the same `value`, `min`, and `data-testid` so Playwright `fill()` and no-JS form submission continue to work.

## Trigger

- `[x]` **COMP-DATE-TIME-PICKER-004**: While a `value` is set, the trigger SHALL display `"{Weekday}, {Mon} {DD} · {H}:{MM} {AM|PM}"`; while empty, the trigger SHALL display the `placeholder`.
- `[x]` **COMP-DATE-TIME-PICKER-005**: When the trigger is clicked, the popover SHALL toggle open/closed.

## Popover Open/Close

- `[x]` **COMP-DATE-TIME-PICKER-006**: When the popover is open, pressing `Escape` SHALL close it.
- `[x]` **COMP-DATE-TIME-PICKER-007**: When the popover is open, a `mousedown` outside the wrapper SHALL close it.
- `[x]` **COMP-DATE-TIME-PICKER-008**: Selecting a day or changing a time control SHALL NOT close the popover; only the `"Done"` button, `"Clear"` button, `Escape`, or click-outside SHALL close it.

## Day Cell State

- `[x]` **COMP-DATE-TIME-PICKER-009**: For each day cell, color SHALL be applied with priority `disabled > selected > today > base`. Base: `text-ink` (in-month) or `text-ink-4` (out-of-month). Today (not selected): `text-primary font-semibold` with a `ring-1 ring-inset ring-primary/40`. Selected: `bg-primary text-white font-semibold`. Disabled: `text-ink-4 opacity-50 cursor-not-allowed`. This priority chain is the day-cell-specific equivalent of `DSYS-VAR-001` — the picker's day cells operate on a different state set (`selected`, `today`, `in-month`) than the universal interactive lattice (`hover`, `loading`, `disabled`), so the two priorities coexist without contradiction.
- `[x]` **COMP-DATE-TIME-PICKER-010**: If a day's end-of-day (`23:59:59.999` local) is before `min`, the day SHALL be disabled.

## Time Behavior

- `[x]` **COMP-DATE-TIME-PICKER-011**: When clicking a day, the hour and minute SHALL be preserved from the current `value`; when the `value` is empty, the time SHALL default to `19:00`.
- `[x]` **COMP-DATE-TIME-PICKER-012**: The minute select SHALL offer values `{0, 15, 30, 45}` only (quarter-hour granularity).
- `[x]` **COMP-DATE-TIME-PICKER-013**: When `value` is empty and a time control (hour, minute, or meridiem) is changed, the system SHALL default the date to today and the unchanged time component to `19:00`.
- `[ ]` **COMP-DATE-TIME-PICKER-014**: If the user enters an out-of-range hour (>12 or <1) in the hour input, the system SHALL display visible inline feedback. Active gap — out-of-range input is silently dropped today.

## External Value Sync

- `[x]` **COMP-DATE-TIME-PICKER-015**: When the `value` prop changes externally to a date in a different month (e.g., a quick-pick chip), the calendar view SHALL re-anchor to the new month.

## Footer Actions

- `[x]` **COMP-DATE-TIME-PICKER-016**: When clicking `"Clear"`, the system SHALL set `value` to `""` and close the popover.
- `[x]` **COMP-DATE-TIME-PICKER-017**: When clicking `"Done"`, the system SHALL close the popover without modifying `value`.

## Accessibility

- `[x]` **COMP-DATE-TIME-PICKER-A11Y-001**: The trigger SHALL set `aria-haspopup="dialog"` and `aria-expanded={open}`.
- `[x]` **COMP-DATE-TIME-PICKER-A11Y-002**: The popover SHALL set `role="dialog"` and `aria-label="Choose date and time"`.
- `[x]` **COMP-DATE-TIME-PICKER-A11Y-003**: The hour input SHALL set `aria-label="Hour"`; the minute select SHALL set `aria-label="Minute"`; the prev/next month buttons SHALL set `aria-label="Previous month"` / `aria-label="Next month"`.
- `[x]` **COMP-DATE-TIME-PICKER-A11Y-004**: Each day button SHALL set `aria-pressed={isSelected}` while selected; the selected day SHALL also carry `data-testid="calendar-day-selected"`.
- `[ ]` **COMP-DATE-TIME-PICKER-A11Y-005**: When the popover is open, the day grid SHALL support arrow-key navigation between days, `Home`/`End` for first/last day of the week, and `PageUp`/`PageDown` for previous/next month. Active gap.
- `[x]` **COMP-DATE-TIME-PICKER-A11Y-006**: The trigger button, hour input, minute select, and AM/PM toggle SHALL apply per-control focus styling (`focus:border-primary focus:ring-2 focus:ring-primary/15`) in addition to the global `:focus-visible` ring. This is an LLD-documented override per `DSYS-FOCUS-002` — the per-control treatment integrates focus into each control's chrome so the picker reads as a unified form, not a list of buttons with floating outlines.

## Token Discipline

- `[ ]` **COMP-DATE-TIME-PICKER-018**: The popover SHALL apply `box-shadow: var(--shadow-lg)`. Active gap — current implementation inlines a literal `oklch` shadow (`0 18px 40px -12px oklch(0.18 0.02 60 / 0.35)`) via a Tailwind arbitrary value; should reference the `--shadow-lg` token (see `DSYS-TOKEN-003`).

## Deferred

- `[D]` **COMP-DATE-TIME-PICKER-019**: `max` prop mirroring `min`.
- `[D]` **COMP-DATE-TIME-PICKER-020**: Locale-aware week start and month header.
- `[D]` **COMP-DATE-TIME-PICKER-021**: Touch-optimized popover width (current fixed `19.5rem` crowds mobile viewports).
