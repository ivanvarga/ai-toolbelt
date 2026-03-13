---
phase: 08-mbridge-ui-parsing
plan: 01
subsystem: parsing
tags: [mbridge, ios, android, uiautomator, idb, accessibility, normalization, pytest]

requires:
  - phase: 07-mbridge-cli-foundation
    provides: platform modules (ios.py, android.py) with subprocess patterns, device management
provides:
  - parsing/normalize.py with unified type maps, bounds/visibility/center computation
  - parsing/ios_parser.py transforming idb JSON into normalized elements
  - parsing/android_parser.py transforming uiautomator XML into normalized elements
  - ios.dump_ui and android.dump_ui platform functions
  - test infrastructure (pytest, fixtures, 57 tests)
affects: [08-02-query-layer, 09-mbridge-ui-interaction]

tech-stack:
  added: [pytest]
  patterns: [TDD with fixture-based testing, normalized element schema, platform-specific parser with shared normalize layer]

key-files:
  created:
    - tools/mbridge/src/mbridge/parsing/__init__.py
    - tools/mbridge/src/mbridge/parsing/normalize.py
    - tools/mbridge/src/mbridge/parsing/ios_parser.py
    - tools/mbridge/src/mbridge/parsing/android_parser.py
    - tools/mbridge/tests/__init__.py
    - tools/mbridge/tests/fixtures/idb_describe_all.json
    - tools/mbridge/tests/fixtures/uiautomator_dump.xml
    - tools/mbridge/tests/test_normalize.py
    - tools/mbridge/tests/test_ios_parser.py
    - tools/mbridge/tests/test_android_parser.py
  modified:
    - tools/mbridge/pyproject.toml
    - tools/mbridge/src/mbridge/platforms/ios.py
    - tools/mbridge/src/mbridge/platforms/android.py

key-decisions:
  - "idb called as CLI subprocess (not fb-idb Python import) consistent with xcrun/adb pattern"
  - "iOS elements have children=[] (idb returns flat list per known limitation)"
  - "Android accessibility_id prefers content-desc, falls back to resource-id with package prefix stripped"
  - "Integer division for compute_center (round for float iOS frame values)"

patterns-established:
  - "Normalized element schema: type/label/accessibility_id/bounds/center/enabled/visible/children"
  - "Platform parser pattern: raw data -> normalize_type + compute_center + is_visible -> unified dict"
  - "Fixture-based testing: JSON/XML fixtures in tests/fixtures/, loaded in test modules"

requirements-completed: [MBRD-03]

duration: 3min
completed: 2026-03-13
---

# Phase 8 Plan 01: Parsing Infrastructure Summary

**Unified iOS/Android UI element parsing with normalized schema, type maps, visibility computation, and 57-test TDD suite**

## Performance

- **Duration:** 3min
- **Started:** 2026-03-13T13:21:29Z
- **Completed:** 2026-03-13T13:25:06Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created parsing package with normalize module containing iOS and Android type maps, center computation, visibility checking, and bounds parsing
- Built iOS parser that transforms idb describe-all JSON into normalized elements with integer bounds
- Built Android parser that transforms uiautomator XML into nested normalized elements with hierarchy preservation
- Added dump_ui platform functions to both ios.py and android.py following established subprocess patterns
- Established test infrastructure with pytest, realistic fixture data, and 57 comprehensive tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create parsing package with normalize module and test fixtures** - `dca48b3` (feat)
2. **Task 2: Create iOS and Android parsers with platform dump_ui functions** - `4fc7f83` (feat)

## Files Created/Modified
- `tools/mbridge/src/mbridge/parsing/__init__.py` - Package init
- `tools/mbridge/src/mbridge/parsing/normalize.py` - Type maps, normalize_type, compute_center, is_visible, parse_android_bounds
- `tools/mbridge/src/mbridge/parsing/ios_parser.py` - parse_ios_dump transforming idb JSON to normalized elements
- `tools/mbridge/src/mbridge/parsing/android_parser.py` - parse_android_dump transforming uiautomator XML to normalized elements
- `tools/mbridge/src/mbridge/platforms/ios.py` - Added require_idb and dump_ui
- `tools/mbridge/src/mbridge/platforms/android.py` - Added dump_ui
- `tools/mbridge/pyproject.toml` - Added pytest dev dependency
- `tools/mbridge/tests/__init__.py` - Test package init
- `tools/mbridge/tests/fixtures/idb_describe_all.json` - 7-element iOS fixture with Button, StaticText, TextField, Switch, Cell, Group, offscreen Button
- `tools/mbridge/tests/fixtures/uiautomator_dump.xml` - Nested Android fixture with FrameLayout, LinearLayout, Button, TextView, EditText, ImageView, Switch
- `tools/mbridge/tests/test_normalize.py` - 26 tests for type normalization, center, visibility, bounds parsing
- `tools/mbridge/tests/test_ios_parser.py` - 15 tests for iOS parser output
- `tools/mbridge/tests/test_android_parser.py` - 16 tests for Android parser output and resource ID stripping

## Decisions Made
- idb called as CLI subprocess (not fb-idb Python import) consistent with xcrun/adb pattern
- iOS elements have children=[] since idb returns flat list (known limitation)
- Android accessibility_id prefers content-desc, falls back to resource-id with package prefix stripped
- Integer division for compute_center; float iOS frame values rounded to int

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Parsing infrastructure complete, ready for query layer (plan 02: find by id/text/xpath/type)
- Normalized element schema established as contract for all downstream consumers
- Test fixtures available for query layer testing

## Self-Check: PASSED

All 10 created files verified on disk. Both task commits (dca48b3, 4fc7f83) verified in git log. 57 tests passing.

---
*Phase: 08-mbridge-ui-parsing*
*Completed: 2026-03-13*
