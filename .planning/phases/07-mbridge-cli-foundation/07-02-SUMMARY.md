---
phase: 07-mbridge-cli-foundation
plan: 02
subsystem: cli
tags: [python, xcrun, adb, simctl, mbridge, device-discovery, coordinate-conversion]

requires:
  - phase: 07-mbridge-cli-foundation
    provides: CLI skeleton with device/app command group stubs and output helpers
provides:
  - real iOS simulator discovery and interaction via xcrun simctl
  - real Android device discovery and interaction via adb
  - coordinate conversion between logical points and physical pixels
  - working mbridge device list/info/boot and app list/foreground/launch/open-url commands
affects: [08-mbridge-device-interaction, 09-mbridge-verification]

tech-stack:
  added: [xcrun-simctl, adb, plistlib, subprocess]
  patterns: [lazy-tool-check, platform-detect-by-device-id, json-error-output]

key-files:
  created:
    - tools/mbridge/src/mbridge/platforms/ios.py
    - tools/mbridge/src/mbridge/platforms/android.py
    - tools/mbridge/src/mbridge/coords.py
  modified:
    - tools/mbridge/src/mbridge/device.py
    - tools/mbridge/src/mbridge/app.py

key-decisions:
  - "xcrun simctl io enumerate fallback for screen info on shutdown simulators"
  - "iOS list_devices stores internal _dataPath and _deviceTypeIdentifier fields, stripped before output"
  - "Android list_devices returns empty list when adb not available (no error for unfiltered list)"

patterns-established:
  - "Lazy tool check: require_xcrun/require_adb called at function entry, raises RuntimeError"
  - "Platform detection: _detect_platform scans both platform lists to find device_id owner"
  - "Internal fields: prefixed with _ in platform modules, stripped in command layer"

requirements-completed: [MBRD-02]

duration: 2min
completed: 2026-03-12
---

# Phase 7 Plan 02: Platform Logic Summary

**Real xcrun simctl and adb wrappers for device discovery, screen info, app interaction, and point/pixel coordinate conversion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T22:30:17Z
- **Completed:** 2026-03-12T22:32:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- iOS platform module with full simctl integration: list, info (with screen dimensions from enumerate fallback), boot, list apps (plist parsing), foreground detection, launch, open-url
- Android platform module with adb integration: list (devices -l parsing with emulator detection), info (wm size/density), list apps (pm list), foreground detection (dumpsys), launch (monkey), open-url (am start)
- Coordinate conversion module with logical_to_physical and physical_to_logical functions
- Device and app command groups wired to real platform logic with automatic platform detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement platform modules and coordinate conversion** - `a302933` (feat)
2. **Task 2: Wire platform logic into device and app commands** - `04eb68d` (feat)

## Files Created/Modified
- `tools/mbridge/src/mbridge/platforms/ios.py` - xcrun simctl wrapper for iOS simulator discovery and interaction
- `tools/mbridge/src/mbridge/platforms/android.py` - adb wrapper for Android device discovery and interaction
- `tools/mbridge/src/mbridge/coords.py` - Coordinate conversion between logical points and physical pixels
- `tools/mbridge/src/mbridge/device.py` - Device commands with real platform logic and auto-detection
- `tools/mbridge/src/mbridge/app.py` - App commands with real platform logic and auto-detection

## Decisions Made
- xcrun simctl io enumerate used as fallback for screen info when simulator is shutdown (getenv only works on booted devices)
- iOS list_devices stores internal fields (_dataPath, _deviceTypeIdentifier) for use by get_device_info, stripped before output via _strip_internal
- Android platform returns empty list instead of error when adb not available during unfiltered device list (consistent with "no devices is valid" requirement)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All device and app commands functional with real platform tools
- Coordinate conversion module ready for Phase 8+ consumption
- Platform modules expose all functions needed by future action/verify/ui commands
## Self-Check: PASSED

- All 5 created/modified files verified on disk
- Both task commits (a302933, 04eb68d) verified in git log

---
*Phase: 07-mbridge-cli-foundation*
*Completed: 2026-03-12*
