# Arrow: ios-progress

Reading progress on the iPhone client (`IOSPROG-` specs): the update sheet (page/percentage/chapter/status) and the club progress dashboard. Server contract stays owned by `reading-progress`.

## Status

**PLANNED** — segment created 2026-07-03 (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 6). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (progress visibility goal; page/percentage/chapter tracking)

### LLD
- `docs/llds/ios-progress.md` _(forthcoming — M6)_

### EARS
- `docs/specs/ios-progress-specs.md` _(forthcoming — M6; prefix `IOSPROG-`)_

### Tests / Code
- `ios/Dogear/Features/Progress/` and DogearKit tests _(forthcoming)_

## Architecture

**Purpose:** the smallest activity surface (four procedures: `progress.list/me/update/summary`), scheduled before discussions for exactly that reason. Page ↔ percentage math may mirror `src/lib/progress/` helpers in `DogearKit/Domain` if client-side preview is specced.

## Work Required

M6 of the build plan, after ios-clubs lands.
