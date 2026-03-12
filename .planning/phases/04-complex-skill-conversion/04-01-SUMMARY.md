---
phase: 04-complex-skill-conversion
plan: 01
subsystem: infra
tags: [keychain, sentry-api, github-api, node-scripts, macos-security]

requires:
  - phase: 03-simple-skill-conversion
    provides: established SKILL.md conversion patterns and plugin structure
provides:
  - scripts/keychain.js shared Keychain get/set/delete utility
  - scripts/sentry-api.js Sentry API client for issue/event fetching
  - scripts/github-api.js GitHub CDN upload client replicating upload.sh flow
affects: [04-02 pr-upload sentry-investigate sentry-sourcemaps, 04-03 task-jira contentful, 05 setup-unification]

tech-stack:
  added: [macOS security CLI via child_process, Node.js https module]
  patterns: [shared script in scripts/ referenced via path.join(__dirname), credential retrieval via keychain.js execSync, curl-based multipart upload from Node.js]

key-files:
  created: [scripts/keychain.js, scripts/sentry-api.js, scripts/github-api.js]
  modified: []

key-decisions:
  - "keychain.js uses -a flag with service name as account for add-generic-password (macOS requires account field)"
  - "github-api.js uses curl for multipart uploads (same as original upload.sh -- Node.js multipart is unnecessarily complex)"
  - "sentry-api.js uses Node.js https module with promise wrapper for async API calls"

patterns-established:
  - "Shared script interface: CLI with action as first arg, validate args, stderr for errors, exit 1 on failure"
  - "Keychain access pattern: execSync to keychain.js with path.join(__dirname) for sibling resolution"
  - "tb.{service} Keychain naming: tb.sentry-token, tb.github-session"

requirements-completed: [MIGR-04]

duration: 2min
completed: 2026-03-12
---

# Phase 4 Plan 1: Shared Infrastructure Scripts Summary

**Three Node.js CLI scripts for Keychain access, Sentry API, and GitHub CDN upload providing shared infrastructure for Wave 2+ skills**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T09:25:38Z
- **Completed:** 2026-03-12T09:27:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Keychain utility with get/set/delete operations using macOS security CLI
- Sentry API client supporting issue, event, and events list fetching with Bearer token auth
- GitHub CDN upload client replicating the full upload.sh flow (policy request, S3 upload, asset finalization)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/keychain.js shared utility** - `68fc59a` (feat)
2. **Task 2: Create scripts/sentry-api.js and scripts/github-api.js** - `5e5a6d4` (feat)

## Files Created/Modified
- `scripts/keychain.js` - Shared Keychain get/set/delete utility using macOS security CLI
- `scripts/sentry-api.js` - Sentry API client for issue/event/events fetching via HTTPS
- `scripts/github-api.js` - GitHub CDN upload client replicating upload.sh multi-step flow

## Decisions Made
- Added `-a` (account) flag to `security add-generic-password` -- macOS requires an account field; using the service name as account keeps it simple
- Used curl via execSync for GitHub multipart uploads rather than Node.js https -- matches original upload.sh approach, avoids multipart form complexity
- Used Node.js built-in https module for Sentry API (simple GET requests) vs curl for GitHub (complex multipart POST)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 shared scripts ready for Wave 2 skills (pr-upload, sentry-investigate, sentry-sourcemaps)
- scripts/keychain.js provides the credential access pattern all credential-needing skills will use
- No blockers for Plan 2

## Self-Check: PASSED

All 3 created files verified on disk. Both task commits (68fc59a, 5e5a6d4) verified in git log.

---
*Phase: 04-complex-skill-conversion*
*Completed: 2026-03-12*
