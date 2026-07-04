# Arrow: ios-discussions

Discussion threads on the iPhone client (`IOSDISC-` specs): chapter-tagged thread list with spoiler filtering, thread detail, and comments CRUD with one-level nesting. Server contract stays owned by `discussions`.

## Status

**PLANNED** — segment created 2026-07-03 (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 7). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (spoiler-safe discussions goal; chapter-tagged threads)

### LLD
- `docs/llds/ios-discussions.md` _(forthcoming — M7)_

### EARS
- `docs/specs/ios-discussions-specs.md` _(forthcoming — M7; prefix `IOSDISC-`)_

### Tests / Code
- `ios/Dogear/Features/Discussions/` and DogearKit tests _(forthcoming)_

## Architecture

**Purpose:** spoiler-safe reading on the phone. Open question to resolve during the M7 LLD phase: whether `threads.list` filtering is fully server-side (client passes `maxChapter`) or whether any cutoff logic from `src/lib/discussions/spoiler-cutoff.ts` must be mirrored in `DogearKit/Domain` (e.g. compose-time mismatch detection).

## Work Required

M7 of the build plan (last milestone — largest UI surface), after ios-clubs lands.
