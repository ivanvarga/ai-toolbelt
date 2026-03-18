---
phase: 14-per-project-credential-scoping
plan: 04
subsystem: credentials
tags: [keychain, org-scoping, doctor, migration, macOS-security]

requires:
  - phase: 14-per-project-credential-scoping (plan 01)
    provides: resolve-org.js and keychainGet helper for org detection
provides:
  - Org-aware doctor credential checks (4 scripts)
  - One-time credential migration script for global-to-org-scoped
affects: [doctor, setup-credential, credential-management]

tech-stack:
  added: []
  patterns: [org-first-global-fallback credential resolution in doctor checks, interactive migration with per-org confirmation]

key-files:
  created: [scripts/migrate-credentials.js]
  modified: [scripts/checks/cred-sentry.sh, scripts/checks/cred-github.sh, scripts/checks/cred-contentful.sh, scripts/checks/cred-jira-token.sh]

key-decisions:
  - "Doctor checks try org-scoped key first, fall back to global, report mode in PASS message"
  - "Migration script preserves global credentials as fallback after copying to org-scoped keys"

patterns-established:
  - "Org-first credential resolution: check service.org key, then global service key, report which was found"
  - "Interactive migration pattern: discover orgs from git repos, confirm per-org, skip existing"

requirements-completed: [SCOPE-07, SCOPE-08]

duration: 1min
completed: 2026-03-18
---

# Phase 14 Plan 04: Doctor Checks & Migration Summary

**Org-aware doctor credential checks with 3-tier reporting (org-scoped/global-fallback/missing) and interactive migration script for global-to-org credential scoping**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-18T15:59:23Z
- **Completed:** 2026-03-18T16:00:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 4 doctor credential checks now detect org from git remote and try org-scoped key first
- Doctor checks report whether credential was found as org-scoped, global fallback, or missing
- Migration script discovers git repos under ~/Projects and ~/Work, groups by org, copies globals to org-scoped keys with user confirmation

## Task Commits

Each task was committed atomically:

1. **Task 1: Update 4 doctor credential check scripts to be org-aware** - `f89350a` (feat)
2. **Task 2: Create migrate-credentials.js one-time migration script** - `ab9c573` (feat)

## Files Created/Modified
- `scripts/checks/cred-sentry.sh` - Org-aware Sentry credential check with resolve-org.js
- `scripts/checks/cred-github.sh` - Org-aware GitHub session cookie check with resolve-org.js
- `scripts/checks/cred-contentful.sh` - Org-aware Contentful token check with resolve-org.js
- `scripts/checks/cred-jira-token.sh` - Org-aware Jira API token check with resolve-org.js
- `scripts/migrate-credentials.js` - Interactive one-time migration from global to org-scoped credentials

## Decisions Made
- Doctor checks try org-scoped key first, fall back to global, report mode in PASS message
- Migration script preserves global credentials as fallback after copying to org-scoped keys

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Doctor checks and migration tool complete the credential scoping infrastructure
- Remaining plans (02 credential resolution, 03 setup flows) can proceed independently

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 14-per-project-credential-scoping*
*Completed: 2026-03-18*
