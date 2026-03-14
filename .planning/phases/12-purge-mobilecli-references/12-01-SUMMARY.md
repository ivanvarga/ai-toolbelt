---
phase: 12-purge-mobilecli-references
plan: 01
subsystem: tooling
tags: [mobilecli, mbridge, migration, cleanup]

requires:
  - phase: 10-mobilecli-to-mbridge
    provides: mbridge skill replacing mobilecli
provides:
  - zero mobilecli references outside .planning/
  - clean coords.py with only screen_logical_size export
affects: []

tech-stack:
  added: []
  patterns: [platform-native screenshot commands in skills]

key-files:
  created: []
  modified:
    - skills/pr-describe/SKILL.md
    - skills/pr-upload/SKILL.md
    - skills/pr-qa/SKILL.md
    - CLAUDE.md
    - .claude/settings.local.json
    - tools/mbridge/src/mbridge/coords.py

key-decisions:
  - "settings.local.json is gitignored so mobilecli removal is local-only"

patterns-established: []

requirements-completed: [MBRD-07]

duration: 2min
completed: 2026-03-14
---

# Phase 12 Plan 01: Purge mobilecli References Summary

**Replaced all mobilecli references with mbridge/platform-native equivalents across 5 files and removed 2 dead conversion functions from coords.py**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T13:09:39Z
- **Completed:** 2026-03-14T13:11:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- pr-describe now uses `mbridge device list` and platform-native xcrun/adb screenshot commands
- pr-upload section renamed to "With device screenshots" with iOS/Android command examples
- pr-qa deeplinks path updated to `.mbridge/deeplinks.md`
- CLAUDE.md standalone skill example updated from mobilecli to mbridge
- settings.local.json find pattern cleaned of mobilecli glob
- coords.py reduced from 42 lines to 19 lines, exporting only `screen_logical_size`

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace mobilecli references in SKILL.md files, CLAUDE.md, and settings.local.json** - `e933d19` (fix)
2. **Task 2: Remove unused exports from coords.py** - `9f2d821` (refactor)

## Files Created/Modified
- `skills/pr-describe/SKILL.md` - Device discovery via mbridge, platform-native screenshots
- `skills/pr-upload/SKILL.md` - Section renamed, xcrun/adb commands
- `skills/pr-qa/SKILL.md` - Deeplinks path to .mbridge/
- `CLAUDE.md` - Standalone skill example updated
- `.claude/settings.local.json` - Removed mobilecli glob from find pattern (gitignored, local-only)
- `tools/mbridge/src/mbridge/coords.py` - Removed logical_to_physical and physical_to_logical

## Decisions Made
- settings.local.json is gitignored so the mobilecli removal there is a local-only change, not committed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- This is the final phase (12 of 12) -- project milestone complete
- Zero mobilecli references remain outside .planning/

## Self-Check: PASSED

All files exist. All commits verified (e933d19, 9f2d821).

---
*Phase: 12-purge-mobilecli-references*
*Completed: 2026-03-14*
