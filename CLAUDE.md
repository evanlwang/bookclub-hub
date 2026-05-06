# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project should evolve using linked-intent driven development and test driven developemnt. Use EARS notation and grep to quickly search specs, tests, and code efficiently. Always plan and consult these files first with a plan, then write tests, then implement source code:
- CLAUDE.md for architecture, commands, and development patterns
- docs/high-level-design.md for system vision and key design decisions
- docs/specs/ for EARS requirement IDs and feature scope
- docs/llds/ for component-level contracts (data models, API shapes, visual layouts)
- docs/lids/ for linked-intent driven development docs

## Project Overview

**BookClub Hub** is a full-stack application that coordinates the complete lifecycle of book club activity: voting on books, scheduling meetings, discussing chapters, and tracking reading progress. It consolidates what would otherwise be scattered across group chats, spreadsheets, and scheduling tools into a single, purpose-built application.

### Core Stack
- **Frontend**: Next.js App Router with React Server Components, TypeScript, Tailwind CSS
- **Backend**: tRPC for end-to-end type-safe RPC, Next.js API routes
- **Database**: PostgreSQL (Neon), Prisma ORM for schema management
- **External APIs**: Open Library (book metadata), Resend (email)
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Architecture

### High-Level Layers

1. **API Layer** (`src/server/routers/`): tRPC procedure definitions for 10+ domains (auth, clubs, voting, meetings, discussions, progress, etc.). Each router file is responsible for validating input, calling services, and returning results.

2. **Service Layer** (`src/server/services/`): Business logic that doesn't belong in Prisma models. Handles voting logic, progress calculations, notification triggering, and cross-entity operations.

3. **Data Layer** (`prisma/schema.prisma`): Postgres schema. Relationships between Users, Clubs, Memberships, Voting Rounds, Discussions, Meetings, and Reading Progress. Use `prisma generate` after schema changes.

4. **Frontend** (`src/app/`): Next.js App Router with server components for data loading, client components for interactivity. Pages organized by feature area (clubs/[clubId]/meetings, clubs/[clubId]/vote, etc.). Shared UI components in `src/components/ui/`.

### Key Data Models

- **Club**: Isolated space for group coordination, identified by unique code. Has owner/admin/member roles.
- **VotingRound**: State machine with phases: nominating → voting → decided. Tracks nominations and votes.
- **Meeting**: Scheduling container with proposed slots. Members mark availability, organizer confirms one slot.
- **DiscussionThread**: Book-specific conversations, tagged by chapter. Spoiler-safe filtering based on reader progress.
- **ReadingProgress**: Per-member status (page, percentage, chapter, status) for aggregate club visibility.

## Commands

### Development

```bash
make dev          # Start dev server on :3000 (with DB provisioning)
make up           # Clean reset: kill old server, reset DB, seed fresh test data, start dev
make dev-down     # Kill the dev server
```

### Database

```bash
make db-push      # Apply schema changes from prisma/schema.prisma to local DB
make seed         # Wipe and re-populate dev DB with test data (idempotent)
make db-create    # Create the dev database if it doesn't exist
make db-reset     # Drop and recreate from scratch
```

Test accounts created by `seed`:
- alice@example.com (Alice Chen) — owner of WEDREADS club
- bob@example.com (Bob Martinez) — owner of SCIFI42, admin of WEDREADS
- carol@example.com (Carol Park) — admin of WEDREADS
- dave@example.com (Dave Singh) — member of both clubs
- eve@example.com, frank@example.com — members of WEDREADS

### Testing

```bash
npm run test:unit              # Run all unit tests once
npm run test:integration       # Run all integration tests once
npm run test:e2e               # Run Playwright E2E tests
npm run test                   # Run unit + integration (not E2E)
npm run test:coverage          # Unit tests with coverage report
npx vitest run -t "pattern"    # Run a single test by name
```

Unit tests live in `*.test.ts` files next to source. Integration tests in `tests/integration/`. E2E tests in `tests/e2e/`.

### Linting & Type Checking

```bash
npm run lint      # ESLint check (also run by pre-commit hook)
npm run typecheck # TypeScript check without emitting
npm run build     # Next.js build (full pipeline)
```

### Utilities

```bash
make help         # Show all available Makefile targets
```

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── clubs/[clubId]/           # Club-specific pages
│   │   ├── vote/                 # Voting UI
│   │   ├── meetings/             # Meeting scheduling
│   │   ├── progress/             # Reading progress dashboard
│   │   └── discussions/          # Thread list & detail
│   ├── join/                     # Join club flow
│   └── api/                      # Raw Next.js API routes (minimal; most is tRPC)
├── server/
│   ├── routers/                  # tRPC procedure definitions (one file per domain)
│   │   ├── auth.ts, clubs.ts, votes.ts, rounds.ts, etc.
│   │   └── _app.ts               # Router composition
│   └── services/                 # Business logic layer
├── trpc/
│   ├── client.ts                 # tRPC client for browser
│   ├── react.tsx                 # TanStack Query integration
│   └── server.ts                 # tRPC server factory
├── components/
│   └── ui/                       # Shared UI components (buttons, cards, badges, etc.)
├── lib/
│   ├── auth/                     # Session/identity utilities
│   ├── voting/                   # Voting logic (tie-breaking, etc.)
│   ├── progress/                 # Progress calculations (page → percentage, etc.)
│   └── validation/               # Zod schemas for tRPC input validation
└── types.ts                      # Shared TypeScript interfaces (if any)

tests/
├── unit/                         # Unit tests (co-located with source preferred)
├── integration/                  # Integration tests
└── e2e/                          # Playwright E2E tests
    └── global-setup.ts           # Seed data generator (also used by make seed)

docs/
├── high-level-design.md          # System vision, problems solved, v1 scope
├── specs/                        # EARS requirement specs (vote-specs, meet-specs, etc.)
└── llds/                         # Low-level designs per intent component
```

## Development Patterns

### Adding a Feature

1. **Spec first**: Add a new row to the appropriate spec file in `docs/specs/` (or create one if the domain doesn't exist). Use the EARS format: `FEATURE-CONTEXT-NNN: The system SHALL...`

2. **Write tests**: Add unit tests in `src/` or integration tests in `tests/integration/`. Use `@spec FEATURE-CONTEXT-NNN` annotations in test names to link back to requirements.

3. **Implement**: Create or modify files in the appropriate layer:
   - Database changes: edit `prisma/schema.prisma`, run `make db-push`
   - New API procedure: add to the relevant router in `src/server/routers/`
   - UI: create or modify React components in `src/app/` or `src/components/`
   - Business logic: add to a service in `src/server/services/` if shared across procedures

4. **Annotate code**: Add `// @spec FEATURE-CONTEXT-NNN` comments at the entry point of each implementation (main function/component that implements the behavior). This creates a link from code back to requirements.

### Working with tRPC Procedures

tRPC routes are defined as procedures in `src/server/routers/`. Each procedure:
- Takes **input** (validated with Zod schema)
- Returns **output** (plain TypeScript type)
- Can **throw** TRPCError for failures (caught and sent to client)

Example pattern:
```typescript
export const voting = router({
  submitVotes: protectedProcedure
    .input(z.object({ roundId: z.string(), nominationIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // ctx.user is the authenticated user
      // Call a service, modify DB via Prisma, return result
    }),
});
```

The tRPC server is composed in `src/server/routers/_app.ts` and exposed via `src/app/api/trpc/[trpc].ts`.

### React Server Components & Client Components

- **Server components** (default in App Router): load data at request time, no JS overhead, can directly access DB/services. Used for page shells and data loading.
- **Client components** (`"use client"`): interactive UI, state, effects, event handlers. Used for forms, modals, interactive elements.

The pattern: a server component loads data via tRPC and passes it as props to client components.

### Session & Auth

Sessions are stored in the `sessions` table. The `auth` router handles login (email → create session) and logout. A session cookie is set on successful login. Protected procedures check `ctx.user` (injected by middleware); if missing, they throw `UNAUTHORIZED`.

## EARS Annotations & Intent Tracking

This repository uses EARS (Easy Approach to Requirements Syntax) to maintain a traceable link from requirements → tests → code. Each spec has a unique ID like `VOTE-UI-001` or `PROG-API-003`.

**When adding code**, annotate the main entry point:
```typescript
// @spec FEATURE-CONTEXT-NNN, FEATURE-CONTEXT-OOO
export function MyComponent() { ... }
```

To find all implementations of a spec: `grep -r "VOTE-UI-001" src/` finds code + tests.
To find the requirement: look in `docs/specs/vote-specs.md` for the matching ID.

This creates a queryable chain: Spec → Tests → Code, all navigable via `grep`.

## Common Issues

### Database migrations
If `prisma/schema.prisma` changes and the dev DB won't apply changes:
```bash
make db-reset    # Nuke and rebuild from scratch
```

### Type mismatches in tRPC
tRPC is fully typed end-to-end. If you change input/output types in a router, TypeScript will error on the client side. Update both sides in tandem.

### Tests failing after DB changes
The integration and E2E test suites use a separate test DB. Ensure `DATABASE_URL` in `.env.test` is configured and `make seed` is run to populate test data.

### Vite/Vitest configuration
`vitest.config.ts` and `vitest.config.integration.ts` are separate because integration tests need the Prisma client and full DB setup; unit tests are faster without it.

## References

- **High-level design**: `docs/high-level-design.md` — system vision, v1 scope, architecture diagrams
- **EARS specs**: `docs/specs/` — detailed requirements for each feature domain
- **LLDs**: `docs/llds/` — low-level designs per component
- **Prisma docs**: https://www.prisma.io/docs
- **tRPC docs**: https://trpc.io/docs
- **Next.js App Router**: https://nextjs.org/docs/app
