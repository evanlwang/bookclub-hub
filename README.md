# BookClub Hub

A full-stack web app that replaces the scattered group chats, polls, and spreadsheets that book clubs use to coordinate. One app handles book selection, meeting scheduling, reading progress tracking, and spoiler-safe discussions.

## Features

- **Club Management** — Create or join clubs with a simple code. Multi-club support with sidebar switcher.
- **Book Voting** — Approval voting across nomination rounds. Nominate, vote, and see results with a winner banner.
- **Meeting Scheduling** — Propose time slots, collect availability (available/maybe/unavailable), confirm the best fit.
- **Discussion Threads** — Chapter-tagged threads with automatic spoiler filtering based on your reading progress.
- **Reading Progress** — Track pages/chapters per member. Visual dashboard with progress ring, distribution bar, and member list.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **API**: tRPC v11
- **Database**: PostgreSQL + Prisma 6
- **Styling**: Tailwind CSS 4 with oklch design tokens
- **Testing**: Playwright (E2E), Vitest (unit/integration)
- **Auth**: Passwordless email-based sessions

## Getting Started

Prerequisites: Node.js 20+, PostgreSQL running locally.

```bash
npm install
make up        # Creates DB, pushes schema, seeds test data, starts dev server
```

The dev server runs at `http://localhost:3000`. Test accounts are printed after seeding.

## Development

```bash
make dev       # Start dev server (provisions DB if needed)
make seed      # Re-seed with fresh test data
make test      # Run all tests (unit + integration + E2E)
make typecheck # TypeScript check
make help      # Show all available commands
```

## Project Structure

```
src/
  app/            # Next.js App Router pages and layouts
    clubs/[clubId]/
      page.tsx        # Dashboard with hero card and three-up grid
      sidebar.tsx     # Club switcher + nav with badges
      vote/           # Voting rounds (nominate → vote → decided)
      meetings/       # Scheduling with availability responses
      discussions/    # Chapter-tagged threads with spoiler filter
      progress/       # Reading progress with ring chart and member bars
  components/ui/  # Shared component library (Avatar, Badge, BookCover, etc.)
  server/         # tRPC routers and server config
  lib/            # Utilities (auth, validation, progress computation)
docs/
  specs/          # EARS requirements with status markers
  llds/           # Low-level design documents
  high-level-design.md
tests/
  e2e/            # Playwright end-to-end tests
  unit/           # Vitest unit tests
  integration/    # Vitest integration tests
```

## Design

The UI follows a custom design system with oklch color tokens, three font families (Newsreader display, Geist UI, JetBrains Mono), and components like `BookCover` (generative color variants), `ChapterChip` (rotating palette), `AvatarStack`, and `ProgressBar` (animated, status-colored).

Specs use EARS (Easy Approach to Requirements Syntax) with `@spec` code annotations for traceability.
