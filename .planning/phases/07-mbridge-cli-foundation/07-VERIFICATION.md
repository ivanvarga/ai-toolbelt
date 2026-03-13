---
phase: 07-mbridge-cli-foundation
verified: 2026-03-13T10:45:00Z
status: passed
score: 12/12 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/12
  gaps_closed:
    - "Coordinate conversion module converts between logical points and physical pixels"
    - "coords.py is imported and used by ios.py for coordinate conversion context in device info"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run `mbridge device list --platform ios` on a macOS machine with Xcode installed"
    expected: "JSON array with id, name, platform=ios, type=simulator, state, os_version fields"
    why_human: "Requires xcrun simctl available; simulator availability varies per machine"
  - test: "Run `mbridge device info <udid>` for a booted simulator"
    expected: "Screen dict includes logical_width and logical_height in addition to physical width/height/scale"
    why_human: "Requires a live booted simulator; verifies the new logical dimension enrichment end-to-end"
  - test: "Run `mbridge device info <udid>` for a shutdown simulator"
    expected: "Screen dict has width/height from enumerate fallback, no logical_width/logical_height keys (scale is null)"
    why_human: "Requires a shutdown simulator; confirms graceful None-safe handling of screen_logical_size"
  - test: "Run `node tools/mbridge/setup.js` on a clean machine"
    expected: "Installs mbridge via uv tool install, prints success message"
    why_human: "Fresh install path requires a clean environment without mbridge already present"
---

# Phase 7: mbridge CLI Foundation Verification Report

**Phase Goal:** mbridge is an installable Python CLI that can discover connected iOS simulators and Android emulators
**Verified:** 2026-03-13T10:45:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 07-03, commit cec5bc4)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running `uv tool install` from tools/mbridge/ installs mbridge CLI globally | VERIFIED | pyproject.toml has valid entrypoint `mbridge = "mbridge.cli:cli"`, hatchling build backend, setup.js wired |
| 2 | `mbridge --help` shows root group with device, app, action, verify, ui subgroups | VERIFIED | cli.py registers all 5 via add_command(), all have docstrings |
| 3 | `mbridge device --help` shows list, boot, info subcommands | VERIFIED | device.py has all three commands with arguments and options |
| 4 | `mbridge app --help` shows list, foreground, launch, open-url subcommands | VERIFIED | app.py has all four commands |
| 5 | Click command structure uses nested groups with help text for all commands | VERIFIED | All groups have docstrings; all commands have help text |
| 6 | `mbridge device list` returns JSON array of connected iOS simulators and Android devices | VERIFIED | device.py list_devices calls both platform modules, outputs via output() |
| 7 | `mbridge device list --platform ios/android` filters correctly | VERIFIED | --platform Choice option wired, each branch calls correct platform module |
| 8 | `mbridge device info <id>` returns extended device info including screen dimensions | VERIFIED | Screen dict includes width, height, scale; logical_width/logical_height added when scale is available; None-safe for shutdown simulators |
| 9 | `mbridge device boot <id>` boots an iOS simulator | VERIFIED | boot_device() calls xcrun simctl boot, handles already-booted case |
| 10 | `mbridge app list/launch/open-url` work on discovered devices | VERIFIED | All four app commands delegate to _call_platform() which detects iOS/Android |
| 11 | Device list entries have fields: id, name, platform, type, state, os_version | VERIFIED | Both ios.list_devices() and android.list_devices() return all six required fields |
| 12 | Coordinate conversion module converts between logical points and physical pixels | VERIFIED | coords.py is 41 lines with module docstring, function docstrings, and screen_logical_size helper; ios.py imports and uses screen_logical_size at line 7 and line 64 |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tools/mbridge/pyproject.toml` | Package config with Click dep and mbridge entrypoint | VERIFIED | Contains `mbridge = "mbridge.cli:cli"`, click>=8.0, requires-python>=3.12 |
| `tools/mbridge/src/mbridge/cli.py` | Root Click group registering all subgroups | VERIFIED | 24 lines, imports all 5 subgroups, registers via add_command() |
| `tools/mbridge/src/mbridge/device.py` | Device commands with real platform logic | VERIFIED | 94 lines, real xcrun/adb calls via platform modules |
| `tools/mbridge/src/mbridge/app.py` | App commands with real platform logic | VERIFIED | 76 lines, all 4 commands wired to _call_platform() helper |
| `tools/mbridge/setup.js` | uv auto-install script following existing setup.js patterns | VERIFIED | Checks existing install, checks uv, runs uv tool install |
| `tools/mbridge/src/mbridge/platforms/ios.py` | xcrun simctl wrapper for iOS simulator discovery and interaction | VERIFIED | 178 lines, all required functions present; imports screen_logical_size from coords |
| `tools/mbridge/src/mbridge/platforms/android.py` | adb wrapper for Android device discovery and interaction | VERIFIED | 179 lines, all required functions present and substantive |
| `tools/mbridge/src/mbridge/coords.py` | Coordinate conversion between logical points and physical pixels | VERIFIED | 41 lines (plan min_lines: 15 — passed); module docstring, per-function docstrings, screen_logical_size helper; imported by ios.py |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cli.py` | `device.py` | `cli.add_command(device)` | WIRED | cli.py line 19 |
| `cli.py` | `app.py` | `cli.add_command(app)` | WIRED | cli.py line 20 |
| `pyproject.toml` | `cli.py` | `[project.scripts]` entrypoint | WIRED | `mbridge = "mbridge.cli:cli"` at line 11 |
| `device.py` | `platforms/ios.py` | `from mbridge.platforms import ... ios` | WIRED | device.py line 4 |
| `device.py` | `platforms/android.py` | `from mbridge.platforms import ... android` | WIRED | device.py line 4 |
| `app.py` | `platforms/ios.py` | `from mbridge.platforms import ... ios` | WIRED | app.py line 4 |
| `platforms/ios.py` | `coords.py` | `from mbridge.coords import screen_logical_size` | WIRED | ios.py line 7; used at line 64 inside get_device_info |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| MBRD-01 | 07-01-PLAN.md | Python CLI with uv + Click, installable via `uv tool install` | SATISFIED | pyproject.toml with hatchling + Click entrypoint; setup.js automates install; CLI groups respond to --help |
| MBRD-02 | 07-02-PLAN.md | Device discovery for iOS simulators and Android emulators | SATISFIED | ios.list_devices() via xcrun simctl JSON, android.list_devices() via adb devices -l; both return required field schema; `mbridge device list` wires to both |

No orphaned requirements. MBRD-01 and MBRD-02 are the only IDs mapped to Phase 7 in REQUIREMENTS.md. Both satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No TODO/FIXME/placeholder/stub anti-patterns in any mbridge source file |

### Human Verification Required

#### 1. iOS Device List on Live Machine

**Test:** Run `mbridge device list --platform ios` on a macOS machine with Xcode Command Line Tools installed.
**Expected:** JSON array of available simulators with id, name, platform="ios", type="simulator", state, os_version fields. os_version should look like "iOS 17.2" not a raw runtime key.
**Why human:** Requires xcrun simctl to be available; simulator availability varies per machine.

#### 2. Logical Screen Dimensions — Booted Simulator

**Test:** Run `mbridge device info <udid>` where the simulator is in "Booted" state.
**Expected:** Screen dict contains width, height, scale, logical_width, and logical_height. logical_width = round(width / scale).
**Why human:** Requires a live booted simulator; verifies the new logical dimension enrichment from the gap closure.

#### 3. Logical Screen Dimensions — Shutdown Simulator

**Test:** Run `mbridge device info <udid>` where the simulator is in "Shutdown" state.
**Expected:** Screen dict contains width/height from enumerate fallback; no logical_width/logical_height keys (scale is null, screen_logical_size returns None).
**Why human:** Requires a shutdown simulator; confirms graceful None-safe behavior.

#### 4. setup.js Fresh Install Path

**Test:** Run `node tools/mbridge/setup.js` on a machine where mbridge is NOT already installed.
**Expected:** Runs uv tool install, prints "mbridge installed successfully."
**Why human:** The "already installed" branch is verifiable programmatically but the fresh install path requires a clean environment.

### Gap Closure Summary

**Gap 1 — coords.py orphaned (closed).**
coords.py was at 6 lines with no importers. Plan 07-03 expanded it to 41 lines with a module docstring explaining iOS point-space vs Android pixel-space philosophy, function docstrings for both conversion functions, and a new `screen_logical_size` helper with None-safe handling. ios.py now imports `screen_logical_size` at line 7 and calls it in `get_device_info` at line 64, adding `logical_width` and `logical_height` to the screen dict when scale is available. Commit cec5bc4 confirms this change.

**Gap 2 — screen.scale null for shutdown simulators (resolved as intended behavior).**
As documented in 07-03-PLAN.md key decisions: `screen_logical_size` returns None when scale is None or 0. The `get_device_info` function only adds logical dimensions when `screen_logical_size` returns a non-None value. Null scale on shutdown simulators is now explicitly handled and documented — no logical dimension keys are emitted, avoiding null clutter in the output. This is correct behavior per the plan.

---

_Verified: 2026-03-13T10:45:00Z_
_Verifier: Claude (gsd-verifier)_
