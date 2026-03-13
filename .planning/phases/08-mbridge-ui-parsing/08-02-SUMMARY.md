---
phase: 08-mbridge-ui-parsing
plan: 02
subsystem: parsing
tags: [mbridge, query, xpath, accessibility, click, cli]

requires:
  - phase: 08-mbridge-ui-parsing
    provides: parsing infrastructure (normalize.py, ios_parser.py, android_parser.py, dump_ui functions)
provides:
  - parsing/query.py with find_elements supporting id, text, xpath, type filters and nested search
  - ui.py dump subcommand producing normalized JSON from iOS/Android
  - ui.py find subcommand capturing fresh dump and querying with filter flags
affects: [09-mbridge-ui-interaction]

tech-stack:
  added: []
  patterns: [XML-based XPath evaluation via ElementTree conversion, recursive tree flattening for filter queries]

key-files:
  created:
    - tools/mbridge/src/mbridge/parsing/query.py
    - tools/mbridge/tests/test_query.py
  modified:
    - tools/mbridge/src/mbridge/ui.py

key-decisions:
  - "XPath queries converted to .// prefix internally (ElementTree requires relative paths on elements)"
  - "Shared _capture_dump helper extracts dump logic for reuse between dump and find subcommands"

patterns-established:
  - "Query filter combination as AND: all specified filters must match"
  - "Normalized-to-XML roundtrip for XPath: element tree -> XML with attributes -> XPath eval -> back to normalized dict"

requirements-completed: [MBRD-05]

duration: 2min
completed: 2026-03-13
---

# Phase 8 Plan 02: Query Engine and CLI Summary

**Element query engine with id/text/xpath/type filters and dump/find CLI subcommands wired into ui Click group**

## Performance

- **Duration:** 2min
- **Started:** 2026-03-13T13:27:47Z
- **Completed:** 2026-03-13T13:29:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Built query engine (find_elements) supporting id, text (substring + exact), type, xpath, and combined AND filters with recursive nested child search
- Wired dump and find subcommands into existing ui Click group with platform-aware dump capture
- TDD approach: 12 tests covering all filter types, edge cases, nested elements, and XPath attribute queries
- Full test suite at 69 tests (57 from plan 01 + 12 new query tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create query engine with element finding logic** - `c1aa228` (test), `8e2e79d` (feat)
2. **Task 2: Wire dump and find subcommands into ui Click group** - `11cb742` (feat)

## Files Created/Modified
- `tools/mbridge/src/mbridge/parsing/query.py` - find_elements with id/text/xpath/type filters, _flatten, _to_xml, _from_xml_node
- `tools/mbridge/tests/test_query.py` - 12 tests covering all filter combinations and edge cases
- `tools/mbridge/src/mbridge/ui.py` - dump and find subcommands with platform dispatch and error handling

## Decisions Made
- XPath queries automatically prefixed with `.` (ElementTree requires relative paths when calling findall on elements)
- Shared `_capture_dump` helper extracts platform detection and dump logic, reused by both dump and find subcommands

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] XPath absolute path syntax error**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** ElementTree.findall raises SyntaxError on `//Button` (absolute path not allowed on element)
- **Fix:** Auto-prefix `//` with `.` to make `.//Button` (standard ElementTree pattern for descendant search)
- **Files modified:** tools/mbridge/src/mbridge/parsing/query.py
- **Verification:** XPath tests pass
- **Committed in:** 8e2e79d (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Standard ElementTree behavior, no scope change.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 08 complete: mbridge ui dump and find are fully functional
- Query engine provides the primary interface for Claude to interact with mobile UIs
- Ready for phase 09 (mbridge UI interaction: tap, type, swipe based on element coordinates)

## Self-Check: PASSED

All 3 files verified on disk. All 3 task commits (c1aa228, 8e2e79d, 11cb742) verified in git log. 69 tests passing.

---
*Phase: 08-mbridge-ui-parsing*
*Completed: 2026-03-13*
