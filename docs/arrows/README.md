# `docs/arrows/` — Arrow of Intent Tracking

This directory tracks the arrow of intent across BookClub Hub — the chain from high-level design through to realized code:

```
HLD → LLDs → EARS → Tests → Code
```

It is the navigation overlay that scales `linked-intent-dev` for projects too large to hold in one context window. Load `index.yaml` first; load per-segment docs on demand.

## Files in this directory

- **`index.yaml`** — The dependency graph. Load this first to understand what's available, what's blocked, and what needs work.
- **`{segment-name}.md`** — One file per arrow segment (`auth`, `clubs`, `voting`, `meetings`, `discussions`, `reading-progress`). Orientation page with References, Spec Coverage, and Key Findings.

## Starting a session

1. Load `index.yaml`.
2. Query for unblocked segments:
   ```bash
   yq '.arrows | to_entries | .[] | select(.value.blockedBy | length == 0) | .key' index.yaml
   ```
3. Load the relevant `{segment-name}.md`.
4. Follow its References to the LLD, spec file, tests, or code.

## Status enum

| Status | Meaning |
|---|---|
| UNMAPPED | Not yet explored |
| MAPPED | Structure known, specs not verified against code |
| AUDITED | Specs verified — implementation status understood |
| OK | Fully coherent — all specs implemented |
| PARTIAL | Some specs missing or partial |
| BROKEN | Code and docs have diverged significantly |
| STALE | Docs exist but outdated |
| OBSOLETE | Superseded, kept for historical reference |
| MERGED | Combined into another arrow (see `merged_into`) |

Normal progression: `UNMAPPED → MAPPED → AUDITED → OK`. `AUDITED` means "we know the state"; `OK` means "it's coherent."

## Common workflows

### Auditing a segment

1. Read the segment's arrow doc references.
2. For each EARS spec, verify the implementing code with the cited `@spec` annotation.
3. Update arrow doc coverage table and any "Key Findings."
4. Refresh `status`, `audited`, `audited_sha`, `next`, and `drift` in `index.yaml`.

### Mapping a new segment

1. Explore the code and docs for the domain.
2. Create `docs/arrows/{name}.md` from the arrow-doc template.
3. Add an entry to `index.yaml` under `arrows:`.
4. Remove from `unmapped.docs` if listed.

### Splitting a segment

1. Create the new segment's arrow doc.
2. Move relevant references from the original to the new one.
3. Update both docs to reference each other.
4. Update `index.yaml` — add the new segment, adjust the original.

### Merging segments

1. Pick the primary.
2. Move references from secondary to primary.
3. Mark secondary in `index.yaml` with `status: MERGED` and `merged_into: {primary-name}`.
4. Tombstone the secondary's arrow doc (or delete if preferred).

### Renaming a segment

1. Rename the arrow-doc filename.
2. Update the `index.yaml` entry key.
3. Walk every cross-reference: `blocks`, `blockedBy`, `merged_into`, `taxonomy`, other arrow docs' References. Update all in the same session.

## Optional: coherence-check script

A reference Node implementation lives at `plugins/arrow-maintenance/skills/arrow-maintenance/references/coherence-check.mjs`. To use it in this project:

1. Copy the script to a location of your choice (e.g., `bin/coherence-check.mjs`).
2. Declare the path in `CLAUDE.md` under a `## LID Tooling` section:

   ```markdown
   ## LID Tooling

   - **Coherence check**: `bin/coherence-check.mjs`
   ```

3. The `arrow-maintenance` skill reads the declaration during audit and invokes the declared script. Without a declaration (or with a declared path that does not resolve), the skill falls back to in-prompt audit.

This project does not currently declare a coherence-check script — audits run in-prompt. Adding one is an opt-in performance accelerator.

## This project's segments at a glance

| Segment | LLD | Spec file(s) | Status |
|---|---|---|---|
| `auth` | `auth-and-accounts.md` | `auth-specs.md`, `home-specs.md` | OK |
| `clubs` | `club-management.md` | `club-specs.md`, `dash-specs.md` | OK |
| `voting` | `book-selection-and-voting.md` | `vote-specs.md` | OK |
| `meetings` | `meeting-scheduling.md` | `meet-specs.md` | OK |
| `discussions` | `discussion-threads.md` | `disc-specs.md` | OK |
| `reading-progress` | `reading-progress.md` | `prog-specs.md` | OK |
| `live-updates` | `live-updates.md` | `live-specs.md` (+ consumer-side IDs in the five segments above) | OK |
