---
phase: 11-mbridge-deploy-setup-hardening
plan: 01
subsystem: tooling
tags: [click, uv, mbridge, cli, doctor, version]

requires:
  - phase: 08-mbridge-ui-hierarchy
    provides: ui dump and find commands
  - phase: 09-mbridge-interaction-ocr
    provides: action, verify, and OCR commands
  - phase: 10-mbridge-skill-integration
    provides: SKILL.md and doctor check script

provides:
  - "--version flag on mbridge CLI for version detection"
  - "Version-aware setup.js that detects stale binaries"
  - "Consolidated 1-line doctor check for mbridge prerequisites"
  - "Deployed binary with all Phase 8-10 commands available"

affects: []

tech-stack:
  added: []
  patterns:
    - "click.version_option for CLI version flag"
    - "pyproject.toml regex extraction in Node.js for version comparison"
    - "Consolidated doctor check with fast-path/slow-path pattern"

key-files:
  created: []
  modified:
    - tools/mbridge/src/mbridge/cli.py
    - tools/mbridge/setup.js
    - scripts/checks/tool-mbridge.sh

key-decisions:
  - "Used click.version_option with __version__ import for CLI version flag"
  - "setup.js compares pyproject.toml version vs mbridge --version output"
  - "Doctor check uses fast-path (all pass) / slow-path (build MISSING list) pattern"

patterns-established:
  - "Version staleness detection: read source version from pyproject.toml, compare to installed CLI --version"

requirements-completed: [MBRD-03, MBRD-04, MBRD-05, MBRD-06]

duration: 2min
completed: 2026-03-14
---

# Phase 11 Plan 01: Deploy + Setup Hardening Summary

**mbridge binary deployed with --version flag, version-aware setup.js, and consolidated 1-line doctor check**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T08:17:58Z
- **Completed:** 2026-03-14T08:19:19Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added --version flag to mbridge CLI via click.version_option, enabling version detection
- Rewrote setup.js to compare installed binary version against pyproject.toml source version, preventing stale binary issues
- Consolidated doctor check from 3 output lines to exactly 1 line with fast-path/slow-path pattern
- Force-reinstalled binary, deploying all Phase 8-10 code (ui dump, find, action, verify commands)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --version flag to mbridge CLI** - `c6f337b` (feat)
2. **Task 2: Harden setup.js with version comparison** - `88f0fee` (feat)
3. **Task 3: Consolidate doctor check to 1 output line** - `021a573` (fix)

## Files Created/Modified
- `tools/mbridge/src/mbridge/cli.py` - Added __version__ import and click.version_option decorator
- `tools/mbridge/setup.js` - Rewrote to compare pyproject.toml version vs installed --version output
- `scripts/checks/tool-mbridge.sh` - Consolidated 3 checks into 1 output line with MISSING detail on FAIL

## Decisions Made
- Used click.version_option with __version__ import for CLI version flag (standard Click pattern)
- setup.js extracts version from pyproject.toml via regex (no TOML parser dependency needed)
- Doctor check uses fast-path inline && chain for PASS, slow-path individual checks for FAIL with specific missing items

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- mbridge binary is fully deployed with all commands from Phases 7-10
- setup.js now prevents stale binary drift on future code changes
- Doctor check follows 1-line convention consistently with other check scripts

## Self-Check: PASSED

All 3 files verified present. All 3 commit hashes verified in git log.

---
*Phase: 11-mbridge-deploy-setup-hardening*
*Completed: 2026-03-14*
