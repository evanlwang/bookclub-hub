# Meeting Scheduling

## Context and Design Philosophy

Meetings are where the book club actually meets. Scheduling is the second-highest-friction activity after book selection (the first being "when can everyone meet?"). This LLD replaces the Doodle-poll-in-a-group-chat pattern with an integrated availability poll tied to the club's current book.

Design philosophy: **lightweight scheduling, not a calendar app**. The system proposes times, collects availability, and confirms a meeting. It does not manage recurring schedules, integrate with external calendars (v1), or handle time zones beyond displaying them correctly.

Traces to HLD Approach (Meeting Scheduling) and Success Metric (voting completes without reminder chasing — meetings inherit the same reminder infrastructure).

## Meeting Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Proposed: Admin proposes time slots
    Proposed --> Confirmed: Admin confirms a time
    Proposed --> Cancelled: Admin cancels
    Confirmed --> Completed: Meeting time passes
    Confirmed --> Cancelled: Admin cancels
    Completed --> [*]
    Cancelled --> [*]
```

- **Proposed**: admin offers 2–5 candidate time slots. Members indicate availability for each.
- **Confirmed**: admin picks a time based on availability responses. The meeting is set.
- **Completed**: the meeting's scheduled time has passed. Automatic transition.
- **Cancelled**: admin cancels. Members are notified.

## Data Model

```
Meeting {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book, nullable -- nullable for non-book meetings)
  title: string (default: "Meeting: {book title}")
  description: string (nullable)
  status: enum("proposed", "confirmed", "completed", "cancelled")
  confirmed_time: timestamp (nullable -- set when confirmed)
  location: string (nullable -- "Zoom link", "Alice's house", etc.)
  created_by: UUID (FK -> User)
  created_at: timestamp
  updated_at: timestamp
}

MeetingTimeSlot {
  id: UUID (PK)
  meeting_id: UUID (FK -> Meeting)
  proposed_time: timestamp
  duration_minutes: integer (default 60)
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

## Availability Collection

Members mark their availability for each time slot (available, maybe, unavailable). The admin view shows a color-coded response heatmap with the best-fit slot highlighted. For visual implementation of the availability polling UI, response summary, and admin confirmation flow, see `docs/bookclub-hub-designs/project/artboards/meetings.jsx` and `docs/design-system.md` → Color Palette (success, warning, danger colors).

## API Contracts

Endpoints below are logical contracts. The implementation uses tRPC procedures (e.g., `meetings.create(...)`, `meetings.confirm(...)`) rather than REST routes.

| Procedure | Auth | Input | Output |
|-----------|------|-------|--------|
| `meetings.list` | member | `{ clubId, status? }` | `[{ meeting, slots, responses_summary }]` |
| `meetings.create` | admin+ | `{ clubId, title?, book_id?, description?, location?, slots: [{ time, duration? }] }` | `{ meeting, slots }` |
| `meetings.get` | member | `{ meetingId }` | `{ meeting, slots, responses }` |
| `meetings.update` | admin+ | `{ meetingId, title?, description?, location? }` | `{ meeting }` |
| `meetings.confirm` | admin+ | `{ meetingId, slotId }` | `{ meeting }` (sets confirmed_time) |
| `meetings.cancel` | admin+ | `{ meetingId }` | - |
| `meetings.submitAvailability` | member | `{ meetingId, responses: [{ slotId, status }] }` | (replaces all responses for user) |

## Notification Triggers (via Resend)

- Meeting proposed: email all club members
- Availability not yet submitted (48h after proposal): email non-responders
- Meeting confirmed: email all members with time, location, and book
- Meeting reminder: email 24 hours before confirmed time
- Meeting cancelled: email all members

## Time Zone Handling

All timestamps are stored in UTC. The frontend displays times in the user's local timezone (detected from browser). The proposal UI lets the admin enter times in their local timezone; the server converts to UTC on receipt. No per-user timezone setting in v1.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Scheduling model | Propose-and-respond (Doodle-style) | Fixed recurring schedule; calendar integration; free-text poll | Propose-and-respond is the proven pattern for small-group scheduling. Recurring schedules are too rigid for irregular book clubs. Calendar integration is high-effort for v1. |
| Availability options | Three-state (available, maybe, unavailable) | Binary (yes/no); four-state (adding "prefer") | Three states capture useful nuance. Binary loses the "maybe" signal. Four states add complexity without much information gain. |
| Who confirms the time | Admin picks from responses | Auto-confirm best fit; group vote on time | Admin picks because they know context the algorithm doesn't (e.g., "we always meet at Alice's house on Saturdays"). |
| Meeting-book linkage | Optional FK to Book | Required; no linkage | Optional because clubs may have non-book meetings (planning, social). |

## Open Questions & Future Decisions

### Resolved

1. ✅ Doodle-style propose-and-respond.
2. ✅ Three-state availability.
3. ✅ Admin confirms.

### Deferred

1. **Calendar export (.ics).** Confirmed meetings should be exportable as .ics files. Straightforward but not v1 core.
2. **Recurring meeting templates.** "We usually meet the third Thursday" — a template that pre-fills time slots.
3. **External calendar integration (Google Calendar, Outlook).** Two-way sync is complex. Deferred.

## Design Reference

**Visual implementation:** See `docs/bookclub-hub-designs/project/artboards/meetings.jsx` (four interactive views: list, member-respond, admin-confirm, create flow).

**Design tokens & components:**
- Meeting title: Display serif (32px) with book metadata below
- Availability heatmap: color-coded responses with `--success` (available), `--warning` (maybe), `--danger` (unavailable)
- Time slots: card stack (20px padding, `--shadow-sm`), each with response counts
- Admin confirmation: use `btn-primary` with icon `I.check` for "Confirm time"
- Status badge: `Badge` with appropriate tone (primary for proposed, success for confirmed)

**Key patterns:**
- **Proposed view (member):**
  - Question/prompt: "Mark your availability:" (body text, 15px)
  - Radio buttons or pill buttons for each time slot (available, maybe, unavailable)
  - Response count: caption text ("5 of 8 members have responded")
  - Submit button: `btn-primary` (primary, md size)

- **Admin confirm view:**
  - Show availability heatmap: horizontal bars with color-coded dots (✓, ~, ✗)
  - Highlight best-fit slot with `--success-soft` background
  - "Responses" label (caption/mono, 12px)
  - Confirm button: `btn-primary` with icon `I.check`

- **Create meeting flow:**
  - Title input: max 200 chars
  - Description textarea: optional
  - Location input: free-form text (Zoom link, address, etc.)
  - Time slot inputs: proposal date/time picker, duration (default 60 min)
  - Add/remove slot buttons: `btn-secondary` with `I.plus` / `I.x`

- **Confirmed meeting card:**
  - Display time in user's local timezone
  - Show location and description
  - Book cover (if linked): small size with details
  - Member avatars: stacked overflow style
  - Edit/cancel buttons: `btn-secondary` for edit, `btn-danger` for cancel

**Typography & spacing:**
- Time slot text: body (15px) with caption for day of week
- Response summary: caption (12px, secondary ink)
- Metadata (duration, location): caption (12px, tertiary ink)

## References

- `docs/high-level-design.md`
- `docs/llds/club-management.md` — meetings are club-scoped
- `docs/llds/book-selection-and-voting.md` — meetings link to books
- `docs/specs/meet-specs.md`
- `docs/design-system.md` — design tokens, Badge, Button variants
