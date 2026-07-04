# Arrow: ios-clubs

Club context on the iPhone client (`IOSCLUB-` specs): dashboard, club switcher, join/create/lookup, member roster + role management, nav badges. The iOS counterpart of the web `clubs` segment's UI; server contract stays owned by `clubs`.

## Status

**PLANNED** — segment created 2026-07-03 (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 3). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (club management / multi-tenancy; sub-30-second club switch goal)

### LLD
- `docs/llds/ios-clubs.md` _(forthcoming — M3)_

### EARS
- `docs/specs/ios-clubs-specs.md` _(forthcoming — M3; prefix `IOSCLUB-`)_

### Tests / Code
- `ios/Dogear/Features/Clubs/` and DogearKit tests _(forthcoming)_

## Architecture

**Purpose:** the authenticated shell every activity segment hangs off. Active club id persisted in `UserDefaults`; switching swaps `clubId` and resets the domain stores. Uses `clubs.*` incl. `navState`/`unreadDiscussionCounts` for badges. Members/roles and settings pushed from the dashboard via `NavigationStack`.

## Work Required

M3 of the build plan, after ios-auth lands.
