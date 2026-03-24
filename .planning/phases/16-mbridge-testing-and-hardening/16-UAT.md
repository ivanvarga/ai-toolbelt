---
status: complete
phase: 16-mbridge-testing-and-hardening
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md]
started: 2026-03-24T12:30:00Z
updated: 2026-03-24T18:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. ui wait-for finds existing element
expected: Run `mbridge ui wait-for <device> --text "<visible_text>" --timeout 5` on a screen with visible text. Returns matching element JSON quickly without timing out.
result: pass

### 2. ui wait-for times out on missing element
expected: Run `mbridge ui wait-for <device> --text "NONEXISTENT_XYZ" --timeout 3`. Returns error after 3 seconds indicating timeout.
result: pass

### 3. action swipe-to scrolls to offscreen element
expected: On a scrollable list, run `mbridge action swipe-to <device> --text "<item_below_fold>" --direction up`. Automatically swipes until element found, returns element JSON with swipe count.
result: issue
reported: "swipe-to finds element but stops when it's barely visible — just a thin line at screen edge, not usable"
severity: minor

### 4. action type auto-dismisses keyboard (Android)
expected: Run `mbridge action type <device> "test" --type TextField` on Android. Text is typed and keyboard dismisses automatically. Bottom tab bar is visible and tappable after typing.
result: pass

### 5. action type --clear replaces field contents
expected: Type text into a field, then run `mbridge action type <device> "new text" --text "<old_text>" --clear`. Old text cleared, new text appears.
result: pass

### 6. iOS real device shows clear error message
expected: Run any command (e.g. `mbridge app list <ios_real_device_id>`) against an iOS real device. Returns error explaining iOS real devices are not supported, mentioning idb limitation, and suggesting simulator.
result: pass

### 7. iOS real device appears in device list
expected: With an iOS real device connected, `mbridge device list --platform ios` shows the real device with type "device". Discovery works even though automation doesn't.
result: pass

### 8. verify text works on Android (OCR)
expected: Run `mbridge verify text <device> "<visible_text>"` on Android. Returns `{"found": true, "text": "..."}`. Also test with nonexistent text — returns `{"found": false, ...}` with `ocr_text` field showing what was recognized.
result: pass

### 9. Integration tests pass on iOS simulator
expected: Run `MBRIDGE_TEST_DEVICE=<sim_id> MBRIDGE_TEST_BUNDLE=<bundle> uv run pytest tests/ -v` in tools/mbridge. All 24 tests pass.
result: pass

### 10. Integration tests pass on Android emulator
expected: Run `MBRIDGE_TEST_DEVICE=<emu_id> MBRIDGE_TEST_BUNDLE=<bundle> uv run pytest tests/ -v` in tools/mbridge. All 24 tests pass.
result: pass

### 11. SKILL.md documents ui wait-for
expected: `skills/mbridge/SKILL.md` contains ui wait-for command reference with --text, --id, --type, --exact, --timeout, --interval flags documented. Appears in Quick Start, Navigation Strategy, and Command Reference sections.
result: pass

### 12. SKILL.md documents action swipe-to
expected: `skills/mbridge/SKILL.md` contains action swipe-to command reference with --text, --direction, --distance, --max-swipes, --pause flags. "Scroll to find an element" workflow uses swipe-to instead of manual loop.
result: pass

## Summary

total: 12
passed: 11
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "swipe-to scrolls element fully into view"
  status: failed
  reason: "User reported: swipe-to finds element but stops when it's barely visible — just a thin line at screen edge, not usable"
  severity: minor
  test: 3
  root_cause: "swipe-to stops as soon as element center is within screen bounds, but element may only be partially visible at edge"
  artifacts:
    - path: "tools/mbridge/src/mbridge/action.py"
      issue: "_find_visible checks center is on screen but doesn't verify element is fully visible"
  missing:
    - "After finding element, check if bounds are fully within screen. If partially visible, do one more swipe to center it."
  debug_session: ""
