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

State: proposed — buttons shown: "Respond"/"Update", per-slot "Available"/"Maybe"/"Can't" (availability auto-saves on each selection — no "Save" button); admin only: heatmap, per-slot "Confirm time", and Edit/"Cancel meeting" (within `admin-confirm-section`) — transitions: → confirmed (`meetings.confirm` via the "Confirm time" buttons); → cancelled (`meetings.cancel` via the "Cancel meeting" button)
State: confirmed — buttons shown: read-only meeting details for all members; admin only: Edit and "Cancel meeting" hidden behind a "Details" toggle (`MEET-UI-DETAILS-DISCLOSURE-001`) — transitions: → completed (**manual via `meetings.update` only; no background job / auto-complete**); → cancelled (Cancel under Details disclosure)
State: completed — buttons shown: none (display only) — transitions: terminal
State: cancelled — buttons shown: none (excluded from the meetings list per `MEET-UI-LIST-001`; retained in DB) — transitions: terminal

Phase descriptions:
- **Proposed**: admin offers 2–5 candidate slots. Members mark availability per slot. Admin sees an availability heatmap and confirms one slot.
- **Confirmed**: a slot has been picked. Confirmed time and location are surfaced to all members. Admin can still Edit or Cancel via the Details disclosure on the confirmed card.
- **Completed**: time has passed. Today reached only by manual `meetings.update` or via the API; no scheduled job.
- **Cancelled**: admin cancels via the Cancel button in the Details disclosure (or via API). A cancelled meeting is hidden from the meetings list entirely (`MEET-UI-LIST-001`) — mirroring how cancelled voting rounds are excluded from the round history (`VOTE-UI-LIST-001`). The row remains in the DB for audit and is still returned by `meetings.list`; the exclusion is purely at the render layer so badge/active detection is unaffected.

## Button Inventory

Button: "Propose Meeting" — `create-meeting.tsx:108-123` (`ProposeMeetingTrigger`) — visible: meetings page header (admin only) — handler: opens CreateMeetingForm (sets `proposing` in MeetingsClient)
Button: filter tabs "All" / "Proposed" / "Confirmed" / "Past" — `meetings-client.tsx:260-293` — visible: always — handler: setFilter (client state)
Button: meeting row toggle (proposed) — `meetings-client.tsx` `ProposedMeetingRow` — visible: status="proposed" — handler: expand/collapse RespondMeeting. Flat card (no icon-box column): title + viewer-aware badge (primary "Awaiting your response" / success "You responded") on the top row, serif-italic slot-count subtitle, then the progress bar with the responder count.
Button: "Respond" / "Update" — `meetings-client.tsx` `ProposedMeetingRow` — visible: status="proposed" — handler: same toggle as row click. Full-width button at the bottom of the card (primary when awaiting, ghost "Update" once the viewer has responded).
Button: "Available" / "Maybe" / "Can't" (per slot) — `respond-meeting.tsx:165-192` — visible: respond UI expanded — handler: setSlotResponse → auto-persist (client state + `meetings.submitAvailability`)
Availability auto-save — `respond-meeting.tsx:95-115` — visible: respond UI expanded — handler: `meetings.submitAvailability` fires on each per-slot selection (no dedicated "Save" button); inline-error guard requires ≥1 response (`respond-meeting.tsx:101-107`)
Button: meeting title input — `create-meeting.tsx:231-241` — optional
Button: "+ Add description" — `create-meeting.tsx:262-269` — visible: showDesc=false — handler: reveals description textarea
Button: quick-pick chips ("Tonight 7pm" (only if 7pm is still upcoming today) / "Tomorrow 7pm" / "Sat 7pm" / "Next Sat 7pm") — `create-meeting.tsx:297-308` — visible: form open — handler: applyQuickPick fills the next empty slot at 7:00 PM local
Button: per-slot datetime picker (`DateTimePicker`) — `create-meeting.tsx:321-326` — always visible per slot
Button: per-slot duration select (30/45/60/90/120/150/180/240 min, default 120) — `create-meeting.tsx:329-342` — always visible per slot
Button: "×" remove slot — `create-meeting.tsx:343-353` — visible: slots.length > 2 — handler: removeSlot
Button: "+ Add another time" — `create-meeting.tsx:367-376` — visible: slots.length < 5 — handler: addSlot
Button: "Cancel" (create form) — `create-meeting.tsx:386-388` — visible: form open — handler: closes form
Button: "Send to Members" — `create-meeting.tsx:389-397` — visible: form open — handler: `meetings.create` (`handleSubmit` at `create-meeting.tsx:185-221`); validates ≥2 timed slots and no duplicate instants; on success the new meeting is optimistically prepended to the meetings.list cache and an invalidation backfills server-authoritative state (MEET-UI-CREATE-003, MEET-UI-CACHE-SOT-001)
Button: location text input — `create-meeting.tsx:251-258` — visible: form open — handler: setLocation; submitted with `meetings.create`
Button: per-slot "Confirm time" — `admin-confirm.tsx:179-188` (within `admin-confirm-section`) — visible: status="proposed", admin only — handler: `meetings.confirm` (MEET-UI-CONFIRM-BTN-001)
Button: "Details" toggle — `meetings-client.tsx:383-410` — visible: status="confirmed", admin only — handler: toggles disclosure of Edit/Cancel buttons (MEET-UI-DETAILS-DISCLOSURE-001)
Button: "Edit" — `edit-meeting-button.tsx` — visible: under Details disclosure on confirmed cards, or on proposed cards admin only — handler: opens focus-trapped dialog wired to `meetings.update` (MEET-UI-EDIT-BTN-001)
Button: "Cancel meeting" — `cancel-meeting-button.tsx` — visible: under Details disclosure on confirmed cards, or on proposed cards admin only — handler: opens focus-trapped dialog wired to `meetings.cancel` (MEET-UI-CANCEL-BTN-001)

## Live Updates

Mechanism owned by `docs/llds/live-updates.md`; this segment's surfaces:

- **`meetings.list` query cache is the client source of truth** (MEET-UI-CACHE-SOT-001): the meetings client renders from the polled query (30s interval, RSC-seeded `initialData`) instead of a one-time `useState(initialMeetings)` copy. The optimistic `apply*` helpers (create/confirm/cancel/respond) become `utils.meetings.list.setData` transforms with the same reshaping bodies; trailing `router.refresh()` calls on counter-only paths are replaced by invalidation (`meetings.list`, `clubs.navState`).
- **Other members' responses appear within 30s** — response counts, the amber→green progress bar, heatmap cells, attendee stacks (MEET-UI-LIVE-001).
- **Availability submit is optimistic with rollback** (MEET-UI-RESPOND-OPTIMISTIC-001).

## Gaps (mutations exist, UI does not call them)

Linked-book dropdown in create form — `[ ]` API supports `bookId`; UI does not.
"Notes" button on past meetings — `[ ]` deferred; not implemented (no button is rendered).
Auto-transition to "completed" when confirmedTime passes — `[ ]` no scheduled job; status remains "confirmed" until manually updated via `meetings.update`.
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

- `[x]` Meeting proposed → email all members (`meetings.ts:47-122`)
- `[x]` Meeting confirmed → email all members with time + location (`meetings.ts:178-238`)
- `[x]` Meeting cancelled → email all members (`meetings.ts:240-281`)
- `[ ]` 48h-after-proposal availability reminder for non-responders
- `[ ]` 24h-before-confirmed-meeting reminder

## Time Zone Handling

All timestamps stored in UTC (Prisma default). Frontend displays in user's local timezone via `toLocaleString` / `toLocaleTimeString`. Proposal UI uses a custom `<DateTimePicker>` that emits a user-local `"YYYY-MM-DDTHH:MM"` string (same contract as a native `datetime-local` input); at submit it is converted to UTC via `new Date(s.time).toISOString()` (`create-meeting.tsx:193`). No per-user timezone setting in v1.

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
2. **"Notes" button on past meetings.** Not implemented — no button is rendered.
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
