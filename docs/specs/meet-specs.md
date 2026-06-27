# Meeting Scheduling Specs

**LLD**: docs/llds/meeting-scheduling.md
**Implementing artifacts**:
- API: `src/server/routers/meetings.ts`
- UI: `src/app/clubs/[clubId]/meetings/page.tsx`, `meetings-client.tsx`, `create-meeting.tsx`, `respond-meeting.tsx`
- Tests: `tests/integration/meetings.test.ts`, `tests/integration/meetings-security.test.ts`, `tests/e2e/meeting-confirm.spec.ts`, `tests/e2e/meeting-create-respond.spec.ts`, `tests/e2e/meeting-filters.spec.ts`, `tests/e2e/meeting-scheduling.spec.ts`, `tests/e2e/live-updates.spec.ts`, `tests/unit/meetings-availability.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Meeting Lifecycle

State: proposed — buttons shown: "Respond"/"Update" (all members), expanded: per-slot "Available"/"Maybe"/"Can't" (auto-saves on each selection, all members); "Propose Meeting" (admin, header); admin-only in the expanded panel: availability heatmap, per-slot "Confirm time", "Edit", "Cancel meeting" (the admin-confirm section) — transitions: → confirmed (admin via `meetings.confirm`, wired to the "Confirm time" buttons — `MEET-UI-CONFIRM-BTN-001`), → cancelled (admin via `meetings.cancel`, wired to the "Cancel meeting" button — `MEET-UI-CANCEL-BTN-001`)
State: confirmed — buttons shown: read-only details for all members; admin-only "Edit" and "Cancel meeting" revealed behind a "Details" toggle (`MEET-UI-DETAILS-DISCLOSURE-001`) — transitions: → completed (manual via `meetings.update`; **no scheduled job / auto-complete**), → cancelled (admin via `meetings.cancel` behind the Details toggle — `MEET-UI-CANCEL-BTN-001`)
State: completed — buttons shown: none (display only; a Notes button remains deferred and is not rendered) — transitions: terminal
State: cancelled — buttons shown: none (rendered as "Past") — transitions: terminal

## Meeting Creation API

- `[x]` **MEET-API-001**: When an admin calls `meetings.create` with 2–5 time slots, the system SHALL create the meeting in "proposed" status with the specified slots. (`meetings.ts:47-122`)
- `[x]` **MEET-API-CREATE-VAL-001**: `meetings.create` SHALL validate 2–5 slots and 15–240 min duration each (default 120). (`meetings.ts:47-122`)
- `[x]` **MEET-DATA-001**: Each meeting SHALL have 2–5 proposed time slots.
- `[x]` **MEET-API-TITLE-001**: When `title` is omitted but `bookId` is provided, the title defaults to "Meeting: {book.title}". When both are omitted, default to "Club Meeting". (`meetings.ts:47-122`)

## Availability API

- `[x]` **MEET-API-003**: When a member calls `meetings.submitAvailability`, the system SHALL accept a list of `(slotId, status)` pairs and replace all previous responses for that user across all slots in the meeting. (`meetings.ts:283-347`)
- `[x]` **MEET-DATA-002**: Availability status SHALL be one of: "available", "maybe", "unavailable".
- `[x]` **MEET-UI-001**: Per slot, the response control set SHALL be three buttons: "Available", "Maybe", "Can't" (where "Can't" maps to status="unavailable"). (`respond-meeting.tsx:135-192`)

## Confirmation & Cancellation API

- `[x]` **MEET-API-004**: When an admin calls `meetings.confirm` with a `slotId`, the system SHALL set the meeting status to "confirmed" and store the `confirmedTime` from the selected slot. (`meetings.ts:178-238`)
- `[x]` **MEET-API-005**: When an admin calls `meetings.cancel`, the system SHALL set status to "cancelled". (`meetings.ts:240-281`)
- `[x]` **MEET-API-UPDATE-001**: When an admin calls `meetings.update`, the system SHALL update title, description, and/or location fields. (`meetings.ts:144-176`)

## Server-side Guards

These specs document invariants enforced inside the `meetings` router and exercised by `tests/integration/meetings-security.test.ts`. They prevent cross-club ID smuggling, malformed time inputs, and out-of-order state transitions.

- `[x]` **MEET-BE-TIME-001**: `meetings.create` SHALL reject any proposed slot whose `time` is not strictly in the future (relative to `Date.now()` at request time), returning `BAD_REQUEST` "Meeting times must be in the future". (`meetings.ts:67-74`)
- `[x]` **MEET-BE-CROSS-001**: `meetings.confirm` SHALL verify the supplied `meetingId` belongs to the supplied `clubId` AND that the supplied `slotId` belongs to that meeting; a slot from another meeting returns `NOT_FOUND` and leaves the meeting in "proposed". (`meetings.ts:190-210`)
- `[x]` **MEET-BE-CROSS-002**: `meetings.update` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`; mismatched pairs return `NOT_FOUND` (no cross-club edit). (`meetings.ts:156-162`)
- `[x]` **MEET-BE-CROSS-003**: `meetings.cancel` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`; mismatched pairs return `NOT_FOUND`. (`meetings.ts:247-253`)
- `[x]` **MEET-BE-CROSS-004**: `meetings.submitAvailability` SHALL verify the supplied `meetingId` belongs to the supplied `clubId`, AND every supplied `slotId` belongs to that meeting (rejecting cross-meeting slot smuggling); offenders return `NOT_FOUND`/`BAD_REQUEST` and write no rows. (`meetings.ts:303-327`)
- `[x]` **MEET-BE-STATE-001**: Both `meetings.confirm` and `meetings.submitAvailability` SHALL reject the call when the meeting's status is not "proposed" — a meeting cannot be (re-)confirmed and availability cannot be edited once it is confirmed/cancelled/completed. (`meetings.ts:197-202` confirm; `meetings.ts:312` + `src/lib/meetings/validation.ts:39-46` submitAvailability)
- `[x]` **MEET-BE-STATE-002**: `meetings.cancel` SHALL reject the call when the meeting is already in status "cancelled" (no double-cancel). (`meetings.ts:254-259`)
- `[x]` **MEET-BE-RESP-EMPTY-001**: `meetings.submitAvailability` SHALL reject a submission whose `responses` array is empty, returning `BAD_REQUEST` "Please select availability for at least one time" (mirrors the client-side guard in `MEET-UI-RESP-SAVE-001`). (`src/lib/meetings/validation.ts:24-33`, called from `meetings.ts:299`)
- `[x]` **MEET-BE-CREATE-DEDUP-001**: `meetings.create` SHALL reject any two proposed slots that share the same start instant (compared by `getTime()`, even when their durations differ), returning `BAD_REQUEST` "Duplicate time slots are not allowed". (`src/lib/meetings/validation.ts:53-67`, called from `meetings.ts:77`)

## Confirmation & Edit UI (mutations now wired into the meetings UI)

- `[x]` **MEET-UI-CONFIRM-001**: Implemented via the three sub-IDs below. `meetings.confirm` is now wired to an admin-only section inside the proposed-meeting expanded panel.
  - `[x]` **MEET-UI-CONFIRM-BTN-001**: When the viewer's role for the club is `owner` or `admin`, the proposed-meeting expanded panel SHALL render an admin section (`data-testid="admin-confirm-section"`) listing every slot with a "Confirm time" button (`data-testid="confirm-slot-{slotId}"`). Clicking calls `meetings.confirm({clubId, meetingId, slotId})`; the meetings cache updates optimistically and reconciles via invalidation (MEET-UI-CACHE-SOT-001). Plain members SHALL NOT see this section.
  - `[x]` **MEET-UI-CONFIRM-HEATMAP-001**: The admin section SHALL render a heatmap with one row per responder (any member who has submitted at least one availability response for this meeting) and one column per slot. Each cell SHALL render a colored dot — `available`=success, `maybe`=warning, `unavailable`=danger, no-response=neutral. `data-testid="heatmap-cell-{userId}-{slotId}"` carries `data-status="available|maybe|unavailable|none"`.
  - `[D]` **MEET-UI-CONFIRM-RECOMMEND-001**: Deferred — superseded by `MEET-UI-CONFIRM-BADGE-001`. The "Most available" badge IS the recommendation. Reintroduce only if a richer recommendation surface is required.
  - `[x]` **MEET-UI-CONFIRM-BADGE-001**: The slot with the highest `available` response count SHALL display a "Most available" Badge (`data-testid="most-available-badge"`). Ties broken by `available + maybe` count, then by `proposedTime ASC`. If no slot has any responses, no badge SHALL be shown. Ranking computed by `src/lib/meetings/availability.ts#pickMostAvailableSlot` (unit tested).
- `[x]` **MEET-UI-EDIT-001**: Both `meetings.update` and `meetings.cancel` are now wired into the meetings UI for admins (see sub-IDs below).
  - `[x]` **MEET-UI-EDIT-BTN-001**: An owner or admin viewing a proposed or confirmed meeting SHALL see an "Edit" link (`data-testid="edit-meeting-{meetingId}"`). Clicking opens a focus-trapped dialog (`data-testid="edit-meeting-dialog"`) with editable title, location, and description fields. Saving POSTs to `meetings.update` and the parent merges the new fields optimistically. The Save button is disabled until at least one field changes.
  - `[x]` **MEET-UI-CANCEL-BTN-001**: An owner or admin viewing a proposed or confirmed meeting SHALL see a "Cancel meeting" link (`data-testid="cancel-meeting-{meetingId}"`). Clicking opens a focus-trapped dialog (`data-testid="cancel-meeting-dialog"`); confirming POSTs to `meetings.cancel` and the parent flips the meeting to status `cancelled` optimistically.
  - `[x]` **MEET-UI-DETAILS-DISCLOSURE-001**: On a confirmed-meeting card, the Edit and Cancel admin actions SHALL be hidden by default and revealed via a "Details" toggle button (`data-testid="meeting-details-toggle-{meetingId}"`) carrying `aria-expanded`. The toggle is rendered only when the viewer is an owner or admin. Clicking the toggle reveals/hides both the Edit and Cancel buttons (they remain registered to their existing test IDs and EARS — only their visibility is gated).

## Time Handling

- `[x]` **MEET-UI-004**: The frontend SHALL display meeting times in the user's local timezone (browser-detected). Slot times use `Date.toLocaleString()` (`respond-meeting.tsx:156-163`); confirmed times use `Date.toLocaleTimeString()` (`meetings-client.tsx:352`).

## Notifications

- `[x]` **MEET-NOTIFY-001**: When a meeting is proposed, the system SHALL email all club members. (`meetings.ts:47-122`)
- `[x]` **MEET-NOTIFY-003**: When a meeting is confirmed, the system SHALL email all members with the confirmed time and location. (`meetings.ts:178-238`)
- `[x]` **MEET-NOTIFY-005**: When a meeting is cancelled, the system SHALL email all members. (`meetings.ts:240-281`)
- `[x]` **MEET-NOTIFY-REMIND-001**: Voting deadline reminders, mid-book check-ins, and 48h-since-proposed availability nudges are wired into a separate reminder pipeline (`docs/specs/dash-specs.md`, `tests/integration/cron-deadline-reminder.test.ts`).
- `[x]` **MEET-NOTIFY-NONBLOCK-001**: Meeting notification email failures SHALL NOT cause `meetings.propose`, `meetings.confirm`, or `meetings.cancel` to fail. Email is a best-effort side effect; the meeting state change is the contract. Same handling lives inside the shared email service as `VOTE-NOTIFY-NONBLOCK-001`. (`src/server/services/email.ts`)

## Meeting List UI

- `[x]` **MEET-UI-006**: The meeting list SHALL support filter tabs (All / Proposed / Confirmed / Past) with counts. Past tab maps to `status === "completed"` (cancelled meetings are also rendered with `PastMeetingRow`). (`meetings-client.tsx:255-278`)
- `[x]` **MEET-UI-LIST-EMPTY-001**: When no meetings match the filter, the list SHALL display an empty-state message (`data-testid="no-meetings"`): "No meetings yet — propose one to get started." for the All filter, otherwise "No {filter} meetings." (`meetings-client.tsx:280-293`)

## Proposed Meeting Row

- `[x]` **MEET-UI-PROP-001**: Each proposed meeting SHALL render a per-viewer status badge ("Awaiting your response" warning, or "You responded" success), the title, the linked book title (if any), the slot count, and the responder count. (`meetings-client.tsx:489-506`)
- `[x]` **MEET-UI-PROP-002**: The row is clickable and SHALL toggle expansion to reveal the respond UI. The right-aligned Button ("Respond", or "Update" once the viewer has responded) provides an explicit affordance for the same toggle. (`meetings-client.tsx:476-510`)
- `[x]` **MEET-UI-007**: The row counts members responded (deduped by userId across all slots' responses). Older spec's amber-→-green progress bar is not implemented; only the count is shown.
- `[x]` **MEET-UI-PROP-PROGRESS-001**: Each proposed meeting row SHALL render a thin horizontal progress bar reflecting `responded / memberCount` as a percentage. The fill SHALL be a CSS gradient running from `--color-warning` (amber, left edge / 0%) to `--color-success` (green, right edge / 100%), revealed by `clip-path` so partial fills show partial gradient. The bar carries `data-testid="response-progress-{meetingId}"`, `data-percentage` (0–100 integer), and `data-tone` (`"green"` when 100%, otherwise `"amber"`); also exposed as a `role="progressbar"` with `aria-valuenow/min/max`. (`meetings-client.tsx` `ResponseProgress`)

## Respond Meeting UI

- `[x]` **MEET-UI-RESP-001**: For each slot the UI SHALL display formatted local time + duration `(Xmin)` and a row of three buttons: "Available", "Maybe", "Can't". (`respond-meeting.tsx:150-194`)
- `[x]` **MEET-UI-RESP-002**: Selected button SHALL apply success/warning/danger soft-tone styling; unselected uses a dashed neutral border. (`respond-meeting.tsx:166-189`)
- `[x]` **MEET-UI-RESP-SAVE-001**: Availability SHALL auto-save on each per-slot selection (no dedicated "Save Availability" button); each change calls `meetings.submitAvailability`. Validation: at least one slot must have a response, otherwise an inline error "Please select availability for at least one time" is shown and no request is sent. (`respond-meeting.tsx:95-115`; guard at `respond-meeting.tsx:101-107`)
- `[x]` **MEET-UI-RESP-CONFIRM-001**: After a successful save, a "✓ Saved" confirmation SHALL appear in the status line. (`respond-meeting.tsx:203-207`)

## Confirmed Meeting Row

- `[x]` **MEET-UI-008**: Confirmed meetings SHALL display: a date stamp block, the "Confirmed" success badge, the title, the local time, the location (if any), the linked book title (if any), an attendee avatar stack (max 4), and "{N} going" with "· {M} maybe" appended only when M > 0. (`meetings-client.tsx:336-435`)

## Past Meeting Row

- `[x]` **MEET-UI-009**: Past meetings (`status="completed"` or `status="cancelled"`) SHALL render muted (`opacity-75`), with a muted date stamp (or a "—" placeholder when there is no confirmed time), a rotated "PAST"/"CANCELLED" rubber-stamp marker, the title, the location, and the attended count (or "Cancelled" when applicable). (`meetings-client.tsx:546-575`)

## Live Updates (mechanism: docs/llds/live-updates.md)

- `[x]` **MEET-UI-LIVE-001**: WHILE a member is viewing the meetings page, other members' availability responses (response counts, progress bar fill per MEET-UI-PROP-PROGRESS-001, heatmap cells, attendee stacks) and meeting state changes SHALL appear within 30s via a polled `meetings.list` query — without a reload.
- `[x]` **MEET-UI-CACHE-SOT-001**: The meetings client SHALL render from the `meetings.list` query cache (seeded with RSC `initialData`) rather than a one-time `useState` copy of initial props, so polled refetches and `setData` writes are the single source of truth. The existing optimistic `apply*` helpers become cache transforms with unchanged reshaping semantics.
- `[x]` **MEET-UI-RESPOND-OPTIMISTIC-001**: WHEN the viewer saves availability, the response counts and their own per-slot selections SHALL update immediately via a cache write. IF the mutation fails, the prior cache state SHALL be restored and the existing inline error shown. On settle, `meetings.list` SHALL be invalidated for server reconciliation.

## Meeting Creation UI

- `[x]` **MEET-UI-CREATE-001**: Button: "Propose Meeting" (`create-meeting.tsx:108-123`, `ProposeMeetingTrigger`) is rendered in the meetings page header (admin only via membership check upstream). When clicked it switches the area to the create form.
- `[x]` **MEET-UI-CREATE-002**: The create form SHALL include:
  - Optional Title input (`create-meeting.tsx:231-241`) and an optional Location input (`create-meeting.tsx:251-258`)
  - "+ Add description" toggle that reveals an optional Description textarea (`create-meeting.tsx:262-289`)
  - 2–5 time slots, each rendered with a custom `<DateTimePicker>` (calendar icon, popover with month grid + AM/PM time chooser, Esc/click-outside dismissal, keeping the "YYYY-MM-DDTHH:MM" local-ISO contract of a native datetime-local input) and a duration `<select>` offering 30 / 45 / 60 / 90 / 120 / 150 / 180 / 240 min, default 120. A row of quick-pick chips above the slots ("Tonight 7pm" — shown only when 7pm is still upcoming today —, "Tomorrow 7pm", "Sat 7pm", "Next Sat 7pm") prefills the next empty slot at 7:00 PM local; a small inline relative-date line ("today" / "tomorrow" / "in N days") under each filled slot supplements the picker trigger's absolute date readout. (`create-meeting.tsx:291-366`, `date-time-picker.tsx`)
  - Button: "+ Add another time" — visible when `slots.length < 5` (`create-meeting.tsx:367-376`)
  - Button: "×" remove per slot — visible when `slots.length > 2` (`create-meeting.tsx:343-353`)
  - Button: "Cancel" (`create-meeting.tsx:386-388`) closes the form
  - Button: "Send to Members" (`create-meeting.tsx:389-397`) submits via `meetings.create`; on success it optimistically updates the meetings list cache (see MEET-UI-CREATE-003), no page reload
- `[x]` **MEET-UI-CREATE-VAL-001**: Submit validation requires at least 2 slots with a non-empty `time`, otherwise inline error "At least 2 time slots are required"; it also rejects duplicate slot instants client-side with inline error "Two time slots have the same date and time" (mirrors MEET-BE-CREATE-DEDUP-001). (`create-meeting.tsx:185-221`)
- `[x]` **MEET-UI-CREATE-003**: When `meetings.create` succeeds, the meetings list SHALL reflect the newly created meeting immediately on the proposer's screen without requiring a manual page reload. Implemented by optimistic prepend to the `meetings.list` query cache in `MeetingsClient` plus invalidation for server-authoritative backfill, mirroring the pattern used by confirm/cancel/edit/respond (MEET-UI-CACHE-SOT-001). (`create-meeting.tsx` `onCreated`, `meetings-client.tsx` `applyCreatedMeeting`)
