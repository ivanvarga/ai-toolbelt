# Phase 8: mbridge UI Parsing - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

mbridge can capture and parse UI hierarchy from iOS and Android devices and find elements within it. Two commands: `mbridge ui dump` (full tree) and `mbridge ui find` (query elements). UI interaction (tap, swipe, type) belongs in Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Output normalization
- Unified element schema across iOS and Android — same JSON structure regardless of platform
- Core fields per element: type, label, accessibility_id, bounds (x/y/w/h), center (x/y), enabled, visible, children
- Element types normalized to generic names: Button, Label, TextField, Image, Switch, View, etc. (not UIButton or android.widget.Button)
- Normalization optimized for SKILL.md consumption — the skill shouldn't need platform awareness when querying

### iOS UI hierarchy source
- Research phase should investigate: how mobilecli and rn-debugger MCP capture iOS accessibility trees
- idb (Facebook) is acceptable as a dependency — standard mobile dev tooling
- Research should evaluate library maturity and reliability as primary selection criteria
- Must produce structured data (JSON or equivalent) that can be normalized into unified schema

### Android UI hierarchy source
- Use `adb shell uiautomator dump` — standard, well-known, works on all Android versions
- Known limitation: fails on constantly-animating screens (same as mobilecli)
- Parse XML output and normalize into unified element schema

### Element finding
- Flag-based query API: --id (accessibility ID), --text (text content), --xpath (XPath expression), extensible for future strategies
- --text uses substring matching by default, --exact flag for exact match
- --type flag to filter by normalized element type (combinable with other flags)
- Multiple matches return JSON array of all matching elements
- `find` is self-contained: captures a fresh dump internally, then queries it (one-shot, no piping required)

### Position & bounds
- Coordinates in platform-native space: logical points for iOS, pixels for Android (what each platform's touch APIs expect)
- Both bounds rect (x/y/w/h) AND computed center point (x/y) on every element
- Visibility determined bounds-based: element visible if bounds intersect screen dimensions (baseline approach)
- Research should investigate whether idb or other tools solve scroll container visibility and occlusion detection — this was problematic in previous mbridge attempts
- `find` returns ALL elements by default (not just visible) — SKILL.md handles filtering

### Claude's Discretion
- Type normalization mapping (exact mapping table for iOS and Android native types to generic names)
- XPath implementation details (library choice, expression evaluation)
- Internal dump caching strategy (if any, within a single command invocation)
- Error handling for partial dumps or timeouts

</decisions>

<specifics>
## Specific Ideas

- Previous mbridge attempt failed on element positioning: pixel density, scroll position, visibility, app focus were all potential causes. Research must verify that the chosen iOS library and uiautomator give reliable bounds
- Visibility detection struggled with elements in scrollable containers and absolute-positioned items covering others. Research should check if existing libraries (idb, etc.) solve this natively before falling back to bounds-based heuristics
- The SKILL.md is the primary consumer — all design choices should optimize for what makes the skill's job easiest (normalized types, precomputed centers, one-shot find)
- mobilecli's test-helpers.sh has 50+ functions for dump/find/tap patterns — study these during research as the reference for what workflows mbridge must support

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- coords.py: logical_to_physical, physical_to_logical, screen_logical_size — ready for position conversion
- output.py: JSON output helper + error helper — all new commands should use these
- device.py: _detect_platform() auto-detects iOS vs Android from device ID
- platforms/ios.py: run_cmd(), require_xcrun(), _get_screen_info() — reusable subprocess and screen dimension helpers
- platforms/android.py: run_cmd(), require_adb(), _get_screen_info() — same pattern for Android

### Established Patterns
- Click command groups with device_id as required positional arg
- JSON output via output.output() for all command results
- Platform modules (ios.py, android.py) handle platform-specific logic, device.py dispatches
- Lazy tool checks: require_xcrun()/require_adb() per-command, not at startup

### Integration Points
- ui.py: empty Click group placeholder, ready for dump and find subcommands
- UI parsing modules will likely follow platforms/ pattern (ios.py and android.py each implement dump/parse)
- find command needs access to screen dimensions from device info for visibility calculation
- Element coordinates feed directly into Phase 9 tap/swipe commands

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-mbridge-ui-parsing*
*Context gathered: 2026-03-13*
