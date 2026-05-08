# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project should evolve using linked-intent driven development and test driven development. Use EARS notation and grep to quickly search specs, tests, and code efficiently. Always plan and consult these files first with a plan, then write tests, then implement source code:
- CLAUDE.md for architecture, commands, and development patterns
- docs/high-level-design.md for system vision and key design decisions
- docs/specs/ for EARS requirement IDs and feature scope
- docs/llds/ for component-level contracts (data models, API shapes, visual layouts)
When implementing a feature, always audit the spec notation against the source code and tests. If a spec is implemented, it should have an exact matching `// @spec` comment that is searchable and prevents documentation rot. After code has been tested and docs audited, commit with a message. 

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

1. **API Layer** (`src/server/routers/`): tRPC procedure definitions, one file per domain (auth, clubs, books, nominations, votes, rounds, selections, meetings, threads, comments, progress). Each router validates input with Zod, calls into the lib layer, and returns plain TypeScript values.

2. **Business-logic libraries** (`src/lib/`): Pure-ish domain logic — voting and tie-breaking (`src/lib/voting/`), progress math (`src/lib/progress/`), discussion threading (`src/lib/discussions/`), meeting scheduling helpers (`src/lib/meetings/`), Zod input schemas (`src/lib/validation/`), session/identity (`src/lib/auth/`), shared React hooks (`src/lib/hooks/`), Prisma client singleton (`src/lib/db.ts`). This is where domain rules live — not under `src/server/services/`.

3. **External integrations** (`src/server/services/`): Outbound API adapters only — `email.ts` (Resend), `open-library.ts` (book metadata). Add a service here only when wrapping a third party.

4. **Data Layer** (`prisma/schema.prisma`): Postgres schema. Relationships between Users, Clubs, Memberships, Voting Rounds, Discussions, Meetings, and Reading Progress. Use `prisma generate` after schema changes.

5. **Frontend** (`src/app/`): Next.js App Router with server components for data loading, client components for interactivity. Pages organized by feature area (clubs/[clubId]/meetings, clubs/[clubId]/vote, etc.). Shared UI components in `src/components/ui/`.

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
│   │   ├── discussions/          # Thread list & detail (incl. [threadId])
│   │   └── members/              # Member roster & roles
│   ├── login/                    # Login page
│   ├── join/                     # Join-club flow
│   ├── page.tsx                  # Landing
│   ├── layout.tsx                # Root layout
│   └── api/
│       ├── trpc/[trpc]/route.ts  # tRPC HTTP entrypoint
│       └── cron/                 # Vercel scheduled jobs
├── server/
│   ├── routers/                  # tRPC procedure definitions (one file per domain)
│   │   ├── auth.ts, clubs.ts, books.ts, nominations.ts, votes.ts, rounds.ts,
│   │   ├── selections.ts, meetings.ts, threads.ts, comments.ts, progress.ts
│   │   └── _app.ts               # Router composition
│   └── services/                 # External integrations only
│       ├── email.ts              # Resend adapter
│       └── open-library.ts       # Open Library book-metadata adapter
├── trpc/
│   ├── client.ts                 # tRPC client for browser
│   ├── react.tsx                 # TanStack Query integration
│   └── server.ts                 # tRPC server factory
├── components/
│   └── ui/                       # Shared UI components (buttons, cards, badges, etc.)
└── lib/                          # Business-logic libraries (domain rules live here)
    ├── auth/                     # Session/identity utilities
    ├── voting/                   # Voting logic, tie-breaking
    ├── progress/                 # Page → percentage math
    ├── discussions/              # Thread / spoiler-safety helpers
    ├── meetings/                 # Scheduling helpers
    ├── validation/               # Zod schemas for tRPC input
    ├── hooks/                    # Shared React hooks
    ├── db.ts                     # Prisma client singleton
    └── db.test-utils.ts          # DB helpers used only in tests

tests/
├── unit/                         # Unit tests (co-located with source preferred)
├── integration/                  # Integration tests
├── e2e/                          # Playwright E2E tests
│   └── global-setup.ts           # Seed data generator (also used by `make seed`)
├── factories/                    # Domain object factories for tests
├── fixtures/                     # Static test fixtures
├── helpers/                      # Test helpers
├── setup.ts                      # Vitest unit setup
├── setup.integration.ts          # Vitest integration setup
└── dev-setup.ts                  # Dev-only seed bootstrap

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

The tRPC server is composed in `src/server/routers/_app.ts` and exposed via `src/app/api/trpc/[trpc]/route.ts` (App Router convention).

### React Server Components & Client Components

- **Server components** (default in App Router): load data at request time, no JS overhead, can directly access DB/services. Used for page shells and data loading.
- **Client components** (`"use client"`): interactive UI, state, effects, event handlers. Used for forms, modals, interactive elements.

The pattern: a server component loads data via tRPC and passes it as props to client components.

### Session & Auth

Sessions are stored in the `sessions` table. The `auth` router handles login (email → create session) and logout. A session cookie is set on successful login. Protected procedures check `ctx.user` (injected by middleware); if missing, they throw `UNAUTHORIZED`.

## EARS Annotations & Intent Tracking

Each spec has a globally unique ID like `VOTE-UI-001` or `PROG-API-003`. Placement rules are in the LID `### Code annotations` section below. The grep recipe:

- Find every implementation and test of a spec: `grep -rn "VOTE-UI-001" src/ tests/`
- Find the requirement itself: look in `docs/specs/{domain}-specs.md` for the matching ID.

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

## LID Mode: Full

## Linked-Intent Development (MANDATORY)

**Consult the `linked-intent-dev` skill for ALL code changes.** All changes flow through the arrow of intent in one direction:

```
HLD → LLDs → EARS → Tests → Code
```

- **New features and refactors**: full six-phase workflow (HLD check → LLD check/draft → EARS → intent-narrowing edge audit → tests-first → code).
- **Bug fixes**: walk the arrow like any other change — find where behavior diverged from intent and cascade from there. No short-circuit.
- **If unsure**: use the full workflow.

Stop after each phase for user review. Mutation, not accumulation — docs reflect current intent, not history.

### Navigation

| What you need | Where to look |
|---|---|
| High-level design | `docs/high-level-design.md` |
| Low-level designs | `docs/llds/` |
| EARS specs | `docs/specs/` |
| Arrow of intent overlay | `docs/arrows/index.yaml` and per-segment docs in `docs/arrows/` |

### Terminology

- **HLD**: High-Level Design — single project-level doc at `docs/high-level-design.md`.
- **LLD**: Low-Level Design — detailed component design doc in `docs/llds/`. One per intent component.
- **EARS**: Easy Approach to Requirements Syntax — structured one-line requirements with globally unique IDs in `docs/specs/`. Markers: `[x]` implemented, `[ ]` active gap, `[D]` deferred.
- **Arrow**: the unidirectional chain from vision to code (HLD → LLDs → EARS → Tests → Code). Strictly a DAG of intent.
- **Arrow segment**: the territory owned by one LLD — the LLD itself plus the specs, tests, and code that cite its EARS IDs. Within-segment cascade is free; across-segment cascade pauses.
- **Cascade**: propagating a change downstream through the arrow so adjacent levels stay coherent.

### Code annotations

Annotate code and tests with `@spec` comments citing EARS IDs:

```
// @spec AUTH-UI-001, AUTH-UI-002
```

Place the annotation at the *entry point of the behavior's implementation graph* — the topmost function or module owning the specified behavior, not every helper. When a behavior spans multiple subsystems (UI + API + database, for example), annotate at the entry point in each subsystem. Tests follow the same rule: annotate the test that directly exercises the spec, not every inner assertion.
