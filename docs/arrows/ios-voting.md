# Arrow: ios-voting

Book selection and voting on the iPhone client (`IOSVOTE-` specs): rounds list/detail, nominations with debounced `books.search`, approval ballot with `maxApprovals` (optimistic toggle), turnout, admin close-preview/advance/cancel, selections. Server contract stays owned by `voting`.

## Status

**PLANNED** — segment created 2026-07-03 (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 4). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (approval voting; admin-pick)

### LLD
- `docs/llds/ios-voting.md` _(forthcoming — M4)_

### EARS
- `docs/specs/ios-voting-specs.md` _(forthcoming — M4; prefix `IOSVOTE-`)_

### Tests / Code
- `ios/Dogear/Features/Voting/` and DogearKit tests _(forthcoming)_

## Architecture

**Purpose:** the full voting lifecycle from a phone. Ballot submits via `votes.submit` (atomic replace — see VOTE-DATA-VOTE-PERSIST-001 on the server side). Nomination search relays Open Library through `books.search`; needs debounce + `Task` cancellation client-side.

## Work Required

M4 of the build plan, after ios-clubs lands.
