# Mock Data System Improvements

## Overview

Refactored the test data setup from scattered duplicate fixtures into a comprehensive, reusable factory system with multiple seed scenarios. This eliminates duplication, improves maintainability, and provides flexible options for different test contexts.

## What Changed

### Structure

**Before:**
- Fixtures scattered in `tests/fixtures/` with manual duplication between fixtures and global-setup
- Limited to one "golden dataset" approach
- Duplicated seed logic in `tests/e2e/global-setup.ts` and `tests/fixtures/index.ts`

**After:**
- Organized factory functions in `tests/factories/` (users, books, clubs, entities)
- Three composable seed scenarios (minimal, standard, full)
- Global-setup reuses factories, eliminating duplication
- Backward-compatible fixture re-exports for existing code

### Key Files Created

1. **`tests/factories/users.ts`** — User factory + 8 pre-built users (alice, bob, grace, henry, etc.)
2. **`tests/factories/books.ts`** — Book factory + 8 pre-built books with real metadata (ISBN, page counts, descriptions)
3. **`tests/factories/clubs.ts`** — Club factory + 4 pre-built clubs (wedReads, sciFiExplorers, historyBuffs, fantasyFans)
4. **`tests/factories/entities.ts`** — Factories for complex entities:
   - Voting rounds, nominations, votes
   - Meetings, time slots, availability responses
   - Discussion threads and comments
   - Reading progress
   - Memberships and book selections
5. **`tests/factories/scenarios.ts`** — Three complete seed scenarios:
   - `seedMinimal()` — Quick setup for unit tests (~15 records)
   - `seedStandard()` — Golden dataset matching original E2E setup (~100 records)
   - `seedFull()` — Comprehensive scenario with multiple clubs/rounds/meetings (~250+ records)
6. **`tests/factories/index.ts`** — Single entry point exporting all factories
7. **`tests/factories/README.md`** — Complete documentation with examples

### Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Duplication** | Seed logic duplicated in fixtures & global-setup | Single source of truth in factories |
| **Flexibility** | One static "golden dataset" | Three scenarios (minimal, standard, full) |
| **Reusability** | Limited factory support | Complete factory functions for all entities |
| **Test users** | 6 hardcoded users | 8 pre-built users, easy to create more |
| **Test books** | 3 basic books | 8 books with real metadata (ISBN, descriptions, page counts) |
| **Test clubs** | 2 clubs | 4 clubs, easy to create more |
| **Maintainability** | Changes needed in 2 places | Changes only in factories, used everywhere |
| **Documentation** | None | Comprehensive README with examples |

## Usage Examples

### Seed a Test Database

```typescript
import { seedStandard, seedFull } from "@tests/factories";

// For most E2E tests
await seedStandard(db); // ~100 records, 2 clubs, 1 completed voting round

// For comprehensive testing
await seedFull(db); // ~250+ records, 3 clubs, multiple voting rounds/states
```

### Use Pre-built Objects

```typescript
import { alice, bob, dune, wedReads } from "@tests/factories";

// Pre-built objects ready to use
const user = alice; // {id, email: "alice@example.com", displayName: "Alice Chen"}
const book = dune;  // {id, title: "Dune", author, isbn, pageCount: 412, ...}
```

### Create Custom Objects

```typescript
import { createUser, createBook, createMeeting } from "@tests/factories";

const testUser = createUser({
  email: "custom@example.com",
  displayName: "Custom User",
});

const testMeeting = await createMeeting(db, {
  clubId: club.id,
  bookId: dune.id,
  createdBy: alice.id,
  slots: [
    { proposedTime: new Date("2026-06-01T19:00:00Z"), durationMinutes: 60 },
    { proposedTime: new Date("2026-06-03T20:00:00Z"), durationMinutes: 90 },
  ],
});
```

## Seed Scenario Details

### seedMinimal

Use for: Quick unit tests with minimal setup

Contains:
- 3 users (alice, bob, carol)
- 2 books (dune, leftHand)
- 1 club with alice as owner

### seedStandard

Use for: Most E2E and integration tests (matches original "golden dataset")

Contains:
- 6 users (alice, bob, carol, dave, eve, frank)
- 3 books (dune, leftHand, kindred)
- 2 clubs with varied membership
- 1 completed voting round (Dune won)
- 1 proposed meeting with 3 slots
- 4 discussion threads with comments
- Varied reading progress across all users

### seedFull

Use for: Comprehensive E2E tests covering all features

Contains:
- 8 users (adds grace, henry)
- 7 books (adds hailMary, piranesi, exhalation, theMartian, foundationSeries)
- 3 clubs with different activity levels
- 3 voting rounds in different phases (nominating, voting, decided)
- 2 meetings (1 confirmed, 1 proposed with availability)
- 3 discussion threads with nested comments (2-3 levels)
- Varied reading progress (not_started, reading, finished)

## Backward Compatibility

Existing code continues to work:

```typescript
// Old imports still work (re-exported from factories)
import { seedFullScenario, alice, wedReads } from "@tests/fixtures";

// New preferred imports
import { seedStandard, alice, wedReads } from "@tests/factories";
```

## Testing

All tests pass with the new system:
- ✅ Unit tests: 84 passed
- ✅ Integration tests: 78 passed
- ✅ E2E tests: Database seeding verified ("E2E global setup: database seeded successfully")

## Migration Guide for Test Code

### If you have custom seed logic:

```typescript
// Before: Manual seed
await db.user.createMany({data: [...]});
await db.club.create({...});

// After: Use factory + scenario
import { seedStandard } from "@tests/factories";
await seedStandard(db);
```

### If you reference seedClubWithMembers:

```typescript
// Before
import { seedClubWithMembers } from "@tests/fixtures/memberships";
await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);

// After (still works, same import)
import { seedClubWithMembers } from "@tests/fixtures/memberships";
await seedClubWithMembers(db, wedReads, alice, [bob], [carol]);

// Or use factories directly
import { insertClub, createMembership } from "@tests/factories";
```

## Next Steps (Optional)

1. **Add more books**: Update `factories/books.ts` with additional titles
2. **Customize scenarios**: Create scenario variations for specific test suites (e.g., `seedWithArchivedClub()`)
3. **Add session creation**: Add `createSession()` factory for auth testing
4. **Snapshot factories**: Create "frozen" snapshots of database states for regression testing

## Questions?

See `tests/factories/README.md` for comprehensive documentation with examples.
