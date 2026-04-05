---
phase: 20-bootstrap-update
plan: 01
subsystem: plugin-operations
tags: [skill, bootstrap, update, gsd, forgetful-plugin, patches]

requires:
  - phase: 19-gsd-workflow-patches
    provides: patches/apply-all.sh and individual patch scripts for GSD workflow injection
  - phase: 18-foundation
    provides: forgetful-client.js, doctor check scripts (gsd-installed.sh, forgetful-plugin.sh, forgetful-mcp.sh)
provides:
  - "/tb:bootstrap skill for one-command environment setup (GSD, forgetful-plugin, patches)"
  - "/tb:update extended with GSD update, forgetful-plugin update, patch re-application"
affects: [doctor, plugin-operations]

tech-stack:
  added: []
  patterns: [claude-plugin-cli-for-plugin-management, direct-jq-key-lookup-for-plugin-detection]

key-files:
  created: [skills/bootstrap/SKILL.md]
  modified: [skills/update/SKILL.md]

key-decisions:
  - "Direct jq key lookup for forgetful-plugin detection instead of broken doctor check jq query"
  - "GSD install guided (user runs manually) vs GSD update automated (npx in bash block)"

patterns-established:
  - "Direct jq key lookup on installed_plugins.json v2 dict format for reliable plugin detection"
  - "claude plugin install/update CLI commands for forgetful-plugin lifecycle"

requirements-completed: [BOOT-01, BOOT-02, BOOT-03, BOOT-04, UPDT-01, UPDT-02, UPDT-03]

duration: 2min
completed: 2026-04-02
---

# Phase 20 Plan 01: Bootstrap & Update Summary

**Bootstrap skill with GSD/forgetful-plugin/patches setup, update skill extended with 4 new dependency-refresh steps**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-02T19:46:14Z
- **Completed:** 2026-04-02T19:48:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `/tb:bootstrap` skill with 5 steps: plugin root, GSD detect/install-guide, forgetful-plugin detect/install, patch application, summary
- Extended `/tb:update` skill from 9 to 13 steps: GSD update, forgetful-plugin update, patch re-application, combined summary
- Used direct jq key lookup `.plugins["forgetful-plugin@forgetful-plugins"]` instead of broken doctor check `.[] | select(.id ==...)` pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bootstrap skill** - `3de9c4a` (feat)
2. **Task 2: Extend update skill with GSD + forgetful-plugin + patches** - `ebe9197` (feat)

## Files Created/Modified
- `skills/bootstrap/SKILL.md` - New bootstrap skill: one-command setup of GSD, forgetful-plugin, and GSD patches
- `skills/update/SKILL.md` - Extended with steps 10-13 for GSD update, forgetful-plugin update, patch re-application, and combined summary

## Decisions Made
- Used direct jq key lookup on `installed_plugins.json` for forgetful-plugin detection instead of the `forgetful-plugin.sh` doctor check script (which has a jq query bug with v2 dict format)
- Bootstrap step 2 presents the GSD install command as text for user to run manually (per D-01), while update step 10 runs it directly in a bash block (per D-07, GSD already installed during update)
- Left step 9's reload reminder intact (per D-06 minimize changes), added second reminder in step 13 (redundant but harmless)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Bootstrap and update skills ready for manual testing
- Doctor integration checks (gsd-installed, forgetful-plugin, forgetful-mcp) already exist from Phase 18
- All 7 requirements (BOOT-01 through BOOT-04, UPDT-01 through UPDT-03) addressed

## Self-Check: PASSED

- FOUND: skills/bootstrap/SKILL.md
- FOUND: skills/update/SKILL.md
- FOUND: 20-01-SUMMARY.md
- FOUND: commit 3de9c4a
- FOUND: commit ebe9197

---
*Phase: 20-bootstrap-update*
*Completed: 2026-04-02*
