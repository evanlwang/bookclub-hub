# Meeting Scheduling Specs

**LLD**: docs/llds/meeting-scheduling.md
**Implementing artifacts**:
- API: `src/server/routers/meetings.ts`
- UI: `src/app/clubs/[clubId]/meetings/page.tsx`, `meetings-client.tsx`, `create-meeting.tsx`, `respond-meeting.tsx`
- Tests: `tests/integration/meetings.test.ts`, `tests/integration/meetings-security.test.ts`, `tests/e2e/meeting-confirm.spec.ts`, `tests/e2e/meeting-create-respond.spec.ts`, `tests/e2e/meeting-filters.spec.ts`, `tests/e2e/meeting-scheduling.spec.ts`, `tests/unit/meetings-availability.test.ts`

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

## Availability API

- `[x]` **MEET-API-003**: When a member calls `meetings.submitAvailability`, the system SHALL accept a list of `(slotId, status)` pairs and replace all previous responses for that user across all slots in the meeting. (`meetings.ts:209-246`)
- `[x]` **MEET-DATA-002**: Availability status SHALL be one of: "available", "maybe", "unavailable".
- `[x]` **MEET-UI-001**: Per slot, the response control set SHALL be three buttons: "Available", "Maybe", "Can't" (where "Can't" maps to status="unavailable"). (`respond-meeting.tsx:73-77`)

## Confirmation & Cancellation API

- `[x]` **MEET-API-004**: When an admin calls `meetings.confirm` with a `slotId`, the system SHALL set the meeting status to "confirmed" and store the `confirmedTime` from the selected slot. (`meetings.ts:141-180`)
- `[x]` **MEET-API-005**: When an admin calls `meetings.cancel`, the system SHALL set status to "cancelled". (`meetings.ts:182-207`)
- `[x]` **MEET-API-UPDATE-001**: When an admin calls `meetings.update`, the system SHALL update title, description, and/or location fields. (`meetings.ts:116-139`)

## Server-side Guards

These specs document invariants enforced inside the `meetings` router and exercised by `tests/integration/meetings-security.test.ts`. They prevent cross-club ID smuggling, malformed time inputs, and out-of-order state transitions.

- `[x]` **MEET-BE-TIME-001**: `meetings.create` SHALL reject any proposed slot whose `time` is not strictly in the future (relative to `Date.now()` at request time), returning `BAD_REQUEST` "Meeting times must be in the future". (`meetings.ts:62-69`)
- `[x]` **MEET-BE-CROSS-001**: `meetings.submitAvailability` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`; mismatched pairs return `NOT_FOUND` (no information leak about the other club's meeting). (`meetings.ts:179-187`)
- `[x]` **MEET-BE-CROSS-002**: `meetings.confirm` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`; mismatched pairs return `NOT_FOUND`. (`meetings.ts:147-154`)
- `[x]` **MEET-BE-CROSS-003**: `meetings.cancel` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`; mismatched pairs return `NOT_FOUND`. (`meetings.ts:237-244`)
- `[x]` **MEET-BE-CROSS-004**: `meetings.update` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`, AND every supplied `slotId` belongs to that meeting (rejecting cross-meeting slot smuggling). (`meetings.ts:289-296`)
- `[x]` **MEET-BE-STATE-001**: `meetings.submitAvailability` SHALL reject the call when the meeting's status is not "proposed" — availability cannot be edited on confirmed/cancelled/completed meetings. (`meetings.ts:179-195`)
- `[x]` **MEET-BE-STATE-002**: `meetings.cancel` SHALL reject the call when the meeting is already in status "cancelled" (no double-cancel). (`meetings.ts:237-252`)

## Confirmation UI Gaps (mutations exist, UI does not call them)

- `[x]` **MEET-UI-CONFIRM-001**: Implemented via the three sub-IDs below. `meetings.confirm` is now wired to an admin-only section inside the proposed-meeting expanded panel.
  - `[x]` **MEET-UI-CONFIRM-BTN-001**: When the viewer's role for the club is `owner` or `admin`, the proposed-meeting expanded panel SHALL render an admin section (`data-testid="admin-confirm-section"`) listing every slot with a "Confirm time" button (`data-testid="confirm-slot-{slotId}"`). Clicking calls `meetings.confirm({clubId, meetingId, slotId})` and refreshes the route. Plain members SHALL NOT see this section.
  - `[x]` **MEET-UI-CONFIRM-HEATMAP-001**: The admin section SHALL render a heatmap with one row per responder (any member who has submitted at least one availability response for this meeting) and one column per slot. Each cell SHALL render a colored dot — `available`=success, `maybe`=warning, `unavailable`=danger, no-response=neutral. `data-testid="heatmap-cell-{userId}-{slotId}"` carries `data-status="available|maybe|unavailable|none"`.
  - `[D]` **MEET-UI-CONFIRM-RECOMMEND-001**: Deferred — superseded by `MEET-UI-CONFIRM-BADGE-001`. The "Most available" badge IS the recommendation. Reintroduce only if a richer recommendation surface is required.
  - `[x]` **MEET-UI-CONFIRM-BADGE-001**: The slot with the highest `available` response count SHALL display a "Most available" Badge (`data-testid="most-available-badge"`). Ties broken by `available + maybe` count, then by `proposedTime ASC`. If no slot has any responses, no badge SHALL be shown. Ranking computed by `src/lib/meetings/availability.ts#pickMostAvailableSlot` (unit tested).
- `[x]` **MEET-UI-EDIT-001**: Both `meetings.update` and `meetings.cancel` are now wired into the meetings UI for admins (see sub-IDs below).
  - `[x]` **MEET-UI-EDIT-BTN-001**: An owner or admin viewing a proposed or confirmed meeting SHALL see an "Edit" link (`data-testid="edit-meeting-{meetingId}"`). Clicking opens a focus-trapped dialog (`data-testid="edit-meeting-dialog"`) with editable title, location, and description fields. Saving POSTs to `meetings.update` and the parent merges the new fields optimistically. The Save button is disabled until at least one field changes.
  - `[x]` **MEET-UI-CANCEL-BTN-001**: An owner or admin viewing a proposed or confirmed meeting SHALL see a "Cancel meeting" link (`data-testid="cancel-meeting-{meetingId}"`). Clicking opens a focus-trapped dialog (`data-testid="cancel-meeting-dialog"`); confirming POSTs to `meetings.cancel` and the parent flips the meeting to status `cancelled` optimistically.

## Time Handling

- `[x]` **MEET-UI-004**: The frontend SHALL display meeting times in the user's local timezone (browser-detected). Slot times use `Date.toLocaleString()` (`respond-meeting.tsx:88-95`); confirmed times use `Date.toLocaleTimeString()` (`meetings-client.tsx:141`).

## Notifications

- `[x]` **MEET-NOTIFY-001**: When a meeting is proposed, the system SHALL email all club members. (`meetings.ts:31-94`)
- `[x]` **MEET-NOTIFY-003**: When a meeting is confirmed, the system SHALL email all members with the confirmed time and location. (`meetings.ts:141-180`)
- `[x]` **MEET-NOTIFY-005**: When a meeting is cancelled, the system SHALL email all members. (`meetings.ts:182-207`)
- `[x]` **MEET-NOTIFY-REMIND-001**: Voting deadline reminders, mid-book check-ins, and 48h-since-proposed availability nudges are wired into a separate reminder pipeline (`docs/specs/dash-specs.md`, `tests/integration/cron-deadline-reminder.test.ts`).

## Meeting List UI

- `[x]` **MEET-UI-006**: The meeting list SHALL support filter tabs (All / Proposed / Confirmed / Past) with counts. Past tab maps to `status === "completed"` (cancelled meetings are also rendered with `PastMeetingRow`). (`meetings-client.tsx:74-94`)
- `[x]` **MEET-UI-LIST-EMPTY-001**: When no meetings match the filter, the list SHALL display "No meetings scheduled." (`meetings-client.tsx:96-107`)

## Proposed Meeting Row

- `[x]` **MEET-UI-PROP-001**: Each proposed meeting SHALL render an "Awaiting responses" warning badge, the title, the linked book title (if any), the slot count, and the responder count. (`meetings-client.tsx:179-219`)
- `[x]` **MEET-UI-PROP-002**: The row is clickable and SHALL toggle expansion to reveal the respond UI. The right-aligned Button: "Respond" provides an explicit affordance for the same toggle. (`meetings-client.tsx:197-219`)
- `[x]` **MEET-UI-007**: The row counts members responded (deduped by userId across all slots' responses). Older spec's amber-→-green progress bar is not implemented; only the count is shown.
- `[x]` **MEET-UI-PROP-PROGRESS-001**: Each proposed meeting row SHALL render a thin horizontal progress bar reflecting `responded / memberCount` as a percentage. The fill SHALL be a CSS gradient running from `--color-warning` (amber, left edge / 0%) to `--color-success` (green, right edge / 100%), revealed by `clip-path` so partial fills show partial gradient. The bar carries `data-testid="response-progress-{meetingId}"`, `data-percentage` (0–100 integer), and `data-tone` (`"green"` when 100%, otherwise `"amber"`); also exposed as a `role="progressbar"` with `aria-valuenow/min/max`. (`meetings-client.tsx` `ResponseProgress`)

## Respond Meeting UI

- `[x]` **MEET-UI-RESP-001**: For each slot the UI SHALL display formatted local time + duration `(Xmin)` and a row of three buttons: "Available", "Maybe", "Can't". (`respond-meeting.tsx:79-115`)
- `[x]` **MEET-UI-RESP-002**: Selected button SHALL apply success/warning/danger soft-tone styling; unselected uses neutral border. (`respond-meeting.tsx:99-112`)
- `[x]` **MEET-UI-RESP-SAVE-001**: Button: "Save Availability" (`respond-meeting.tsx:121-129`) calls `meetings.submitAvailability`. Validation: at least one slot must have a response; otherwise inline error "Please select availability for at least one time".
- `[x]` **MEET-UI-RESP-CONFIRM-001**: After successful save, a "✓ Saved" confirmation SHALL appear next to the button. (`respond-meeting.tsx:130-134`)

## Confirmed Meeting Row

- `[x]` **MEET-UI-008**: Confirmed meetings SHALL display: a date block (day-of-week / day-of-month / month), the "Confirmed" success badge, the linked book title (if any), the title, the local time, the location (if any), an attendee avatar stack (max 5), and "{N} going · {M} maybe" counts. (`meetings-client.tsx:137-177`)

## Past Meeting Row

- `[x]` **MEET-UI-009**: Past meetings (`status="completed"` or `status="cancelled"`) SHALL render with `opacity-70`, a calendar icon block, "Past" neutral badge, the date, title, location, and attended count. (`meetings-client.tsx:241-267`)

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
