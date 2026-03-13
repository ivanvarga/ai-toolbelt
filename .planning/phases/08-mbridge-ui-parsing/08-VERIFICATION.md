---
phase: 08-mbridge-ui-parsing
verified: 2026-03-13T14:00:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
---

# Phase 8: mbridge UI Parsing Verification Report

**Phase Goal:** mbridge can capture and parse UI hierarchy from iOS and Android devices and find elements within it
**Verified:** 2026-03-13T14:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

#### Plan 01 — MBRD-03: Parsing infrastructure

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | idb JSON array is parsed into list of normalized elements with correct fields | VERIFIED | `parse_ios_dump` in ios_parser.py maps frame/AXLabel/AXUniqueId/type/enabled to schema; 15 tests pass |
| 2 | Android uiautomator XML is parsed into nested normalized elements with correct fields | VERIFIED | `parse_android_dump` + `_parse_node` recursion in android_parser.py; 16 tests pass |
| 3 | iOS and Android elements share identical JSON structure | VERIFIED | Both produce type/label/accessibility_id/bounds/center/enabled/visible/children |
| 4 | Element types are normalized to generic names (Button, Label, TextField, etc.) | VERIFIED | IOS_TYPE_MAP and ANDROID_TYPE_MAP in normalize.py; 10 normalize_type tests pass |
| 5 | Bounds include x/y/w/h and center x/y on every element | VERIFIED | compute_center called on every element in both parsers; bounds dict with x/y/width/height |
| 6 | Visibility is computed based on bounds intersecting screen dimensions | VERIFIED | is_visible called on every element; 8 visibility tests pass |

#### Plan 02 — MBRD-05: Query and CLI

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Elements can be found by accessibility ID | VERIFIED | `find_elements(elements, id=...)` exact-matches accessibility_id field |
| 8 | Elements can be found by text content with substring matching | VERIFIED | `text not in label` check; case-sensitive substring test passes |
| 9 | Elements can be found by text with exact match when --exact flag used | VERIFIED | `label != text` check when exact=True; test_find_by_text_exact_match passes |
| 10 | Elements can be found by XPath expression | VERIFIED | _to_xml roundtrip with ET.findall; xpath tests pass including attribute filter |
| 11 | Elements can be filtered by normalized type | VERIFIED | `element["type"] != element_type` check; test_find_by_type passes |
| 12 | Multiple filter flags combine as AND (all must match) | VERIFIED | Sequential continue-on-miss logic in find_elements; test_find_combined_text_and_type passes |
| 13 | mbridge ui dump outputs normalized JSON element tree | VERIFIED | dump subcommand in ui.py calls _capture_dump then output(); `mbridge ui dump --help` confirms DEVICE_ID arg |
| 14 | mbridge ui find captures fresh dump and queries it | VERIFIED | find subcommand calls _capture_dump internally then find_elements; self-contained |
| 15 | Multiple matches return JSON array of all matching elements | VERIFIED | find_elements returns list; output() serializes as JSON array |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tools/mbridge/src/mbridge/parsing/__init__.py` | Package init | VERIFIED | Exists, empty (correct) |
| `tools/mbridge/src/mbridge/parsing/normalize.py` | Type maps, normalize_type, compute_center, is_visible, parse_android_bounds | VERIFIED | All 5 exports present; substantive implementation |
| `tools/mbridge/src/mbridge/parsing/ios_parser.py` | parse_ios_dump | VERIFIED | Exports parse_ios_dump; imports from normalize |
| `tools/mbridge/src/mbridge/parsing/android_parser.py` | parse_android_dump | VERIFIED | Exports parse_android_dump; imports from normalize |
| `tools/mbridge/src/mbridge/platforms/ios.py` | dump_ui, require_idb | VERIFIED | Both functions present; subprocess call to idb |
| `tools/mbridge/src/mbridge/platforms/android.py` | dump_ui | VERIFIED | Function present; subprocess call to adb |
| `tools/mbridge/src/mbridge/parsing/query.py` | find_elements | VERIFIED | Exports find_elements; handles all filter types |
| `tools/mbridge/src/mbridge/ui.py` | dump and find CLI subcommands | VERIFIED | Both subcommands registered in ui Click group |
| `tools/mbridge/tests/fixtures/idb_describe_all.json` | iOS fixture data | VERIFIED | Exists with realistic idb element structure |
| `tools/mbridge/tests/fixtures/uiautomator_dump.xml` | Android fixture data | VERIFIED | Exists with realistic uiautomator XML hierarchy |
| `tools/mbridge/tests/test_normalize.py` | Normalize tests | VERIFIED | 26 tests, all passing |
| `tools/mbridge/tests/test_ios_parser.py` | iOS parser tests | VERIFIED | 15 tests, all passing |
| `tools/mbridge/tests/test_android_parser.py` | Android parser tests | VERIFIED | 16 tests, all passing |
| `tools/mbridge/tests/test_query.py` | Query engine tests | VERIFIED | 12 tests, all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ios_parser.py` | `normalize.py` | `from mbridge.parsing.normalize import` | WIRED | Imports IOS_TYPE_MAP, normalize_type, compute_center, is_visible |
| `android_parser.py` | `normalize.py` | `from mbridge.parsing.normalize import` | WIRED | Imports ANDROID_TYPE_MAP, normalize_type, compute_center, is_visible, parse_android_bounds |
| `platforms/ios.py` | idb CLI | subprocess call to `idb ui describe-all --udid` | WIRED | Line 189: `["idb", "ui", "describe-all", "--udid", device_id]` |
| `platforms/android.py` | adb CLI | subprocess call to `adb exec-out uiautomator dump /dev/tty` | WIRED | Line 183-185: `["adb", "-s", device_id, "exec-out", "uiautomator", "dump", "/dev/tty"]` |
| `ui.py` | `platforms/ios.py` | `ios.dump_ui` + `parse_ios_dump` | WIRED | `_capture_dump` calls `ios.dump_ui` and `parse_ios_dump` |
| `ui.py` | `platforms/android.py` | `android.dump_ui` + `parse_android_dump` | WIRED | `_capture_dump` calls `android.dump_ui` and `parse_android_dump` |
| `ui.py` | `parsing/query.py` | `find_elements` in find subcommand | WIRED | `find` command calls `find_elements(elements, ...)` |
| `ui.py` | `device.py` | `_detect_platform` import | WIRED | `from mbridge.device import _detect_platform` at top of file |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MBRD-03 | 08-01-PLAN.md | UI dump parsing — iOS JSON and Android XML | SATISFIED | ios_parser.py + android_parser.py parse raw platform data; 31 parser tests pass |
| MBRD-05 | 08-02-PLAN.md | Element finding by accessibility ID, text, XPath | SATISFIED | query.py find_elements covers all filter types; `mbridge ui find` subcommand wired; 12 query tests pass |

No orphaned requirements — both IDs declared in plan frontmatter match what is actually implemented.

### Anti-Patterns Found

None. Scanned normalize.py, ios_parser.py, android_parser.py, query.py, ui.py for TODO/FIXME/placeholder patterns, empty implementations, and stub returns. All implementations are substantive.

### Human Verification Required

#### 1. Live iOS device dump

**Test:** Run `mbridge ui dump <booted-simulator-udid>` against a running iOS simulator
**Expected:** JSON array of normalized elements representing the current screen
**Why human:** Requires a live iOS simulator with idb installed; cannot verify subprocess I/O programmatically

#### 2. Live Android device dump

**Test:** Run `mbridge ui dump <android-device-id>` against a connected Android device or emulator
**Expected:** JSON array of normalized elements with nested children hierarchy
**Why human:** Requires a connected Android device with adb; cannot verify subprocess I/O programmatically

#### 3. Live find command

**Test:** Run `mbridge ui find <device-id> --text "Settings"` against a real device
**Expected:** JSON array containing only elements whose label contains "Settings"
**Why human:** Depends on live device state and real UI content

### Gaps Summary

No gaps. All 15 must-have truths are verified, all 14 artifacts exist with substantive implementations, all 8 key links are wired, both requirements MBRD-03 and MBRD-05 are satisfied. 69 tests pass with 0 failures. CLI help output confirms all options registered.

---

_Verified: 2026-03-13T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
