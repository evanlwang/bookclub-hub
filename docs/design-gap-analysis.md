# Design Gap Analysis

Comparison of the Claude Design prototype (`bookclub-hub-handoff.zip`) against the current Next.js implementation. Features are grouped by design artboard section.

---

## Summary

| Area | Implemented | Remaining Gaps |
|------|:-----------:|:--------------|
| 01 Foundation (design system) | Mostly | Toast component, BookCover component |
| 02 Entry (landing + join) | Complete | — |
| 03 Hub (dashboard + sidebar) | Partial | Club switcher, sidebar nav, breadcrumbs, hero card, three-up cards |
| 04 Voting | Partial | Book covers, sidebar metadata, decided banner, tallies table, search modal |
| 05 Meetings | Partial | Date block, avatar stack, admin confirm/heatmap, past meetings, location |
| 06 Discussions | Partial | Pinned threads, thread detail page, edit/delete, [deleted], sticky composer |
| 07 Progress | Mostly | Member subtitle (page/ch), finished checkmark, update modal redesign |

---

## Component-Level Detail Gaps

### 07 · Reading Progress

| Design Detail | Current State | Gap |
|---|---|---|
| Progress ring: 130px, 12px stroke, cubic-bezier, "median" sublabel | 100px, 10px stroke, basic transition, no sublabel | Ring smaller, missing sublabel |
| Member row: avatar(md), name+subtitle (page/ch/status), bar, big pct, badge | avatar(sm), name only, bar, small pct, badge | ✗ No page/chapter subtitle |
| Name subtitle: `Page 322 · ch. 16` / `Finished · 412 pages` / `Not started yet` | Only displayName | ✗ Missing |
| Finished checkmark: 18×18 gold circle with check icon inline with name | Not present | ✗ Missing |
| Percentage: t-display 18px, fontWeight 600, tabular-nums, dimmed `%` | text-xs mono | Smaller, different font |
| "Where everyone is" section heading above member list | Not present | ✗ Missing |
| Update modal: 3-up radio status cards, range slider, live preview bar | Basic number inputs | ✗ Missing radio cards, slider, preview |
| Compact dashboard card: small ring (64px) + one-line stats | Not built | ✗ Missing (dashboard feature) |

### 04 · Voting Rounds

| Design Detail | Current State | Gap |
|---|---|---|
| Nominating cards: BookCover + content + dismiss-X button | Text-only cards, no cover, no dismiss | ✗ Missing covers and dismiss |
| Nominator display: avatar(sm) + name + relative time ("2 days ago") | Name only, no avatar, no time | ✗ Missing avatar + time |
| Sidebar meta: badge, countdown ("Closes in 2 days"), deadline, stats | Not present | ✗ Entire sidebar missing |
| Admin actions (sidebar card): "Advance to voting" + prerequisite text | Inline button at bottom | Different placement |
| Voting cards: checkbox(22×22) + BookCover + content, focus ring on select | No checkbox indicator, no cover | ✗ Missing checkbox + cover |
| Voting sidebar: approval dots (N/max visual), turnout card | Not present | ✗ Missing |
| Decided banner: gradient bg, large BookCover, 44px title, vote fraction, CTAs | Basic card list | ✗ Missing gradient, cover, CTAs |
| Final tallies: ranked (①, 02), BookCover per row, proportional progress bars | Badge with vote count | ✗ Missing ranking, covers, bars |
| Book search modal: search + Esc badge, results with cover + "Nominate" btn | Not implemented | ✗ Entire feature missing |

### 05 · Meetings

| Design Detail | Current State | Gap |
|---|---|---|
| Filter tabs with counts: `All (5) / Proposed (2) / Confirmed (1) / Past (2)` | Tabs without counts, no Past tab | ✗ Missing counts + Past |
| Confirmed row: date block (day/date/month, 64px accent-soft), title, clock+time, pin+location, avatar stack | Basic card with title + date + badge | ✗ Missing date block, location, avatars |
| Attendee avatar stack: overlapping (-6px), 2px bg border, "5 going · 2 maybe" | Not present | ✗ Missing |
| Proposed row: calendar icon (64×64 warning-soft), "Awaiting responses", slot count, response ratio, Respond btn | Basic card with badge | ✗ Missing icon, counts, respond button |
| Past row: dimmed (opacity 0.7), bg-sunken icon, Past badge, location, "Notes" btn | Not shown (no Past filter) | ✗ Missing |
| Admin confirm view: slot table, heatmap blocks (22px, color-coded), "Most available" badge, location input, "Confirm & notify" | Not implemented | ✗ Entire view missing |
| Respond view: tri-state radio (✓/?/✗ colored), sidebar with response dots, "waiting on" avatars | Simpler response UI | Partial |

### 06 · Discussions

| Design Detail | Current State | Gap |
|---|---|---|
| Thread rows: pinned gold bg, `📌 PINNED` label, ChapterChip (color-coded), author avatar + time, hover bg | Basic cards, no pin styling, no avatars in list | ✗ Missing pinned UI, avatars |
| ChapterChip: color palette rotating by chapter number (5 colors) | Basic Badge tone="neutral" | ✗ Missing color rotation |
| Spoiler filter: primary-soft bg, filter icon, styled "X threads hidden" + "Show all anyway" link | Basic bg-soft with input | Partial |
| Thread detail: edit/delete icon buttons, 28px title, avatar(md), "edited" label, serif body (16px, 1.65lh) | Not built as separate page | ✗ Missing |
| Comment blocks: avatar(md) + card, serif body, hover-reveal Reply button | Basic display | ✗ Missing hover-reveal, serif |
| Nested replies: left border (2px var(--line)), 16px indent, avatar(sm) | Basic flat display | ✗ Missing nested styling |
| [deleted] placeholder: bg-sunken, rounded, italic "[deleted]" | Not implemented | ✗ Missing |
| Sticky composer: position sticky, gradient fade mask, avatar + textarea + hint | Not sticky, no fade | ✗ Missing |
| Thread sidebar: "About this thread" metadata card | Not implemented | ✗ Missing |

### 03 · Dashboard + Sidebar

| Design Detail | Current State | Gap |
|---|---|---|
| Sidebar: 244px, bg-soft, club switcher + nav + user menu | Next.js layout with basic links | ✗ Needs redesign |
| Club switcher: club icon + name + role badge + chevron dropdown | Not present | ✗ Missing |
| Dropdown: lists clubs with roles, checkmark on current, "Create or join" action | Not present | ✗ Missing |
| Nav items: active border-left (2px primary), "Live" badge on Voting, count on Discussions | Basic nav links | ✗ Missing active styling, badges |
| Breadcrumb bar: `Club > Page` + invite code chip (mono) + Invite button | Not present | ✗ Missing |
| Greeting: date + "Good evening, {name}" (38px) + attention summary | Not present | ✗ Missing |
| Currently-reading hero: BookCover(lg) + badges + stats grid + progress bar with avatar tick-marks at each member's % | Basic text | ✗ Missing |
| Three-up cards: Active vote (covers + turnout), Next meeting (date block + avatars), Recent threads (chips + pins) | Basic links | ✗ Missing rich cards |

---

## Shared Components Needed

| Component | Used In | Description |
|---|---|---|
| `BookCover` | Voting, Dashboard | Colored placeholder cover with title/author, sizes sm/md/lg/xl |
| `ChapterChip` | Discussions | Color-coded badge rotating through 5 hues by chapter number |
| `DateBlock` | Meetings, Dashboard | Calendar-style block (day/date/month) in accent-soft |
| `AvatarStack` | Meetings, Dashboard | Overlapping avatars with -6px margin and 2px bg border |
| `Heatmap` | Meetings (admin) | Per-member response blocks (green/amber/gray) in a row |
| `RadioGroup` (tri-state) | Meetings (respond) | ✓/?/✗ buttons with colored backgrounds |
| `ApprovalDots` | Voting sidebar | Visual N/max selection indicator (filled/empty dots) |

---

## Priority Ranking (Visual Impact × Effort)

### Tier 1 — High impact, moderate effort
1. **BookCover component** — used in 3 artboards, defines visual identity
2. **Meeting confirmed row** — date block + location + avatar stack
3. **Progress member subtitle** — page/chapter info per row
4. **Nominating card overhaul** — book cover + avatar + dismiss + time

### Tier 2 — High impact, higher effort
5. **Dashboard hero card** — currently-reading with avatar tick-marks
6. **Sidebar + club switcher** — navigation redesign
7. **Decided winner banner** — gradient + large cover + CTAs
8. **Thread detail page** — edit/delete, serif, nested replies

### Tier 3 — Medium impact
9. **Filter tab counts** — badge counts on meeting/discussion tabs
10. **Pinned threads** — gold bg + pin icon + sort-first logic
11. **Admin confirm heatmap** — color-coded availability blocks
12. **Update progress modal** — radio cards + range slider + preview
13. **Final tallies table** — ranked list with proportion bars
14. **Sticky comment composer** — position sticky + fade mask

### Tier 4 — Lower impact / polish
15. **Finished checkmark** — gold circle inline
16. **Progress ring sublabel** — "median" text below percentage
17. **Voting approval dots** — visual selection counter
18. **Thread sidebar** — metadata card
19. **[deleted] placeholder** — sunken italic text
20. **Hover-reveal reply buttons** — CSS-only interaction
