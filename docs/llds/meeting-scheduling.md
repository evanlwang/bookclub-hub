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

State: proposed — buttons shown: "Respond", per-slot "Available"/"Maybe"/"Can't", "Save Availability"; admin gap: no Confirm/Edit/Cancel buttons — transitions: → confirmed (`meetings.confirm` API; **no UI**); → cancelled (`meetings.cancel` API; **no UI**)
State: confirmed — buttons shown: none (read-only display) — transitions: → completed (auto when time passes; **not enforced via background job**); → cancelled (API only)
State: completed — buttons shown: "Notes" (no-op handler) — transitions: terminal
State: cancelled — buttons shown: rendered as Past with no-op "Notes" — transitions: terminal

Phase descriptions:
- **Proposed**: admin offers 2–5 candidate slots. Members mark availability per slot.
- **Confirmed**: admin picks one slot. Confirmed time and location are surfaced to all members.
- **Completed**: time has passed. Today reached only by manual `meetings.update` or via the API; no scheduled job.
- **Cancelled**: admin cancels via API. UI does not currently expose this.

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
Button: "Send to Members" — `create-meeting.tsx:213-221` — visible: form open — enabled: ≥2 slots have a time — handler: `meetings.create`; reloads page on success

## Gaps (mutations exist, UI does not call them)

Button: admin "Confirm time" per slot — `[ ]` not in UI — should call `meetings.confirm`. Mutation at `meetings.ts:141-180`.
Button: admin "Edit meeting" — `[ ]` not in UI — should call `meetings.update`. Mutation at `meetings.ts:116-139`.
Button: admin "Cancel meeting" — `[ ]` not in UI — should call `meetings.cancel`. Mutation at `meetings.ts:182-207`.
Heatmap grid (admin confirm view) — `[!]` listed in older spec, not implemented.
"Most available" badge / AI-recommended banner — `[!]` listed in older spec, not implemented.
Linked-book dropdown in create form — `[ ]` API supports `bookId`; UI does not.
Location text input in create form — `[ ]` API supports `location`; UI does not collect it on creation (read-only display on confirmed rows).
Response progress bar on proposed meeting rows — `[ ]` only a textual count.
"Notes" button handler — `[!]` button rendered without onClick.
Auto-transition to "completed" when confirmedTime passes — `[ ]` no scheduled job; status remains "confirmed" until updated.

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
  duration_minutes: integer (default 60; allowed 15-120)
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
| `meetings.create` | admin+ | `{ clubId, title?, bookId?, description?, location?, slots[] }` | `{ meeting }` | 2–5 slots, 15–120 min each |
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
| Who confirms the time | Admin picks from responses | Auto-confirm best fit; group vote | Admin knows context the algorithm doesn't. (Note: UI for admin confirmation is not built yet.) |
| Meeting-book linkage | Optional FK to Book | Required; no linkage | Optional; clubs may have non-book meetings. |
| Slot remove threshold | Allow removal only when slots.length > 2 | Allow removal of any slot | Enforces 2-slot minimum at the UI layer. |
| Slot add threshold | Allow add only when slots.length < 5 | Unbounded | Enforces 5-slot maximum at the UI layer. |

## Open Questions

### Resolved

1. ✅ Doodle-style propose-and-respond.
2. ✅ Three-state availability with "Available" / "Maybe" / "Can't" labels.
3. ✅ Admin confirms (in API).

### Deferred

1. **Admin confirmation UI.** Heatmap, recommend-banner, "Most available" badge, and "Confirm time" button. None built.
2. **Edit / Cancel meeting UI.** Mutations exist but no UI surfaces them.
3. **Linked-book picker in create form.**
4. **Location input in create form.**
5. **"Notes" button on past meetings.** Currently a no-op placeholder.
6. **Calendar export (.ics).**
7. **Recurring meeting templates.**
8. **External calendar integration (Google Calendar, Outlook).**
9. **Auto-transition to "completed" via scheduled job.**

## References

- `docs/specs/meet-specs.md`
- `docs/llds/club-management.md` — meetings are club-scoped
- `docs/llds/book-selection-and-voting.md` — meetings link to books
- `docs/high-level-design.md`
