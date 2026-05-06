# Meeting Scheduling Specs

**LLD**: docs/llds/meeting-scheduling.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Meeting Creation

- `[x]` **MEET-API-001**: When an admin calls `meetings.create` with time slots, the system SHALL create the meeting in "proposed" status with the specified slots.
- `[x]` **MEET-DATA-001**: Each meeting shall have 2–5 proposed time slots.
- `[ ]` **MEET-API-002**: Meetings may optionally link to a book (via book_id FK). When linked, the meeting title defaults to "Meeting: {book title}".

## Availability

- `[x]` **MEET-API-003**: When a member calls `meetings.submitAvailability`, the system SHALL accept a list of (slot_id, status) pairs and replace all previous responses for that user.
- `[x]` **MEET-DATA-002**: Availability status shall be one of: "available", "maybe", "unavailable".
- `[x]` **MEET-UI-001**: The availability grid shall display three-state radio buttons (available, maybe, unavailable) for each time slot.
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

## Meeting UI Features

- `[x]` **MEET-UI-006**: The meeting list SHALL support filter tabs (All / Proposed / Confirmed / Past) with counts.
- `[x]` **MEET-UI-007**: Proposed meetings in the list SHALL show a response progress bar indicating how many members have submitted availability (color: amber → green at 100%).
- `[x]` **MEET-UI-008**: Confirmed meetings SHALL display a date block (day/date/month), time range, location, attendee avatars, and "N going · M maybe" count.
- `[x]` **MEET-UI-009**: Past meetings SHALL appear dimmed with a "Notes" button linking to meeting notes/summary.
- `[x]` **MEET-UI-010**: The respond-availability view sidebar SHALL show a members-responded progress bar (X of Y responded) and a list of members still waiting.
- `[x]` **MEET-UI-011**: When members respond with availability, the admin confirm view SHALL display a heatmap grid per slot: color-coded rectangles (one per member, green for available, amber for maybe, light for unavailable) showing response distribution at a glance.
- `[x]` **MEET-UI-012**: The admin confirm view SHALL display an AI-recommended banner ("Thu Apr 18 · 7:00 PM works for the most members (N available). Confirm to notify everyone.") highlighting the slot with the highest availability.
- `[x]` **MEET-UI-013**: The confirm view SHALL show a "Most available" badge on the top-ranked slot and highlight its row with a subtle background tint.
- `[x]` **MEET-UI-014**: The create meeting form SHALL include a "Linked book" dropdown selector limited to books selected for the club (optional).
- `[x]` **MEET-UI-015**: The location field SHALL be a text input (optional) and carried through to the confirmation and notification emails.

## Deferred

- `[D]` **MEET-BE-003**: The system shall support .ics calendar export for confirmed meetings.
- `[D]` **MEET-UI-005**: The system shall support recurring meeting templates that pre-fill time slots.
- `[D]` **MEET-BE-004**: The system shall support two-way calendar integration with Google Calendar and Outlook.
