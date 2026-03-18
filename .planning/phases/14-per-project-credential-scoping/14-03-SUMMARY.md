---
phase: 14-per-project-credential-scoping
plan: 03
subsystem: credentials
tags: [keychain, resolve-credential, org-scoping, sentry, github, contentful, jira]

requires:
  - phase: 14-per-project-credential-scoping (plan 01)
    provides: resolve-credential.js and resolve-org.js foundation modules
provides:
  - All credential consumers use org-first resolution via resolve-credential.js
  - No hardcoded keychain service names remain in API scripts or SKILL.md files
affects: [14-per-project-credential-scoping]

tech-stack:
  added: []
  patterns: [org-first credential resolution via resolve-credential.js, plugin path discovery fallback for agents]

key-files:
  created: []
  modified:
    - scripts/sentry-api.js
    - scripts/github-api.js
    - skills/sentry-investigate/SKILL.md
    - skills/sentry-sourcemaps/SKILL.md
    - skills/pr-upload/SKILL.md
    - skills/contentful/SKILL.md
    - skills/task-jira/setup.js
    - agents/attachment-documenter.md

key-decisions:
  - "Agent uses plugin path discovery (find ~/.claude/plugins) with direct security fallback for portability"

patterns-established:
  - "SKILL.md auto-detect: node $PLUGIN_ROOT/scripts/resolve-credential.js <service> replaces security find-generic-password"
  - "SKILL.md runtime: resolve-credential.js replaces keychain.js get for token retrieval"
  - "API scripts: require('./resolve-credential').getCredential() replaces execSync keychain.js"

requirements-completed: [SCOPE-05, SCOPE-06]

duration: 1min
completed: 2026-03-18
---

# Phase 14 Plan 03: Consumer Migration Summary

**All 8 credential consumers migrated to resolve-credential.js with org-first resolution for API scripts, 4 SKILL.md files, setup.js, and attachment-documenter agent**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-18T15:59:19Z
- **Completed:** 2026-03-18T16:00:19Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- API scripts (sentry-api.js, github-api.js) now use getCredential() from resolve-credential.js
- All 4 SKILL.md auto-detect blocks and 9 runtime credential retrievals use resolve-credential.js
- task-jira/setup.js credential check uses resolve-credential.js
- attachment-documenter agent uses plugin path discovery with security command fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Update API scripts to use resolve-credential.js** - `33b1857` (feat)
2. **Task 2: Update SKILL.md files and agent to use resolve-credential.js** - `e1c84d3` (feat)

## Files Created/Modified
- `scripts/sentry-api.js` - Uses getCredential() instead of keychain.js execSync
- `scripts/github-api.js` - Uses getCredential() instead of keychain.js execSync
- `skills/sentry-investigate/SKILL.md` - Auto-detect uses resolve-credential.js
- `skills/sentry-sourcemaps/SKILL.md` - Auto-detect + 6 runtime calls use resolve-credential.js
- `skills/pr-upload/SKILL.md` - Auto-detect uses resolve-credential.js
- `skills/contentful/SKILL.md` - Auto-detect + 3 runtime calls use resolve-credential.js
- `skills/task-jira/setup.js` - Credential check uses resolve-credential.js
- `agents/attachment-documenter.md` - Plugin path discovery + resolve-credential.js with fallback

## Decisions Made
- Agent uses plugin path discovery (find ~/.claude/plugins) with direct security command fallback since agents don't have access to CLAUDE_PLUGIN_ROOT

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All credential consumers now go through org-first resolution layer
- Ready for plan 04 (setup flow updates for org-scoped credential storage)

## Self-Check: PASSED

All 8 modified files verified present. Both task commits (33b1857, e1c84d3) verified in git log.

---
*Phase: 14-per-project-credential-scoping*
*Completed: 2026-03-18*
