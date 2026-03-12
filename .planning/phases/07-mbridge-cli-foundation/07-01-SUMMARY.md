---
phase: 07-mbridge-cli-foundation
plan: 01
subsystem: cli
tags: [python, click, uv, mbridge, cli-skeleton]

requires:
  - phase: 01-plugin-scaffold
    provides: plugin directory structure with tools/ directory
provides:
  - installable mbridge CLI binary with Click command groups
  - device/app/action/verify/ui command group stubs
  - setup.js for automated uv tool install
affects: [07-02, 08-mbridge-device-interaction, 09-mbridge-verification]

tech-stack:
  added: [click, uv, hatchling, python-3.12]
  patterns: [click-nested-groups, json-first-output, stub-with-error]

key-files:
  created:
    - tools/mbridge/pyproject.toml
    - tools/mbridge/src/mbridge/cli.py
    - tools/mbridge/src/mbridge/device.py
    - tools/mbridge/src/mbridge/app.py
    - tools/mbridge/src/mbridge/action.py
    - tools/mbridge/src/mbridge/verify.py
    - tools/mbridge/src/mbridge/ui.py
    - tools/mbridge/src/mbridge/output.py
    - tools/mbridge/src/mbridge/platforms/__init__.py
    - tools/mbridge/setup.js
  modified: []

key-decisions:
  - "verify group function named verify_group with @click.group('verify') to avoid Python builtin shadowing"

patterns-established:
  - "Click nested groups: each command group in its own module, registered via cli.add_command()"
  - "JSON-first output: output() and error() helpers in output.py for all commands"
  - "Stub pattern: unimplemented commands call error('not implemented') for clean failure"

requirements-completed: [MBRD-01]

duration: 2min
completed: 2026-03-12
---

# Phase 7 Plan 01: CLI Skeleton Summary

**Installable mbridge Python CLI with Click command groups (device, app, action, verify, ui) and uv auto-install setup.js**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T22:25:05Z
- **Completed:** 2026-03-12T22:27:29Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full mbridge package structure with pyproject.toml, hatchling build backend, and Click entrypoint
- Five command groups registered: device (list/boot/info), app (list/foreground/launch/open-url), action, verify, ui
- All stub commands output JSON error via shared output.py helpers
- setup.js detects existing install, checks for uv, runs uv tool install

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mbridge Python package with Click CLI skeleton** - `89e7a4e` (feat)
2. **Task 2: Create setup.js for uv auto-install** - `1e66257` (feat)

## Files Created/Modified
- `tools/mbridge/pyproject.toml` - Package config with Click dep and mbridge entrypoint
- `tools/mbridge/src/mbridge/__init__.py` - Package init with version string
- `tools/mbridge/src/mbridge/cli.py` - Root Click group registering all 5 subgroups
- `tools/mbridge/src/mbridge/output.py` - JSON output and error helpers
- `tools/mbridge/src/mbridge/device.py` - Device group with list/boot/info stubs
- `tools/mbridge/src/mbridge/app.py` - App group with list/foreground/launch/open-url stubs
- `tools/mbridge/src/mbridge/action.py` - Empty action group placeholder
- `tools/mbridge/src/mbridge/verify.py` - Empty verify group placeholder
- `tools/mbridge/src/mbridge/ui.py` - Empty ui group placeholder
- `tools/mbridge/src/mbridge/platforms/__init__.py` - Empty platforms subpackage
- `tools/mbridge/setup.js` - uv auto-install script

## Decisions Made
- verify group function named verify_group with @click.group('verify') to avoid Python builtin shadowing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

uv was not installed in the execution environment. Installed via curl (standard install method) to proceed with verification. This is expected -- mbridge's setup.js handles this case by printing install instructions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLI skeleton complete, Plan 02 can fill in real platform logic for device and app commands
- platforms/ subpackage ready for ios.py and android.py

## Self-Check: PASSED

- All 11 created files verified on disk
- Both task commits (89e7a4e, 1e66257) verified in git log

---
*Phase: 07-mbridge-cli-foundation*
*Completed: 2026-03-12*
