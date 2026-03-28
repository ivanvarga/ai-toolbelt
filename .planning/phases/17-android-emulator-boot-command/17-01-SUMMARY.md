---
phase: 17-android-emulator-boot-command
plan: 01
subsystem: tools
tags: [android, emulator, adb, gpu-fallback, subprocess, popen, simulator]

requires:
  - phase: 07-mbridge-cli-foundation
    provides: device.py boot/list commands, android.py/ios.py platform modules
provides:
  - android.boot_emulator() with GPU host-to-software fallback
  - android.list_avds() for AVD discovery
  - android._parse_emulator_version() for version gating
  - device boot --timeout flag with Android emulator support
  - device list --available flag for unbooted AVDs
  - ios.boot_device() opens Simulator.app after boot
affects: [17-02, mbridge-skill]

tech-stack:
  added: []
  patterns: [subprocess.Popen for background process management, time.monotonic deadline loop for boot-wait, GPU fallback host-then-software]

key-files:
  created: []
  modified:
    - tools/mbridge/src/mbridge/platforms/android.py
    - tools/mbridge/src/mbridge/platforms/ios.py
    - tools/mbridge/src/mbridge/device.py

key-decisions:
  - "GPU fallback uses host then software, version-gated at 36.4.9+"
  - "Boot command tries iOS first then Android, propagates errors from both"
  - "AVD list deduplicates running emulators from available list"

patterns-established:
  - "Popen for long-running background processes: use subprocess.Popen with DEVNULL/PIPE, poll() for crash detection"
  - "Boot-wait polling: time.monotonic deadline loop with 2s interval, sys.boot_completed check"
  - "Emulator serial detection: diff adb devices before/after launch"

requirements-completed: [BOOT-01, BOOT-02, BOOT-03, BOOT-04, BOOT-05]

duration: 2min
completed: 2026-03-28
---

# Phase 17 Plan 01: Android Emulator Boot Command Summary

**Android emulator boot lifecycle with GPU host-to-software fallback, AVD discovery via --available flag, iOS Simulator.app opening, and error propagation hardening**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T11:44:58Z
- **Completed:** 2026-03-28T11:47:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added 9 emulator lifecycle functions to android.py: discovery, version parsing, launch, GPU fallback, boot-wait, serial detection
- Rewrote device.py boot command with --timeout flag, Android path, and error propagation from both platforms
- Added --available flag to device list that includes unbooted AVDs with deduplication
- iOS boot_device now opens Simulator.app GUI window after simctl boot

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Android emulator functions and fix iOS boot** - `89fe021` (feat)
2. **Task 2: Rewrite device.py boot command and add --available flag** - `c1f7c7b` (feat)

## Files Created/Modified
- `tools/mbridge/src/mbridge/platforms/android.py` - 9 new functions: _find_emulator, require_emulator, _parse_emulator_version, list_avds, _launch_emulator, _wait_for_process_stable, _get_emulator_serials, _wait_for_boot, boot_emulator
- `tools/mbridge/src/mbridge/platforms/ios.py` - boot_device opens Simulator.app after simctl boot
- `tools/mbridge/src/mbridge/device.py` - boot command with --timeout/Android/error propagation, list with --available

## Decisions Made
- GPU fallback uses host then software mode, version-gated at emulator 36.4.9+ (D-08/D-09/D-12)
- Boot command tries iOS first then Android, propagates errors from both platforms (D-17/D-18)
- AVD list deduplicates running emulators from available AVD list to avoid duplicates (D-01/D-03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Android emulator boot lifecycle complete, ready for plan 02 (swipe-to edge visibility, SKILL.md docs)
- Emulator 36.4.9+ required on user machine for boot to work (version check provides clear upgrade message)

## Self-Check: PASSED

---
*Phase: 17-android-emulator-boot-command*
*Completed: 2026-03-28*
