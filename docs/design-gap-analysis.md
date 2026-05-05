# Design Gap Analysis

Comparison of the Claude Design prototype (`BookClub Hub UI.html`) against the current Next.js implementation. Features are grouped by design artboard section.

---

## Summary

| Area | Implemented | Missing |
|------|:-----------:|:-------:|
| 01 Foundation (design system) | Mostly | Toast component |
| 02 Entry (landing + join) | Complete | — |
| 03 Hub (dashboard + sidebar) | Partial | Club switcher, invite code display, breadcrumbs |
| 04 Voting | Partial | Nominating phase UI, book search modal, advance admin action, sidebar metadata |
| 05 Meetings | Partial | List filters, admin confirm view with heatmap, location field |
| 06 Discussions | Partial | Sort controls, pinned threads, edit/delete on threads/comments, [deleted] placeholder |
| 07 Progress | Partial | Ring summary, distribution bar, staggered bar animations |

---

## Detailed Gaps

### 03 · Dashboard + Sidebar Shell

| Feature | Design | Status |
|---------|--------|--------|
| Club switcher dropdown | Shows all clubs with roles, "Create or join" action | Missing |
| Sidebar nav with badges | "Live" badge on Voting, unread count on Discussions | Missing |
| Breadcrumb bar | `Club > Page` with invite code chip | Missing |
| "Invite" button | Copies/shares invite code | Missing |
| Currently-reading hero card | Progress bar with avatar tick-marks per member | Missing (basic card exists) |
| Three-up cards (active vote, next meeting, recent threads) | Rich preview cards with CTAs | Partial (links exist, not cards) |

### 04 · Voting Rounds

| Feature | Design | Status |
|---------|--------|--------|
| **Nominating phase UI** | Nomination cards with pitch text, book covers, nominator info | Missing |
| **Book search modal** | Search Open Library, nominate from results | Missing |
| **"Advance to voting" admin button** | With prerequisites check ("needs at least 2 nominations") | Missing |
| Sidebar metadata | Round countdown, max approvals, voter turnout, "tallies hidden" | Missing |
| Voting phase approval bar | Visual {N}/{max} dots showing used selections | Missing |
| **"Voted — update?" post-submit state** | Button changes to confirm + allows re-vote | Missing |
| **Decided phase winner banner** | Large card with gradient, vote count, "Set up first meeting" CTA | Missing |
| Final tallies table | Ranked list with progress bars showing vote proportion | Missing |

### 05 · Meetings

| Feature | Design | Status |
|---------|--------|--------|
| **Status filter tabs** (All / Proposed / Confirmed / Past) | Filter meeting list by status | Missing |
| **Confirmed meeting card** | Date block, time, location, attendee avatars | Missing (basic display) |
| **Past meeting card** | Dimmed, "Notes" button | Missing |
| **Admin confirm view** | Slot table with heatmap, "Most available" badge, location input, "Confirm & notify" | Missing |
| **Heatmap visualization** | Color-coded blocks per member response | Missing |
| **Location field** | Text input for where the meeting happens | Missing |
| Meeting description | Expandable description field in create form | Exists |
| Linked book selector | Dropdown to associate a book with the meeting | Missing |

### 06 · Discussions

| Feature | Design | Status |
|---------|--------|--------|
| **Sort controls** (Recent / Most comments) | Tab-style sort at top of list | Missing |
| **Pinned threads** | Visual pin icon + "PINNED" label, sorted first | Missing |
| **Thread body preview** | Single-line truncated body in list view | Missing |
| **Thread detail edit/delete buttons** | Author can edit, author/admin can delete | Missing |
| **[deleted] placeholder** | Deleted comments show "[deleted]" with replies intact | Missing |
| **Sticky comment composer** | Fixed to bottom with fade-mask | Partial (exists but not sticky) |
| **Hover-reveal reply buttons** | Reply button hidden until hover/focus | Missing |
| Thread sidebar | "About this thread" metadata card | Missing |
| Markdown rendering | Bold, italic, links in thread/comment bodies | Missing |

### 07 · Reading Progress

| Feature | Design | Status |
|---------|--------|--------|
| **Progress ring (SVG)** | Circular ring showing median percentage | Missing |
| **Distribution bar** | Segmented bar (finished/reading/not started) with legend | Missing |
| **Summary text** | "5 of 7 reading · median at 61%" with contextual hint | Missing |
| **Staggered bar animations** | Progress bars animate in with 60ms stagger delay | Missing |
| **Status badge per member** (Done / Reading / Waiting) | Color-coded badges in member list | Missing |
| **Finished checkmark** | Gold circle checkmark on finished members | Missing |
| Compact dashboard card | Small ring + stats for dashboard embed | Missing |
| Page slider | Range input for progress update | Missing (uses number input) |

---

## New Spec IDs Needed

These features from the design need new EARS specs:

| ID | Description |
|----|-------------|
| VOTE-UI-004 | Nominating phase shall display nomination cards with book cover, pitch text, and nominator |
| VOTE-UI-005 | Book search modal shall search Open Library and allow one-click nomination |
| VOTE-UI-006 | Admin "Advance to voting" shall appear during nominating with prerequisite check |
| VOTE-UI-007 | Decided phase shall show winner banner with gradient, vote stats, and "Set up first meeting" CTA |
| VOTE-UI-008 | Final tallies shall display ranked list with proportional progress bars |
| MEET-UI-006 | Meeting list shall support status filter tabs (All/Proposed/Confirmed/Past) |
| MEET-UI-007 | Admin confirm view shall show availability heatmap and "Most available" recommendation |
| MEET-UI-008 | Confirmed meetings shall display date block, time, location, and attendee avatars |
| DISC-UI-005 | Thread list shall support sort by Recent and Most Comments |
| DISC-UI-006 | Pinned threads shall display with pin icon and sort above non-pinned |
| DISC-UI-007 | Thread detail shall show edit/delete buttons for author/admin |
| DISC-UI-008 | Deleted comments shall render as "[deleted]" placeholder preserving reply tree |
| PROG-UI-004 | Progress dashboard shall show SVG ring with median percentage |
| PROG-UI-005 | Progress dashboard shall show segmented distribution bar with legend |
| PROG-UI-006 | Member progress bars shall animate with staggered 60ms delay |
| DASH-UI-001 | Sidebar shall include club switcher dropdown with "Create or join" action |
| DASH-UI-002 | Dashboard shall show currently-reading hero with member tick-marks on progress bar |
