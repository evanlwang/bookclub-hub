# Meeting Scheduling

## Context and Design Philosophy

Meetings are where the book club actually meets. Scheduling is the second-highest-friction activity after book selection. This LLD replaces the Doodle-poll-in-a-group-chat pattern with an integrated availability poll tied to the club's current book.

Design philosophy: **lightweight scheduling, not a calendar app**. The system proposes times, collects availability, and confirms a meeting. It does not manage recurring schedules, integrate with external calendars (v1), or handle time zones beyond displaying them correctly.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Meeting Lifecycle

ASCII state diagram (greppable):

```
proposed → confirmed → completed
proposed → cancelled
confirmed → cancelled
```

State: proposed — buttons shown: "Respond", per-slot "Available"/"Maybe"/"Can't", "Save Availability"; admin only: heatmap, per-slot "Confirm" (within `admin-confirm-section`), and Edit/Cancel under a Details disclosure — transitions: → confirmed (`meetings.confirm` via admin-confirm UI); → cancelled (Cancel button under Details)
State: confirmed — buttons shown: read-only meeting details for all members; admin only: Edit and "Cancel meeting" hidden behind a "Details" toggle (`MEET-UI-DETAILS-DISCLOSURE-001`) — transitions: → completed (auto when time passes; **not enforced via background job**); → cancelled (Cancel under Details disclosure)
State: completed — buttons shown: "Notes" (no-op handler) — transitions: terminal
State: cancelled — buttons shown: rendered as Past with no-op "Notes" — transitions: terminal

Phase descriptions:
- **Proposed**: admin offers 2–5 candidate slots. Members mark availability per slot. Admin sees an availability heatmap and confirms one slot.
- **Confirmed**: a slot has been picked. Confirmed time and location are surfaced to all members. Admin can still Edit or Cancel via the Details disclosure on the confirmed card.
- **Completed**: time has passed. Today reached only by manual `meetings.update` or via the API; no scheduled job.
- **Cancelled**: admin cancels via the Cancel button in the Details disclosure (or via API).

## Button Inventory

Button: "Propose Meeting" — `create-meeting.tsx:17-24` — visible: meetings page header (admin only) — handler: opens CreateMeetingForm
Button: filter tabs "All" / "Proposed" / "Confirmed" / "Past" — `meetings-client.tsx:74-94` — visible: always — handler: setFilter (client state)
Button: meeting row toggle (proposed) — `meetings-client.tsx:197-219` — visible: status="proposed" — handler: expand/collapse RespondMeeting
Button: "Respond" — `meetings-client.tsx:216-218` — visible: status="proposed" — handler: same toggle as row click
Button: "Available" / "Maybe" / "Can't" (per slot) — `respond-meeting.tsx:97-113` — visible: respond UI expanded — handler: setSlotResponse (client state)
Button: "Save Availability" — `respond-meeting.tsx:121-129` — visible: respond UI expanded — enabled: ≥1 slot has a response — handler: `meetings.submitAvailability`
Button: "Notes" — `meetings-client.tsx:264` — visible: status="completed" or "cancelled" — **handler: NO-OP (no onClick wired)**
Button: meeting title input — `create-meeting.tsx:122-129` — optional
Button: "+ Add description" — `create-meeting.tsx:132-139` — visible: showDesc=false — handler: reveals description textarea
Button: per-slot datetime input — `create-meeting.tsx:160-166` — always visible per slot
Button: per-slot duration select (30/60/90/120 min) — `create-meeting.tsx:167-178` — always visible per slot
Button: "×" remove slot — `create-meeting.tsx:179-188` — visible: slots.length > 2 — handler: removeSlot
Button: "+ Add another time" — `create-meeting.tsx:191-200` — visible: slots.length < 5 — handler: addSlot
Button: "Cancel" (create form) — `create-meeting.tsx:210-211` — visible: form open — handler: closes form
Button: "Send to Members" — `create-meeting.tsx:213-221` — visible: form open — enabled: ≥2 slots have a time — handler: `meetings.create`; on success the new meeting is optimistically prepended to the meetings.list cache and an invalidation backfills server-authoritative state (MEET-UI-CREATE-003, MEET-UI-CACHE-SOT-001)
Button: location text input — `create-meeting.tsx:248-251` — visible: form open — handler: setLocation; submitted with `meetings.create`
Button: per-slot "Confirm" — `admin-confirm.tsx` (within `admin-confirm-section`) — visible: status="proposed", admin only — handler: `meetings.confirm` (MEET-UI-CONFIRM-BTN-001)
Button: "Details" toggle — `meetings-client.tsx:373-394` — visible: status="confirmed", admin only — handler: toggles disclosure of Edit/Cancel buttons (MEET-UI-DETAILS-DISCLOSURE-001)
Button: "Edit" — `edit-meeting-button.tsx` — visible: under Details disclosure on confirmed cards, or on proposed cards admin only — handler: opens focus-trapped dialog wired to `meetings.update` (MEET-UI-EDIT-BTN-001)
Button: "Cancel meeting" — `cancel-meeting-button.tsx` — visible: under Details disclosure on confirmed cards, or on proposed cards admin only — handler: opens focus-trapped dialog wired to `meetings.cancel` (MEET-UI-CANCEL-BTN-001)

## Live Updates

Mechanism owned by `docs/llds/live-updates.md`; this segment's surfaces:

- **`meetings.list` query cache is the client source of truth** (MEET-UI-CACHE-SOT-001): the meetings client renders from the polled query (30s interval, RSC-seeded `initialData`) instead of a one-time `useState(initialMeetings)` copy. The optimistic `apply*` helpers (create/confirm/cancel/respond) become `utils.meetings.list.setData` transforms with the same reshaping bodies; trailing `router.refresh()` calls on counter-only paths are replaced by invalidation (`meetings.list`, `clubs.navState`).
- **Other members' responses appear within 30s** — response counts, the amber→green progress bar, heatmap cells, attendee stacks (MEET-UI-LIVE-001).
- **Availability submit is optimistic with rollback** (MEET-UI-RESPOND-OPTIMISTIC-001).

## Gaps (mutations exist, UI does not call them)

Linked-book dropdown in create form — `[ ]` API supports `bookId`; UI does not.
"Notes" button handler — `[!]` button rendered without onClick (`meetings-client.tsx`).
Auto-transition to "completed" when confirmedTime passes — `[ ]` no scheduled job; status remains "confirmed" until updated.
(Resolved: amber→green response progress bar shipped as MEET-UI-PROP-PROGRESS-001.)

## Data Model

```
Meeting {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book, nullable -- nullable for non-book meetings)
  title: string (default: "Meeting: {book title}" or "Club Meeting")
  description: string (nullable)
  status: enum("proposed", "confirmed", "completed", "cancelled")
  confirmed_time: timestamp (nullable -- set when confirmed)
  location: string (nullable)
  created_by: UUID (FK -> User)
  created_at: timestamp
  updated_at: timestamp
}

MeetingTimeSlot {
  id: UUID (PK)
  meeting_id: UUID (FK -> Meeting)
  proposed_time: timestamp
  duration_minutes: integer (default 120; allowed 15-240)
}

AvailabilityResponse {
  id: UUID (PK)
  slot_id: UUID (FK -> MeetingTimeSlot)
  user_id: UUID (FK -> User)
  status: enum("available", "maybe", "unavailable")
  created_at: timestamp
  UNIQUE(slot_id, user_id)
}
```

## API Contracts

| Procedure | Auth | Input | Output | Notes |
|-----------|------|-------|--------|-------|
| `meetings.list` | member | `{ clubId, status? }` | `[{ meeting, slots, responses }]` | createdAt DESC |
| `meetings.create` | admin+ | `{ clubId, title?, bookId?, description?, location?, slots[] }` | `{ meeting }` | 2–5 slots, 15–240 min each, default 120 |
| `meetings.get` | member | `{ clubId, meetingId }` | `{ meeting, slots, responses }` | full detail |
| `meetings.update` | admin+ | `{ clubId, meetingId, title?, description?, location? }` | `{ meeting }` | only provided fields |
| `meetings.confirm` | admin+ | `{ clubId, meetingId, slotId }` | `{ meeting }` | sets confirmedTime, status="confirmed" |
| `meetings.cancel` | admin+ | `{ clubId, meetingId }` | `{ success: true }` | sets status="cancelled" |
| `meetings.submitAvailability` | member | `{ clubId, meetingId, responses[] }` | `{ success: true }` | replaces all prior responses for user |

## Notification Triggers (via Resend)

- `[x]` Meeting proposed → email all members (`meetings.ts:31-94`)
- `[x]` Meeting confirmed → email all members with time + location (`meetings.ts:141-180`)
- `[x]` Meeting cancelled → email all members (`meetings.ts:182-207`)
- `[ ]` 48h-after-proposal availability reminder for non-responders
- `[ ]` 24h-before-confirmed-meeting reminder

## Time Zone Handling

All timestamps stored in UTC (Prisma default). Frontend displays in user's local timezone via `toLocaleString` / `toLocaleTimeString`. Proposal UI uses `<input type="datetime-local">` which submits in user-local time and is converted to UTC via `new Date(s.time).toISOString()` (`create-meeting.tsx:79`). No per-user timezone setting in v1.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Scheduling model | Propose-and-respond (Doodle-style) | Fixed recurring schedule; calendar integration | Proven pattern for small-group scheduling. |
| Availability options | Three-state (available, maybe, unavailable) | Binary; four-state | Three states capture useful nuance. |
| Who confirms the time | Admin picks from responses | Auto-confirm best fit; group vote | Admin knows context the algorithm doesn't. Confirm UI: heatmap + per-slot Confirm + "Most available" badge (MEET-UI-CONFIRM-*). |
| Meeting-book linkage | Optional FK to Book | Required; no linkage | Optional; clubs may have non-book meetings. |
| Slot remove threshold | Allow removal only when slots.length > 2 | Allow removal of any slot | Enforces 2-slot minimum at the UI layer. |
| Slot add threshold | Allow add only when slots.length < 5 | Unbounded | Enforces 5-slot maximum at the UI layer. |

## Open Questions

### Resolved

1. ✅ Doodle-style propose-and-respond.
2. ✅ Three-state availability with "Available" / "Maybe" / "Can't" labels.
3. ✅ Admin confirms (in API).

### Deferred

1. **Linked-book picker in create form.**
2. **"Notes" button on past meetings.** Currently a no-op placeholder.
3. **Calendar export (.ics).**
4. **Recurring meeting templates.**
5. **External calendar integration (Google Calendar, Outlook).**
6. **Auto-transition to "completed" via scheduled job.**
(Resolved since first draft: admin confirmation UI incl. heatmap + "Most available" badge (MEET-UI-CONFIRM-*), Edit/Cancel UI (MEET-UI-EDIT-/CANCEL-BTN-001), location input in create form (MEET-UI-CREATE-002).)

## References

- `docs/specs/meet-specs.md`
- `docs/llds/club-management.md` — meetings are club-scoped
- `docs/llds/book-selection-and-voting.md` — meetings link to books
- `docs/high-level-design.md`
