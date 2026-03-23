---
phase: 16-mbridge-testing-and-hardening
plan: 03
subsystem: testing
tags: [mbridge, android, emulator, real-device, ocr, keyboard, skill-md]

requires:
  - phase: 16-02
    provides: iOS testing complete, real device limitation documented
provides:
  - Android emulator fully tested (24/24 integration tests pass)
  - Android real device manually tested (all commands verified)
  - OCR numpy array fix for Android screenshots
  - Auto-dismiss keyboard after type command on Android
  - SKILL.md updated with wait-for, swipe-to, testing discoveries

one_liner: "Android emulator + real device pass all tests; OCR and keyboard fixes; SKILL.md updated with wait-for, swipe-to, and all discoveries"

key-files:
  modified:
    - tools/mbridge/src/mbridge/ocr.py
    - tools/mbridge/src/mbridge/action.py
    - skills/mbridge/SKILL.md

deviations:
  - type: scope_addition
    description: "Added auto-dismiss keyboard after Android type command. Detects keyboard visibility via dumpsys input_method and only sends BACK if keyboard is shown, avoiding app exit at navigation root."
    impact: "Prevents keyboard covering bottom tabs after typing — was blocking subsequent navigation."
  - type: discovery
    description: "Android emulator 36.x cannot boot from CLI on macOS Tahoe — GPU detection reports UNKNOWN, falls back to SwANGLE headless, never connects to adb. Must launch from Android Studio Device Manager. Added Phase 17 to backlog for device boot command."
    impact: "Phase 17 added to roadmap for Android emulator boot support."
  - type: discovery
    description: "UIAutomator idle state issue affects React Native apps with app-level animations (Lottie, RN Animated) even with system animations disabled. Disabling developer animation scales does NOT help."
    impact: "Documented in SKILL.md Known Limitations with clearer guidance."
  - type: discovery
    description: "Android offscreen elements (below fold in ScrollView/FlatList) are completely absent from UIAutomator dump — not marked invisible, just missing. swipe-to command is the correct workaround."
    impact: "Documented in SKILL.md Known Limitations."
---

## What was done

### Android Emulator Testing (Tasks 1-2): COMPLETE
- 24/24 integration tests pass on emulator-5554 (Android 16, arm64)
- Manual verification of all commands: device, app, ui, action, verify
- OCR bug fixed: easyocr.readtext() requires numpy array, not PIL Image
- Keyboard dismiss bug fixed: auto-dismiss via dumpsys input_method detection

### Android Real Device Testing (Tasks 3-4): COMPLETE
- All commands manually verified on OnePlus CPH2581 (b057f32f, Android 16)
- device list/info, app launch/foreground/list, ui find, action tap/swipe/type/swipe-to, verify text
- Keyboard auto-dismiss confirmed working on real device
- swipe-to found "Upper/Lower 4-Day" after 6 swipes on real device

### SKILL.md Update (Task 5): COMPLETE
- Added ui wait-for command reference (11 occurrences)
- Added action swipe-to command reference (10 occurrences)
- Corrected OCR engine name: pytesseract → easyocr
- Added keyboard auto-dismiss note to type command
- Updated Navigation Strategy from 4 to 5 tiers (added wait-for and scroll-to)
- Updated all workflow examples to use wait-for and swipe-to
- Added Known Limitations: offscreen elements, RN animation clarification
- Added Common Mistakes: sleep → wait-for, manual scroll → swipe-to, substring text gotcha
- Added Red Flags: sleep, manual scroll loop, missing --exact

## Bugs Fixed
1. **OCR numpy array** (ocr.py): easyocr.readtext() doesn't accept PIL Image, needs np.array()
2. **Keyboard dismiss** (action.py): Android keyboard left open after type command, blocking tab bar taps. Now auto-dismissed via dumpsys input_method mInputShown check.

## Self-Check: PASSED

- [x] Every mbridge command runs successfully on Android emulator
- [x] Every mbridge command runs successfully on Android real device
- [x] All bugs found during Android testing are fixed with root-cause investigation
- [x] Integration tests pass on Android emulator (24/24)
- [x] SKILL.md documents ui wait-for command with flags and examples
- [x] SKILL.md reflects workflow changes and new gotchas discovered during testing
