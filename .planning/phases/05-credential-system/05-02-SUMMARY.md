---
phase: 05-credential-system
plan: 02
subsystem: credentials
tags: [keychain, doctor, bash, acli, sentry, contentful, github]

requires:
  - phase: 02-hooks-doctor
    provides: doctor auto-discovery pattern via scripts/checks/*.sh
  - phase: 04-complex-skills
    provides: keychain.js and per-skill setup.js scripts
provides:
  - 4 credential check scripts for /tb:doctor auto-discovery
  - cred-github.sh, cred-sentry.sh, cred-contentful.sh, cred-acli.sh
affects: [05-credential-system]

tech-stack:
  added: []
  patterns: [keychain presence check via keychain.js, acli install+auth check]

key-files:
  created:
    - scripts/checks/cred-github.sh
    - scripts/checks/cred-sentry.sh
    - scripts/checks/cred-contentful.sh
    - scripts/checks/cred-acli.sh
  modified: []

key-decisions:
  - "Keychain checks use keychain.js get (not raw security command) for consistency"
  - "acli check uses command -v + --help subcommand to verify install and auth without side effects"

patterns-established:
  - "cred-*.sh pattern: Keychain presence check via node keychain.js get, FAIL includes Run: setup command"
  - "acli check pattern: two-stage check (installed? then authenticated?) with separate FAIL messages"

requirements-completed: [CRED-01, CRED-02, CRED-03, CRED-04]

duration: 1min
completed: 2026-03-12
---

# Phase 5 Plan 2: Doctor Credential Checks Summary

**4 doctor credential check scripts (github, sentry, contentful, acli) auto-discovered by /tb:doctor with exact fix commands**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-12T12:56:45Z
- **Completed:** 2026-03-12T12:57:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 3 Keychain credential check scripts using keychain.js for presence detection
- 1 acli check script verifying both CLI installation and authentication
- All checks produce PASS/FAIL output with exact fix commands
- Zero-config doctor integration via existing auto-discovery pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 3 Keychain credential check scripts** - `f1efc15` (feat)
2. **Task 2: Create acli credential check script** - `bce3b43` (feat)

## Files Created/Modified
- `scripts/checks/cred-github.sh` - Checks tb.github-session Keychain entry
- `scripts/checks/cred-sentry.sh` - Checks tb.sentry-token Keychain entry
- `scripts/checks/cred-contentful.sh` - Checks tb.contentful-token Keychain entry
- `scripts/checks/cred-acli.sh` - Checks acli installation and authentication

## Decisions Made
None - followed plan as specified

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Doctor now reports missing credentials with fix commands
- Ready for plan 3 (shared setup base, verification, setup-all)

## Self-Check: PASSED

All 4 created files verified present. Both task commits (f1efc15, bce3b43) verified in git log.

---
*Phase: 05-credential-system*
*Completed: 2026-03-12*
