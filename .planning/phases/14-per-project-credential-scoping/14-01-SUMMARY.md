---
phase: 14-per-project-credential-scoping
plan: 01
subsystem: credentials
tags: [keychain, git-remote, org-scoping, credential-resolution]

requires:
  - phase: 04-complex-skills
    provides: keychain.js credential storage utility
provides:
  - resolveOrg() function for git remote org extraction
  - getCredential() function for org-aware credential resolution with fallback
affects: [14-02, 14-03, 14-04, sentry-investigate, sentry-sourcemaps, contentful, pr-upload]

tech-stack:
  added: []
  patterns: [org-scoped credential lookup with global fallback, dual-mode CLI/require scripts]

key-files:
  created:
    - scripts/resolve-org.js
    - scripts/resolve-credential.js
  modified: []

key-decisions:
  - "Regex-based URL parsing (no URL library) matching SSH colon, HTTPS, and ssh:// formats"
  - "keychainGet helper wraps keychain.js CLI call for reuse"

patterns-established:
  - "Org-scoped credential pattern: try tb.{service}.{org} first, fall back to tb.{service}"
  - "Dual-mode script pattern: CLI via require.main === module, library via module.exports"

requirements-completed: [SCOPE-01, SCOPE-02]

duration: 1min
completed: 2026-03-18
---

# Phase 14 Plan 01: Foundation Modules Summary

**Git remote org extraction and org-aware credential resolution with global fallback via resolve-org.js and resolve-credential.js**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-18T15:56:08Z
- **Completed:** 2026-03-18T15:57:04Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- resolve-org.js extracts org from SSH colon, HTTPS, and ssh:// git remote URL formats
- resolve-credential.js implements org-first credential lookup with global fallback
- Both scripts work as CLI tools (stdout/exit code) and as require() modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create resolve-org.js and resolve-credential.js** - `9e7d6de` (feat)

## Files Created/Modified
- `scripts/resolve-org.js` - Git remote org extraction (resolveOrg function)
- `scripts/resolve-credential.js` - Org-aware credential resolution with fallback (getCredential function)

## Decisions Made
- Regex-based URL parsing without URL library for simplicity and zero dependencies
- keychainGet helper wraps keychain.js CLI call to keep getCredential clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Foundation modules ready for downstream migration of existing skills
- Plan 14-02 can update setup.js files to use resolve-credential.js
- Plan 14-03 can update SKILL.md credential instructions

## Self-Check: PASSED

- scripts/resolve-org.js: FOUND
- scripts/resolve-credential.js: FOUND
- Commit 9e7d6de: FOUND

---
*Phase: 14-per-project-credential-scoping*
*Completed: 2026-03-18*
