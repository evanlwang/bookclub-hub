# Meeting Scheduling Specs

**LLD**: docs/llds/meeting-scheduling.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Meeting Creation

- `[ ]` **MEET-API-001**: When an admin calls `meetings.create` with time slots, the system SHALL create the meeting in "proposed" status with the specified slots.
- `[ ]` **MEET-DATA-001**: Each meeting shall have 2–5 proposed time slots.
- `[ ]` **MEET-API-002**: Meetings may optionally link to a book (via book_id FK). When linked, the meeting title defaults to "Meeting: {book title}".

## Availability

- `[ ]` **MEET-API-003**: When a member calls `meetings.submitAvailability`, the system SHALL accept a list of (slot_id, status) pairs and replace all previous responses for that user.
- `[ ]` **MEET-DATA-002**: Availability status shall be one of: "available", "maybe", "unavailable".
- `[ ]` **MEET-UI-001**: The availability grid shall display three-state radio buttons (available, maybe, unavailable) for each time slot.
- `[ ]` **MEET-UI-002**: The system SHALL show how many members have responded out of total club members.
- `[ ]` **MEET-UI-003**: Admins shall see a summary of all responses per slot (count of available, maybe, unavailable) to inform their confirmation decision.

## Meeting Confirmation

- `[ ]` **MEET-API-004**: When an admin calls `meetings.confirm` with a slot_id, the system SHALL set the meeting status to "confirmed" and store the confirmed_time from the selected slot.
- `[ ]` **MEET-BE-001**: When a confirmed meeting's time has passed, the system SHALL automatically transition its status to "completed".
- `[ ]` **MEET-API-005**: When an admin calls `meetings.cancel`, the system SHALL set status to "cancelled".

## Time Handling

- `[ ]` **MEET-BE-002**: All meeting timestamps shall be stored in UTC.
- `[ ]` **MEET-UI-004**: The frontend shall display meeting times in the user's local timezone (detected from browser).

## Notifications

- `[ ]` **MEET-NOTIFY-001**: When a meeting is proposed, the system SHALL notify all club members via email.
- `[ ]` **MEET-NOTIFY-002**: When a member has not responded to availability 48 hours after proposal, the system SHALL send a reminder email.
- `[ ]` **MEET-NOTIFY-003**: When a meeting is confirmed, the system SHALL notify all members with the confirmed time, location, and linked book.
- `[ ]` **MEET-NOTIFY-004**: The system SHALL send a reminder email 24 hours before a confirmed meeting.
- `[ ]` **MEET-NOTIFY-005**: When a meeting is cancelled, the system SHALL notify all members.

## Deferred

- `[D]` **MEET-BE-003**: The system shall support .ics calendar export for confirmed meetings.
- `[D]` **MEET-UI-005**: The system shall support recurring meeting templates that pre-fill time slots.
- `[D]` **MEET-BE-004**: The system shall support two-way calendar integration with Google Calendar and Outlook.
