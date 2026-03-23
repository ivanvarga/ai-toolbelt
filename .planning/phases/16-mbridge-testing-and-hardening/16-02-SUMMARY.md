---
phase: 16-mbridge-testing-and-hardening
plan: 02
subsystem: testing
tags: [mbridge, ios, real-device, limitation, simulator]

requires:
  - phase: 16-01
    provides: integration test infrastructure and wait-for command
provides:
  - iOS simulator fully tested (24/24 integration tests pass)
  - iOS real device limitation documented and guarded at code level
  - Clear error messaging when real device commands are attempted

one_liner: "iOS simulator passes all tests; real device blocked by idb ecosystem gap — added guards and documentation"

key-files:
  modified:
    - tools/mbridge/src/mbridge/platforms/ios.py
    - skills/mbridge/SKILL.md

deviations:
  - type: scope_reduction
    description: "iOS real device testing dropped — idb-companion (last updated Aug 2022, v1.1.8) is incompatible with iOS 17+. No maintained open-source tool provides iOS real device UI automation. This affects all tools in the ecosystem (mobilecli, rn-debugger MCP). Added _require_simulator guards to all iOS functions except device list/info, with clear error message explaining the limitation."
    impact: "Real device must_haves not met. Simulator must_haves fully satisfied."
---

## What was done

### iOS Simulator Testing (Tasks 1-2): COMPLETE
- All 24 integration tests pass on iOS simulator
- Bugs found during simulator testing were fixed in prior commits (16-01, 16-02 fix commits)
- Manual verification of all command groups confirmed working

### iOS Real Device Testing (Tasks 3-4): BLOCKED → DOCUMENTED
- Investigated real device connectivity — device discovered via `idb list-targets`
- WDA (WebDriverAgent) installed and running on device (PID confirmed via `xcrun devicectl`)
- `idb ui describe-all` fails with "FBAccessibilityCommands protocol" error
- Root cause: idb-companion v1.1.8 (Aug 2022) incompatible with iOS 17+ CoreDevice framework
- Researched alternatives: mobilecli (same idb limitation), rn-debugger MCP (same), Appium (heavyweight)
- No viable open-source alternative exists for iOS real device UI automation

### Limitation Propagation
- Added `_is_real_device()` and `_require_simulator()` guards to ios.py
- All iOS functions except `list_devices()` and `get_device_info()` now raise clear error on real device
- Error message explains the ecosystem limitation and suggests simulator
- Updated SKILL.md: description, overview, device selection tradeoffs, and Known Limitations section
- Real devices still appear in `device list` for discovery purposes

## Self-Check: PARTIAL

- [x] Every mbridge command runs successfully on iOS simulator
- [ ] Every mbridge command runs successfully on iOS real device — BLOCKED (ecosystem limitation)
- [x] All bugs found during iOS testing are fixed
- [x] Integration tests pass on iOS simulator
- [ ] Integration tests pass on iOS real device — BLOCKED
- [x] Clear error messaging for unsupported real device operations
