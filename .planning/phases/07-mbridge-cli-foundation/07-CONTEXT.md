# Phase 7: mbridge CLI Foundation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Installable Python CLI skeleton with device discovery, basic app commands, and deeplink support. mbridge is a clean redesign of mobilecli — different command surface, JSON-first output, deterministic interaction model (designed now, built in later phases). Lives in tools/mbridge/.

</domain>

<decisions>
## Implementation Decisions

### Command structure
- Nested groups using Click: `mbridge device list`, `mbridge app launch`, `mbridge action tap` (Phase 8+)
- Device ID is a required positional argument on all device-targeting commands (no auto-select)
- Phase 7 command groups: `device` (list, boot, info), `app` (list, foreground, launch, open-url)
- Placeholder groups created but empty: `action` (Phase 8-9), `verify` (Phase 9), `ui` (Phase 8)
- Verbosity handling: Claude's discretion

### Device output
- JSON by default on all commands (primary consumer is the mbridge SKILL.md, not humans)
- `device list` fields: id, name, platform, type (simulator/emulator/physical), state, os_version
- `device info` adds: screen dimensions (width/height/scale), architecture, runtime/SDK version, data path
- `device list` supports `--platform ios|android` filter flag, no other filters
- `device info` returns extended details including screen info (critical for coordinate system)

### Install & packaging
- Python 3.12+ required
- uv for packaging (`uv tool install`)
- uv auto-install integrated into setup.js (consistent with other skill setup patterns)
- Dependencies minimal: just Click for Phase 7, add deps as phases need them
- No /tb:doctor check for mbridge yet — deferred to Phase 10

### mobilecli relationship
- Clean redesign: different command names, different output format, different philosophy
- Hard cutover at Phase 10: mobilecli skill deleted, mbridge is the only mobile skill
- mbridge reads mobilecli's app knowledge from .mobilecli/ (import existing deeplinks, screen names, navigation patterns)
- mbridge writes its own data to ~/.mbridge/ (global, not per-project)
- Lazy tool checks: verify xcrun/adb availability per-command, not at startup

### Global persistent storage
- App knowledge stored globally at ~/.mbridge/apps/<bundle-id>/ (deeplinks, screens, navigation)
- NOT in project folder — shared across all projects for the same app
- Device cache is ephemeral (no persistence needed for device list)

### Coordinate system
- Include coordinate utility module from Phase 7 (logical points ↔ physical pixels)
- device info provides screen scale factor — wired into coord conversion from day one
- Solves the pixel density issues that broke the previous mbridge attempt
- Research rn-debugger MCP source code for how it handles coordinate translation, visibility detection, scroll position

### Deterministic interaction model (design only)
- Philosophy: commands that find + assert + interact in one shot, no AI interpretation loop
- Example: `mbridge action tap <id> --text "Submit"` does dump → find → assert visible → tap
- Phase 7 creates empty command groups (action, verify) signaling this intent
- Actual implementation in Phase 8-9 when UI parsing exists

### Testing strategy
- Integration tests only — no unit tests with mocked subprocess output
- Manual test checklist: commands verified on 4 environments (iOS sim, iOS real, Android emu, Android real)
- Unit tests not trusted for this domain: underdocumented platform differences, real vs simulator behavior gaps, coordinate/visibility/interaction issues only catchable on real devices

### Claude's Discretion
- Verbosity flag approach (global --verbose or per-command)
- Internal Python module layout (flat vs package structure)
- Exact coordinate conversion implementation details
- pyproject.toml configuration details
- Which fields device info exposes per platform (based on what xcrun/adb actually provide)

</decisions>

<specifics>
## Specific Ideas

- mobilecli's deeplink navigation is its best feature — mbridge must preserve this. `mbridge app open-url` included in Phase 7 for immediate usefulness
- Previous mbridge attempt failed on element positioning: pixel density, scroll position, visibility, app focus were all potential causes. Coordinate utilities in Phase 7 to prevent this
- rn-debugger MCP is a reference implementation for how to call adb/idb, handle coordinates, detect visibility — study its source during research, don't copy its skill/MCP design
- "I don't trust unit tests" for device interaction — platform differences between iOS/Android and simulator/real are too varied and underdocumented. Integration tests on real environments only
- Deterministic commands (find + assert + interact in one shot) will speed up testing by eliminating AI round trips for things that should be mechanical

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- skills/mobilecli/SKILL.md: reference for device command patterns, deeplink usage, cache/context system
- skills/mobilecli/test-helpers.sh: 50+ bash functions for device interaction (launch_app, element finding)
- scripts/setup-credential.js: base module pattern for setup.js (mbridge setup.js follows same pattern)
- .mobilecli/ app knowledge files: mbridge reads these for backward compatibility

### Established Patterns
- ${CLAUDE_SKILL_DIR} for skill-local file references
- ${CLAUDE_PLUGIN_ROOT} for shared scripts
- setup.js pattern: check prerequisite → install if missing → verify → confirm
- JSON output from CLI tools consumed by SKILL.md instructions

### Integration Points
- tools/mbridge/: directory exists (empty with .gitkeep)
- ~/.mbridge/: new global directory for persistent app knowledge
- rn-debugger MCP source: research reference for coordinate handling and device interaction

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-mbridge-cli-foundation*
*Context gathered: 2026-03-12*
