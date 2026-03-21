# Phase 16: mbridge Testing and Hardening - Research

**Researched:** 2026-03-21
**Domain:** CLI integration testing, cross-platform mobile device interaction, polling command implementation
**Confidence:** HIGH

## Summary

Phase 16 is the final v1 phase: test every mbridge CLI command against all 4 device environments (iOS simulator, iOS real device, Android emulator, Android real device), fix all bugs found, implement a new `ui wait-for` command, delete the 112 existing unit tests, and update SKILL.md to reflect changes. The test target app is fitlumen at `../fitlumen`.

The codebase is well-structured with clear patterns. The `ui wait-for` command is straightforward: a time-based polling loop around the existing `_capture_dump()` + `find_elements()` infrastructure. All existing code patterns (Click command groups, JSON output, platform dispatch, element query flags) are already established and should be reused exactly.

**Primary recommendation:** Implement `ui wait-for` first, then run the cross-platform test matrix using throwaway pytest integration tests that shell out to mbridge CLI. Fix bugs as found with proper root-cause investigation. Update SKILL.md as the final deliverable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All 4 environments: iOS simulator, iOS real device, Android emulator, Android real device
- Test target app: fitlumen (at `../fitlumen` relative to ai-toolbelt)
- Every mbridge command must pass on all 4 environments before phase is complete
- Human sets up each environment (device booted, fitlumen installed and running) before testing starts
- Human confirms each test step -- no fully autonomous test execution
- Automated pytest integration tests that shell out to mbridge CLI against live devices
- Tests are NOT committed to the repo -- throwaway, used only during this phase to find/fix bugs
- Delete all 112 existing unit tests (tests/ directory contents) -- consistent with Phase 7 "no unit tests" decision
- No formal test results report -- fixes and updated SKILL.md are the deliverables
- `mbridge ui wait-for <device> --text "Submit" --timeout 10` -- polls dump+find at intervals until match or timeout
- Same query flags as `ui find` (--text, --id, --type, --exact)
- Returns element JSON on success, error on timeout
- Fix what breaks during testing -- no preemptive hardening
- Each bug gets dedicated research before fixing -- no quick patches
- Fix everything found -- no deferring to v2
- Update mbridge SKILL.md after testing/hardening

### Claude's Discretion
- Poll interval for ui wait-for (e.g., 500ms vs 1s)
- Default timeout value for ui wait-for
- Test file organization within tools/mbridge/tests/
- Order of environment testing (which platform first)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| click | >=8.0 | CLI framework | Already used by all mbridge commands |
| pytest | >=9.0.2 | Test runner | Already in dev dependencies |
| time (stdlib) | n/a | Polling loop timing | `time.monotonic()` for timeout tracking |
| subprocess (stdlib) | n/a | CLI invocation in tests | Tests shell out to `mbridge` binary |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytesseract | >=0.3.13 | OCR verification | Already a dependency, used by `verify text` |
| Pillow | >=12.0 | Image processing for OCR | Already a dependency |

No new dependencies are needed. The `ui wait-for` command uses only stdlib `time` module plus existing mbridge internals.

## Architecture Patterns

### ui wait-for Implementation Pattern

The command slots into `ui.py` alongside existing `dump` and `find` commands. It reuses:
- `_capture_dump(device_id)` -- captures and parses UI hierarchy
- `find_elements(elements, ...)` -- queries elements by criteria
- `output()` / `error()` -- JSON response formatting

```python
import time

@ui.command("wait-for")
@click.argument("device_id")
@click.option("--text", default=None)
@click.option("--id", "element_id", default=None)
@click.option("--type", "element_type", default=None)
@click.option("--exact", is_flag=True, default=False)
@click.option("--timeout", type=float, default=10.0)
@click.option("--interval", type=float, default=0.5)
def wait_for(device_id, text, element_id, element_type, exact, timeout, interval):
    """Wait for an element to appear in the UI hierarchy."""
    if not text and not element_id and not element_type:
        error("Provide at least one query flag: --text, --id, or --type")

    deadline = time.monotonic() + timeout
    last_error = None

    while time.monotonic() < deadline:
        try:
            elements = _capture_dump(device_id)
            results = find_elements(
                elements, id=element_id, text=text, exact=exact,
                element_type=element_type,
            )
            if results:
                output(results[0])
                return
        except RuntimeError as e:
            last_error = str(e)

        remaining = deadline - time.monotonic()
        if remaining > 0:
            time.sleep(min(interval, remaining))

    if last_error:
        error(f"Timeout after {timeout}s waiting for element (last error: {last_error})")
    else:
        error(f"Timeout after {timeout}s waiting for element")
```

**Key design decisions:**
- `time.monotonic()` over `time.time()` -- monotonic clock is immune to system clock changes
- Sleep the lesser of interval and remaining time -- avoids overshooting deadline
- Catches RuntimeError during polling -- transient dump failures should not abort the wait
- Returns first matching element as JSON (same schema as `ui find` output)
- Error on timeout includes last error context for debugging

### Recommended Poll Interval and Timeout

| Parameter | Recommended Value | Rationale |
|-----------|-------------------|-----------|
| `--interval` | 0.5s (default) | UI dumps take 200-500ms per platform; 0.5s avoids hammering while staying responsive |
| `--timeout` | 10.0s (default) | Most screen transitions complete in 1-3s; 10s accommodates slow animations and cold starts |

### Integration Test Pattern (Throwaway)

Tests shell out to the `mbridge` CLI binary using subprocess, not Click's CliRunner. This tests the real installed binary against real devices.

```python
import json
import subprocess

def run_mbridge(*args):
    result = subprocess.run(
        ["mbridge", *args],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        try:
            return json.loads(stderr), result.returncode
        except json.JSONDecodeError:
            return {"error": stderr}, result.returncode
    return json.loads(result.stdout), result.returncode


def test_device_list(device_id):
    data, code = run_mbridge("device", "list")
    assert code == 0
    assert any(d["id"] == device_id for d in data)
```

**Test file organization:**

```
tools/mbridge/tests/
    conftest.py              # Device ID fixtures, run_mbridge helper
    test_device.py           # device list, info, boot
    test_app.py              # app list, foreground, launch, clear, open-url
    test_ui.py               # ui dump, find, wait-for
    test_action.py           # action tap, swipe, type
    test_verify.py           # verify text
```

### Environment Testing Order

Recommended order (simulators first for faster iteration, then real devices):
1. iOS simulator -- fastest feedback loop, most common dev environment
2. Android emulator -- second fastest, catches platform-specific parsing
3. iOS real device -- catches idb/signing differences
4. Android real device -- catches adb/physical device differences

### Anti-Patterns to Avoid
- **Click CliRunner for integration tests:** CliRunner runs in-process, bypassing subprocess behavior, platform tool discovery, and actual CLI binary. Use subprocess.
- **Hardcoded device IDs in tests:** Device IDs change between machines. Use pytest fixtures or conftest.py with configurable device IDs.
- **Asserting exact OCR text:** OCR is imperfect. Assert substring presence, not exact string equality.
- **Fixed sleep between test steps:** Use `mbridge ui wait-for` or `mbridge app foreground` polling instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polling loop | Custom retry decorator or async polling | Simple `time.monotonic()` + `while` loop | The polling is trivial; decorators add complexity without benefit |
| Element query in wait-for | New query logic | `find_elements()` from `parsing/query.py` | Exact same query semantics as `ui find` |
| UI capture in wait-for | New dump logic | `_capture_dump()` from `ui.py` | Already handles platform dispatch + parsing |
| Test subprocess runner | Custom test harness | `subprocess.run()` + JSON parsing | Tests are throwaway; minimal infrastructure |

## Common Pitfalls

### Pitfall 1: iOS Backspace Clear Sending 500 Individual Key Events
**What goes wrong:** `action type --clear` sends 500 individual backspace key presses on iOS via idb. This is extremely slow (500 subprocess calls) and may timeout or cause idb connection issues.
**Why it happens:** Phase 9 decision to brute-force clear. No select-all shortcut was implemented.
**How to avoid:** During testing, if `--clear` is prohibitively slow on iOS, investigate using `idb ui key-sequence` or `cmd+a` followed by delete as an optimization.
**Warning signs:** `action type --clear` taking >5 seconds on iOS.

### Pitfall 2: Android UIAutomator "Could Not Get Idle State"
**What goes wrong:** `uiautomator dump` fails on screens with animations, timers, or continuous updates. Returns empty or error.
**Why it happens:** UIAutomator waits for the accessibility framework to reach idle state, which never happens on animated screens.
**How to avoid:** Already documented in SKILL.md Known Limitations. During testing, avoid running `ui dump`/`ui find`/`action tap --text` on animated screens. Use `verify text` (OCR-based) as fallback.
**Warning signs:** `ui dump` returning 0 elements or "could not get idle state" errors.

### Pitfall 3: Android Text Encoding Special Characters
**What goes wrong:** `action type` with special characters (%, spaces, shell metacharacters) may not type correctly on Android.
**Why it happens:** `adb shell input text` interprets shell metacharacters. The `_encode_adb_text()` helper encodes these, but edge cases may exist.
**How to avoid:** Test with strings containing: spaces, @, #, $, %, &, quotes, unicode characters. Verify each types correctly.
**Warning signs:** Typed text missing characters or containing escape artifacts.

### Pitfall 4: iOS idb Coordinate Space Mismatch
**What goes wrong:** `idb ui tap` coordinates may not match the coordinate space returned by `idb ui describe-all`. Taps land on wrong elements.
**Why it happens:** idb operates in point space, but `_get_screen_info()` might return pixel dimensions. The `screen_logical_size()` utility exists but may not be wired into tap coordinates correctly.
**How to avoid:** Verify that coordinates from `ui find` center values actually correspond to correct tap locations. Test on both @2x and @3x simulator devices.
**Warning signs:** `action tap --text "X"` tapping the wrong element or tapping outside the screen.

### Pitfall 5: Real Device vs Simulator/Emulator Differences
**What goes wrong:** Commands work on simulators but fail on real devices due to: different tool requirements (idb vs xcrun for real iOS), USB vs network connectivity, different permission models.
**Why it happens:** Real devices have additional security restrictions, different tool chains, and network latency.
**How to avoid:** Test real devices as a dedicated pass, not assumed to work because simulators work.
**Warning signs:** Connection errors, "device not found", permission denied on real devices.

### Pitfall 6: wait-for Swallowing Real Errors
**What goes wrong:** The polling loop catches RuntimeError broadly, masking genuine configuration errors (missing tools, wrong device ID) that should fail immediately.
**How to avoid:** On the first iteration, let errors propagate. Only catch errors in subsequent iterations (first attempt establishes that the device is reachable).
**Warning signs:** `wait-for` timing out when the actual issue is a missing tool or disconnected device.

### Pitfall 7: Android DUMPSTATE Instead of UI Hierarchy
**What goes wrong:** `adb shell uiautomator dump /dev/tty` may return DUMPSTATE output instead of UI XML on some Android versions.
**Why it happens:** Known Android bug where the output prefix is contaminated.
**How to avoid:** The current code strips to `</hierarchy>` end tag, which handles this. Verify during testing that the parser handles this correctly on each Android version.
**Warning signs:** XML parsing errors from `dump_ui()`.

## Code Examples

### Registering wait-for in cli.py

No change needed to `cli.py`. The `wait-for` command is added to the `ui` Click group in `ui.py`, which is already registered.

### SKILL.md Addition for wait-for

```markdown
### ui wait-for

```bash
mbridge ui wait-for DEVICE_ID --text "Submit"
mbridge ui wait-for DEVICE_ID --id "login_btn" --timeout 15
mbridge ui wait-for DEVICE_ID --type "Button" --text "OK" --exact --timeout 5 --interval 1
```

Polls the UI hierarchy until a matching element appears or timeout expires.

- `--text TEXT` -- wait for element with matching text (substring)
- `--id ID` -- wait for element with matching accessibility ID
- `--type TYPE` -- wait for element with matching type
- `--exact` -- require exact text match
- `--timeout SECONDS` -- maximum wait time (default: 10)
- `--interval SECONDS` -- poll interval (default: 0.5)

Returns the first matching element on success (same format as `ui find`).
Returns error on timeout.
```

### Test conftest.py Pattern

```python
import json
import os
import subprocess

import pytest

DEVICE_ID = os.environ.get("MBRIDGE_TEST_DEVICE", "")
BUNDLE_ID = os.environ.get("MBRIDGE_TEST_BUNDLE", "")


@pytest.fixture
def device_id():
    if not DEVICE_ID:
        pytest.skip("MBRIDGE_TEST_DEVICE not set")
    return DEVICE_ID


@pytest.fixture
def bundle_id():
    if not BUNDLE_ID:
        pytest.skip("MBRIDGE_TEST_BUNDLE not set")
    return BUNDLE_ID


def run_mbridge(*args, timeout=30):
    result = subprocess.run(
        ["mbridge", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    stdout_data = None
    stderr_data = None
    if result.stdout.strip():
        try:
            stdout_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            stdout_data = result.stdout
    if result.stderr.strip():
        try:
            stderr_data = json.loads(result.stderr)
        except json.JSONDecodeError:
            stderr_data = result.stderr
    return stdout_data, stderr_data, result.returncode
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| mobilecli bash helpers + jq | mbridge CLI with element targeting flags | Phase 7-10 | Eliminated 50+ wrapper functions |
| Fixed sleep between commands | `app foreground` polling + `verify text` | Phase 10 | More reliable, faster when possible |
| Fixed sleep for element appearance | `ui wait-for` (this phase) | Phase 16 | Caller-controlled wait, replaces blanket timeouts |
| Unit tests with mocked subprocess | No unit tests; integration tests on real devices | Phase 7 decision | Tests catch real platform issues |

## Known Risk Areas (from Prior Phases)

These are areas specifically flagged in prior phases as likely to surface bugs during integration testing:

| Risk Area | Source | What to Watch For |
|-----------|--------|-------------------|
| Scroll container visibility | Phase 8 | Elements in scroll views reported as `visible: true` when off-screen |
| Android text encoding | Phase 9 | Special chars (%, space, shell metacharacters) not typing correctly |
| iOS clear brute force | Phase 9 | 500 backspace key events being slow or failing |
| Pixel density coords | Phase 7 | Coordinate mismatch between find results and tap targets |
| iOS flat children | Phase 8 | idb returns flat list, no parent-child hierarchy on iOS |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest >=9.0.2 |
| Config file | tools/mbridge/pyproject.toml (dev dependency group) |
| Quick run command | `cd tools/mbridge && uv run pytest tests/ -x -v` |
| Full suite command | `cd tools/mbridge && uv run pytest tests/ -v` |

### Phase Requirements -> Test Map

This phase has no formal requirement IDs. The validation is manual: every mbridge command must pass on all 4 environments, confirmed by human. The throwaway pytest tests are a tool for systematic discovery, not a persistent validation artifact.

| Command Group | Commands | Test Type | Notes |
|---------------|----------|-----------|-------|
| device | list, boot, info | integration (live device) | Verify output schema, platform detection |
| app | list, foreground, launch, clear, open-url | integration (live device) | Requires fitlumen installed |
| ui | dump, find, wait-for | integration (live device) | Test element counts, query accuracy |
| action | tap, swipe, type | integration (live device) | Verify side effects via ui find/verify text |
| verify | text | integration (live device) | OCR accuracy varies by device |

### Sampling Rate
- **Per bug fix:** Re-run the specific failing test on the affected environment
- **Per environment pass:** Run full test suite for that platform
- **Phase gate:** All commands pass on all 4 environments, human-confirmed

### Wave 0 Gaps
- [ ] Delete all existing unit tests from `tools/mbridge/tests/` (6 test files + fixtures/)
- [ ] Create `tools/mbridge/tests/conftest.py` with device fixtures and run_mbridge helper
- [ ] Create throwaway integration test files per command group
- [ ] Verify `uv run pytest` works with mbridge dev dependencies

## Open Questions

1. **idb compatibility with real iOS devices**
   - What we know: idb is used for tap, swipe, type, and UI dump on iOS. All Phase 7-10 development targeted simulators.
   - What's unclear: Whether idb works identically on real iOS devices connected via USB. May need `--udid` flag adjustments or different connection setup.
   - Recommendation: Test real iOS device early. If idb fails on real devices, research alternatives (xcrun-based interaction).

2. **Android real device USB debugging reliability**
   - What we know: adb works with physical Android devices via USB debugging.
   - What's unclear: Whether the `exec-out screencap` and `uiautomator dump /dev/tty` commands behave identically on physical devices vs emulators.
   - Recommendation: Test basic commands first (device list, info) before running full test suite.

3. **fitlumen-specific UI patterns**
   - What we know: fitlumen is the test target app. Its specific screens, deeplinks, and UI elements are not documented in mbridge context.
   - What's unclear: Which screens are best for testing each command type. Whether fitlumen has animations that trigger UIAutomator idle issues.
   - Recommendation: Human guidance on which screens to target for each test category.

## Sources

### Primary (HIGH confidence)
- mbridge source code: `tools/mbridge/src/mbridge/` -- all command implementations read directly
- Prior phase context files: 07-CONTEXT.md, 08-CONTEXT.md, 09-CONTEXT.md -- design decisions and known risks
- mbridge SKILL.md: `skills/mbridge/SKILL.md` -- current command reference and known limitations

### Secondary (MEDIUM confidence)
- [Python time.monotonic() for polling](https://realpython.com/python-sleep/) -- polling loop best practices
- [Click documentation](https://click.palletsprojects.com/en/stable/advanced/) -- Click 8.x advanced patterns
- [UIAutomator dump known issues](https://github.com/flutter/flutter/issues/74197) -- StackOverflowError and idle state issues

### Tertiary (LOW confidence)
- [idb ui describe-all reliability](https://github.com/facebook/idb/issues/643) -- older issue, 2020 era, may not reflect current state

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing dependencies
- Architecture: HIGH -- `wait-for` follows established patterns exactly, code examples derived from source code
- Pitfalls: HIGH -- risk areas well-documented across prior phases; platform-specific issues are inherent to the domain
- Testing: MEDIUM -- throwaway test approach is sound but real-device behavior has unknowns

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- no fast-moving dependencies)
