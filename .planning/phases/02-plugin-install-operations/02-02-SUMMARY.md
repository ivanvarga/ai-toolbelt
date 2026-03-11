---
phase: 02-plugin-install-operations
plan: 02
subsystem: plugin-ops
tags: [skills, health-check, update, doctor, bash]

requires:
  - phase: 01-plugin-scaffold
    provides: Plugin directory structure with skills/, scripts/, hooks/

provides:
  - /tb:update skill for pulling latest plugin changes with changelog
  - /tb:doctor skill for modular health checks
  - Modular check script framework in scripts/checks/
  - Three core check scripts (plugin-registered, skills-valid, hooks-valid)

affects: [03-simple-skills, 04-complex-skills]

tech-stack:
  added: []
  patterns: [modular-check-scripts, skill-disable-model-invocation]

key-files:
  created:
    - skills/update/SKILL.md
    - skills/doctor/SKILL.md
    - scripts/checks/plugin-registered.sh
    - scripts/checks/skills-valid.sh
    - scripts/checks/hooks-valid.sh
  modified: []

key-decisions:
  - "Check scripts use python3 for JSON parsing (available on macOS/Linux)"
  - "hooks-valid parses nested hooks.json structure (hooks -> event -> matchers -> hooks -> command)"

patterns-established:
  - "Modular check script convention: $1=PLUGIN_ROOT, output PASS|FAIL check-name message, exit 0"
  - "disable-model-invocation: true for user-initiated skills with side effects"

requirements-completed: [PLUG-03, PLUG-04]

duration: 3min
completed: 2026-03-11
---

# Phase 02 Plan 02: Update & Doctor Skills Summary

**/tb:update skill for git-based plugin updates with version diff and changelog, /tb:doctor with modular check script framework**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T16:45:02Z
- **Completed:** 2026-03-11T16:48:26Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- /tb:update skill handles stash/pull/unstash workflow with version comparison and git log changelog
- /tb:doctor skill discovers and runs all scripts/checks/*.sh with pass/fail checklist output
- Three core health checks: plugin-registered, skills-valid, hooks-valid
- Check framework is extensible by dropping .sh files into scripts/checks/

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /tb:update skill** - `9734a49` (feat)
2. **Task 2: Create /tb:doctor skill and modular check scripts** - `916ed94` (feat)

## Files Created/Modified
- `skills/update/SKILL.md` - Update skill: stash/pull/unstash with version diff and changelog
- `skills/doctor/SKILL.md` - Doctor skill: discover and run modular check scripts
- `scripts/checks/plugin-registered.sh` - Check plugin registration in Claude Code settings
- `scripts/checks/skills-valid.sh` - Validate all skill directories have SKILL.md with name frontmatter
- `scripts/checks/hooks-valid.sh` - Validate hooks.json structure and referenced scripts exist
- `skills/.gitkeep` - Removed (skills/ has real content)
- `scripts/.gitkeep` - Removed (scripts/ has real content)

## Decisions Made
- Used python3 for JSON parsing in check scripts (universally available, handles complex structures)
- hooks-valid script parses nested hooks.json format (hooks -> event -> matchers -> hooks -> command) matching actual plugin structure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed hooks.json parsing for nested structure**
- **Found during:** Task 2
- **Issue:** Initial python3 parser assumed flat hook list; actual hooks.json uses nested structure with event names and matcher arrays
- **Fix:** Updated parser to traverse hooks -> event_name -> matchers[] -> hooks[] -> command
- **Files modified:** scripts/checks/hooks-valid.sh
- **Verification:** hooks-valid.sh correctly finds 1 hook in existing hooks.json
- **Committed in:** 916ed94 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed hook count output formatting**
- **Found during:** Task 2
- **Issue:** `grep -c .` on empty COMMANDS string produced split-line output
- **Fix:** Added explicit empty check before counting
- **Files modified:** scripts/checks/hooks-valid.sh
- **Verification:** Clean single-line output for both 0 and N hooks
- **Committed in:** 916ed94 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness with actual hooks.json format. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plugin operational skills (update, doctor) ready for use
- Check script framework established for future phases to add health checks
- Skills directory populated with real skills (update, doctor)

## Self-Check: PASSED

All 5 created files verified present. Both task commits (9734a49, 916ed94) verified in git log.

---
*Phase: 02-plugin-install-operations*
*Completed: 2026-03-11*
