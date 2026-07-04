# Arrow: ios-meetings

Meeting scheduling on the iPhone client (`IOSMEET-` specs): list/detail, admin create/update/confirm/cancel, and the 3-state availability grid with optimistic taps. Server contract stays owned by `meetings`.

## Status

**PLANNED** — segment created 2026-07-03 (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 5). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (Doodle-style scheduling; 3-state availability + heatmap confirmation)

### LLD
- `docs/llds/ios-meetings.md` _(forthcoming — M5)_

### EARS
- `docs/specs/ios-meetings-specs.md` _(forthcoming — M5; prefix `IOSMEET-`)_

### Tests / Code
- `ios/Dogear/Features/Meetings/` and DogearKit tests _(forthcoming)_

## Architecture

**Purpose:** availability marking is the tap-latency-sensitive surface — optimistic 3-state cycling backed by `meetings.submitAvailability`. Admin flows call `meetings.create/update/confirm/cancel`. Dates arrive as ISO-8601 strings (no transformer); local-time rendering is a spec concern.

## Work Required

M5 of the build plan, after ios-clubs lands.
