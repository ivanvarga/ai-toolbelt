# Phase 17: Android Emulator Boot Command - Research

**Researched:** 2026-03-28
**Domain:** Android emulator lifecycle management, iOS simulator improvements, subprocess management
**Confidence:** HIGH

## Summary

This phase extends `mbridge device boot` with Android emulator support, improves iOS simulator boot UX, hardens error handling, and fixes swipe-to edge visibility. The technical domain is well-understood: `emulator -list-avds` for AVD discovery, `emulator -avd <name> -gpu <mode>` for launch, `adb shell getprop sys.boot_completed` for boot detection, and `subprocess.Popen` for background process management with crash detection.

The GPU fallback strategy (D-08/D-09) is the most complex piece. The user's local emulator is version 36.3.10 (Dec 2025), which does NOT have `-gpu software`. That flag was introduced in 36.4.9 (Feb 10, 2026). Decision D-12 says to require 36.4.9+ and error with an upgrade message on older versions. For 36.4.9+, the fallback path is: try `-gpu host` first, detect early crash within ~5s via `Popen.poll()`, then relaunch with `-gpu software`.

**Primary recommendation:** Use `subprocess.Popen` for emulator launch (long-running background process), `time.monotonic()` deadline loop for boot-wait polling (matching existing `wait-for` pattern), and `Popen.poll()` for crash detection. All new functions go in `android.py`; dispatch logic stays in `device.py`.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `--available` flag to `device list` that includes unbooted AVDs from `emulator -list-avds`
- **D-02:** `device boot` takes AVD name as argument (same pattern as iOS simulator ID)
- **D-03:** Available-but-not-running AVDs distinguished from running emulators in list output
- **D-04:** 120s default timeout with `--timeout` flag override
- **D-05:** Poll adb continuously for connection -- no emulator restart on intermittent failures
- **D-06:** Silent during boot -- return result JSON on success, error on failure
- **D-07:** On timeout, leave emulator process running (may be almost ready)
- **D-08:** Try `-gpu host` first (hardware acceleration via MoltenVK)
- **D-09:** If host fails (process exits within ~5s), relaunch with `-gpu software` (Lavapipe)
- **D-10:** No `--gpu` flag exposed -- fallback is fully internal
- **D-11:** No persistent memory of what worked -- stateless fallback each time
- **D-12:** Require emulator 36.4.9+ for `-gpu software` flag. Error with upgrade message on older versions
- **D-13:** Include `gpu_mode` in result JSON: `"host"` or `"software"`. When falling back to software, include `"note": "Hardware GPU unavailable, using software rendering (slower)"`
- **D-14:** `swiftshader_indirect` is deprecated (36.4.9) -- do not use anywhere
- **D-15:** Run `open -a Simulator` after `xcrun simctl boot` to open GUI window
- **D-16:** Propagate RuntimeError from iOS boot instead of silently swallowing
- **D-17:** `device boot` in device.py: stop swallowing RuntimeError with bare `except RuntimeError: pass`
- **D-18:** Try iOS first, then Android -- propagate actual errors from both platforms
- **D-19:** After finding element, check if its center is within a "usable zone" (middle 80% of screen, symmetric 10% padding each side)
- **D-20:** If element center is outside usable zone, do one more swipe to bring it further into view
- **D-21:** This is default behavior, no opt-in flag
- **D-22:** Extra swipe counted in swipe count, no separate field in result

### Claude's Discretion
- Exact adb polling interval during boot-wait
- How to detect emulator process crash (exit code, process alive check)
- Implementation of usable zone calculation
- AVD metadata to include in `device list --available` output
- Boot-wait stages (adb wait-for-device vs sys.boot_completed polling)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| subprocess (stdlib) | Python 3.12+ | Launch emulator process, run adb commands | Already used throughout mbridge via `run_cmd()` |
| subprocess.Popen | Python 3.12+ | Background emulator process with crash detection | Needed for long-running emulator process (not run-and-wait like `run_cmd`) |
| time.monotonic | Python 3.12+ | Deadline-based polling loop | Already used in `wait-for` command; immune to clock changes |
| shutil.which | Python 3.12+ | Find `emulator` binary on PATH | Already used for `require_adb()` pattern |
| os.environ | Python 3.12+ | Read ANDROID_HOME for emulator binary fallback | Standard for Android SDK discovery |
| re | Python 3.12+ | Parse emulator version string | Already imported in android.py |
| click | >=8.0 | CLI command/option definitions | Already used throughout mbridge |

### Supporting
No additional external dependencies needed. Everything uses stdlib + existing click dependency.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Popen for emulator launch | run_cmd (existing) | run_cmd blocks until process exits -- emulator runs indefinitely, so Popen is required |
| time.monotonic deadline | threading.Timer | Adds unnecessary complexity; monotonic loop is proven in wait-for |
| Parsing emulator -version output | Checking for -gpu software support at runtime | Version check is simpler and more reliable than trying a flag and seeing if it errors |

**Installation:**
No new packages needed. All stdlib.

## Architecture Patterns

### Recommended Project Structure
```
tools/mbridge/src/mbridge/
  platforms/
    android.py     # Add: require_emulator(), list_avds(), boot_emulator(), _parse_emulator_version()
    ios.py         # Modify: boot_device() adds `open -a Simulator`
  device.py        # Modify: boot() adds --timeout, Android path, error propagation; list_devices() adds --available
  action.py        # Modify: swipe_to() adds usable zone check
```

### Pattern 1: Emulator Binary Discovery
**What:** Find the `emulator` binary using `shutil.which()` with ANDROID_HOME fallback
**When to use:** Any function that needs to call the emulator CLI
**Example:**
```python
import os
import shutil

def _find_emulator():
    path = shutil.which("emulator")
    if path:
        return path
    android_home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if android_home:
        candidate = os.path.join(android_home, "emulator", "emulator")
        if os.path.isfile(candidate):
            return candidate
    return None

def require_emulator():
    path = _find_emulator()
    if not path:
        raise RuntimeError(
            "Android emulator not found. Install via Android Studio SDK Manager "
            "or set ANDROID_HOME environment variable."
        )
    return path
```
**Source:** Verified on local machine -- `emulator` is at `$ANDROID_HOME/emulator/emulator` and also on PATH.

### Pattern 2: Emulator Version Parsing
**What:** Parse `emulator -version` output to extract semantic version for 36.4.9+ check
**When to use:** Before attempting boot, to validate `-gpu software` is available
**Example:**
```python
import re

def _parse_emulator_version(emulator_path):
    result = subprocess.run([emulator_path, "-version"], capture_output=True, text=True)
    match = re.search(r"Android emulator version (\d+)\.(\d+)\.(\d+)", result.stdout)
    if not match:
        return None
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))
```
**Source:** Verified locally -- `emulator -version` outputs `Android emulator version 36.3.10.0 (build_id 14472402) (CL:N/A)`.

### Pattern 3: Background Process Launch + Crash Detection
**What:** Launch emulator via Popen, poll for early crash within ~5s
**When to use:** GPU fallback strategy (D-08/D-09)
**Example:**
```python
import subprocess
import time

def _launch_emulator(emulator_path, avd_name, gpu_mode):
    proc = subprocess.Popen(
        [emulator_path, "-avd", avd_name, "-gpu", gpu_mode],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    return proc

def _wait_for_process_stable(proc, seconds=5):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            return False
        time.sleep(0.5)
    return True
```
**Source:** Python subprocess docs -- `Popen.poll()` returns `None` if process is still running, returncode if exited.

### Pattern 4: Boot-Wait with Two-Stage Polling
**What:** Wait for adb device connection, then poll `sys.boot_completed`
**When to use:** After emulator process is stable
**Example:**
```python
def _wait_for_boot(device_serial, timeout):
    deadline = time.monotonic() + timeout

    while time.monotonic() < deadline:
        try:
            result = subprocess.run(
                ["adb", "-s", device_serial, "shell", "getprop", "sys.boot_completed"],
                capture_output=True, text=True, timeout=5,
            )
            if result.stdout.strip() == "1":
                return True
        except (subprocess.TimeoutExpired, RuntimeError):
            pass
        time.sleep(2)

    return False
```
**Source:** ReactiveCircus android-emulator-runner uses 2s polling interval with `sys.boot_completed` check. Briar CI script uses 1s. 2s is the community standard for CI/automation contexts.

### Pattern 5: Usable Zone Check for swipe-to
**What:** After finding an element, verify its center is within the middle 80% of the screen (10% padding each side)
**When to use:** In `swipe_to()` after element is found
**Example:**
```python
def _is_in_usable_zone(element, screen_width, screen_height):
    cx = element.get("center", {}).get("x", 0)
    cy = element.get("center", {}).get("y", 0)
    pad_x = screen_width * 0.10
    pad_y = screen_height * 0.10
    return (pad_x <= cx <= screen_width - pad_x and
            pad_y <= cy <= screen_height - pad_y)
```

### Anti-Patterns to Avoid
- **Using `run_cmd()` for emulator launch:** `run_cmd()` blocks until the process exits. The emulator runs indefinitely. Use `Popen` instead.
- **Parsing adb output during early boot:** The adb daemon may not be ready yet. Catch all subprocess errors and retry.
- **Relying on emulator exit code for GPU failure:** The emulator may exit with code 0 even on GPU failure. Use process-alive check (poll returns non-None = exited) as the signal.
- **Using `swiftshader_indirect`:** Deprecated in 36.4.9. Decision D-14 explicitly forbids it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AVD discovery | Custom filesystem scanning | `emulator -list-avds` | Official command, handles all config paths and ANDROID_HOME variants |
| Boot completion detection | Custom socket/port monitoring | `adb shell getprop sys.boot_completed` | Standard property, used by all CI systems, emulator teams, and automation tools |
| Device serial detection after launch | Parsing emulator console output | `adb devices` polling | The emulator assigns a serial like `emulator-5554`; just poll `adb devices` until the new serial appears |
| Emulator version parsing | Reading internal files | `emulator -version` output parsing | Stable output format across versions |

**Key insight:** The Android emulator CLI and adb together provide complete lifecycle management. Every operation has an official command -- no need to probe internal state.

## Common Pitfalls

### Pitfall 1: adb Connection Race After Emulator Launch
**What goes wrong:** Code tries `adb shell getprop` immediately after Popen but adb daemon hasn't started yet. Gets "device not found" or "device offline" errors.
**Why it happens:** Emulator takes 5-15s to start its adb server. The process is alive but not ready for adb.
**How to avoid:** Catch all subprocess errors in the boot-wait loop. The `sys.boot_completed` check loop inherently handles this -- any error just means "not ready yet, try again."
**Warning signs:** `error: device 'emulator-5554' not found` or `error: device offline`

### Pitfall 2: Emulator Process Exits With Non-Zero But No Useful stderr
**What goes wrong:** GPU host mode crashes silently on macOS Tahoe. Process exits but stderr may be empty or contain unhelpful messages.
**Why it happens:** GPU detection on macOS Tahoe reports UNKNOWN (Google issue tracker #271701966). MoltenVK initialization may fail without clear error output.
**How to avoid:** Don't rely on stderr content for fallback decision. Simply check if process exited within the 5s window (D-09). If it exited for any reason, try software mode.
**Warning signs:** `proc.poll() is not None` within first 5 seconds

### Pitfall 3: Multiple Emulator Instances and Port Conflicts
**What goes wrong:** Starting a new emulator when one is already running can cause port conflicts. The default port is 5554.
**Why it happens:** `emulator -avd` picks the next available port (5554, 5556, 5558...), but if many are running, things get confused.
**How to avoid:** After launching, identify the new device serial by diffing `adb devices` before and after launch. The serial will be `emulator-<port>`.
**Warning signs:** The boot-wait loop connects to the wrong emulator instance.

### Pitfall 4: emulator -list-avds Returns Empty on Misconfigured ANDROID_HOME
**What goes wrong:** `emulator -list-avds` returns nothing even though AVDs exist in Android Studio.
**Why it happens:** AVD files live in `~/.android/avd/` by default, but ANDROID_AVD_HOME or ANDROID_HOME overrides can redirect.
**How to avoid:** Use `emulator -list-avds` as-is (it respects all env vars). If empty, that's valid -- no AVDs configured.
**Warning signs:** Empty output from `emulator -list-avds` when user claims AVDs exist.

### Pitfall 5: getprop sys.boot_completed Returns Carriage Return
**What goes wrong:** `getprop sys.boot_completed` returns `"1\r"` not `"1"`.
**Why it happens:** Android shell uses `\r\n` line endings. `subprocess.run` with `text=True` doesn't strip `\r`.
**How to avoid:** Always `.strip()` the output before comparison.
**Warning signs:** `result.stdout.strip() == "1"` works; `result.stdout == "1"` does not.

### Pitfall 6: open -a Simulator Fails When Xcode Not Installed at Default Path
**What goes wrong:** `open -a Simulator` may fail if Xcode is not at `/Applications/Xcode.app`.
**Why it happens:** Some developers have multiple Xcode installations or renamed Xcode.app.
**How to avoid:** Use `open -a Simulator` (not a full path). macOS `open -a` searches registered apps. If it fails, the boot still succeeded -- just log/ignore the Simulator.app failure. The simulator is booted via `xcrun simctl boot` regardless.
**Warning signs:** `RuntimeError` from `open -a Simulator` should not prevent boot success from being reported.

### Pitfall 7: swipe-to Usable Zone Extra Swipe Direction
**What goes wrong:** Extra swipe goes in the wrong direction, pushing the element further off screen.
**Why it happens:** If element is at the bottom edge and swipe direction is "down", the extra swipe would push it further down.
**How to avoid:** The extra swipe should use the same direction as the original swipe_to direction. If the user swiped "up" to find the element, one more "up" swipe brings it further into view. This is already correct by design.
**Warning signs:** Element disappears after extra swipe.

## Code Examples

### AVD Discovery (list_avds)
```python
def list_avds():
    emulator_path = require_emulator()
    result = subprocess.run(
        [emulator_path, "-list-avds"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return []
    avds = []
    for line in result.stdout.strip().splitlines():
        name = line.strip()
        if name:
            avds.append(name)
    return avds
```
**Source:** Verified locally -- `emulator -list-avds` returns one AVD name per line (e.g., `Medium_Phone_API_36.1`).

### Full Boot Sequence Skeleton
```python
def boot_emulator(avd_name, timeout=120):
    emulator_path = require_emulator()
    version = _parse_emulator_version(emulator_path)
    if not version or version < (36, 4, 9):
        raise RuntimeError(
            f"Android emulator 36.4.9+ required (found {'.'.join(map(str, version)) if version else 'unknown'}). "
            "Update via Android Studio SDK Manager."
        )

    gpu_mode = "host"
    proc = _launch_emulator(emulator_path, avd_name, gpu_mode)

    if not _wait_for_process_stable(proc, seconds=5):
        gpu_mode = "software"
        proc = _launch_emulator(emulator_path, avd_name, gpu_mode)
        if not _wait_for_process_stable(proc, seconds=5):
            raise RuntimeError("Emulator failed to start with both host and software GPU modes")

    device_serial = _detect_new_emulator()
    if not device_serial:
        raise RuntimeError("Emulator started but no adb device detected")

    booted = _wait_for_boot(device_serial, timeout)
    result = {"id": device_serial, "status": "booted" if booted else "timeout", "gpu_mode": gpu_mode}
    if gpu_mode == "software":
        result["note"] = "Hardware GPU unavailable, using software rendering (slower)"
    if not booted:
        raise RuntimeError(f"Emulator boot timed out after {timeout}s (left running)")
    return result
```

### Detecting New Emulator Serial
```python
def _get_emulator_serials():
    try:
        result = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=5)
        serials = set()
        for line in result.stdout.splitlines()[1:]:
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0].startswith("emulator-"):
                serials.add(parts[0])
        return serials
    except (subprocess.TimeoutExpired, RuntimeError):
        return set()
```

### iOS Boot with Simulator.app Opening
```python
def boot_device(device_id):
    _require_simulator(device_id)
    require_xcrun()
    try:
        run_cmd(["xcrun", "simctl", "boot", device_id])
    except RuntimeError as e:
        if "Booted" not in str(e) and "current state: Booted" not in str(e):
            raise
    try:
        subprocess.run(["open", "-a", "Simulator"], capture_output=True, timeout=10)
    except (subprocess.TimeoutExpired, OSError):
        pass
    return {"id": device_id, "status": "booted"}
```
**Note:** `open -a Simulator` failure should not prevent boot success from being reported. It's a UX convenience, not a requirement.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `-gpu swiftshader_indirect` | `-gpu software` | Emulator 36.4.9 (Feb 2026) | Unified flag picks best software renderer (Lavapipe preferred) |
| SwiftShader for software rendering | Lavapipe (Mesa 3D) | Emulator 36.4.9 (Feb 2026) | 42% faster than SwiftShader per CONTEXT.md research |
| `-gpu guest` for guest-side rendering | `-gpu software` | Emulator 36.4.9 (Feb 2026) | `guest` deprecated, `software` covers all software rendering |
| Manual GPU mode selection | `-gpu auto` as default | Long-standing | Auto detects best mode, but can fail on macOS Tahoe |

**Deprecated/outdated:**
- `swiftshader_indirect`: Deprecated in 36.4.9. Replaced by `-gpu software`.
- `guest`: Deprecated in 36.4.9. Was already falling back to swiftshader_indirect for API 28+.
- `angle_indirect`: Deprecated in 34.2.14. Windows-only, not relevant.
- `ANDROID_SDK_ROOT`: Deprecated env var, but still works. `ANDROID_HOME` is the canonical one.

**Local machine status:**
- Emulator version: 36.3.10 (Dec 4, 2025) -- does NOT have `-gpu software`
- Needs update to 36.4.9+ via Android Studio SDK Manager
- AVDs present: `Medium_Phone_API_36.1`

## Open Questions

1. **Detecting the new emulator's serial after launch**
   - What we know: Emulator assigns serials like `emulator-5554`, `emulator-5556`, etc. Can diff `adb devices` before/after.
   - What's unclear: Exact timing -- how long after Popen before the serial appears in `adb devices`? May take 5-15s.
   - Recommendation: Include serial detection in the boot-wait loop. Poll `adb devices` and match new emulator-* serials. The boot-wait loop already has timeout handling.

2. **AVD metadata for `device list --available`**
   - What we know: `emulator -list-avds` returns only names, no metadata (no OS version, no device type).
   - What's unclear: Whether to parse AVD .ini files for metadata or just show names.
   - Recommendation: Show AVD name with `state: "available"` and `type: "emulator"`. Metadata would require parsing `~/.android/avd/<name>.avd/config.ini` -- could add basic info (display name, API level) if desired but not required by decisions.

3. **Polling interval for boot-wait**
   - What we know: ReactiveCircus uses 2s, Briar CI uses 1s, typical range is 1-2s.
   - Recommendation: Use 2s interval. `sys.boot_completed` check is cheap (single getprop), and 2s is the standard for automation contexts. Matches the low-overhead approach.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2+ |
| Config file | `tools/mbridge/tests/conftest.py` (integration test infrastructure) |
| Quick run command | `cd tools/mbridge && uv run pytest tests/test_device.py -x` |
| Full suite command | `cd tools/mbridge && uv run pytest tests/ -x` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | `device list --available` includes unbooted AVDs | integration | `uv run pytest tests/test_device.py::test_device_list_available -x` | No -- Wave 0 |
| D-02/D-04 | `device boot <avd>` with timeout | integration (manual) | Manual: requires emulator launch, 120s wait | N/A |
| D-08/D-09 | GPU host fallback to software | integration (manual) | Manual: requires emulator with known GPU issues | N/A |
| D-15 | iOS boot opens Simulator.app | integration (manual) | Manual: verify Simulator.app window appears | N/A |
| D-16/D-17 | Error propagation in device boot | integration | `uv run pytest tests/test_device.py::test_device_boot_error_propagation -x` | No -- Wave 0 |
| D-19/D-20 | swipe-to usable zone extra swipe | integration (manual) | Manual: find element at screen edge, verify extra swipe | N/A |

### Sampling Rate
- **Per task commit:** `cd tools/mbridge && uv run pytest tests/test_device.py -x`
- **Per wave merge:** `cd tools/mbridge && uv run pytest tests/ -x`
- **Phase gate:** Full suite green + manual emulator boot verification

### Wave 0 Gaps
- [ ] `tests/test_device.py::test_device_list_available` -- covers D-01 (--available flag)
- [ ] `tests/test_device.py::test_device_boot_error_propagation` -- covers D-16/D-17
- Note: Emulator boot (D-02/D-04/D-08/D-09), iOS Simulator.app (D-15), and swipe-to zone (D-19/D-20) are manual-only due to requiring physical device/emulator state

## Sources

### Primary (HIGH confidence)
- Android Emulator CLI docs: https://developer.android.com/studio/run/emulator-commandline -- `-list-avds`, `-avd`, `-gpu` flags
- Android Emulator acceleration docs: https://developer.android.com/studio/run/emulator-acceleration -- all GPU modes and deprecation versions
- Android Emulator release notes: https://developer.android.com/studio/releases/emulator -- 36.4.9 introduces `-gpu software`, Lavapipe, deprecates `swiftshader_indirect`/`guest`/`swangle_indirect`
- Local machine verification: `emulator -version` outputs `36.3.10.0`, `emulator -list-avds` returns `Medium_Phone_API_36.1`, `emulator -help-gpu` shows modes available on current version
- Python subprocess docs: https://docs.python.org/3/library/subprocess.html -- Popen.poll() behavior
- AOSP GPU-EMULATION.TXT: https://android.googlesource.com/platform/external/qemu/+/emu-master-dev/android/docs/GPU-EMULATION.TXT -- GPU mode details

### Secondary (MEDIUM confidence)
- ReactiveCircus android-emulator-runner: https://github.com/ReactiveCircus/android-emulator-runner -- boot-wait implementation (2s polling, sys.boot_completed)
- Briar CI wait-for-emulator.sh: https://code.briarproject.org/briar/ci-image-android-emulator/-/blob/main/wait-for-emulator.sh -- 1s polling, 720s timeout, sys.boot_completed

### Tertiary (LOW confidence)
- Google Issue Tracker #271701966: GPU detection UNKNOWN on macOS -- referenced in CONTEXT.md canonical refs, issue is access-restricted so details not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all stdlib, no new dependencies, verified locally
- Architecture: HIGH -- follows existing mbridge patterns exactly (run_cmd, require_*, Popen for background)
- GPU fallback strategy: HIGH -- version numbers and flag availability verified against official release notes and local machine
- Boot-wait: HIGH -- sys.boot_completed is the universal standard, verified across multiple CI implementations
- Pitfalls: HIGH -- based on documented issues, local testing observations, and CI community experience
- swipe-to zone: MEDIUM -- calculation is straightforward, but exact edge behavior needs manual testing

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain, emulator CLI commands change slowly)
