# Phase 9: mbridge Interaction + OCR - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

mbridge can interact with device UIs via tap, swipe, and text input, and verify results using OCR. Commands live under the existing `action` and `verify` Click groups. UI parsing and element finding (Phase 8) feed into interaction commands. The mbridge SKILL.md integration is Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Tap command
- Two modes: coordinate-based (`mbridge action tap <device> <x> <y>`) and element-based (`mbridge action tap <device> --text "Submit"`)
- Element-based mode uses `_capture_dump()` + `find_elements()` internally (reuses Phase 8 infrastructure)
- Default behavior: tap first match when multiple elements found
- `--unique` flag: fail with all matches listed if more than one element matches
- Same query flags as `ui find`: `--text`, `--id`, `--type`, `--exact`
- Minimal output on success: `{status: "tapped", x: N, y: N}`

### Swipe command
- Named directions as positional arg: `mbridge action swipe <device> up|down|left|right`
- Default swipe starts from screen center
- `--distance` flag to control swipe length (percentage of screen dimension)
- No speed/duration control — fixed sensible duration
- Element targeting supported: `--text`, `--id` flags to swipe starting from matched element's center
- `--from` flag for custom start coordinates as fallback

### Text input
- `mbridge action type <device> "text"` using platform-native input (simctl sendkeys on iOS, adb input text on Android)
- Inline escape sequences for special keys: `\n` (enter), `\b` (backspace), `\t` (tab), `\e` (escape)
- Optional element targeting: `--text`, `--id` flags to tap the field first, then type
- `--clear` flag: select-all + delete existing content before typing new text
- No separate `key` command — special keys handled via escape sequences in type

### OCR verify command
- `mbridge verify text <device> "expected text"`
- Screenshot via platform tools: `xcrun simctl io screenshot` (iOS), `adb exec-out screencap` (Android)
- Temp file workflow: capture PNG, OCR with pytesseract, delete temp file
- Substring match by default — checks if expected text appears anywhere in OCR output
- `--exact` flag for full-string match
- Full screen OCR only — no region cropping
- Output on success: `{found: true, text: "matched text"}`
- Output on failure: `{found: false, expected: "...", ocr_text: "full OCR output"}`
- pytesseract + Pillow as new dependencies

### Claude's Discretion
- Exact escape sequence parsing implementation
- Platform-specific text encoding (Android space encoding, iOS key mapping)
- Temp file location and cleanup strategy
- Default swipe distance percentage and duration values
- pytesseract configuration (language, PSM mode, preprocessing)
- How select-all + delete is implemented per platform for --clear

</decisions>

<specifics>
## Specific Ideas

- Element-based targeting across all interaction commands (tap, swipe, type) follows a consistent pattern: same `--text`/`--id`/`--type`/`--exact` flags reused from `ui find`
- The `--unique` flag on tap is specifically for assertion-style usage where the SKILL.md expects exactly one match — default is lenient (tap first match)
- Escape sequences in type (`\n`, `\b`) keep the command surface small — no separate `key` command needed
- `--clear` on type enables the common "edit existing field" workflow without requiring the SKILL.md to manually select-all + delete
- Verify returning full OCR text on failure is critical for SKILL.md diagnostics — it can see what's actually on screen without a second command

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `action.py`: empty Click group, ready for tap/swipe/type subcommands
- `verify.py`: empty Click group (named `verify_group` to avoid Python builtin), ready for text subcommand
- `ui.py._capture_dump()`: captures and parses UI hierarchy — reuse for element-based targeting in action commands
- `parsing/query.py.find_elements()`: query parsed elements by id/text/xpath/type — reuse for element lookup in tap/swipe/type
- `coords.py`: logical_to_physical/physical_to_logical — may be needed for coordinate space handling
- `output.py`: `output()` and `error()` helpers for consistent JSON output
- `platforms/ios.py`: `run_cmd()`, `require_xcrun()`, `require_idb()` — subprocess helpers
- `platforms/android.py`: `run_cmd()`, `require_adb()` — subprocess helpers

### Established Patterns
- Click command groups with `device_id` as required positional arg
- JSON output via `output.output()` for all command results
- Platform detection via `device.py._detect_platform()`
- Platform modules handle platform-specific logic, top-level commands dispatch
- Lazy tool checks: `require_xcrun()`/`require_adb()` per-command

### Integration Points
- `action` group: add `tap`, `swipe`, `type` subcommands
- `verify` group: add `text` subcommand
- Platform modules: add `tap()`, `swipe()`, `type_text()`, `screenshot()` functions to ios.py and android.py
- `pyproject.toml`: add pytesseract and Pillow dependencies

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-mbridge-interaction-ocr*
*Context gathered: 2026-03-13*
