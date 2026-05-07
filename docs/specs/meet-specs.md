# Meeting Scheduling Specs

**LLD**: docs/llds/meeting-scheduling.md
**Implementing artifacts**:
- API: `src/server/routers/meetings.ts`
- UI: `src/app/clubs/[clubId]/meetings/page.tsx`, `meetings-client.tsx`, `create-meeting.tsx`, `respond-meeting.tsx`
- Tests: `tests/integration/meetings.test.ts`, `tests/e2e/meetings-*.spec.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Meeting Lifecycle

State: proposed — buttons shown: "Respond" (all members), expanded: per-slot "Available"/"Maybe"/"Can't" (all members), "Save Availability" (all members), "Propose Meeting" (admin, header) — transitions: → confirmed (admin via `meetings.confirm` API; **no UI button**), → cancelled (admin via `meetings.cancel` API; **no UI button**)
State: confirmed — buttons shown: none (display only) — transitions: → completed (auto when confirmedTime passes), → cancelled (admin via API only)
State: completed — buttons shown: none (display only — see `MEET-UI-NOTES-IMPL-001` for planned Notes button) — transitions: terminal
State: cancelled — buttons shown: none (rendered as "Past") — transitions: terminal

## Meeting Creation API

- `[x]` **MEET-API-001**: When an admin calls `meetings.create` with 2–5 time slots, the system SHALL create the meeting in "proposed" status with the specified slots. (`meetings.ts:31-94`)
- `[x]` **MEET-API-CREATE-VAL-001**: `meetings.create` SHALL validate 2–5 slots and 15–120 min duration each. (`meetings.ts:31-94`)
- `[x]` **MEET-DATA-001**: Each meeting SHALL have 2–5 proposed time slots.
- `[x]` **MEET-API-TITLE-001**: When `title` is omitted but `bookId` is provided, the title defaults to "Meeting: {book.title}". When both are omitted, default to "Club Meeting". (`meetings.ts:31-94`)
- `[ ]` **MEET-API-002**: Meetings may optionally link to a book (via `bookId`). API supports it (`meetings.ts:31-94`); UI form does not expose a book picker.

## Availability API

- `[x]` **MEET-API-003**: When a member calls `meetings.submitAvailability`, the system SHALL accept a list of `(slotId, status)` pairs and replace all previous responses for that user across all slots in the meeting. (`meetings.ts:209-246`)
- `[x]` **MEET-DATA-002**: Availability status SHALL be one of: "available", "maybe", "unavailable".
- `[x]` **MEET-UI-001**: Per slot, the response control set SHALL be three buttons: "Available", "Maybe", "Can't" (where "Can't" maps to status="unavailable"). (`respond-meeting.tsx:73-77`)

## Confirmation & Cancellation API

- `[x]` **MEET-API-004**: When an admin calls `meetings.confirm` with a `slotId`, the system SHALL set the meeting status to "confirmed" and store the `confirmedTime` from the selected slot. (`meetings.ts:141-180`)
- `[x]` **MEET-API-005**: When an admin calls `meetings.cancel`, the system SHALL set status to "cancelled". (`meetings.ts:182-207`)
- `[x]` **MEET-API-UPDATE-001**: When an admin calls `meetings.update`, the system SHALL update title, description, and/or location fields. (`meetings.ts:116-139`)
- `[ ]` **MEET-BE-001**: When a confirmed meeting's time has passed, the system SHALL automatically transition its status to "completed". The UI filter treats `status="completed"` as Past, but no scheduled job auto-transitions records.

## Confirmation UI Gaps (mutations exist, UI does not call them)

- `[!]` **MEET-UI-CONFIRM-001**: `meetings.confirm` mutation exists at `meetings.ts:141-180` but **no UI button calls it**. Older spec described a heatmap + AI-recommended banner + "Most available" badge — none implemented. Treat the entire admin confirm flow as a gap:
  - `[ ]` **MEET-UI-CONFIRM-BTN-001**: Admin "Confirm time" button per slot in proposed-meeting view.
  - `[ ]` **MEET-UI-CONFIRM-HEATMAP-001**: Color-coded heatmap (green/amber/light per member per slot).
  - `[ ]` **MEET-UI-CONFIRM-RECOMMEND-001**: AI-recommended banner highlighting best-fit slot.
  - `[ ]` **MEET-UI-CONFIRM-BADGE-001**: "Most available" badge on top-ranked slot.
- `[!]` **MEET-UI-EDIT-001**: `meetings.update` and `meetings.cancel` exist; no UI surfaces them. Treat as gaps:
  - `[ ]` **MEET-UI-EDIT-BTN-001**: Admin "Edit meeting" button on proposed/confirmed meetings.
  - `[ ]` **MEET-UI-CANCEL-BTN-001**: Admin "Cancel meeting" button on proposed/confirmed meetings.

## Time Handling

- `[ ]` **MEET-BE-002**: All meeting timestamps SHALL be stored in UTC. (Likely true via Prisma defaults; not asserted in tests.)
- `[x]` **MEET-UI-004**: The frontend SHALL display meeting times in the user's local timezone (browser-detected). Slot times use `Date.toLocaleString()` (`respond-meeting.tsx:88-95`); confirmed times use `Date.toLocaleTimeString()` (`meetings-client.tsx:141`).

## Notifications

- `[x]` **MEET-NOTIFY-001**: When a meeting is proposed, the system SHALL email all club members. (`meetings.ts:31-94`)
- `[x]` **MEET-NOTIFY-003**: When a meeting is confirmed, the system SHALL email all members with the confirmed time and location. (`meetings.ts:141-180`)
- `[x]` **MEET-NOTIFY-005**: When a meeting is cancelled, the system SHALL email all members. (`meetings.ts:182-207`)
- `[x]` **MEET-NOTIFY-REMIND-001**: Voting deadline reminders, mid-book check-ins, and 48h-since-proposed availability nudges are wired into a separate reminder pipeline (`docs/specs/dash-specs.md`, `tests/integration/cron-deadline-reminder.test.ts`).
- `[ ]` **MEET-NOTIFY-002**: 48h-after-proposal availability reminder for non-responders. (Reminder infra exists; this specific trigger may or may not be live — verify before claiming.)
- `[ ]` **MEET-NOTIFY-004**: 24-hour-before-meeting reminder email.

## Meeting List UI

- `[x]` **MEET-UI-006**: The meeting list SHALL support filter tabs (All / Proposed / Confirmed / Past) with counts. Past tab maps to `status === "completed"` (cancelled meetings are also rendered with `PastMeetingRow`). (`meetings-client.tsx:74-94`)
- `[x]` **MEET-UI-LIST-EMPTY-001**: When no meetings match the filter, the list SHALL display "No meetings scheduled." (`meetings-client.tsx:96-107`)

## Proposed Meeting Row

- `[x]` **MEET-UI-PROP-001**: Each proposed meeting SHALL render an "Awaiting responses" warning badge, the title, the linked book title (if any), the slot count, and the responder count. (`meetings-client.tsx:179-219`)
- `[x]` **MEET-UI-PROP-002**: The row is clickable and SHALL toggle expansion to reveal the respond UI. The right-aligned Button: "Respond" provides an explicit affordance for the same toggle. (`meetings-client.tsx:197-219`)
- `[x]` **MEET-UI-007**: The row counts members responded (deduped by userId across all slots' responses). Older spec's amber-→-green progress bar is not implemented; only the count is shown.
- `[ ]` **MEET-UI-PROP-PROGRESS-001**: Visual response progress bar (0%→100%, amber→green) on proposed meeting rows.

## Respond Meeting UI

- `[x]` **MEET-UI-RESP-001**: For each slot the UI SHALL display formatted local time + duration `(Xmin)` and a row of three buttons: "Available", "Maybe", "Can't". (`respond-meeting.tsx:79-115`)
- `[x]` **MEET-UI-RESP-002**: Selected button SHALL apply success/warning/danger soft-tone styling; unselected uses neutral border. (`respond-meeting.tsx:99-112`)
- `[x]` **MEET-UI-RESP-SAVE-001**: Button: "Save Availability" (`respond-meeting.tsx:121-129`) calls `meetings.submitAvailability`. Validation: at least one slot must have a response; otherwise inline error "Please select availability for at least one time".
- `[x]` **MEET-UI-RESP-CONFIRM-001**: After successful save, a "✓ Saved" confirmation SHALL appear next to the button. (`respond-meeting.tsx:130-134`)

## Confirmed Meeting Row

- `[x]` **MEET-UI-008**: Confirmed meetings SHALL display: a date block (day-of-week / day-of-month / month), the "Confirmed" success badge, the linked book title (if any), the title, the local time, the location (if any), an attendee avatar stack (max 5), and "{N} going · {M} maybe" counts. (`meetings-client.tsx:137-177`)

## Past Meeting Row

- `[x]` **MEET-UI-009**: Past meetings (`status="completed"` or `status="cancelled"`) SHALL render with `opacity-70`, a calendar icon block, "Past" neutral badge, the date, title, location, and attended count. (`meetings-client.tsx:241-267`)
- `[ ]` **MEET-UI-NOTES-IMPL-001**: Wire a "Notes" button on past meetings to a meeting notes/summary view. **Hidden from UI today** — the previous non-functional ghost button was removed (`meetings-client.tsx:241-267`); restore once a destination view exists.

## Meeting Creation UI

- `[x]` **MEET-UI-CREATE-001**: Button: "Propose Meeting" (`create-meeting.tsx:17-24`) is rendered in the meetings page header (admin only via membership check upstream). When clicked it switches the area to the create form.
- `[x]` **MEET-UI-CREATE-002**: The create form SHALL include:
  - Optional Title input (`create-meeting.tsx:122-129`)
  - "+ Add description" toggle that reveals an optional Description textarea (`create-meeting.tsx:132-151`)
  - 2–5 time slots, each with a `datetime-local` input and a duration `<select>` (30 / 60 / 90 / 120 min) (`create-meeting.tsx:154-190`)
  - Button: "+ Add another time" — visible when `slots.length < 5` (`create-meeting.tsx:191-200`)
  - Button: "×" remove per slot — visible when `slots.length > 2` (`create-meeting.tsx:179-188`)
  - Button: "Cancel" (`create-meeting.tsx:210-211`) closes the form
  - Button: "Send to Members" (`create-meeting.tsx:213-221`) submits via `meetings.create`; reloads page on success
- `[x]` **MEET-UI-CREATE-VAL-001**: Submit validation requires at least 2 slots with a non-empty `time`; otherwise inline error "At least 2 time slots are required". (`create-meeting.tsx:83-87`)
- `[ ]` **MEET-UI-014**: "Linked book" dropdown selector. The `bookId` field is in the API but the create form does not expose it.
- `[ ]` **MEET-UI-015**: Location text input. The `location` field is in the API and is rendered on confirmed meetings, but the create form does not collect it.

## Deferred

- `[D]` **MEET-BE-003**: .ics calendar export for confirmed meetings.
- `[D]` **MEET-UI-RECURRING-001**: Recurring meeting templates that pre-fill time slots.
- `[D]` **MEET-BE-004**: Two-way calendar integration (Google Calendar, Outlook).
