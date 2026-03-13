---
phase: 07-mbridge-cli-foundation
verified: 2026-03-12T22:50:00Z
status: gaps_found
score: 9/12 must-haves verified
gaps:
  - truth: "Coordinate conversion module converts between logical points and physical pixels"
    status: partial
    reason: "coords.py exists with correct functions but is orphaned — nothing imports it. The plan key link (ios.py -> coords.py via 'from mbridge.coords') is not wired."
    artifacts:
      - path: "tools/mbridge/src/mbridge/coords.py"
        issue: "6 lines (plan min_lines: 15) and completely unimported by any other module"
    missing:
      - "Import and use coords in ios.py (e.g., logical_to_physical called from get_device_info or documented in module as the conversion context for screen info)"
      - "Alternatively: explicit note in PLAN/SUMMARY that coords is intentionally a standalone utility for Phase 8+ — but if so, the key_link in 07-02-PLAN.md is incorrect and should be removed or deferred"
  - truth: "Device info includes screen width, height, and scale/density"
    status: partial
    reason: "iOS device info returns screen.scale only when device is booted (getenv path). When device is shutdown and fallback 'xcrun simctl io enumerate' is used, scale is never populated — it stays null. Android device info returns 'density' not 'scale' (different key name, correctly documented per platform)."
    artifacts:
      - path: "tools/mbridge/src/mbridge/platforms/ios.py"
        issue: "_get_screen_info: enumerate fallback path never populates screen['scale'], returns None on shutdown simulators"
    missing:
      - "Either: accept scale=null as valid for shutdown simulators (document as expected behavior), OR attempt to derive scale from deviceTypeIdentifier in the fallback path"
      - "This gap is minor/acceptable if null scale for shutdown devices is intentional — requires human judgment"
---

# Phase 7: mbridge CLI Foundation Verification Report

**Phase Goal:** mbridge is an installable Python CLI that can discover connected iOS simulators and Android emulators
**Verified:** 2026-03-12T22:50:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running `uv tool install` from tools/mbridge/ installs mbridge CLI globally | VERIFIED | pyproject.toml has valid entrypoint `mbridge = "mbridge.cli:cli"`, hatchling build backend, setup.js wired correctly |
| 2 | `mbridge --help` shows root group with device, app, action, verify, ui subgroups | VERIFIED | cli.py registers all 5 via add_command(), all have docstrings |
| 3 | `mbridge device --help` shows list, boot, info subcommands | VERIFIED | device.py has all three commands with arguments and options |
| 4 | `mbridge app --help` shows list, foreground, launch, open-url subcommands | VERIFIED | app.py has all four commands |
| 5 | Click command structure uses nested groups with help text for all commands | VERIFIED | All groups have docstrings; all commands have help text |
| 6 | `mbridge device list` returns JSON array of connected iOS simulators and Android devices | VERIFIED | device.py list_devices calls both platform modules, outputs result via output() |
| 7 | `mbridge device list --platform ios/android` filters correctly | VERIFIED | --platform Choice option wired, each branch calls correct platform module |
| 8 | `mbridge device info <id>` returns extended device info including screen dimensions | PARTIAL | Works for booted simulators; screen.scale returns null for shutdown simulators (enumerate fallback has no scale source) |
| 9 | `mbridge device boot <id>` boots an iOS simulator | VERIFIED | boot_device() calls xcrun simctl boot, handles already-booted case |
| 10 | `mbridge app list/launch/open-url` work on discovered devices | VERIFIED | All four app commands delegate to _call_platform() which detects iOS/Android and calls correct platform function |
| 11 | Device list entries have fields: id, name, platform, type, state, os_version | VERIFIED | Both ios.list_devices() and android.list_devices() return all six required fields |
| 12 | Coordinate conversion module converts between logical points and physical pixels | FAILED | coords.py exists with correct functions (logical_to_physical, physical_to_logical) but is completely orphaned — no module imports it. Plan key link (ios.py -> coords.py via 'from mbridge.coords') is not wired. |

**Score:** 9/12 truths verified (10/12 if null-scale-on-shutdown is accepted as intentional)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tools/mbridge/pyproject.toml` | Package config with Click dep and mbridge entrypoint | VERIFIED | Contains `mbridge = "mbridge.cli:cli"`, click>=8.0, requires-python>=3.12 |
| `tools/mbridge/src/mbridge/cli.py` | Root Click group registering all subgroups | VERIFIED | 24 lines, imports all 5 subgroups, registers via add_command() |
| `tools/mbridge/src/mbridge/device.py` | Device commands with real platform logic | VERIFIED | 94 lines, real xcrun/adb calls via platform modules, platform detection implemented |
| `tools/mbridge/src/mbridge/app.py` | App commands with real platform logic | VERIFIED | 76 lines, all 4 commands wired to _call_platform() helper |
| `tools/mbridge/setup.js` | uv auto-install script following existing setup.js patterns | VERIFIED | Checks existing install, checks uv, runs uv tool install, prints status messages |
| `tools/mbridge/src/mbridge/platforms/ios.py` | xcrun simctl wrapper for iOS simulator discovery and interaction | VERIFIED | 173 lines (>80 min), all required functions present and substantive |
| `tools/mbridge/src/mbridge/platforms/android.py` | adb wrapper for Android device discovery and interaction | VERIFIED | 179 lines (>80 min), all required functions present and substantive |
| `tools/mbridge/src/mbridge/coords.py` | Coordinate conversion between logical points and physical pixels | ORPHANED | 6 lines (plan min_lines: 15), correct functions exist but no module imports or uses them |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cli.py` | `device.py` | `cli.add_command(device)` | WIRED | cli.py line 19: `cli.add_command(device)` |
| `cli.py` | `app.py` | `cli.add_command(app)` | WIRED | cli.py line 20: `cli.add_command(app)` |
| `pyproject.toml` | `cli.py` | `[project.scripts]` entrypoint | WIRED | `mbridge = "mbridge.cli:cli"` at line 11 |
| `device.py` | `platforms/ios.py` | `from mbridge.platforms import ... ios` | WIRED | device.py line 4: `from mbridge.platforms import android, ios` |
| `device.py` | `platforms/android.py` | `from mbridge.platforms import ... android` | WIRED | device.py line 4: `from mbridge.platforms import android, ios` |
| `app.py` | `platforms/ios.py` | `from mbridge.platforms import ... ios` | WIRED | app.py line 4: `from mbridge.platforms import android, ios` |
| `platforms/ios.py` | `coords.py` | `from mbridge.coords` | NOT WIRED | No import of coords anywhere in ios.py — coords module is completely orphaned |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| MBRD-01 | 07-01-PLAN.md | Python CLI with uv + Click, installable via `uv tool install` | SATISFIED | pyproject.toml with hatchling + Click entrypoint exists; setup.js automates install; CLI responds to --help on all groups |
| MBRD-02 | 07-02-PLAN.md | Device discovery for iOS simulators and Android emulators | SATISFIED | ios.list_devices() via xcrun simctl JSON, android.list_devices() via adb devices -l; both return required field schema; `mbridge device list` wires to both |

Both MBRD-01 and MBRD-02 are the only requirements mapped to Phase 7 in REQUIREMENTS.md (lines 99-100). No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No TODO/FIXME/placeholder/stub anti-patterns found in any mbridge source file |

### Human Verification Required

#### 1. iOS Device List on Live Machine

**Test:** Run `mbridge device list --platform ios` on a macOS machine with Xcode Command Line Tools installed.
**Expected:** JSON array of available simulators with id, name, platform="ios", type="simulator", state, os_version fields. os_version should look like "iOS 17.2" not a raw runtime key.
**Why human:** Requires xcrun simctl to be available; simulator availability varies per machine.

#### 2. Screen Info for Shutdown Simulator

**Test:** Run `mbridge device info <udid>` where the simulator is in "Shutdown" state.
**Expected:** Screen width and height populated from `xcrun simctl io enumerate` fallback; scale may be null.
**Why human:** Requires a shutdown simulator; need to confirm whether null scale is acceptable output or should be treated as a bug.

#### 3. setup.js Fresh Install Path

**Test:** Run `node tools/mbridge/setup.js` on a machine where mbridge is NOT already installed.
**Expected:** Runs uv tool install, prints "mbridge installed successfully."
**Why human:** The "already installed" branch is verifiable programmatically but the fresh install path requires a clean environment.

### Gaps Summary

Two gaps identified:

**Gap 1 — coords.py is orphaned (blocker for truth #12).**
The `coords.py` module exists at 6 lines with correct functions (`logical_to_physical`, `physical_to_logical`), but no other module imports it. The plan explicitly defined a key link from `ios.py` → `coords.py` via `from mbridge.coords`. This link was not implemented. The PLAN frontmatter also specifies `min_lines: 15` for this artifact; at 6 lines it fails the substantive check. The module is ready for Phase 8+ but the plan required it to be wired from ios.py as "screen info includes coord conversion context."

**Gap 2 — screen.scale is null for shutdown simulators (minor/partial, truth #8).**
When an iOS simulator is in Shutdown state, `getenv SIMULATOR_MAINSCREEN_SCALE` fails and the fallback `xcrun simctl io enumerate` does not emit a scale value. The `screen["scale"]` field returns `null` in this case. Whether this is acceptable behavior is a judgment call — the plan says "Scale may not be available from enumerate — omit if not parseable" which suggests the implementation matches intent. This may require human confirmation rather than code change.

---

_Verified: 2026-03-12T22:50:00Z_
_Verifier: Claude (gsd-verifier)_
