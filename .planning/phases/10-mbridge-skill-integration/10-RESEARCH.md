# Phase 10: mbridge Skill Integration - Research

**Researched:** 2026-03-14
**Domain:** Claude Code skill authoring, mbridge CLI integration, mobilecli-to-mbridge migration
**Confidence:** HIGH

## Summary

Phase 10 creates a SKILL.md for mbridge in `skills/mbridge/`, deletes `skills/mobilecli/`, and optionally adds a doctor check. The mbridge CLI is fully built (Phases 7-9) with device, app, ui, action, and verify command groups. The skill must teach Claude Code how to sequence raw mbridge CLI calls for mobile automation -- no wrapper scripts, no bash helpers, no test-helpers.sh.

The mobilecli SKILL.md (510 lines) serves as the structural template but the content is fundamentally different: mbridge's element-targeting flags (`--text`, `--id`, `--type`, `--exact`, `--unique`) replace the entire dump-then-jq-then-tap pattern, eliminating the need for test-helpers.sh or any bash boilerplate. The skill is a direct CLI reference with workflow guidance.

**Primary recommendation:** Create a single SKILL.md (~500 lines) that documents all mbridge commands with flags, establishes the navigation priority order, defines the `.mbridge/` cache structure, and includes both Common Mistakes and Red Flags guardrail sections. Delete `skills/mobilecli/` entirely.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Heavy reference (~500 lines), comparable to mobilecli's SKILL.md
- Full command reference with all flags and options documented
- Includes Common Mistakes table AND Red Flags - STOP section (both guardrail sections)
- Platform-specific notes limited to behavioral differences only (e.g., Android BACK exits app at nav root) -- skip internal details mbridge handles automatically
- No debug mode for v1 -- focus on core automation
- Fresh discovery only -- no import from .mobilecli/ directory
- Per-project storage at .mbridge/ (created on first use with user permission, added to .gitignore)
- Clean namespace, no confusion with mobilecli
- Delete skills/mobilecli/ directory entirely -- clean break, git history preserves it
- mbridge is the only mobile skill after Phase 10
- Permissions: both allowed-tools frontmatter (Bash(mbridge:*)) AND recommended permissions section for user's global settings (Bash(mbridge:*), Bash(adb:*), Bash(xcrun:*))
- Direct CLI calls -- no wrapper scripts, no bash helpers, no sourcing boilerplate
- Each step is a raw mbridge command; Claude sequences them in Bash tool calls
- Batch 3-5 mbridge commands per Bash call with && for sequential execution
- Subagent delegation for 5+ test flows (single device = sequential only)
- Navigation strategy priority order: 1) deeplinks (mbridge app open-url), 2) element targeting (mbridge action tap --text), 3) swipe + retry, 4) OCR verify as verification fallback

### Claude's Discretion
- Config persistence approach (JSON config file vs session-level memory)
- Deeplink discovery approach (subagent vs inline)
- Doctor check inclusion
- Exact content and order of Common Mistakes / Red Flags sections
- Workflow example selection and depth

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MBRD-07 | mbridge SKILL.md that leverages app code knowledge and mobilecli context/cache | Full mbridge CLI command inventory documented; SKILL.md structure modeled on mobilecli (510 lines); .mbridge/ cache system defined; app context via deeplink discovery and per-project config |
</phase_requirements>

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| SKILL.md | Plugin frontmatter v1 | Skill definition with name, description, allowed-tools | Established plugin pattern from Phases 3-4 |
| mbridge CLI | 0.1.0 | Mobile device bridge | Built in Phases 7-9, installed via `uv tool install` |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| scripts/checks/*.sh | Doctor check scripts | If doctor check is added (Claude's discretion) |
| .mbridge/ | Per-project cache directory | Created on first use for deeplinks, device context, app config |

## Architecture Patterns

### Skill Directory Structure
```
skills/mbridge/
  SKILL.md              # ~500 lines, full command reference + workflow guidance
```

No supporting files needed. mbridge commands are self-contained -- no test-helpers.sh, no DEBUG-MODE.md, no env.sh sourcing.

### SKILL.md Structure (modeled on mobilecli)

The SKILL.md follows this order based on mobilecli's proven structure:
```
1. Frontmatter (name, description, allowed-tools)
2. Overview (core principle: element targeting replaces dump+jq+tap)
3. Quick Start (3-4 command examples)
4. Pre-flight Check (app launch verification)
5. Device Selection (ask user when multiple)
6. Command Reference (full reference with all flags)
   - device list/boot/info
   - app list/foreground/launch/open-url
   - ui dump/find
   - action tap/swipe/type
   - verify text
7. Navigation Strategy (priority order)
8. Deeplink Pitfalls
9. Multi-step Automation Pattern (batching, subagents)
10. Cache Strategy (.mbridge/)
11. Workflow Examples
12. Known Limitations
13. Recommended Permissions
14. Common Mistakes (table)
15. Red Flags - STOP (bullet list)
```

### Frontmatter Pattern
```yaml
---
name: mbridge
description: Use when interacting with mobile apps on iOS simulators, Android emulators, or real devices. Use when tapping UI elements, navigating screens, testing mobile flows, verifying screen content, opening deeplinks, or automating any mobile device interaction.
allowed-tools: Bash(mbridge:*)
---
```

Key notes:
- `allowed-tools: Bash(mbridge:*)` matches the `Bash(mobilecli:*)` pattern from mobilecli
- No `disable-model-invocation` needed -- safe for auto-trigger (read-only device interaction)
- Description mirrors mobilecli's but updates tool name

### mbridge CLI Command Inventory

All commands produce JSON output via `output()` (pretty-printed `json.dumps`). Errors go to stderr as `{"error": "..."}` and exit 1.

**device group:**
- `mbridge device list [--platform ios|android]`
- `mbridge device boot DEVICE_ID`
- `mbridge device info DEVICE_ID`

**app group:**
- `mbridge app list DEVICE_ID`
- `mbridge app foreground DEVICE_ID`
- `mbridge app launch DEVICE_ID BUNDLE_ID`
- `mbridge app open-url DEVICE_ID URL`

**ui group:**
- `mbridge ui dump DEVICE_ID`
- `mbridge ui find DEVICE_ID [--id ID] [--text TEXT] [--exact] [--type TYPE] [--xpath XPATH]`

**action group:**
- `mbridge action tap DEVICE_ID [--x X --y Y] [--text TEXT] [--id ID] [--type TYPE] [--exact] [--unique]`
- `mbridge action swipe DEVICE_ID DIRECTION [--distance FLOAT] [--text TEXT] [--id ID] [--type TYPE] [--exact] [--from X,Y]`
  - DIRECTION: up, down, left, right
- `mbridge action type DEVICE_ID TEXT [--text ELEMENT_TEXT] [--id ID] [--type TYPE] [--exact] [--clear]`

**verify group:**
- `mbridge verify text DEVICE_ID EXPECTED [--exact]`

**Global flag:**
- `mbridge --verbose` / `-v`

### Element Output Format

All elements (from ui dump/find, used internally by action commands) have this normalized shape:
```json
{
  "type": "Button",
  "label": "Sign Up",
  "accessibility_id": "signup_btn",
  "bounds": {"x": 100, "y": 200, "width": 150, "height": 44},
  "center": {"x": 175, "y": 222},
  "enabled": true,
  "visible": true,
  "children": []
}
```

### Key Advantage Over mobilecli

mobilecli required a 5-step pattern:
```bash
mobilecli dump ui --device $D > cache/screen.json
jq -r '...' cache/screen.json | head -1   # find element
mobilecli io tap --device $D 305,434       # tap coordinates
```

mbridge does it in one command:
```bash
mbridge action tap $D --text "Sign Up"
```

The `--text/--id/--type` flags on action commands internally call `_capture_dump` + `find_elements` + platform dispatch. This eliminates the need for jq, cached dump files, and test-helpers.sh entirely.

### .mbridge/ Cache Structure
```
.mbridge/
  config.json           # App settings: device_id, bundle_id, deeplink_scheme
  deeplinks.md          # Discovered deeplink schema (persisted across sessions)
```

Simpler than mobilecli's .mobilecli/ -- no cache/*.json files needed because mbridge does its own internal dumps. Only persistent project-level config and deeplink research need files.

### Permission Logic for .mbridge/
```
.mbridge/ exists? -> Use silently
.mbridge/ does not exist? -> Ask user once
  -> yes: Create .mbridge/, add to .gitignore if not present
  -> no: Work without persistent config (pass device/bundle on each call)
```

### Multi-step Automation Pattern
```bash
mbridge app open-url $DEV "myapp://signup" && \
mbridge action type $DEV "user@test.com" --text "Email" && \
mbridge action tap $DEV --text "Sign Up" && \
mbridge verify text $DEV "Welcome"
```

Batch 3-5 commands per Bash tool call. Each command is self-contained. No sourcing, no env vars, no boilerplate.

### Subagent Pattern (5+ test flows)
Same concept as mobilecli: dispatch a subagent for large UAT suites. The subagent runs mbridge commands directly. Single device = sequential only (no parallel subagents).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Element finding + tapping | Manual dump + jq + coordinate tap | `mbridge action tap --text "Label"` | mbridge handles dump, find, tap atomically |
| Element finding + typing | Manual dump + jq + type | `mbridge action type TEXT --text "Label"` | Same atomic pattern |
| Screen text verification | Screenshot + OCR manually | `mbridge verify text DEVICE "expected"` | mbridge handles screenshot, OCR, comparison |
| Bash helper functions | test-helpers.sh equivalent | Direct mbridge commands | mbridge's flags replace 50+ bash functions |
| UI dump caching | File-based dump cache + jq | `mbridge ui find --text "Label"` | Find does its own dump internally |
| Platform detection | Manual simctl/adb platform check | mbridge auto-detects | All commands detect platform automatically |

**Key insight:** mbridge internalizes what mobilecli externalized. There is no dump+jq+tap workflow to teach -- every mbridge command is self-contained.

## Common Pitfalls

### Pitfall 1: Trying to cache mbridge UI dumps to files
**What goes wrong:** User pipes `mbridge ui dump` to a file and queries with jq, replicating the mobilecli pattern
**Why it happens:** Carryover from mobilecli mental model
**How to avoid:** Use `mbridge ui find` and `mbridge action tap/type --text` directly. Internal dumps handle everything.
**Warning signs:** Any jq command in mbridge workflows

### Pitfall 2: Writing bash wrapper functions
**What goes wrong:** Creating test-helpers.sh equivalent with functions like tap_text, screen_text, assert_screen
**Why it happens:** mobilecli required this; mbridge doesn't
**How to avoid:** Each mbridge command is a one-liner. Chain with &&.
**Warning signs:** Any `source` command or function definition in mbridge workflows

### Pitfall 3: Forgetting --exact for ambiguous text matches
**What goes wrong:** `mbridge action tap --text "S"` matches "Settings", "Search", "Sign Up" -- taps the first one
**Why it happens:** Default text matching is substring (case-sensitive)
**How to avoid:** Use `--exact` for precise matching, `--unique` to fail if ambiguous
**Warning signs:** Unexpected element tapped, or "Multiple matches found" error (only with --unique)

### Pitfall 4: Using coordinate-based taps when element targeting works
**What goes wrong:** `mbridge action tap $D --x 305 --y 434` breaks on different screen sizes
**Why it happens:** Legacy mobilecli pattern -- coordinates were the only option
**How to avoid:** Always prefer `--text`, `--id`, or `--type` targeting. Coordinates only when no element identifiers exist.
**Warning signs:** `--x` and `--y` flags in tap commands

### Pitfall 5: Android BACK exits app at navigation root
**What goes wrong:** App closes when BACK is used at the root of the navigation stack on Android
**Why it happens:** Android system behavior -- BACK at root triggers onBackPressed which finishes the activity
**How to avoid:** Use deeplinks (`mbridge app open-url`) to navigate away instead of hardware BACK
**Warning signs:** Using adb/system BACK button on Android (mbridge has no button command -- this is external)

### Pitfall 6: Deeplink to current screen won't refresh
**What goes wrong:** Opening a deeplink to the screen already displayed does nothing
**Why it happens:** React Navigation (and similar routers) won't remount the current route
**How to avoid:** Navigate to a different screen first, then deeplink to the target
**Warning signs:** `open-url` returning success but screen not updating

### Pitfall 7: verify text is OCR-based -- expect imperfect matching
**What goes wrong:** `mbridge verify text` fails on text that's visually present
**Why it happens:** OCR (pytesseract) isn't perfect -- special characters, small text, unusual fonts may not OCR correctly
**How to avoid:** Use ui find/dump for structural verification when possible. Reserve verify text for cases where UI elements lack identifiers. On failure, check the `ocr_text` field in output.
**Warning signs:** verify text failing on text with special characters or non-standard fonts

### Pitfall 8: Not polling for app foreground after launch
**What goes wrong:** Sending commands before app is ready
**Why it happens:** `mbridge app launch` returns immediately; app needs time to initialize
**How to avoid:** Poll `mbridge app foreground` until the expected bundle ID appears before sending interaction commands
**Warning signs:** Commands failing right after app launch

## Code Examples

### Device discovery and selection
```bash
mbridge device list
```
Output:
```json
[
  {"id": "ABCD-1234-...", "name": "iPhone 16 Pro", "state": "Booted", "platform": "ios", ...},
  {"id": "emulator-5554", "name": "Pixel_8", "state": "device", "platform": "android", ...}
]
```

### Launch app and verify foreground
```bash
mbridge app launch $DEV com.example.app && \
mbridge app foreground $DEV
```
Output of foreground:
```json
{"packageName": "com.example.app", "appName": "MyApp", "version": "1.0"}
```

### Navigate via deeplink
```bash
mbridge app open-url $DEV "myapp://settings"
```

### Find element on screen
```bash
mbridge ui find $DEV --text "Settings"
```
Output:
```json
[
  {
    "type": "Button",
    "label": "Settings",
    "accessibility_id": "settings_tab",
    "bounds": {"x": 270, "y": 780, "width": 100, "height": 44},
    "center": {"x": 320, "y": 802},
    "enabled": true,
    "visible": true,
    "children": []
  }
]
```

### Tap element by text
```bash
mbridge action tap $DEV --text "Settings"
```
Output:
```json
{"status": "tapped", "x": 320, "y": 802}
```

### Type into a field
```bash
mbridge action type $DEV "user@test.com" --text "Email" --clear
```
Output:
```json
{"status": "typed", "text": "user@test.com"}
```

### Swipe down from element
```bash
mbridge action swipe $DEV down --text "List" --distance 0.5
```

### Verify text on screen (OCR)
```bash
mbridge verify text $DEV "Welcome"
```
Output (success):
```json
{"found": true, "text": "Welcome"}
```
Output (failure):
```json
{"found": false, "expected": "Welcome", "ocr_text": "Wecone to MyApp\nSign in below..."}
```

### Multi-step flow example
```bash
DEV="ABCD-1234"
mbridge app open-url $DEV "myapp://signup" && \
mbridge action type $DEV "user@test.com" --text "Email" && \
mbridge action type $DEV "secret123" --text "Password" && \
mbridge action tap $DEV --text "Sign Up" && \
mbridge verify text $DEV "Welcome"
```

## State of the Art

| Old Approach (mobilecli) | New Approach (mbridge) | Impact |
|--------------------------|------------------------|--------|
| `dump ui > file.json` + `jq` + coordinate tap | `mbridge action tap --text "Label"` | One command replaces three |
| test-helpers.sh (50+ bash functions) | Direct mbridge commands | Zero bash boilerplate |
| `.mobilecli/cache/*.json` dump files | Internal dumps (no file I/O needed) | Simpler cache structure |
| `mobilecli io text` (broken on Android RN) | `mbridge action type --clear` | Platform quirks handled internally |
| Manual `jq` queries for element finding | `mbridge ui find --text/--id/--type/--xpath` | No jq dependency |
| `mobilecli screenshot` + manual review | `mbridge verify text` (OCR) | Automated text verification |

## Open Questions

1. **Config persistence approach**
   - What we know: mobilecli used `env.sh` sourced at start of each bash call. mbridge doesn't need sourcing.
   - What's unclear: JSON config file vs session-level memory for device_id/bundle_id/deeplink_scheme
   - Recommendation: Use a simple JSON config file at `.mbridge/config.json`. Claude reads it at session start to avoid re-asking device/bundle. Lightweight, no parsing dependencies. Example: `{"device_id": "ABCD-1234", "bundle_id": "com.example.app", "deeplink_scheme": "myapp"}`

2. **Deeplink discovery approach**
   - What we know: mobilecli dispatched a subagent to research deeplinks once, cached to `.mobilecli/deeplinks.md`
   - What's unclear: Whether subagent or inline discovery is better for mbridge
   - Recommendation: Keep the subagent pattern -- deeplink research requires reading multiple source files (linking config, route definitions, scheme declarations). A subagent researcher is appropriate. Cache results to `.mbridge/deeplinks.md`.

3. **Doctor check inclusion**
   - What we know: Doctor system uses drop-in `.sh` scripts in `scripts/checks/`. Each outputs `PASS|FAIL check-name message`.
   - What's unclear: Whether mbridge doctor check is worth the extra file
   - Recommendation: Include it. It's 15 lines, verifies mbridge CLI + Python 3.12+ + tesseract, and catches setup issues early. Pattern: `scripts/checks/tool-mbridge.sh`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | /skill-creator verification (as per config.json) |
| Config file | N/A -- skill verification is manual via plugin loading |
| Quick run command | `claude --plugin-dir . --debug` then invoke `/tb:mbridge` |
| Full suite command | Load plugin, invoke skill, verify command examples work |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MBRD-07 | SKILL.md exists with frontmatter | smoke | `test -f skills/mbridge/SKILL.md && grep -q "^name: mbridge" skills/mbridge/SKILL.md` | Wave 0 |
| MBRD-07 | mobilecli deleted | smoke | `test ! -d skills/mobilecli/` | Wave 0 |
| MBRD-07 | Skill discovered by session-start hook | smoke | `bash hooks/session-start.sh \| grep -q mbridge` | Wave 0 |
| MBRD-07 | Doctor check (if added) | smoke | `bash scripts/checks/tool-mbridge.sh .` | Wave 0 |

### Sampling Rate
- **Per task commit:** Verify SKILL.md frontmatter parses, hook discovers skill
- **Per wave merge:** Full plugin load test
- **Phase gate:** /skill-creator verification per config.json

### Wave 0 Gaps
- [ ] `skills/mbridge/SKILL.md` -- the primary deliverable
- [ ] `scripts/checks/tool-mbridge.sh` -- if doctor check is included

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `tools/mbridge/src/mbridge/*.py` -- all CLI commands, flags, output formats
- Direct codebase inspection: `skills/mobilecli/SKILL.md` -- 510-line reference template
- Direct codebase inspection: `skills/mobilecli/test-helpers.sh` -- 473-line bash helper (to be replaced by mbridge)
- Direct codebase inspection: `skills/doctor/SKILL.md` -- doctor check pattern
- Direct codebase inspection: `scripts/checks/*.sh` -- doctor check script format
- Direct codebase inspection: `hooks/session-start.sh` -- skill discovery mechanism
- Direct codebase inspection: `tools/mbridge/setup.js` -- mbridge installation

### Secondary (MEDIUM confidence)
- Phase 9 summary (`.planning/phases/09-mbridge-interaction-ocr/09-01-SUMMARY.md`) -- interaction command details

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all components exist in codebase, no external dependencies to verify
- Architecture: HIGH - SKILL.md pattern established across 18 skills, mobilecli template is proven
- Pitfalls: HIGH - derived from mobilecli experience and mbridge CLI source code analysis

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- internal tooling, no external API drift)
