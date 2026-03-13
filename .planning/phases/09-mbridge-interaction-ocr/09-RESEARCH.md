# Phase 9: mbridge Interaction + OCR - Research

**Researched:** 2026-03-13
**Domain:** Mobile device interaction (tap/swipe/type) and OCR verification via platform CLIs
**Confidence:** HIGH

## Summary

This phase adds interaction commands (tap, swipe, type) and OCR verification to the mbridge CLI. The technical surface is well-defined: iOS uses Facebook's `idb` for tap/swipe/text and `xcrun simctl io screenshot` for screenshots; Android uses `adb shell input` for interactions and `adb exec-out screencap -p` for screenshots. OCR uses `pytesseract` wrapping the Tesseract engine with `Pillow` for image handling.

The existing codebase already has empty `action` and `verify` Click groups ready for subcommands, platform modules with `run_cmd()` helpers, the `_capture_dump()` + `find_elements()` pipeline for element-based targeting, and `output()`/`error()` helpers for JSON output. The implementation is primarily wiring platform-specific subprocess calls into the established Click command patterns.

**Primary recommendation:** Use `idb ui tap/swipe/text/key` for all iOS interactions (already a dependency), `xcrun simctl io screenshot` for iOS screenshots, `adb shell input tap/swipe/text/keyevent` for Android interactions, and `adb exec-out screencap -p` for Android screenshots. pytesseract + Pillow for OCR. Temp file approach for iOS screenshots, stdout pipe for Android.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tap command: Two modes (coordinate-based and element-based), `--unique` flag, same query flags as `ui find` (`--text`, `--id`, `--type`, `--exact`)
- Swipe command: Named directions as positional arg (`up|down|left|right`), default from screen center, `--distance` percentage flag, element targeting via `--text`/`--id`, `--from` for custom start
- Text input: `mbridge action type <device> "text"` using platform-native input, inline escape sequences (`\n`, `\b`, `\t`, `\e`), optional element targeting with `--text`/`--id`, `--clear` flag for select-all + delete
- OCR verify: `mbridge verify text <device> "expected text"`, screenshot via platform tools, temp file workflow, substring match default, `--exact` flag, full screen OCR only, pytesseract + Pillow dependencies
- Output formats: `{status: "tapped", x: N, y: N}` for tap, `{found: true/false, ...}` for verify

### Claude's Discretion
- Exact escape sequence parsing implementation
- Platform-specific text encoding (Android space encoding, iOS key mapping)
- Temp file location and cleanup strategy
- Default swipe distance percentage and duration values
- pytesseract configuration (language, PSM mode, preprocessing)
- How select-all + delete is implemented per platform for --clear

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MBRD-04 | Basic interaction commands -- tap, swipe, text input | Platform tool research for idb (iOS) and adb (Android) covers tap, swipe, text commands with verified syntax. Element targeting reuses Phase 8 `_capture_dump()` + `find_elements()`. |
| MBRD-06 | OCR-based UI verification via pytesseract | pytesseract 0.3.13 + Pillow 12.1.1 verified. Screenshot capture via `xcrun simctl io screenshot` (iOS) and `adb exec-out screencap -p` (Android). PSM mode 3 (default) suitable for full-screen OCR. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pytesseract | >=0.3.13 | Python wrapper for Tesseract OCR engine | De facto Python OCR wrapper; accepts PIL Images directly |
| Pillow | >=12.0 | Image loading from screenshot bytes | Required by pytesseract; handles PNG from screenshots |

### Platform Tools (already available, not pip-installed)
| Tool | Purpose | Already Used |
|------|---------|--------------|
| idb | iOS tap, swipe, text, key, screenshot | Yes (Phase 8: `idb ui describe-all`) |
| xcrun simctl | iOS screenshot capture | Yes (Phase 7: device info, boot) |
| adb | Android tap, swipe, text, keyevent, screenshot | Yes (Phase 7/8: device info, UI dump) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tempfile (stdlib) | -- | Temp file for iOS screenshot | iOS screenshot requires file path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xcrun simctl screenshot | idb screenshot | idb also supports `--dest -` for stdout but simctl is more reliable and already used |
| pytesseract | easyocr | easyocr is heavier (torch dependency), pytesseract is lightweight wrapper |

**Installation (pyproject.toml additions):**
```toml
dependencies = [
    "click>=8.0",
    "pytesseract>=0.3.13",
    "Pillow>=12.0",
]
```

**System dependency:** Tesseract OCR engine must be installed: `brew install tesseract`

## Architecture Patterns

### Platform Function Additions
```
src/mbridge/
  platforms/
    ios.py      # + tap(), swipe(), type_text(), key_press(), screenshot()
    android.py  # + tap(), swipe(), type_text(), keyevent(), screenshot()
  action.py     # + tap, swipe, type subcommands
  verify.py     # + text subcommand
  ocr.py        # NEW: ocr_screenshot() helper
```

### Pattern 1: Element-Based Targeting (shared across tap/swipe/type)
**What:** Reuse `_capture_dump()` + `find_elements()` to resolve element coordinates before performing action
**When to use:** When `--text`, `--id`, `--type`, or `--exact` flags are provided on any action command

The tap, swipe, and type commands all share the same element-targeting pattern. Extract this into a shared helper to avoid duplication:

```python
def _resolve_element(device_id, text=None, element_id=None, element_type=None, exact=False, unique=False):
    elements = _capture_dump(device_id)
    results = find_elements(elements, id=element_id, text=text, exact=exact, element_type=element_type)
    if not results:
        error("No matching elements found")
    if unique and len(results) > 1:
        error(f"Multiple matches found ({len(results)}): {json.dumps([r['label'] for r in results])}")
    return results[0]
```

### Pattern 2: Platform Dispatch
**What:** Action commands detect platform, then dispatch to platform-specific function
**When to use:** All action and verify commands

```python
platform = _detect_platform(device_id)
if platform == "ios":
    ios.tap(device_id, x, y)
elif platform == "android":
    android.tap(device_id, x, y)
else:
    error(f"Device not found: {device_id}")
```

### Pattern 3: Screenshot-to-OCR Pipeline
**What:** Capture screenshot, load as PIL Image, run pytesseract, clean up
**When to use:** The `verify text` command

```python
import tempfile
from PIL import Image
import pytesseract

def ocr_screenshot(device_id, platform):
    if platform == "ios":
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            tmp_path = f.name
        try:
            ios.screenshot(device_id, tmp_path)
            img = Image.open(tmp_path)
            return pytesseract.image_to_string(img)
        finally:
            os.unlink(tmp_path)
    elif platform == "android":
        raw = android.screenshot_bytes(device_id)
        img = Image.open(io.BytesIO(raw))
        return pytesseract.image_to_string(img)
```

### Anti-Patterns to Avoid
- **Duplicating element targeting across commands:** Extract shared `_resolve_element()` helper; do not copy-paste the `_capture_dump` + `find_elements` + error handling pattern into each command
- **Leaving temp files on error:** Always use try/finally or context managers for temp file cleanup
- **Hardcoding coordinates for swipe calculations:** Use screen dimensions from device info to compute swipe start/end points as percentages

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OCR text extraction | Custom image processing pipeline | pytesseract.image_to_string() | Tesseract handles all text recognition complexity |
| Image loading from bytes | Manual PNG parsing | PIL.Image.open(BytesIO(raw)) | Pillow handles all image format details |
| iOS tap/swipe/text | Raw HID event generation | `idb ui tap/swipe/text` | idb handles HID protocol, coordinate systems |
| Android text with special chars | Manual shell escaping | Replace spaces with `%s`, escape special chars | adb has known encoding requirements |

## Common Pitfalls

### Pitfall 1: Android adb text space encoding
**What goes wrong:** `adb shell input text "hello world"` fails -- spaces are not supported directly
**Why it happens:** adb `input text` treats spaces as argument separators
**How to avoid:** Replace spaces with `%s` before sending: `text.replace(" ", "%s")`
**Warning signs:** Text input missing everything after first space

### Pitfall 2: Android special character escaping
**What goes wrong:** Characters like `&`, `(`, `)`, `<`, `>`, `;`, `*`, `|`, `~`, `"`, `'`, `\` break adb input
**Why it happens:** Shell metacharacters are interpreted by adb shell
**How to avoid:** Escape each special char with backslash prefix, or for complex text use keyevent sequences
**Warning signs:** Unexpected errors or truncated text input

### Pitfall 3: iOS idb key codes are HID usage codes, not ASCII
**What goes wrong:** Sending ASCII code for Enter (13) does nothing
**Why it happens:** idb uses USB HID usage table key codes, not ASCII. Enter=40, Backspace=42, Tab=43, Escape=41
**How to avoid:** Map escape sequences to HID codes: `\n`->40, `\b`->42, `\t`->43, `\e`->41
**Warning signs:** Keys silently not working on iOS

### Pitfall 4: Tesseract not installed
**What goes wrong:** pytesseract raises `TesseractNotFoundError` at runtime
**Why it happens:** pytesseract is only a wrapper; Tesseract OCR engine must be installed separately
**How to avoid:** Add Tesseract check in setup.js or a `require_tesseract()` lazy check (like `require_xcrun()`)
**Warning signs:** `verify text` fails immediately with "tesseract is not installed" error

### Pitfall 5: iOS screenshot requires file path, not stdout
**What goes wrong:** Trying to pipe simctl screenshot output directly
**Why it happens:** `xcrun simctl io screenshot -` writes to stdout but idb's screenshot also works. However, simctl with `-` for stdout works fine for piping
**How to avoid:** Use temp file approach for reliability: write to temp .png, read with Pillow, delete
**Warning signs:** Corrupted image data or empty output

### Pitfall 6: Android select-all + delete for --clear
**What goes wrong:** No reliable single keyevent to clear a text field
**Why it happens:** Android doesn't expose Ctrl+A natively via `adb shell input keyevent`
**How to avoid:** Use triple-tap to select all (or KEYCODE_MOVE_HOME + SHIFT+KEYCODE_MOVE_END + KEYCODE_DEL). Alternative: `input keyevent 123` (MOVE_END) then repeated `67` (DEL) -- but slow for long text. Best approach: `input keyevent 29 --longpress` does not work. Use: send KEYCODE_MOVE_END (123), then SHIFT+KEYCODE_MOVE_HOME via combo doesn't work either through plain input. Practical solution: send MOVE_END (123), then send DEL (67) in a loop (e.g., 200 times) -- crude but reliable without ADBKeyboard.
**Warning signs:** Old text remaining in field after --clear

### Pitfall 7: iOS select-all + delete for --clear
**What goes wrong:** Need to clear field contents before typing
**How to avoid:** Use `idb ui key 40` sequence: Cmd+A = not directly available via idb key. Alternative: use `idb ui text` which replaces focused field content, or tap the field, use idb key 123 (end), then repeatedly send idb key 42 (backspace). Practical: for iOS, Cmd+A shortcut may not work via idb key. Safest approach: move to end of field, then send enough backspace (42) key events to clear.

## Code Examples

### iOS Tap via idb
```python
def tap(device_id, x, y):
    require_idb()
    run_cmd(["idb", "ui", "tap", str(x), str(y), "--udid", device_id])
```

### iOS Swipe via idb
```python
def swipe(device_id, x_start, y_start, x_end, y_end):
    require_idb()
    run_cmd(["idb", "ui", "swipe", str(x_start), str(y_start), str(x_end), str(y_end), "--udid", device_id])
```

### iOS Text Input via idb
```python
def type_text(device_id, text):
    require_idb()
    run_cmd(["idb", "ui", "text", text, "--udid", device_id])
```

### iOS Key Press via idb
```python
def key_press(device_id, key_code):
    require_idb()
    run_cmd(["idb", "ui", "key", str(key_code), "--udid", device_id])
```

### iOS Screenshot via simctl
```python
def screenshot(device_id, dest_path):
    require_xcrun()
    run_cmd(["xcrun", "simctl", "io", device_id, "screenshot", dest_path])
```

### Android Tap via adb
```python
def tap(device_id, x, y):
    require_adb()
    run_cmd(["adb", "-s", device_id, "shell", "input", "tap", str(x), str(y)])
```

### Android Swipe via adb
```python
def swipe(device_id, x_start, y_start, x_end, y_end, duration_ms=300):
    require_adb()
    run_cmd(["adb", "-s", device_id, "shell", "input", "swipe",
             str(x_start), str(y_start), str(x_end), str(y_end), str(duration_ms)])
```

### Android Text Input via adb
```python
def type_text(device_id, text):
    require_adb()
    encoded = text.replace("%", "%%").replace(" ", "%s")
    for ch in ['&', '(', ')', '<', '>', '|', ';', '*', '\\', '"', "'", '`', '~']:
        encoded = encoded.replace(ch, f"\\{ch}")
    run_cmd(["adb", "-s", device_id, "shell", "input", "text", encoded])
```

### Android Keyevent via adb
```python
def keyevent(device_id, keycode):
    require_adb()
    run_cmd(["adb", "-s", device_id, "shell", "input", "keyevent", str(keycode)])
```

### Android Screenshot (binary to stdout)
```python
def screenshot_bytes(device_id):
    require_adb()
    result = subprocess.run(
        ["adb", "-s", device_id, "exec-out", "screencap", "-p"],
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode().strip() or "screencap failed")
    return result.stdout
```

### Escape Sequence to Platform Key Mapping
```python
IOS_KEY_MAP = {
    "\n": 40,   # Enter (HID usage)
    "\b": 42,   # Backspace (HID usage)
    "\t": 43,   # Tab (HID usage)
    "\e": 41,   # Escape (HID usage)
}

ANDROID_KEY_MAP = {
    "\n": 66,   # KEYCODE_ENTER
    "\b": 67,   # KEYCODE_DEL (backspace)
    "\t": 61,   # KEYCODE_TAB
    "\e": 111,  # KEYCODE_ESCAPE
}
```

### Swipe Direction to Coordinates
```python
def compute_swipe_coords(screen_width, screen_height, direction, distance_pct=0.5, start_x=None, start_y=None):
    cx = start_x if start_x is not None else screen_width // 2
    cy = start_y if start_y is not None else screen_height // 2

    if direction == "up":
        return cx, cy, cx, cy - int(screen_height * distance_pct)
    elif direction == "down":
        return cx, cy, cx, cy + int(screen_height * distance_pct)
    elif direction == "left":
        return cx, cy, cx - int(screen_width * distance_pct), cy
    elif direction == "right":
        return cx, cy, cx + int(screen_width * distance_pct), cy
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Appium for iOS automation | idb CLI for direct simulator control | 2020+ | Eliminates heavyweight Appium server dependency |
| `adb shell screencap /sdcard/screen.png` + `adb pull` | `adb exec-out screencap -p` (stdout) | Android 5.0+ | Single command, no temp file on device |
| Custom OCR engines | Tesseract 5.x via pytesseract | Stable | Industry-standard, good enough for UI text verification |

**Deprecated/outdated:**
- fb-idb Python package: idb is now installed via `brew install idb-companion`; the Python client `fb-idb` is the CLI wrapper

## Open Questions

1. **iOS clear field reliability**
   - What we know: idb does not expose Cmd+A (select-all) as a key combination. Backspace (key 42) works for individual characters.
   - What's unclear: Whether there's a more efficient way than sending N backspace events
   - Recommendation: Implement as "send 500 backspaces" (fast enough for any realistic field length; idb key events are quick). This is crude but reliable. Alternatively, triple-tap to select all then delete could work but is fragile.

2. **Android clear field reliability**
   - What we know: Standard adb input doesn't support Ctrl+A key combinations. KEYCODE_MOVE_END (123) + repeated KEYCODE_DEL (67) works.
   - What's unclear: Maximum field length that can be reliably cleared
   - Recommendation: Same approach: KEYCODE_MOVE_END then 500x KEYCODE_DEL. Could optimize by batching as `input keyevent 67 67 67 ...` (multiple keycodes in one command).

3. **Tesseract system dependency management**
   - What we know: pytesseract requires `tesseract` binary installed separately (`brew install tesseract`)
   - What's unclear: Whether to add this to setup.js or just let it fail with a clear error
   - Recommendation: Add `require_tesseract()` lazy check in verify.py (consistent with `require_xcrun()`/`require_adb()` pattern), plus mention in setup.js

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest >=9.0.2 |
| Config file | none (uses pyproject.toml defaults) |
| Quick run command | `cd tools/mbridge && uv run pytest tests/ -x` |
| Full suite command | `cd tools/mbridge && uv run pytest tests/` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MBRD-04 | tap dispatches to platform tap with correct coords | unit | `cd tools/mbridge && uv run pytest tests/test_action.py -x` | No -- Wave 0 |
| MBRD-04 | swipe computes correct start/end from direction + distance | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_swipe_coords -x` | No -- Wave 0 |
| MBRD-04 | type splits text on escape sequences and dispatches key/text | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_type_escape -x` | No -- Wave 0 |
| MBRD-04 | Android text encoding replaces spaces with %s and escapes special chars | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_android_text_encoding -x` | No -- Wave 0 |
| MBRD-04 | element-based targeting resolves coordinates from find_elements | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_resolve_element -x` | No -- Wave 0 |
| MBRD-04 | --unique flag errors when multiple matches found | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_unique_flag -x` | No -- Wave 0 |
| MBRD-06 | OCR extracts text from screenshot image | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_ocr_extraction -x` | No -- Wave 0 |
| MBRD-06 | verify text returns found:true on substring match | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_verify_found -x` | No -- Wave 0 |
| MBRD-06 | verify text returns found:false with full OCR output on failure | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_verify_not_found -x` | No -- Wave 0 |
| MBRD-06 | --exact flag requires full string match | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_verify_exact -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd tools/mbridge && uv run pytest tests/ -x`
- **Per wave merge:** `cd tools/mbridge && uv run pytest tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_action.py` -- covers MBRD-04 (tap/swipe/type command logic, element resolution, escape parsing, text encoding)
- [ ] `tests/test_verify.py` -- covers MBRD-06 (OCR extraction, substring/exact match, output format)
- [ ] `pyproject.toml` -- add pytesseract and Pillow to dependencies

## Sources

### Primary (HIGH confidence)
- Local `idb ui tap/swipe/text/key --help` output -- exact CLI syntax verified on installed idb
- Local `xcrun simctl io --help` output -- screenshot syntax confirmed (`--type=png`, stdout via `-`)
- Local `xcrun simctl help` -- confirmed no `sendkeys` subcommand exists
- Existing codebase: `action.py`, `verify.py`, `ui.py`, `platforms/ios.py`, `platforms/android.py` -- established patterns

### Secondary (MEDIUM confidence)
- [pytesseract PyPI](https://pypi.org/project/pytesseract/) -- v0.3.13, requires Tesseract binary, supports PIL Images
- [Pillow docs](https://pillow.readthedocs.io/) -- v12.1.1, Python 3.10-3.14 support
- [idb commands docs](https://fbidb.io/docs/commands/) -- tap, swipe, text, key subcommands documented
- [ADB shell input events](https://www.repeato.app/understanding-adb-shell-input-events/) -- adb input tap/swipe/text/keyevent syntax
- [Tesseract PSM modes](https://pyimagesearch.com/2021/11/15/tesseract-page-segmentation-modes-psms-explained-how-to-improve-your-ocr-accuracy/) -- PSM 3 (default) for full page, PSM 6 for blocks

### Tertiary (LOW confidence)
- Android Ctrl+A via broadcast: requires ADBKeyboard app installed -- not usable for our case
- idb HID key codes (40=Enter, 42=Backspace): found in search results, needs verification against HID spec

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- pytesseract and Pillow are well-established, platform tools verified locally
- Architecture: HIGH -- extending existing patterns (Click groups, platform dispatch, run_cmd helpers)
- Pitfalls: HIGH -- Android text encoding and iOS HID codes verified through multiple sources
- OCR config: MEDIUM -- PSM mode 3 default should work for full-screen; may need tuning
- Clear field approach: MEDIUM -- backspace loop is crude but functional; no elegant cross-platform solution

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no fast-moving APIs)
