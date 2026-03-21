---
phase: 16-mbridge-testing-and-hardening
plan: 01
subsystem: testing
tags: [mbridge, pytest, integration-tests, click, polling]

requires:
  - phase: 07-mbridge-cli-scaffold
    provides: mbridge CLI structure and ui/device/app/action/verify commands
  - phase: 08-mbridge-ui-parsing
    provides: _capture_dump and find_elements for UI hierarchy queries
provides:
  - ui wait-for polling command for element appearance detection
  - subprocess-based integration test harness (conftest.py + run_mbridge)
  - 24 integration tests covering all mbridge command groups
affects: [16-02, 16-03]

tech-stack:
  added: []
  patterns: [subprocess-based CLI integration testing, time.monotonic polling loop]

key-files:
  created:
    - tools/mbridge/tests/conftest.py
    - tools/mbridge/tests/test_device.py
    - tools/mbridge/tests/test_app.py
    - tools/mbridge/tests/test_ui.py
    - tools/mbridge/tests/test_action_integration.py
    - tools/mbridge/tests/test_verify_integration.py
  modified:
    - tools/mbridge/src/mbridge/ui.py

key-decisions:
  - "Deleted all 112 unit tests per Phase 7 no-unit-tests decision"
  - "wait-for uses time.monotonic for clock-change immunity"
  - "Integration tests use subprocess.run against installed mbridge binary"

patterns-established:
  - "Polling command pattern: monotonic deadline + min(interval, remaining) sleep"
  - "Integration test pattern: run_mbridge helper returns (stdout_data, stderr_data, returncode)"

requirements-completed: []

duration: 2min
completed: 2026-03-21
---

# Phase 16 Plan 01: Test Infrastructure and wait-for Command Summary

**Deleted 112 unit tests, added ui wait-for polling command with monotonic timing, created 24 subprocess-based integration tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T12:42:52Z
- **Completed:** 2026-03-21T12:45:03Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Cleaned test directory of all legacy unit tests and fixtures (1039 lines deleted)
- Implemented ui wait-for command with time.monotonic polling, transient error resilience, and configurable timeout/interval
- Created throwaway integration test infrastructure covering device, app, ui, action, and verify command groups (24 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete existing unit tests and fixtures** - `74ea35d` (chore)
2. **Task 2: Implement ui wait-for command** - `77c18f3` (feat)
3. **Task 3: Create throwaway integration test infrastructure** - `6dda91a` (feat)

## Files Created/Modified
- `tools/mbridge/src/mbridge/ui.py` - Added wait-for subcommand with polling loop
- `tools/mbridge/tests/conftest.py` - Device fixtures and run_mbridge subprocess helper
- `tools/mbridge/tests/test_device.py` - Device list/info integration tests
- `tools/mbridge/tests/test_app.py` - App list/foreground/launch/open-url tests
- `tools/mbridge/tests/test_ui.py` - UI dump/find/wait-for tests including timeout verification
- `tools/mbridge/tests/test_action_integration.py` - Tap/swipe/type action tests
- `tools/mbridge/tests/test_verify_integration.py` - OCR text verification tests

## Decisions Made
- Deleted all 112 unit tests consistent with Phase 7 "no unit tests" decision
- wait-for uses time.monotonic() for clock-change immunity rather than time.time()
- Integration tests shell out to installed mbridge binary via subprocess.run (not Python imports)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Integration tests ready to run against live iOS simulators (Plan 02) and Android emulators (Plan 03)
- wait-for command available for replacing fixed sleeps in integration test sequences
- MBRIDGE_TEST_DEVICE and MBRIDGE_TEST_BUNDLE env vars required for device-specific tests

## Self-Check: PASSED

All 7 files verified present. All 3 commit hashes verified in git log.

---
*Phase: 16-mbridge-testing-and-hardening*
*Completed: 2026-03-21*
