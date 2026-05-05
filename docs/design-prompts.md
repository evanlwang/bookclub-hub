# Plan: Prompting Claude.ai Design Tool for BookClub Hub UI

## Context

BookClub Hub is feature-complete at the API level (11 tRPC routers, 181 passing tests) but has only minimal unstyled HTML pages. The goal is to use Claude.ai's design tool to generate polished UI component designs for each feature area, then integrate them into the Next.js codebase.

---

## Strategy: How to Use the Design Tool Effectively

### General Tips

1. **One feature area per conversation** — the design tool works best with focused scope
2. **Provide data shape** — tell it exactly what fields/objects the UI displays
3. **Specify states** — loading, empty, error, populated, permission variants
4. **Name the tech** — say "React + Tailwind CSS" so it generates copy-pasteable code
5. **Iterate in the same conversation** — "make the cards more compact" / "add a dark mode variant"
6. **Ask for responsive** — specify mobile-first or desktop-first
7. **Reference a vibe** — "Linear-style minimal", "Notion-like", "warm and bookish" — helps set tone

---

## UX Principles (include in every prompt)

Paste this block at the top of each design prompt as a constraint:

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.
```

---

## Prompt 1: Design System Foundation

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design a React component library for a book club app called "BookClub Hub".

Tech: React 19, Tailwind CSS 4, no component library dependencies.

Brand vibe: Warm, literary, approachable. Think cozy bookshop meets modern SaaS.
Primary color: deep teal. Accent: warm amber. Neutrals: warm grays.

Create a design system page showing:
- Typography scale (headings, body, captions) — body 16px minimum, 1.5 line height
- Color palette with semantic names (primary, accent, success, warning, error, muted)
- Button variants (primary, secondary, ghost, destructive) in sizes sm/md/lg — show loading state for each
- Badge/chip component (for status: active, decided, cancelled, etc.)
- Card component (with header, body, footer slots) — generous internal padding
- Avatar component (with initials fallback, size variants)
- Form inputs (text, number, select, checkbox group) — show focus, error, and disabled states
- Empty state component (icon + message + single CTA button)
- Toast/notification component (success, error, with undo action)
- A responsive sidebar layout shell (sidebar + main content area)

For every interactive component, show its resting state, hover/focus state, active/loading state, and disabled state. Transitions between states should be 150ms ease.
```

---

## Prompt 2: Landing + Join Flow

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design two pages for a book club app using React + Tailwind:

PAGE 1 — Landing page (/)
- Single focal point: the headline "Your book club, organized"
- One primary CTA: "Join a Club". Secondary: "Create a Club" (smaller, ghost style)
- Brief feature showcase below (3 cards): voting, meetings, discussions
- Simple footer
- The page should feel calm and uncluttered. Lots of whitespace.

PAGE 2 — Join a Club (/join)
- Centered card, narrow width (max 400px)
- The form IS the focal point — nothing else competes
- Step 1: Enter club code (text input, uppercase). On blur, lookup shows club name + member count inline below the input (subtle fade-in, 150ms)
- Step 2: Enter email + display name (appear after successful lookup, slide down)
- Submit button: shows loading spinner on click, disables
- Error state: red text below the relevant input, not a modal or alert
- Success: "Welcome to [Club Name]!" replaces the form (crossfade)

Data on lookup: { clubName: string, memberCount: number }
On success: { club: { id, name, code }, sessionId: string }
Errors: "Club not found", "This club is no longer active"

Mobile-first, single-column.
```

---

## Prompt 3: Club Dashboard + Switcher

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design the main authenticated layout for a book club app (React + Tailwind):

LAYOUT SHELL:
- Left sidebar (collapsible on mobile → hamburger):
  - Club switcher dropdown at top (user may be in multiple clubs, show name + role badge)
  - Nav links: Dashboard, Voting, Meetings, Discussions, Progress
  - Active nav link is visually distinct (not just bold — background highlight)
  - User menu at bottom (avatar + name + logout)
- Main content area — generous left padding from sidebar edge

CLUB DASHBOARD (/clubs/[id]):
- Focal point: "Currently Reading" card — largest, top of page
  - Book title (large), author, club progress summary (median %, # finished)
- Below: 2-column grid (stacks on mobile) with:
  - "Active Vote" card: status badge, nomination count or vote count, single CTA
  - "Next Meeting" card: title, confirmed time or "Awaiting responses", attendee count
- Below that: "Recent Discussions" — 3 thread titles as a simple list (title + chapter tag + time)
- Empty states: each card shows a friendly message + one action when nothing exists yet. e.g. "No book selected yet — Start a vote"

Data shapes:
- Club: { name, code, description, memberCount }
- CurrentBook: { title, author, pageCount } | null
- ActiveRound: { status: "nominating"|"voting", nominationCount, voteCount } | null
- NextMeeting: { title, confirmedTime: Date|null, status, responseCount } | null
- RecentThreads: { title, chapterTag, commentCount, authorName, createdAt }[]
```

---

## Prompt 4: Voting Rounds

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design the voting feature for a book club app (React + Tailwind). Three phase views:

PHASE 1 — NOMINATING:
- Focal point: "Search & Nominate" button (primary, prominent)
- Below: current nominations as a clean list (book title, author, nominator, pitch)
- Admin action: "Advance to Voting" at bottom (secondary style, disabled if < 2 nominations)
- Book search modal: text input at top, results appear below as they type (150ms debounce). Each result has a "Nominate" button. After nominating, modal closes and new nomination fades into the list.

PHASE 2 — VOTING:
- Focal point: the submit button at bottom
- Instruction text: "Select up to {N} books" — clear, not buried
- Nomination cards with large clickable checkbox areas (the whole card is tappable)
- Selected cards get a visible border/highlight change
- Submit button shows count: "Submit 2 votes" — updates live as selections change
- After submit: button becomes "Update votes" and shows "✓ Voted" confirmation inline (fade in)
- Vote tallies HIDDEN during this phase

PHASE 3 — DECIDED:
- Focal point: winner card (elevated, larger, amber accent border)
- Winner: book title, author, vote count, "Now Reading" badge
- Below: runner-ups in a subdued list (smaller, show vote counts)
- Admin: "Start New Round" button (secondary)

Data:
- Round: { id, status, maxApprovalsPerMember, winningBookId? }
- Nomination: { id, book: { title, author }, nominator: { displayName }, pitch?, voteCount (decided only), createdAt }
- MyVotes: nominationId[]
```

---

## Prompt 5: Meeting Scheduling

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design meeting scheduling UI for a book club app (React + Tailwind):

VIEW 1 — MEETING LIST:
- Filter tabs: All / Proposed / Confirmed / Past (underline style, not heavy buttons)
- Card per meeting: title, status badge, confirmed time or "Awaiting responses"
- Focal point: the most urgent meeting (proposed, needs your response) — highlighted subtly

VIEW 2 — RESPOND TO MEETING (member view):
- Focal point: the submit/update button
- Meeting title + description at top
- Time slots as rows. Each row: nicely formatted date/time on the left, three radio buttons on the right (Available ✓ / Maybe ~ / Unavailable ✗)
- Radio buttons should be large tap targets with clear visual states (green/amber/red tint on selection)
- Show response summary per slot: "4 available, 1 maybe" in muted text
- Submit: "Save Availability" button. After save: inline "✓ Saved" confirmation (fade in, no page reload)

VIEW 3 — CREATE MEETING (admin):
- Focal point: the "Propose Meeting" submit button
- Title input
- Description textarea (optional, collapsed by default — "Add description" link expands it)
- Time slots: start with 2 rows. Each row: date + time + duration. "Add another time" link (max 5).
- Removing a slot: small × button, slot slides out (150ms)
- Clean, vertical form layout. Not cramped.

Data:
- Meeting: { id, title, description?, status, confirmedTime?, location? }
- Slot: { id, proposedTime: Date, durationMinutes: number }
- Response: { slotId, userId, status: "available"|"maybe"|"unavailable" }
```

---

## Prompt 6: Spoiler-Safe Discussions

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design a discussion/forum feature for a book club app (React + Tailwind) with spoiler protection:

VIEW 1 — THREAD LIST:
- Focal point: "New Thread" button (primary, top right)
- Spoiler filter bar (subtle, not dominant):
  - "I'm on chapter: [input]" — small number input inline
  - When active: "{N} threads hidden for spoilers" text with "Show anyway" link
  - Filter change = threads list fades and re-renders (150ms crossfade)
- Thread items: title (bold), chapter tag as colored badge, comment count, author, relative time
  - Each thread is a clickable row, hover highlights subtly
  - Pinned threads: pin icon, sorted to top, slightly different background
- Sort toggle: Recent / Most Comments (small, top of list, not competing with CTA)

VIEW 2 — THREAD DETAIL:
- Focal point: the original post content (body text, largest element)
- Header: title, chapter badge, author + avatar, timestamp
- Body: generous line height, comfortable reading width (max 680px)
- Comments below: clear visual separation from OP
  - Top-level comments: avatar, name, timestamp, body
  - Replies: indented 24px, slightly smaller, connected by a subtle vertical line
  - Reply button: appears on hover/focus of a top-level comment (not always visible — reduces clutter)
  - "[deleted]" comments: gray italic text, no author shown
- Comment input: sticky at bottom of viewport, expands on focus

Data:
- Thread: { id, title, body, chapterTag?, chapterNumber?, authorName, commentCount, isPinned, createdAt }
- Comment: { id, body, authorName, parentCommentId?, createdAt, replies: Comment[] }
- hiddenCount: number
```

---

## Prompt 7: Reading Progress

```
UX CONSTRAINTS (apply to every element):
- Immediate feedback: buttons show loading state on click (disabled + spinner). No dead moments.
- Clear hierarchy: one primary action per view, visually loudest. Secondary actions recede.
- Breathing room: generous padding (16px minimum between elements, 24px between sections).
- Consistency: same action = same appearance everywhere. Delete is always red, confirm always primary color, same position pattern.
- Readable text: body at 16px, 1.5 line height, high contrast. Never light gray on white.
- Smooth transitions: 150ms ease for content appearing/disappearing. No hard blinks.
- One focal point: when I land on a page, my eye goes to exactly one place first.

---

Design a reading progress dashboard for a book club app (React + Tailwind):

VIEW 1 — CLUB PROGRESS:
- Focal point: "Update My Progress" button (primary, top right)
- Header: book title + "412 pages"
- Summary row: 3 simple stats (median %, finished count, reading count) — not cards, just bold numbers with labels
- Member list (sorted by % desc):
  - Each row: avatar, name, horizontal progress bar, percentage number, chapter number
  - Progress bar colors: gray (not started), teal (reading), amber (finished)
  - Bar fills animate on load (300ms ease-out, staggered 50ms per row)
  - Finished members: bar is full + small checkmark
- The list should feel like a leaderboard without being competitive — warm, not gamified

VIEW 2 — UPDATE PROGRESS (modal overlay):
- Focal point: the Save button
- Current page input: large number input. As you type, percentage updates live below it
- Percentage: shown as text, auto-computed (not a separate input — reduces confusion)
- Chapter input: optional, smaller
- Status: three large radio cards (Not Started / Reading / Finished) — selecting Finished auto-fills 100%
- Save: "Update Progress" button, shows loading, closes modal on success with the progress bar animating to new position

Data:
- Progress: { userId, displayName, currentPage?, totalPages?, percentage, currentChapter?, status }[]
- Summary: { medianPercentage, finishedCount, readingCount, notStartedCount, totalMembers }
- Book: { title, author, pageCount }
```

---

## Integration Workflow

Once you have designs from the tool:

1. **Export the React code** from each artifact
2. **Extract shared components** (Button, Card, Badge, Avatar, etc.) into `src/components/ui/`
3. **Extract the color/typography tokens** into `tailwind.config.ts` or CSS variables
4. **Wire up real data** — replace hardcoded props with tRPC calls (the API layer is already complete)
5. **Use the existing page routes** — replace the minimal pages in `src/app/clubs/[clubId]/*`

### File mapping:
| Design | Target files |
|--------|-------------|
| Design system | `src/components/ui/*.tsx`, `tailwind.config.ts` |
| Landing + Join | `src/app/page.tsx`, `src/app/join/page.tsx` |
| Layout + Dashboard | `src/app/layout.tsx`, `src/app/clubs/[clubId]/page.tsx` |
| Voting | `src/app/clubs/[clubId]/vote/page.tsx` + subcomponents |
| Meetings | `src/app/clubs/[clubId]/meetings/page.tsx` + subcomponents |
| Discussions | `src/app/clubs/[clubId]/discussions/page.tsx` + subcomponents |
| Progress | `src/app/clubs/[clubId]/progress/page.tsx` + subcomponents |

### Verification

After integrating each design:
- `npx tsc --noEmit` — no type errors
- `npm run test:unit && npm run test:integration` — all 162 tests still pass
- `npx playwright test` — all 19 E2E tests still pass
- Visual check at http://localhost:3000
