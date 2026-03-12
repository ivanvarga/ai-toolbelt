---
phase: 05-credential-system
plan: 01
subsystem: credentials
tags: [keychain, setup, credential-management, refactor]

requires:
  - phase: 04-complex-skill-conversion
    provides: "4 individual setup.js files with duplicated keychain logic"
provides:
  - "scripts/setup-credential.js shared base module with keychain and cli-check modes"
  - "4 thin-wrapper setup.js files using shared base"
affects: [05-credential-system]

tech-stack:
  added: []
  patterns: ["setup-credential config object pattern for credential setup"]

key-files:
  created: [scripts/setup-credential.js]
  modified: [skills/pr-upload/setup.js, skills/sentry-investigate/setup.js, skills/contentful/setup.js, skills/task-jira/setup.js]

key-decisions:
  - "verify callback returns true/false/null (null = connection error, triggers store-anyway prompt)"
  - "3 retry attempts for failed verification before offering store-anyway fallback"

patterns-established:
  - "Credential setup config: { mode, service, name, prompt, verify } for keychain, { mode, name, checks } for cli-check"
  - "Thin wrapper pattern: skill setup.js requires ../../scripts/setup-credential and passes config"

requirements-completed: [CRED-01, CRED-02, CRED-03, CRED-04, CRED-05]

duration: 2min
completed: 2026-03-12
---

# Phase 5 Plan 1: Shared Credential Setup Summary

**Shared setup-credential.js base module with keychain/cli-check modes, replacing 4 duplicated setup.js files with thin wrappers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T12:56:40Z
- **Completed:** 2026-03-12T12:58:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created scripts/setup-credential.js with dual-mode support (keychain + cli-check)
- Refactored 4 setup.js files from ~46 lines each to thin wrappers (9-22 lines)
- Added API verification support with 3-attempt retry and connection error handling
- Reduced total setup code from 161 lines to 54 lines (66% reduction)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/setup-credential.js shared base module** - `f1efc15` (feat)
2. **Task 2: Refactor 4 setup.js files to thin wrappers** - `89137dd` (refactor)

## Files Created/Modified
- `scripts/setup-credential.js` - Shared base module with keychain mode (prompt, verify, store) and cli-check mode (command validation)
- `skills/pr-upload/setup.js` - Thin wrapper, keychain mode, verify: null (store-only)
- `skills/sentry-investigate/setup.js` - Thin wrapper, keychain mode, Sentry API verification
- `skills/contentful/setup.js` - Thin wrapper, keychain mode, Contentful API verification
- `skills/task-jira/setup.js` - Thin wrapper, cli-check mode for acli install/auth

## Decisions Made
- verify callback uses three-value return: true (valid), false (invalid token, 401/403), null (connection error) to distinguish bad tokens from network issues
- 3 retry attempts for failed verification before offering store-anyway fallback
- Connection errors offer immediate store-anyway rather than counting as failed verification attempts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shared base ready for doctor integration checks (Plan 02)
- All existing credential skills using the shared pattern
- New credential skills can be added as thin wrappers following the established pattern

## Self-Check: PASSED

All 5 files verified present. Both commits (f1efc15, 89137dd) verified in git log.

---
*Phase: 05-credential-system*
*Completed: 2026-03-12*
