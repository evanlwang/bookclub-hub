# Book Selection and Voting

## Context and Design Philosophy

Book selection is the core decision-making feature. A club picks its next book through a structured process: members nominate candidates, the group votes, and the winner becomes the current read. This replaces the informal "who wants to read what?" conversation that happens in group chats and produces no clear outcome.

The design philosophy is **structured but not rigid**. The system enforces a nomination/vote cycle but lets the organizer skip steps (the organizer can also pick a book without a vote). The voting mechanism is approval voting — simple to understand, resistant to vote splitting, and trivial to implement.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Voting Round Lifecycle

ASCII state diagram (greppable):

```
nominating → voting → decided
nominating → cancelled
voting → cancelled
```

State: nominating — buttons shown: "Search & nominate", "Advance to Voting" (admin) — transitions: → voting (admin clicks "Advance to Voting"; needs ≥2 nominations); → cancelled (admin via API only)
State: voting — buttons shown: nomination cards, "Submit N votes" / "Save changes" / "✓ Votes saved", "Close voting & reveal winner" (admin), "Cancel round" (admin) — transitions: → decided (admin clicks Close voting → `rounds.advance`); → cancelled (admin clicks Cancel round → `rounds.cancel`)
State: decided — buttons shown: "Start new round" (admin) — transitions: terminal
State: cancelled — buttons shown: none on the round itself — transitions: terminal. When all rounds in the club are cancelled (no nominating, voting, or decided round to render), admins SHALL see the NonePhase "Start new round" CTA at the page level (VOTE-UI-NONE-001).

Phase descriptions:
- **Nominating**: members add books. No duplicates within the same round (UNIQUE on `(round_id, book_id)`). Admin can set a nomination deadline (data model only; no UI).
- **Voting**: each member approves up to N books (N configurable, default 3, min 1). Tallies hidden from non-decided rounds.
- **Decided**: highest approvals wins; ties broken by earliest nomination timestamp. Winner promoted to club's current book via BookSelection (`isCurrent=true`); prior current selection demoted.
- **Cancelled**: round discarded. All votes and nominations deleted.

## Button Inventory

Exact rendered labels in the running app, with conditions and handlers.

Button: "Search & nominate" — `vote-round.tsx:402-409` — visible: status="nominating" — enabled: always — handler: opens NominateModal
Button: "Advance to Voting" — `vote-round.tsx:440-449` — visible: status="nominating" AND isAdmin — enabled: nominations.length ≥ 2 — handler: `rounds.advance`
Button: nomination card (clickable) — `vote-round.tsx:155-196` — visible: status="voting" — enabled: not (selected.length ≥ maxApprovals AND !isSelected) — handler: toggleSelection
Button: "Submit {N} votes" / "Save changes" / "✓ Votes saved" — visible: status="voting" — three states driven by `(hasVoted, hasPendingChanges)` (VOTE-UI-VOTE-003): "Submit N votes" pre-vote, "Save changes" when voted+edited, disabled "✓ Votes saved" when voted+unedited — handler: `votes.submit`
Button: "Close voting & reveal winner" — visible: status="voting" AND isAdmin — enabled: at least one approval cast — handler: opens close-voting dialog → on confirm calls `rounds.advance` (CLOSE-002..006)
Button: "Cancel round" — visible: (status="nominating" OR "voting") AND isAdmin — enabled: always — handler: opens typed-confirmation dialog → calls `rounds.cancel` (CANCEL-002)
Button: "Start new round" — `vote-round.tsx:331-339` — visible: status="decided" AND isAdmin — enabled: always — handler: `rounds.create`
Button: "Start your first round" / "Start new round" (NonePhase) — `none-phase.tsx:91-118` — visible: isAdmin AND no round in club is `nominating`, `voting`, or `decided` (i.e., zero rounds OR all prior rounds cancelled) — enabled: always — handler: `rounds.create` (VOTE-UI-NONE-001)
Button: search input (debounced) — `nominate-modal.tsx:230-247` — visible: modal open, search tab — handler: `books.search` after 300ms debounce
Button: "Nominate" (per result row) — `nominate-modal.tsx:272-283` — visible: search results present — handler: `nominations.create`
Button: "Enter manually" — `nominate-modal.tsx:290-305` — visible: search ran, zero results — handler: switches to manual tab
Button: "Create & Nominate" — `nominate-modal.tsx:398-406` — visible: manual tab — enabled: title and author non-empty — handler: `books.createManual` then `nominations.create`
Button: "Back" — `nominate-modal.tsx:383-394` — visible: manual tab — handler: returns to search tab, resets manual fields
Button: "Cancel" — `nominate-modal.tsx:311-318` — visible: search tab — handler: closes modal

## Close-Voting Flow

Sequence when an admin closes voting from the UI:

```
admin → "Close voting & reveal winner" button (voting phase)
      → opens CloseVotingDialog
            → preview: top 3 nominations by approval count (computed client-side)
            → leader marked "Will become the current book"
            → if tied: "Tied with N other(s) — earliest nomination wins"
            → "Close voting" confirm button (irreversible)
      → rounds.advance(roundId)
            → server tallies via tallyVotes (VOTE-BE-001 — earliest nomination breaks ties)
            → sets winningBookId, marks BookSelection.isCurrent=true,
              demotes prior current selection
      → router.refresh() → page re-renders with status="decided"
            → winner banner, full tallies revealed (VOTE-API-VISIBILITY-002)
            → club dashboard "Current Book" card reflects new pick on next visit
```

The Close button is disabled with helper text "No votes cast yet" when zero approvals exist across nominations (CLOSE-007). Tie-break behavior is the existing `VOTE-BE-001` rule — surfaced in copy rather than overridable. Manual tie override is deferred (`VOTE-BE-TIE-MANUAL-001`).

## Gaps (UI not yet built; mutations exist)

Button: "Set up first meeting" CTA on winner banner — `[!]` listed in older spec, not implemented.
Button: "View on Open Library" CTA on winner banner — `[!]` listed in older spec, not implemented.
Pitch textarea in NominateModal — `[ ]` data field exists on Nomination but no UI input.
Nomination deadline / voting deadline pickers — `[ ]` data fields exist on VotingRound; no UI exposure.

## Data Model

```
Book {
  id: UUID (PK)
  title: string
  author: string
  isbn: string (nullable)
  cover_url: string (nullable)
  description: string (nullable)
  page_count: integer (nullable)
  open_library_id: string (nullable -- null when manually created)
  created_at: timestamp
}

VotingRound {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  status: enum("nominating", "voting", "decided", "cancelled")
  max_approvals_per_member: integer (default 3)
  nomination_deadline: timestamp (nullable)
  voting_deadline: timestamp (nullable)
  winning_book_id: UUID (FK -> Book, nullable)
  created_by: UUID (FK -> User)
  created_at: timestamp
  updated_at: timestamp
}

Nomination {
  id: UUID (PK)
  round_id: UUID (FK -> VotingRound)
  book_id: UUID (FK -> Book)
  nominated_by: UUID (FK -> User)
  pitch: string (max 500 chars, nullable)
  created_at: timestamp
  UNIQUE(round_id, book_id)
}

Vote {
  id: UUID (PK)
  round_id: UUID (FK -> VotingRound)
  nomination_id: UUID (FK -> Nomination)
  user_id: UUID (FK -> User)
  created_at: timestamp
  UNIQUE(round_id, nomination_id, user_id)
}

BookSelection {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book)
  round_id: UUID (FK -> VotingRound, nullable -- null if admin-picked)
  selected_at: timestamp
  finished_at: timestamp (nullable)
  is_current: boolean (default true)
}
```

## API Contracts

| Procedure | Auth | Input | Output | Notes |
|-----------|------|-------|--------|-------|
| `rounds.list` | member | `{ clubId }` | `[{ round }]` | ordered by createdAt DESC |
| `rounds.create` | admin+ | `{ clubId, maxApprovalsPerMember?, nominationDeadline?, votingDeadline? }` | `{ round }` | throws CONFLICT if active round exists |
| `rounds.get` | member | `{ clubId, roundId }` | `{ round, nominations, votes? }` | hides tallies pre-decided |
| `rounds.advance` | admin+ | `{ clubId, roundId }` | `{ newStatus, winner? }` | nominating→voting OR voting→decided; throws BAD_REQUEST if decided/cancelled |
| `rounds.cancel` | admin+ | `{ clubId, roundId }` | `{ success: true }` | throws BAD_REQUEST if decided/cancelled |
| `nominations.create` | member | `{ clubId, roundId, bookId, pitch? }` | `{ nomination }` | requires status="nominating"; CONFLICT on duplicate |
| `nominations.delete` | nominator OR admin+ | `{ clubId, nominationId }` | `{ success: true }` | NOT_FOUND if the loaded nomination's `round.clubId` differs from `input.clubId` — cross-club guard (VOTE-API-NOMDELETE-XCLUB-001) |
| `votes.submit` | member | `{ clubId, roundId, nominationIds }` | `{ success, voteCount }` | requires status="voting"; replaces all prior votes |
| `books.search` | required | `{ query }` | `[{ book }]` | local cache → Open Library; merged results collapsed by content key (ISBN, else title+author) so the same logical book never appears twice; empty array on API failure |
| `books.createManual` | required | `{ title, author, isbn?, pageCount? }` | `{ book }` | openLibraryId=null |
| `books.listForClub` | member | `{ clubId }` | `[{ book }]` | books selected for this club |
| `selections.list` | member | `{ clubId }` | `[{ selection }]` | reading history, selectedAt DESC |
| `selections.createDirectPick` | admin+ | `{ clubId, bookId }` | `{ selection }` | admin pick without vote |

## Notification Triggers (via Resend)

- `[x]` Round enters "nominating" → email all members (`rounds.ts:17-66`)
- `[x]` Round enters "voting" → email all members (`rounds.ts:118-126`)
- `[x]` Round decided → email all members with winner (`rounds.ts:128-181`)
- `[ ]` Voting deadline 24h before → email non-voters (gap; needs deadline UI)

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Voting method | Approval voting | Ranked choice; plurality; Borda count | Approval is simplest to implement and explain. A member checks the books they'd be happy reading. Highest count wins. |
| Vote visibility during voting | Hidden until decided | Live tally; anonymous results | Hidden tallies prevent bandwagoning. |
| Tie-breaking | Earliest nomination timestamp | Random; admin picks; runoff | Deterministic; rewards initiative. |
| Vote replacement | Full replacement (submit all approvals at once) | Incremental add/remove | Simpler; avoids partial-vote states. |
| Manual book entry | Title/Author/ISBN/PageCount, no Open Library ID | Require Open Library | Lets clubs add obscure or non-cataloged books. |

## Open Questions

### Resolved

1. ✅ Approval voting with hidden tallies.
2. ✅ External book metadata API with manual fallback (Title/Author/ISBN/PageCount form).
3. ✅ Tie-breaking by earliest nomination.

### Deferred

1. **Nomination limits per member per round.** Currently unlimited.
2. **Reading history analytics.** Genre distribution, pace over time, author diversity.
3. **"I've already read this" flag.** Useful signal but adds UI complexity.
4. **Pitch text in nominate flow.** Data model supports it; no UI input today.

## References

- `docs/specs/vote-specs.md`
- `docs/llds/club-management.md` — rounds are scoped to clubs
- `docs/high-level-design.md`
