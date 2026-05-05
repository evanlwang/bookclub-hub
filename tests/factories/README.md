# Test Data Factories

This directory contains reusable factories and seed scenarios for creating consistent mock data across unit, integration, and E2E tests.

## Overview

The factory system provides:
- **Factories**: Functions for creating individual test objects (users, books, clubs, etc.)
- **Pre-built objects**: Commonly-used test data (alice, bob, dune, wedReads, etc.)
- **Seed scenarios**: Complete database states for different testing contexts

## Structure

```
factories/
├── users.ts          # User factories and pre-built users
├── books.ts          # Book factories and pre-built books
├── clubs.ts          # Club factories and pre-built clubs
├── entities.ts       # Factories for complex entities (voting rounds, meetings, etc.)
├── scenarios.ts      # Complete seed scenarios (minimal, standard, full)
├── index.ts          # Main export file
└── README.md         # This file
```

## Quick Start

### Using Pre-built Objects

```typescript
import { alice, bob, dune, wedReads } from "@tests/factories";

// Pre-built objects are ready to use
console.log(alice.email); // "alice@example.com"
console.log(dune.title);  // "Dune"
```

### Creating Test Objects

```typescript
import { createUser, createBook, createClub } from "@tests/factories";

// Create with defaults
const user = createUser();
const book = createBook();

// Create with overrides
const carol = createUser({
  email: "carol@example.com",
  displayName: "Carol Park",
});

const novel = createBook({
  title: "1984",
  author: "George Orwell",
  pageCount: 328,
});
```

### Seeding a Test Database

```typescript
import { seedMinimal, seedStandard, seedFull } from "@tests/factories";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Minimal: 3 users, 2 books, 1 simple club
await seedMinimal(db);

// Standard: 2 clubs, 6 users, completed voting round (matches original golden dataset)
await seedStandard(db);

// Full: 3 clubs, 8 users, multiple voting rounds in different phases, confirmed meeting, discussions with comments
await seedFull(db);
```

## Seed Scenarios

### seedMinimal

**Use for**: Unit tests with minimal setup overhead

Contains:
- 3 users (alice, bob, carol)
- 2 books (dune, leftHand)
- 1 club (wedReads) with alice as owner

**Size**: ~15 database records

### seedStandard

**Use for**: Most E2E and integration tests; the standard "golden dataset"

Contains:
- 6 users (alice, bob, carol, dave, eve, frank)
- 3 books (dune, leftHand, kindred)
- 2 clubs with varied membership structure
- 1 completed voting round
- 1 proposed meeting with availability responses
- 4 discussion threads with comments
- Reading progress for all users

**Size**: ~100 database records

**Clubs**:
- `wedReads` (alice=owner, bob+carol=admin, dave+eve+frank=member)
- `sciFiExplorers` (bob=owner, alice+dave=member)

### seedFull

**Use for**: Comprehensive E2E tests, testing multiple states

Contains:
- 8 users (includes grace, henry)
- 7 books
- 3 clubs with different activity levels
- 3 voting rounds in different phases:
  - Round 1 (decided): Dune selected
  - Round 2 (nominating): Active nominations
  - Round 3 (voting): Votes in progress
- 2 meetings:
  - 1 confirmed with datetime and location
  - 1 proposed with 3 time slots and availability responses
- 3 discussion threads with nested comments
- Varied reading progress (not_started, reading, finished)

**Size**: ~250+ database records

**Clubs**:
- `wedReads` (6 members, active)
- `sciFiExplorers` (4 members, active voting)
- `historyBuffs` (2 members, voting in progress)

## Creating Entities in Tests

### Voting Rounds

```typescript
import { createVotingRound, createNomination, createVote } from "@tests/factories";

const round = await createVotingRound(db, {
  clubId: club.id,
  status: "nominating",
  createdBy: alice.id,
});

const nomination = await createNomination(db, {
  roundId: round.id,
  bookId: dune.id,
  nominatedBy: alice.id,
  pitch: "A classic we've never read",
});

const vote = await createVote(db, {
  roundId: round.id,
  nominationId: nomination.id,
  userId: bob.id,
});
```

### Meetings

```typescript
import { createMeeting, createAvailability } from "@tests/factories";

const meeting = await createMeeting(db, {
  clubId: club.id,
  bookId: dune.id,
  title: "Dune Discussion",
  createdBy: alice.id,
  status: "proposed",
  slots: [
    { proposedTime: new Date("2026-05-18T19:00:00Z"), durationMinutes: 60 },
    { proposedTime: new Date("2026-05-20T20:00:00Z"), durationMinutes: 90 },
  ],
});

// Add availability responses
const slots = await db.meetingTimeSlot.findMany({ where: { meetingId: meeting.id } });
await createAvailability(db, {
  slotId: slots[0].id,
  userId: alice.id,
  status: "available",
});
```

### Discussions

```typescript
import { createDiscussionThread, createComment } from "@tests/factories";

const thread = await createDiscussionThread(db, {
  clubId: club.id,
  bookId: dune.id,
  authorId: alice.id,
  title: "The water discipline worldbuilding",
  body: "The Fremen water discipline is fascinating...",
  chapterTag: "Chapter 3",
  chapterNumber: 3,
});

const comment = await createComment(db, {
  threadId: thread.id,
  authorId: bob.id,
  body: "Great point about the ecological themes!",
});
```

### Reading Progress

```typescript
import { createReadingProgress } from "@tests/factories";

await createReadingProgress(db, {
  clubId: club.id,
  bookId: dune.id,
  userId: alice.id,
  currentPage: 251,
  totalPages: 412,
  percentage: 61,
  currentChapter: 12,
  status: "reading",
});
```

## Available Pre-built Objects

### Users

- `alice` (alice@example.com, Alice Chen)
- `bob` (bob@example.com, Bob Martinez)
- `carol` (carol@example.com, Carol Park)
- `dave` (dave@example.com, Dave Singh)
- `eve` (eve@example.com, Eve Thompson)
- `frank` (frank@example.com, Frank Wilson)
- `grace` (grace@example.com, Grace Lee)
- `henry` (henry@example.com, Henry Kim)

### Books

- `dune` (Frank Herbert, 412 pages)
- `leftHand` (Ursula K. Le Guin, 304 pages)
- `kindred` (Octavia Butler, 264 pages)
- `hailMary` (Andy Weir, 476 pages)
- `piranesi` (Susanna Clarke, 272 pages)
- `exhalation` (Ted Chiang, 512 pages)
- `theMartian` (Andy Weir, 369 pages)
- `foundationSeries` (Isaac Asimov, 255 pages)

### Clubs

- `wedReads` (code: WEDREADS, "Wednesday Night Reads")
- `sciFiExplorers` (code: SCIFI42, "Sci-Fi Explorers")
- `historyBuffs` (code: HSTBUF, "History Buffs")
- `fantasyFans` (code: FFU, "Fantasy Fans United")

## Best Practices

### Choose the Right Scenario

- **Unit tests**: Use factories directly, avoid scenarios if possible
- **Integration tests**: Use `seedStandard` or create minimal setup
- **E2E tests**: Use `seedStandard` or `seedFull` depending on test scope

### Avoid Duplication

```typescript
// ✗ Bad: Create your own test data
const alice = { id: "xyz", email: "alice@example.com" };

// ✓ Good: Use pre-built objects
import { alice } from "@tests/factories";
```

### Use Factories for Customization

```typescript
// ✗ Bad: Mutate pre-built objects
alice.email = "alice2@example.com";

// ✓ Good: Create a new object with overrides
const alice2 = createUser({
  email: "alice2@example.com",
  displayName: "Alice Chen",
});
```

### Keep Tests Independent

Each test should either:
1. Use a scenario (automatic cleanup via transaction)
2. Create its own fixtures in a `beforeEach` block
3. Use `@expect` style assertions that don't depend on timing

## Migration from Old Fixtures

The old `tests/fixtures/` directory now re-exports from `tests/factories/` for backward compatibility. You can update imports:

```typescript
// Old (still works)
import { alice, seedFullScenario } from "@tests/fixtures";

// New (preferred)
import { alice, seedStandard } from "@tests/factories";
```

## Adding New Scenarios

Create a scenario in `scenarios.ts` following this pattern:

```typescript
export async function seedMyScenario(db: PrismaClient) {
  // Clear database (done by E2E test harness)
  
  // Create users
  await insertAllUsers(db, [alice, bob, carol]);
  
  // Create books
  await insertAllBooks(db, [dune, leftHand]);
  
  // Create clubs and memberships
  const club = await db.club.create({...});
  await createMembership(db, {clubId: club.id, userId: alice.id, role: "owner"});
  
  // Create related entities
  const round = await createVotingRound(db, {...});
  
  // Return created entities for test reference
  return { club, round, users: [alice, bob, carol] };
}
```

Then export it from `index.ts`.
