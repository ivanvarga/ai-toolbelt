# Phase 17: Android Emulator Boot Command - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

`mbridge device boot` gains Android emulator support (AVD discovery, launch with GPU fallback, boot-wait), iOS boot gets Simulator.app opening, error handling hardened across `device boot`, and `swipe-to` edge visibility fixed.

</domain>

<decisions>
## Implementation Decisions

### AVD discovery and selection
- **D-01:** Add `--available` flag to `device list` that includes unbooted AVDs from `emulator -list-avds`
- **D-02:** `device boot` takes AVD name as argument (same pattern as iOS simulator ID)
- **D-03:** Available-but-not-running AVDs distinguished from running emulators in list output

### Boot timeout and wait strategy
- **D-04:** 120s default timeout with `--timeout` flag override
- **D-05:** Poll adb continuously for connection — no emulator restart on intermittent failures
- **D-06:** Silent during boot — return result JSON on success, error on failure. Matches all other mbridge command output patterns
- **D-07:** On timeout, leave emulator process running (may be almost ready)

### GPU mode strategy
- **D-08:** Try `-gpu host` first (hardware acceleration via MoltenVK, best performance)
- **D-09:** If host fails (process exits within ~5s), relaunch with `-gpu software` (Lavapipe, 42% faster than old SwiftShader)
- **D-10:** No `--gpu` flag exposed — fallback is fully internal
- **D-11:** No persistent memory of what worked — stateless fallback each time
- **D-12:** Require emulator 36.4.9+ for `-gpu software` flag. Error with upgrade message on older versions
- **D-13:** Include `gpu_mode` in result JSON: `"host"` or `"software"`. When falling back to software, include `"note": "Hardware GPU unavailable, using software rendering (slower)"`
- **D-14:** `swiftshader_indirect` is deprecated (36.4.9) — do not use anywhere

### iOS boot improvements
- **D-15:** Run `open -a Simulator` after `xcrun simctl boot` to open GUI window
- **D-16:** Propagate RuntimeError from iOS boot instead of silently swallowing

### Error handling hardening
- **D-17:** `device boot` in device.py: stop swallowing RuntimeError with bare `except RuntimeError: pass`
- **D-18:** Try iOS first, then Android — propagate actual errors from both platforms

### swipe-to edge visibility
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

</decisions>

<specifics>
## Specific Ideas

- GPU fallback communicates mode to skill via result JSON so skill can mention slower rendering if relevant
- Fire-and-forget optimization: skill calls `device boot`, gets result when ready, no intermediate status to parse
- Research confirmed: Lavapipe (via `-gpu software`) is 42% faster than SwiftShader in benchmarks

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Relevant upstream docs (for researcher)
- Android emulator GPU modes: `emulator -help-gpu` and AOSP GPU-EMULATION.TXT
- emulator 36.4.9 release notes: `-gpu software` introduction, deprecation of `swiftshader_indirect`
- Google issue tracker #271701966: macOS GPU detection failures (recurring pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `device.py`: Existing `boot()` command and `_detect_platform()` helper — extend, don't rewrite
- `android.py`: `require_adb()`, `run_cmd()`, `list_devices()`, `_getprop()` — all reusable for boot implementation
- `ios.py`: `boot_device()` — needs Simulator.app opening added
- `action.py`: `swipe_to()` at line 214, `_find_visible()`, `_perform_swipe()` — modify visibility check

### Established Patterns
- Platform modules (`ios.py`, `android.py`) own device interaction; `device.py` dispatches
- `run_cmd()` wrapper for subprocess calls with error handling
- Click commands return JSON via `output()` helper, errors via `error()` helper
- `shutil.which()` for tool availability checks (see `require_adb()`)

### Integration Points
- `device.py:boot()` — main entry point, currently iOS-only
- `device.py:list_devices()` — needs `--available` flag for unbooted AVDs
- `android.py` — needs new `boot_emulator()`, `list_avds()` functions
- `ios.py:boot_device()` — needs `open -a Simulator` addition
- `action.py:swipe_to()` — needs usable zone check after element found

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-android-emulator-boot-command*
*Context gathered: 2026-03-28*
