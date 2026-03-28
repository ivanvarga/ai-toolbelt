---
phase: 17-android-emulator-boot-command
verified: 2026-03-28T12:10:00Z
status: passed
score: 7/7 must-haves verified
gaps: []
human_verification:
  - test: "Android emulator boot end-to-end"
    expected: "mbridge device boot <avd-name> returns {\"status\": \"booted\", \"gpu_mode\": \"host\" or \"software\"}"
    why_human: "Requires actual Android emulator installed and running; can't execute emulator binary in CI"
  - test: "iOS Simulator.app opens on boot"
    expected: "After mbridge device boot <uuid>, Simulator.app GUI window appears on screen"
    why_human: "Requires macOS GUI and Xcode simulator; can't verify window appearance programmatically"
  - test: "GPU fallback activates when host mode crashes"
    expected: "If emulator crashes within 5s on host GPU, result shows gpu_mode: software"
    why_human: "Requires emulator environment where host GPU fails; cannot simulate crash in unit tests"
---

# Phase 17: Android Emulator Boot Command Verification Report

**Phase Goal:** Add Android emulator boot command to mbridge with GPU fallback, version gating, AVD discovery, iOS Simulator.app opening, error propagation, and swipe-to usable zone fix.
**Verified:** 2026-03-28T12:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `mbridge device boot <avd-name>` launches Android emulator and waits for boot | ✓ VERIFIED | `boot_emulator()` in android.py:110 — full launch, serial detection, `_wait_for_boot` polling loop |
| 2   | GPU mode falls back from host to software if emulator crashes within 5s | ✓ VERIFIED | android.py:123-131 — `_wait_for_process_stable(proc, 5)` returns False triggers software relaunch |
| 3   | Emulator version gate with upgrade error for old versions | ✓ VERIFIED | android.py:113 gates at `(36, 0, 0)` — research 36.4.9 was overly conservative; tested working on 36.3.10 |
| 4   | iOS boot opens Simulator.app GUI window after simctl boot | ✓ VERIFIED | ios.py:174 — `subprocess.run(["open", "-a", "Simulator"])` inside try/except after simctl boot |
| 5   | device boot propagates RuntimeError instead of silently swallowing | ✓ VERIFIED | device.py:70-96 — errors captured per-platform and propagated via `error()` calls; no bare `except: pass` |
| 6   | device list --available shows unbooted AVDs alongside running devices | ✓ VERIFIED | device.py:52-62 — `--available` flag calls `android.list_avds()`, deduplicates against running device IDs |
| 7   | Boot result JSON includes gpu_mode field for Android | ✓ VERIFIED | android.py:147-153 — result dict always includes `"gpu_mode": gpu_mode` |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `tools/mbridge/src/mbridge/platforms/android.py` | 9 emulator lifecycle functions | ✓ VERIFIED | All 9 present: `_find_emulator`, `require_emulator`, `_parse_emulator_version`, `list_avds`, `_launch_emulator`, `_wait_for_process_stable`, `_get_emulator_serials`, `_wait_for_boot`, `boot_emulator` |
| `tools/mbridge/src/mbridge/platforms/ios.py` | `boot_device` opens Simulator.app | ✓ VERIFIED | Lines 173-176 add `subprocess.run(["open", "-a", "Simulator"])` wrapped in try/except |
| `tools/mbridge/src/mbridge/device.py` | boot + list with Android support | ✓ VERIFIED | `--timeout` on boot, Android path via `android.list_avds()` + `android.boot_emulator()`, `--available` on list |
| `tools/mbridge/src/mbridge/action.py` | swipe-to with `_is_in_usable_zone` | ✓ VERIFIED | Lines 199-206 implement `_is_in_usable_zone` with 10% padding; swipe_to applies it in two code paths |
| `skills/mbridge/SKILL.md` | Android emulator boot documentation | ✓ VERIFIED | "Booting Devices" section at line 50, `device boot` command reference, GPU fallback docs, `--available` flag documented |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `device.py` | `android.py` | `android.boot_emulator()` in boot command | ✓ WIRED | device.py:83 — `result = android.boot_emulator(device_id, timeout=timeout)` |
| `device.py` | `android.py` | `android.list_avds()` in list command | ✓ WIRED | device.py:56 and device.py:80 — called in both `list_devices` and `boot` commands |
| `device.py` | `ios.py` | `ios.boot_device()` in boot command | ✓ WIRED | device.py:72 — `result = ios.boot_device(device_id)` |
| `action.py` | `action.py` | `_is_in_usable_zone` inside `swipe_to` | ✓ WIRED | action.py:307 (pre-loop) and action.py:326 (in-loop) — both call `_is_in_usable_zone` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| BOOT-01 | 17-01 | Android AVD discovery via `emulator -list-avds` with `--available` flag | ✓ SATISFIED | `list_avds()` in android.py; `--available` flag in device.py `list_devices` |
| BOOT-02 | 17-01 | Android emulator boot with GPU host-to-software fallback | ✓ SATISFIED | GPU fallback implemented; version gate 36.0.0 (lowered from 36.4.9 after real-world testing on 36.3.10) |
| BOOT-03 | 17-01 | Boot-wait polling via `adb shell getprop sys.boot_completed` with configurable timeout | ✓ SATISFIED | `_wait_for_boot()` at android.py:94 uses `sys.boot_completed` with `.strip()` and deadline loop |
| BOOT-04 | 17-01 | iOS simulator boot opens Simulator.app GUI window | ✓ SATISFIED | ios.py:173-176 adds `open -a Simulator` after simctl boot |
| BOOT-05 | 17-01 | `device boot` propagates RuntimeError instead of silently swallowing | ✓ SATISFIED | device.py boot command captures and re-propagates errors from both platforms |
| BOOT-06 | 17-02 | `swipe-to` extra swipe when element center is outside usable zone (middle 80%) | ✓ SATISFIED | `_is_in_usable_zone` with 10% padding applied in both pre-loop and loop paths in `swipe_to` |
| BOOT-07 | 17-02 | SKILL.md updated with Android emulator boot documentation | ✓ SATISFIED | "Booting Devices" section, device command reference, GPU fallback, `--available` flag, common mistakes row |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No anti-patterns found | — | — |

No `swiftshader_indirect` found anywhere in the codebase.
No TODO/FIXME/placeholder comments found in modified files.
No empty implementations (return null / return {}) found.
All three commits confirmed present: `89fe021`, `c1f7c7b`, `3512698`.
All existing integration tests pass: `3 passed, 1 skipped`.

### Human Verification Required

#### 1. Android Emulator Boot End-to-End

**Test:** `mbridge device list --available` then `mbridge device boot <avd-name> --timeout 180`
**Expected:** Emulator window opens; result JSON contains `"status": "booted"` and `"gpu_mode"` field
**Why human:** Requires emulator 36.4.9+ installed and Android Studio SDK configured

#### 2. iOS Simulator.app Opens on Boot

**Test:** `mbridge device list --platform ios`, pick a shutdown UUID, run `mbridge device boot <uuid>`
**Expected:** Simulator.app GUI window appears on screen (not just background boot)
**Why human:** Requires macOS GUI environment; cannot verify window appearance via code

#### 3. GPU Fallback Under Crash Conditions

**Test:** If host GPU mode crashes on the test machine, verify `gpu_mode: software` in result
**Expected:** Result JSON shows `"gpu_mode": "software"` and includes the note about slower rendering
**Why human:** Cannot simulate GPU crash in unit tests

### Gaps Summary

No gaps. All 7 must-haves verified. Version gate was lowered from 36.4.9 to 36.0.0 after real-world testing confirmed `-gpu software` works on emulator 36.3.10 (the research claim about 36.4.9 being the introduction point was incorrect).

---

_Verified: 2026-03-28T12:10:00Z_
_Verifier: Claude (gsd-verifier)_
