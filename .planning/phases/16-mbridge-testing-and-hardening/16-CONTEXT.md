# Phase 16: mbridge Testing and Hardening - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Test every mbridge CLI command against real devices across all 4 environments (iOS sim, iOS real, Android emu, Android real), fix all bugs found, add a `ui wait-for` command, update SKILL.md to reflect changes, and delete existing unit tests. Human confirms each environment is ready before testing begins. This is the final v1 phase.

</domain>

<decisions>
## Implementation Decisions

### Test matrix
- All 4 environments: iOS simulator, iOS real device, Android emulator, Android real device
- Test target app: fitlumen (at `../fitlumen` relative to ai-toolbelt)
- Every mbridge command must pass on all 4 environments before phase is complete
- Human sets up each environment (device booted, fitlumen installed and running) before testing starts
- Human confirms each test step — no fully autonomous test execution

### Test approach
- Automated pytest integration tests that shell out to mbridge CLI against live devices
- Tests are NOT committed to the repo — throwaway, used only during this phase to find/fix bugs
- Delete all 112 existing unit tests (tests/ directory contents) — consistent with Phase 7 "no unit tests" decision
- No formal test results report — fixes and updated SKILL.md are the deliverables

### New command: ui wait-for
- `mbridge ui wait-for <device> --text "Submit" --timeout 10`
- Polls dump+find at intervals until element match or timeout
- Returns element JSON on success, error on timeout
- Same query flags as `ui find` (--text, --id, --type, --exact)
- Replaces the need for blanket subprocess timeouts — caller controls wait duration

### Hardening approach
- Fix what breaks during testing — no preemptive hardening
- Known risk areas to expect issues: scroll container visibility, Android text encoding, input focus handling, iOS backspace clear, pixel density across platforms
- Each bug gets dedicated research before fixing — no quick patches
- Fix everything found — no deferring to v2 for this phase

### SKILL.md updates
- Update mbridge SKILL.md after testing/hardening with: new `ui wait-for` command reference, corrected workflow patterns, new gotchas discovered during testing

### Claude's Discretion
- Poll interval for ui wait-for (e.g., 500ms vs 1s)
- Default timeout value for ui wait-for
- Test file organization within tools/mbridge/tests/
- Order of environment testing (which platform first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### mbridge CLI
- `tools/mbridge/src/mbridge/` — Full CLI source, all command implementations
- `tools/mbridge/pyproject.toml` — Package config, dependencies, Python version requirement
- `skills/mbridge/SKILL.md` — Current skill instructions (to be updated after hardening)

### Prior phase context
- `.planning/phases/07-mbridge-cli-foundation/07-CONTEXT.md` — CLI design decisions, coordinate system, testing philosophy
- `.planning/phases/08-mbridge-ui-parsing/08-CONTEXT.md` — UI parsing decisions, normalization, element finding, known visibility risks
- `.planning/phases/09-mbridge-interaction-ocr/09-CONTEXT.md` — Interaction command design, OCR verify, escape sequences, platform encoding
- `.planning/phases/10-mbridge-skill-integration/10-CONTEXT.md` — SKILL.md design, multi-step automation pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ui.py._capture_dump()`: shared dump helper — reuse for `ui wait-for` polling loop
- `parsing/query.py.find_elements()`: query engine — reuse for wait-for element matching
- `output.py`: `output()` and `error()` JSON helpers — use for wait-for responses
- `device.py._detect_platform()`: platform detection — needed for wait-for platform dispatch

### Established Patterns
- Click command groups with `device_id` as required positional arg
- JSON output via `output.output()` for all command results
- Platform modules (ios.py, android.py) handle platform-specific logic
- Lazy tool checks: `require_xcrun()`/`require_adb()` per-command
- Same query flags (--text, --id, --type, --exact) shared across ui find and action commands

### Integration Points
- `ui.py`: add `wait-for` subcommand alongside existing `dump` and `find`
- `tests/`: delete all existing unit test files, use for throwaway integration tests
- `skills/mbridge/SKILL.md`: update command reference section with `ui wait-for`

</code_context>

<specifics>
## Specific Ideas

- fitlumen app (at ../fitlumen) is the test target — tests assume it's installed and running on the device
- Human must confirm each environment is set up before that platform's tests run — no assuming device state
- Each bug found gets dedicated investigation, not quick patches — understand root cause before fixing
- The `ui wait-for` command replaces blanket timeouts — keeps individual commands fast, puts wait logic where it belongs
- Known risk areas from prior phases: scroll container visibility detection (Phase 8 flagged this), Android text encoding with special chars (Phase 9), iOS clear sending 500 backspaces (Phase 9), pixel density coordinate issues (Phase 7 — original mbridge failure cause)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-mbridge-testing-and-hardening*
*Context gathered: 2026-03-21*
