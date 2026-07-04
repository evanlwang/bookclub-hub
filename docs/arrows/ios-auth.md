# Arrow: ios-auth

Native entry flow for the iPhone client (`IOSAUTH-` specs): email + display name + pilot passcode, sign-in vs join/create branching, session bootstrap via `auth.me`, and logout. The iOS counterpart of the web `auth` segment's UI slice — the server contract itself stays owned by `auth`.

## Status

**PLANNED** — segment created 2026-07-03 (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 2). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (email-only identity; entry flow; iOS client scope)

### LLD
- `docs/llds/ios-auth.md` _(forthcoming — M2)_

### EARS
- `docs/specs/ios-auth-specs.md` _(forthcoming — M2; prefix `IOSAUTH-`)_

### Tests / Code
- `ios/Dogear/Features/Auth/` and DogearKit tests _(forthcoming)_

## Architecture

**Purpose:** get a user from app launch to an authenticated club context. `SessionStore.bootstrap()` calls `auth.me` at launch (success → tabs, `UNAUTHORIZED` → entry flow). Entry calls `auth.signIn`/`auth.enter` with the pilot passcode (typed, never persisted — the cookie is the durable credential; 5/min rate limit needs a `TOO_MANY_REQUESTS` UX). Logout calls `auth.logout` then wipes cookies for the base URL.

## Work Required

M2 of the build plan, after ios-foundation lands.
