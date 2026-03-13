# Phase 8: mbridge UI Parsing - Research

**Researched:** 2026-03-13
**Domain:** Mobile UI hierarchy capture, parsing, and element querying (iOS + Android)
**Confidence:** HIGH

## Summary

This phase adds two subcommands to the `mbridge ui` Click group: `dump` (capture full UI hierarchy) and `find` (query elements). The primary technical challenge is capturing accessibility trees from two platforms using different tools and normalizing them into a single JSON schema.

For iOS, the recommended tool is **idb** (Facebook's iOS Development Bridge), which provides `idb ui describe-all` returning a flat JSON array of accessibility elements with frame coordinates in logical points. idb is the de facto standard used by virtually all modern iOS simulator automation tools (MCP servers, Claude skills, etc.). It requires a two-part install (companion via Homebrew, client via pip) but is mature and reliable. A known limitation is that child elements of "group" parents may not appear in `describe-all` output (GitHub issue #767, unresolved), but for most practical UI automation this is adequate.

For Android, the decision to use `adb shell uiautomator dump` is locked. The command produces XML with a `<hierarchy>` root containing nested `<node>` elements. Each node has attributes including `bounds` (format `[x1,y1][x2,y2]`), `class`, `text`, `resource-id`, `content-desc`, and interaction state flags. Python's stdlib `xml.etree.ElementTree` is sufficient for parsing and supports enough XPath for the `--xpath` flag (attribute matching, descendant navigation, position predicates). No `lxml` dependency needed.

**Primary recommendation:** Use idb for iOS UI hierarchy capture, `adb shell uiautomator dump /dev/tty` for Android, Python stdlib `xml.etree.ElementTree` for Android XML parsing, and normalize both into a unified element schema with fields: type, label, accessibility_id, bounds, center, enabled, visible, children.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Unified element schema across iOS and Android -- same JSON structure regardless of platform
- Core fields per element: type, label, accessibility_id, bounds (x/y/w/h), center (x/y), enabled, visible, children
- Element types normalized to generic names: Button, Label, TextField, Image, Switch, View, etc.
- iOS UI hierarchy source: idb is acceptable as dependency; must produce structured JSON data
- Android UI hierarchy source: use `adb shell uiautomator dump`
- Flag-based query API: --id (accessibility ID), --text (text content), --xpath (XPath expression)
- --text uses substring matching by default, --exact flag for exact match
- --type flag to filter by normalized element type (combinable with other flags)
- Multiple matches return JSON array of all matching elements
- `find` is self-contained: captures a fresh dump internally, then queries it
- Coordinates in platform-native space: logical points for iOS, pixels for Android
- Both bounds rect (x/y/w/h) AND computed center point (x/y) on every element
- Visibility determined bounds-based: element visible if bounds intersect screen dimensions
- `find` returns ALL elements by default (not just visible)

### Claude's Discretion
- Type normalization mapping (exact mapping table for iOS and Android native types to generic names)
- XPath implementation details (library choice, expression evaluation)
- Internal dump caching strategy (if any, within a single command invocation)
- Error handling for partial dumps or timeouts

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MBRD-03 | UI dump parsing -- iOS JSON and Android XML | idb `ui describe-all` for iOS JSON, `adb shell uiautomator dump /dev/tty` for Android XML; both parsed and normalized into unified schema |
| MBRD-05 | Element finding by accessibility ID, text, XPath | Flag-based `find` subcommand with --id, --text, --xpath, --type filters; Python stdlib xml.etree for XPath on normalized tree |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| idb (fb-idb + idb-companion) | latest (PyPI: fb-idb) | iOS accessibility tree capture via `idb ui describe-all` | Used by all modern iOS simulator MCP servers; only reliable programmatic access to iOS accessibility tree |
| xml.etree.ElementTree | stdlib (Python 3.12+) | Parse Android uiautomator XML dump | No external dependency; sufficient XPath support for attribute matching and descendant navigation |
| click | >=8.0 (already in pyproject.toml) | CLI command structure | Already established in mbridge |
| json | stdlib | Parse idb output, produce normalized output | Already used throughout mbridge |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| re | stdlib | Parse Android bounds format `[x1,y1][x2,y2]` | Android element parsing |
| subprocess | stdlib | Run idb and adb commands | Already used in platforms/ modules |
| shutil | stdlib | Check tool availability (idb, adb) | Already used for require_xcrun/require_adb pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| idb | AXe (`brew install cameroncooke/axe/axe`) | Newer, single binary, no Python dependency, but less mature; `describe-ui` output format not well documented; idb is battle-tested |
| idb | xctree (`brew tap ldomaradzki/xctree`) | Lightweight accessibility tree inspector, but purely a viewer; no interaction commands for Phase 9 |
| xml.etree.ElementTree | lxml | Full XPath 1.0 support vs limited subset, but adds C dependency; stdlib subset handles needed queries |

**Installation:**
```bash
# idb companion (macOS, one-time)
brew tap facebook/fb
brew install idb-companion

# idb Python client (added to pyproject.toml)
# Add "fb-idb" to dependencies in pyproject.toml
```

**Note on idb dependency:** idb has two components. The companion (brew) is a system-level tool like xcrun/adb and is NOT a Python dependency. The Python client (`fb-idb` on PyPI) communicates with the companion via gRPC. For mbridge, we should call idb as an external CLI tool (like we call xcrun and adb), NOT import fb-idb as a Python library. This avoids the fb-idb dependency entirely -- the user just needs `idb` on their PATH. This is consistent with how mbridge already uses xcrun and adb.

## Architecture Patterns

### Recommended Project Structure
```
src/mbridge/
    ui.py                  # Click group with dump and find subcommands
    platforms/
        ios.py             # Add: dump_ui() using idb, require_idb()
        android.py         # Add: dump_ui() using adb uiautomator
    parsing/
        __init__.py
        normalize.py       # Unified element schema + type mapping
        ios_parser.py      # Parse idb JSON -> normalized tree
        android_parser.py  # Parse uiautomator XML -> normalized tree
        query.py           # Element finding: by id, text, xpath, type
```

### Pattern 1: Platform dispatch (established)
**What:** device.py's `_detect_platform()` routes to platform-specific functions
**When to use:** All commands that need to work on both platforms
**Example:** The `dump` and `find` subcommands detect platform, call the appropriate dump function, then normalize the result.

### Pattern 2: Normalized element schema
**What:** Both platforms produce the same JSON structure regardless of source
**When to use:** All output from dump and find commands
**Example:**
```python
# Normalized element structure
{
    "type": "Button",           # Normalized type name
    "label": "Sign In",         # Display text (AXLabel on iOS, text on Android)
    "accessibility_id": "login_btn",  # AXUniqueId on iOS, resource-id on Android
    "bounds": {"x": 30, "y": 700, "width": 360, "height": 50},
    "center": {"x": 210, "y": 725},
    "enabled": True,
    "visible": True,
    "children": [...]           # Nested normalized elements
}
```

### Pattern 3: CLI tool as subprocess (established)
**What:** Call external tools (idb, adb) via subprocess.run(), parse stdout
**When to use:** All platform-specific operations
**Example:** Follows exact same pattern as `run_cmd()` in platforms/ios.py and platforms/android.py.

### Anti-Patterns to Avoid
- **Importing fb-idb as Python library:** Adds heavyweight gRPC dependency chain. Call `idb` CLI via subprocess instead, consistent with xcrun/adb pattern.
- **Two-step adb dump (dump to file + pull):** Use `adb exec-out uiautomator dump /dev/tty` for single-command stdout capture. Strip trailing "UI hierchary dumped to: /dev/tty" message.
- **Building full XPath engine for find command:** User-facing `--xpath` queries run against the normalized JSON tree, not raw XML. Use Python's stdlib ElementTree XPath on an intermediate XML representation if needed, or implement simple path-based matching on the JSON tree directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS accessibility tree | Custom AppleScript/XCUITest bridge | `idb ui describe-all` | Apple's private accessibility APIs are fragile; idb wraps them correctly |
| Android UI hierarchy | Custom accessibility service | `adb shell uiautomator dump /dev/tty` | Standard tool, works on all Android versions |
| XML parsing | Regex-based XML parser | `xml.etree.ElementTree` | XML is hierarchical; regex cannot handle nesting correctly |
| Bounds parsing (Android) | Complex parser | Regex `r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]'` | Format is fixed `[x1,y1][x2,y2]`, simple regex is reliable |

**Key insight:** The entire iOS accessibility pipeline depends on idb's companion process handling Apple's private APIs. Attempting to replicate this (e.g., via AppleScript, XCUITest, or WebDriverAgent) would require managing Xcode projects, signing, and deployment -- vastly more complex than calling one CLI command.

## Common Pitfalls

### Pitfall 1: idb companion not running
**What goes wrong:** `idb ui describe-all` fails with connection error
**Why it happens:** idb companion must be running for the target simulator. It auto-starts when idb is used, but can crash or disconnect.
**How to avoid:** Check for idb availability with `shutil.which("idb")`, and provide clear error message: "idb not found. Install: brew tap facebook/fb && brew install idb-companion && pip3 install fb-idb"
**Warning signs:** Connection refused errors, empty output

### Pitfall 2: uiautomator dump trailing message
**What goes wrong:** XML parsing fails because output includes "UI hierchary dumped to: /dev/tty" appended after the XML
**Why it happens:** uiautomator always appends this status message to stdout
**How to avoid:** Strip everything after the closing `</hierarchy>` tag, or strip the known suffix string
**Warning signs:** XML parse error on the last line

### Pitfall 3: idb describe-all missing group children
**What goes wrong:** Elements nested inside tab bars, toolbars, or other group containers don't appear in output
**Why it happens:** Known idb issue #767 -- Apple's NSAccessibilityElement API doesn't expose accessibilityChildren for group elements
**How to avoid:** Accept this as a known limitation. For most UI automation, the flat list is sufficient. Document it. If critical elements are missing, `idb ui describe-point X Y` can be used as a targeted fallback.
**Warning signs:** UI elements visible on screen but absent from dump

### Pitfall 4: Android uiautomator fails on animated screens
**What goes wrong:** Dump hangs or returns error "could not get idle state"
**Why it happens:** uiautomator waits for the UI thread to be idle; continuous animations prevent this
**How to avoid:** Implement retry logic (3 attempts with short delay, matching mobilecli's test-helpers.sh pattern). Return partial results or clear error on timeout.
**Warning signs:** Command hangs for 10+ seconds, empty output

### Pitfall 5: Coordinate space mismatch
**What goes wrong:** Tap coordinates from dump don't hit the expected element
**Why it happens:** iOS idb returns logical points (correct for simctl tap), but if scale factor is wrong, physical coordinates won't match. Android uiautomator returns pixel coordinates matching `wm size`.
**How to avoid:** iOS coordinates from idb `frame` field are already in logical points -- use as-is. Android `bounds` are already in pixels -- use as-is. No conversion needed for this phase. coords.py is available if Phase 9 needs conversion.
**Warning signs:** Taps landing on wrong elements, off by 2x or 3x

### Pitfall 6: idb flat output vs hierarchical need
**What goes wrong:** `describe-all` returns a flat JSON array, but normalized schema requires `children` field for hierarchy
**Why it happens:** idb intentionally returns a flat list, not a tree
**How to avoid:** For iOS, the flat list IS the hierarchy (one level). Set `children: []` for all iOS elements. The normalized schema supports children for Android's naturally hierarchical XML, but iOS elements are leaf nodes. This is acceptable -- the skill consumer (SKILL.md) primarily uses find-by-id/text/type, not tree traversal.
**Warning signs:** Expecting nested iOS trees when none exist

## Code Examples

### iOS: Capture and parse idb output
```python
# Source: idb docs (fbidb.io/docs/accessibility/)
import json
import subprocess

def require_idb():
    if not shutil.which("idb"):
        raise RuntimeError(
            "idb not found. Install: brew tap facebook/fb && "
            "brew install idb-companion && pip3 install fb-idb"
        )

def dump_ui_ios(device_id):
    require_idb()
    result = subprocess.run(
        ["idb", "ui", "describe-all", "--udid", device_id],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "idb ui describe-all failed")
    elements = json.loads(result.stdout)
    return elements  # List of dicts with AXLabel, frame, type, role, etc.
```

### idb element JSON structure
```json
// Source: fbidb.io/docs/accessibility/
{
  "AXFrame": "{{21.5, 28}, {72, 87.5}}",
  "AXUniqueId": "Calendar",
  "frame": {"y": 28, "x": 21.5, "width": 72, "height": 87.5},
  "role_description": "button",
  "AXLabel": "Calendar",
  "content_required": false,
  "type": "Button",
  "title": null,
  "help": null,
  "custom_actions": ["Edit mode", "Today"],
  "AXValue": "Wednesday, October 14",
  "enabled": true,
  "role": "AXButton",
  "subrole": null
}
```

### Android: Capture and parse uiautomator dump
```python
# Source: adb documentation, adbpy patterns
import re
import xml.etree.ElementTree as ET

BOUNDS_RE = re.compile(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]')

def dump_ui_android(device_id):
    require_adb()
    result = subprocess.run(
        ["adb", "-s", device_id, "exec-out", "uiautomator", "dump", "/dev/tty"],
        capture_output=True, text=True
    )
    stdout = result.stdout
    # Strip trailing status message
    end_tag = "</hierarchy>"
    idx = stdout.find(end_tag)
    if idx >= 0:
        stdout = stdout[:idx + len(end_tag)]
    return ET.fromstring(stdout)

def parse_bounds(bounds_str):
    """Parse '[x1,y1][x2,y2]' -> {x, y, width, height}"""
    m = BOUNDS_RE.match(bounds_str)
    if not m:
        return None
    x1, y1, x2, y2 = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
    return {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1}
```

### Android XML node attributes
```xml
<!-- Source: uiautomator dump output format -->
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout"
        package="com.example.app" content-desc="" checkable="false"
        checked="false" clickable="false" enabled="true" focusable="false"
        focused="false" scrollable="false" long-clickable="false"
        password="false" selected="false" bounds="[0,0][1080,2340]">
    <node index="0" text="Sign In" resource-id="com.example:id/btn_login"
          class="android.widget.Button" content-desc="Login button"
          bounds="[30,700][390,750]" clickable="true" enabled="true"
          ...>
    </node>
  </node>
</hierarchy>
```

### Type normalization mapping
```python
# iOS type -> normalized (from idb "type" field)
IOS_TYPE_MAP = {
    "Button": "Button",
    "StaticText": "Label",
    "TextField": "TextField",
    "SecureTextField": "SecureTextField",
    "TextArea": "TextArea",
    "Image": "Image",
    "Switch": "Switch",
    "Slider": "Slider",
    "Cell": "Cell",
    "Table": "ScrollView",
    "ScrollView": "ScrollView",
    "NavigationBar": "NavigationBar",
    "TabBar": "TabBar",
    "Alert": "Alert",
    "Sheet": "Sheet",
    "Group": "View",
    "Other": "View",
    "Application": "Application",
    "Window": "Window",
}

# Android class -> normalized (from XML "class" attribute)
ANDROID_TYPE_MAP = {
    "android.widget.Button": "Button",
    "android.widget.TextView": "Label",
    "android.widget.EditText": "TextField",
    "android.widget.ImageView": "Image",
    "android.widget.ImageButton": "Button",
    "android.widget.Switch": "Switch",
    "android.widget.CheckBox": "CheckBox",
    "android.widget.RadioButton": "RadioButton",
    "android.widget.Spinner": "Picker",
    "android.widget.SeekBar": "Slider",
    "android.widget.ProgressBar": "ProgressBar",
    "android.widget.ScrollView": "ScrollView",
    "android.widget.HorizontalScrollView": "ScrollView",
    "android.widget.ListView": "ScrollView",
    "android.widget.RecyclerView": "ScrollView",
    "android.widget.FrameLayout": "View",
    "android.widget.LinearLayout": "View",
    "android.widget.RelativeLayout": "View",
    "android.view.View": "View",
    "android.view.ViewGroup": "View",
    "android.webkit.WebView": "WebView",
}
# Fallback: strip package prefix, use class simple name
```

### Visibility calculation
```python
def is_visible(element_bounds, screen_width, screen_height):
    """Check if element bounds intersect with screen dimensions."""
    x, y = element_bounds["x"], element_bounds["y"]
    w, h = element_bounds["width"], element_bounds["height"]
    if w <= 0 or h <= 0:
        return False
    return (x + w > 0 and y + h > 0 and
            x < screen_width and y < screen_height)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebDriverAgent for iOS UI inspection | idb `ui describe-all` | 2019 (Facebook deprecated WDA, open-sourced idb) | idb is simpler, no Xcode project management needed |
| adb pull + file-based uiautomator dump | `adb exec-out uiautomator dump /dev/tty` | Available since ADB platform-tools ~28+ | Single command, no file transfer needed |
| lxml for all XML parsing | stdlib xml.etree.ElementTree | Python 3.8+ improved XPath support | No C dependency needed for basic XPath |
| AXe (single binary, no companion) | New entrant (2025) | 2025 | Promising but less documented than idb; worth watching |

**Deprecated/outdated:**
- WebDriverAgent (facebookarchive/WebDriverAgent): Archived by Facebook, maintained by Appium but heavyweight
- `adb shell uiautomator dump` (file-based): Still works but requires separate pull step; `/dev/tty` approach is better

## Open Questions

1. **idb group children limitation (issue #767)**
   - What we know: `describe-all` may not return children of group elements (tab bars, toolbars)
   - What's unclear: Whether this affects all iOS apps or just certain configurations
   - Recommendation: Accept limitation for v1. Document it. If a user reports missing elements, `idb ui describe-point` can be used as targeted fallback per-coordinate.

2. **idb vs AXe for future phases**
   - What we know: AXe is newer, single-binary, no companion process. But its output format is less documented.
   - What's unclear: Whether AXe's `describe-ui` provides the same field richness as idb's `describe-all`
   - Recommendation: Use idb for Phase 8 (proven, documented). Re-evaluate AXe for Phase 9+ if idb causes friction.

3. **XPath on normalized JSON tree**
   - What we know: User wants --xpath flag. The normalized output is JSON, not XML.
   - What's unclear: How to apply XPath to a JSON tree structure
   - Recommendation: Convert normalized JSON tree to XML temporarily for XPath evaluation using `xml.etree.ElementTree`. Build a small converter: element -> XML node with attributes, then run XPath, then return matching elements as normalized JSON. This gives real XPath behavior with no additional dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (standard for Python CLI tools) |
| Config file | none -- Wave 0 gap |
| Quick run command | `cd tools/mbridge && uv run pytest tests/ -x -q` |
| Full suite command | `cd tools/mbridge && uv run pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MBRD-03 | iOS idb JSON parsed into normalized schema | unit | `uv run pytest tests/test_ios_parser.py -x` | No -- Wave 0 |
| MBRD-03 | Android uiautomator XML parsed into normalized schema | unit | `uv run pytest tests/test_android_parser.py -x` | No -- Wave 0 |
| MBRD-03 | `mbridge ui dump <device_id>` produces normalized JSON | integration | manual (requires simulator/emulator) | manual-only |
| MBRD-05 | Find by --id matches accessibility_id field | unit | `uv run pytest tests/test_query.py::test_find_by_id -x` | No -- Wave 0 |
| MBRD-05 | Find by --text matches label with substring | unit | `uv run pytest tests/test_query.py::test_find_by_text -x` | No -- Wave 0 |
| MBRD-05 | Find by --text --exact matches exact label | unit | `uv run pytest tests/test_query.py::test_find_by_text_exact -x` | No -- Wave 0 |
| MBRD-05 | Find by --xpath evaluates XPath expression | unit | `uv run pytest tests/test_query.py::test_find_by_xpath -x` | No -- Wave 0 |
| MBRD-05 | Find by --type filters normalized element type | unit | `uv run pytest tests/test_query.py::test_find_by_type -x` | No -- Wave 0 |
| MBRD-05 | Combined filters (--text + --type) work together | unit | `uv run pytest tests/test_query.py::test_combined_filters -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd tools/mbridge && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd tools/mbridge && uv run pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tools/mbridge/tests/__init__.py` -- package init
- [ ] `tools/mbridge/tests/test_ios_parser.py` -- iOS JSON parsing with fixture data
- [ ] `tools/mbridge/tests/test_android_parser.py` -- Android XML parsing with fixture data
- [ ] `tools/mbridge/tests/test_query.py` -- element finding (id, text, xpath, type, combined)
- [ ] `tools/mbridge/tests/test_normalize.py` -- type mapping, visibility, bounds computation
- [ ] `tools/mbridge/tests/fixtures/` -- sample idb JSON and uiautomator XML files
- [ ] pytest added to pyproject.toml `[project.optional-dependencies]` dev group
- [ ] Framework install: `cd tools/mbridge && uv add --dev pytest`

## Sources

### Primary (HIGH confidence)
- [fbidb.io/docs/accessibility/](https://fbidb.io/docs/accessibility/) - idb `ui describe-all` command, JSON output format, element fields
- [fbidb.io/docs/commands/](https://fbidb.io/docs/commands/) - Full idb command reference
- [fbidb.io/docs/installation/](https://fbidb.io/docs/installation/) - Two-part install (companion + client)
- [fbidb.io/docs/architecture/](https://fbidb.io/docs/architecture/) - Companion/client gRPC architecture
- [docs.python.org/3/library/xml.etree.elementtree.html](https://docs.python.org/3/library/xml.etree.elementtree.html) - ElementTree XPath support (supported expressions, limitations)
- Existing mbridge codebase (platforms/ios.py, platforms/android.py, device.py, output.py, coords.py) - Established patterns

### Secondary (MEDIUM confidence)
- [github.com/facebook/idb/issues/767](https://github.com/facebook/idb/issues/767) - describe-all missing group children (confirmed open issue)
- [github.com/cameroncooke/AXe](https://github.com/cameroncooke/AXe) - AXe alternative for iOS, describe-ui command
- [github.com/ldomaradzki/xctree](https://github.com/ldomaradzki/xctree) - xctree accessibility tree CLI
- mobilecli test-helpers.sh (local) - Reference implementation for dump/find/tap patterns, retry logic

### Tertiary (LOW confidence)
- AXe `describe-ui` output format - Not well documented; JSON fields inferred from Claude skill gists, not official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - idb is well-documented and ubiquitous; uiautomator dump is Android standard; stdlib xml.etree is Python standard
- Architecture: HIGH - Follows established mbridge patterns (platform dispatch, CLI subprocess, Click groups)
- Pitfalls: HIGH - Known issues documented with sources (idb #767, uiautomator trailing text, animated screen failures)
- Type mapping: MEDIUM - Mappings inferred from idb docs and Android widget classes; may need runtime adjustment for uncommon types

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain; idb and uiautomator change infrequently)
