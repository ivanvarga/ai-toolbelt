---
phase: 05-credential-system
plan: 03
subsystem: credentials
tags: [setup-all, auto-detect, skill-prerequisites, keychain]

requires:
  - phase: 05-credential-system
    provides: "Shared setup-credential.js base module and thin-wrapper setup.js files"
provides:
  - "scripts/setup-all.js orchestrator for batch credential configuration"
  - "Standardized auto-detect Prerequisites in all credential-needing SKILL.md files"
affects: [05-credential-system]

tech-stack:
  added: []
  patterns: ["auto-detect Prerequisites pattern: check Keychain, run setup.js if missing"]

key-files:
  created: [scripts/setup-all.js]
  modified: [skills/sentry-investigate/SKILL.md, skills/pr-upload/SKILL.md, skills/contentful/SKILL.md, skills/task-jira/SKILL.md]

key-decisions:
  - "setup-all.js runs setups in dependency order: Sentry first (serves two skills), then Contentful, GitHub Upload, Jira"
  - "Auto-detect pattern runs setup.js inline instead of exit 1, so Claude self-heals missing credentials"

patterns-established:
  - "SKILL.md auto-detect Prerequisites: check keychain.js get, run setup.js if empty"
  - "setup-all.js as standalone orchestrator (not a skill) with TTY guard and failure summary"

requirements-completed: [CRED-05]

duration: 2min
completed: 2026-03-12
---

# Phase 5 Plan 3: Setup-All Orchestrator and SKILL.md Standardization Summary

**setup-all.js batch credential orchestrator plus standardized auto-detect Prerequisites across all credential-needing skills**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T13:01:04Z
- **Completed:** 2026-03-12T13:03:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created scripts/setup-all.js orchestrator that runs all 4 credential setups in sequence with headers, error handling, and summary
- Standardized 3 Keychain-based SKILL.md files with auto-detect Prerequisites that check Keychain and run setup.js if missing
- Standardized task-jira SKILL.md with Prerequisites header for consistency
- Verified sentry-sourcemaps SKILL.md already has correct cross-skill credential reference (unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/setup-all.js orchestrator** - `36485c0` (feat)
2. **Task 2: Standardize SKILL.md Prerequisites sections** - `e489c47` (feat)

## Files Created/Modified
- `scripts/setup-all.js` - Batch orchestrator running all 4 credential setups in sequence with TTY guard, failure handling, and summary
- `skills/sentry-investigate/SKILL.md` - Auto-detect Prerequisites: checks tb.sentry-token, runs setup.js if missing
- `skills/pr-upload/SKILL.md` - Auto-detect Prerequisites: checks tb.github-session, runs setup.js if missing
- `skills/contentful/SKILL.md` - Auto-detect Prerequisites: checks tb.contentful-token, runs setup.js if missing
- `skills/task-jira/SKILL.md` - Renamed Setup to Prerequisites for consistency

## Decisions Made
- setup-all.js runs Sentry first (serves two skills: sentry-investigate and sentry-sourcemaps), then Contentful, GitHub Upload, Jira
- Auto-detect pattern runs setup.js inline rather than exit 1, enabling Claude to self-heal missing credentials without user intervention
- task-jira header renamed from "Setup" to "Prerequisites" for cross-skill consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All credential-needing skills now auto-detect and self-heal missing credentials
- setup-all.js provides single-command credential configuration for fresh machines
- Phase 5 (Credential System) fully complete

## Self-Check: PASSED

All 5 files verified present. Both commits (36485c0, e489c47) verified in git log.

---
*Phase: 05-credential-system*
*Completed: 2026-03-12*
