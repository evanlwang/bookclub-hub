# Reading Progress Tracking

## Context and Design Philosophy

Reading progress serves two purposes: (1) it lets the organizer see whether the group is ready to meet, and (2) it drives the spoiler filter in discussions. Progress is self-reported — the member enters their current page or percentage. There is no e-reader integration.

Design philosophy: **low friction, visible but not judgmental**. The system shows aggregate progress ("65% of members are past chapter 10") but does not rank members or send "you're behind" notifications. Reading is supposed to be fun.

Traces to HLD Approach (Reading Progress Tracking), Key Design Decision (no e-reader integration), and Goal #4 (progress visibility reduces scheduling guesswork).

## Progress Model

A member's progress through a book is a single record that they update over time. The record stores both a page number and a percentage (the member can enter either; the system computes the other if page count is known).

```
ReadingProgress {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book)
  user_id: UUID (FK -> User)
  current_page: integer (nullable)
  total_pages: integer (nullable -- from Book.page_count or user override)
  percentage: integer (0-100)
  current_chapter: integer (nullable -- for spoiler filtering)
  status: enum("not_started", "reading", "finished")
  updated_at: timestamp
  UNIQUE(club_id, book_id, user_id)
}
```

When the member enters a page number and `total_pages` is known, `percentage` is computed. When they enter a percentage, `current_page` is computed (rounded). When `total_pages` is not known (book metadata missing), only percentage is accepted.

The `current_chapter` field is entered separately by the member. It is not derived from page number because chapter lengths vary unpredictably. This field drives the discussion spoiler filter.

## Progress Update UI

```
┌──────────────────────────────────────────┐
│  Your Progress: Dune                     │
│  304 pages                               │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Page: [187_____] / 304           │    │
│  │ ████████████░░░░░░░░  61%        │    │
│  │                                  │    │
│  │ Current chapter: [12___]         │    │
│  │                                  │    │
│  │ Status: ( ) Not started          │    │
│  │         (●) Reading              │    │
│  │         ( ) Finished             │    │
│  └──────────────────────────────────┘    │
│  [Update]                                │
│                                          │
│  Last updated: 2 hours ago               │
└──────────────────────────────────────────┘
```

## Club Progress Dashboard (Organizer View)

```
┌──────────────────────────────────────────────┐
│  Club Progress: Dune                         │
│  8 members                                   │
│                                              │
│  ████████████████████████  100% ── Carol     │
│  ██████████████████░░░░░░   75% ── Dave      │
│  ████████████████░░░░░░░░   65% ── Alice     │
│  ████████████░░░░░░░░░░░░   50% ── Eve       │
│  ████████░░░░░░░░░░░░░░░░   33% ── Bob       │
│  ░░░░░░░░░░░░░░░░░░░░░░░░    0% ── Frank    │
│  ── (not started) ──         -- Grace, Hank  │
│                                              │
│  Median: 57%  · 3 members past Ch. 10        │
│                                              │
│  [Schedule Meeting]                          │
└──────────────────────────────────────────────┘
```

Individual progress bars are visible to all club members. The aggregate summary (median, chapter distribution) is visible to all but primarily useful to the organizer.

## API Contracts

Endpoints below are logical contracts. The implementation uses tRPC procedures (e.g., `progress.update(...)`) rather than REST routes.

| Procedure | Auth | Input | Output |
|-----------|------|-------|--------|
| `progress.list` | member | `{ clubId, bookId }` | `[{ user, progress }]` (all members' progress) |
| `progress.me` | member | `{ clubId, bookId }` | `{ progress }` |
| `progress.update` | member | `{ clubId, bookId, current_page?, percentage?, current_chapter?, status? }` | `{ progress }` |
| `progress.summary` | member | `{ clubId, bookId }` | `{ median_pct, finished_count, reading_count, not_started_count, chapter_distribution }` |

`progress.update` is idempotent — it creates the record if it doesn't exist, updates it if it does. The member can update any subset of fields.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Progress input | Page number or percentage, manually entered | E-reader sync; photo of page; daily check-in prompt | Manual entry is the only approach that works across all reading formats (physical, Kindle, audiobook, PDF). E-reader sync is fragile (HLD non-goal). |
| Chapter tracking | Separate manual field | Derive from page number + table of contents; no chapter tracking | Derivation requires a table of contents rarely available from APIs. No chapter tracking breaks spoiler filtering. Manual entry is one number. |
| Visibility | All members see individual progress | Only organizer sees individual; everyone sees aggregate only | Visibility creates gentle social accountability. Privacy concern is mitigated by the fact that book clubs are small trusted groups. |
| Progress history | No history (current state only) | Store every update with timestamp | History adds storage cost for minimal value. Current state is what matters for scheduling and spoiler filtering. |

## Open Questions & Future Decisions

### Resolved

1. ✅ Manual entry (page or percentage).
2. ✅ Separate chapter field for spoiler filtering.
3. ✅ Individual progress visible to all members.

### Deferred

1. **Audiobook progress.** Audiobooks measure progress in hours:minutes, not pages. A `duration_seconds` field could accommodate this.
2. **Progress reminders.** "You haven't updated your progress in 2 weeks." Could be useful but risks feeling nagging.
3. **Historical reading pace.** "You read 50 pages/week on average." Requires storing update history.

## References

- `docs/high-level-design.md`
- `docs/llds/discussion-threads.md` — progress drives spoiler filtering
- `docs/llds/club-management.md` — progress is club-scoped
- `docs/specs/prog-specs.md`
