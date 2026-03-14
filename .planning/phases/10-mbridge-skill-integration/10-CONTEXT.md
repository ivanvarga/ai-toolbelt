# Phase 10: mbridge Skill Integration - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a SKILL.md for mbridge in the plugin skills/ directory, delete mobilecli, and make mbridge the sole mobile automation skill. The skill must enable Claude Code to discover app context, automate multi-step mobile interactions, and verify results using mbridge CLI commands.

</domain>

<decisions>
## Implementation Decisions

### Skill instruction depth
- Heavy reference (~500 lines), comparable to mobilecli's SKILL.md
- Full command reference with all flags and options documented
- Includes Common Mistakes table AND Red Flags - STOP section (both guardrail sections)
- Platform-specific notes limited to behavioral differences only (e.g., Android BACK exits app at nav root) — skip internal details mbridge handles automatically
- No debug mode for v1 — focus on core automation

### App context bootstrapping
- Fresh discovery only — no import from .mobilecli/ directory
- Per-project storage at .mbridge/ (created on first use with user permission, added to .gitignore)
- Clean namespace, no confusion with mobilecli

### Config and discovery
- Claude's Discretion: how to persist project-level app settings (config file vs in-memory)
- Claude's Discretion: whether to use subagent researcher or inline discovery for deeplinks/bundle IDs

### mobilecli cutover
- Delete skills/mobilecli/ directory entirely — clean break, git history preserves it
- mbridge is the only mobile skill after Phase 10
- Permissions: both allowed-tools frontmatter (Bash(mbridge:*)) AND recommended permissions section for user's global settings (Bash(mbridge:*), Bash(adb:*), Bash(xcrun:*))

### Doctor check
- Claude's Discretion: whether to add a /tb:doctor check for mbridge (verifying mbridge CLI installed, Python 3.12+, pytesseract/tesseract)

### Multi-step automation pattern
- Direct CLI calls — no wrapper scripts, no bash helpers, no sourcing boilerplate
- Each step is a raw mbridge command; Claude sequences them in Bash tool calls
- Batch 3-5 mbridge commands per Bash call with && for sequential execution (reduces context overhead)
- Subagent delegation for 5+ test flows (single device = sequential only)
- Navigation strategy priority order: 1) deeplinks (mbridge app open-url), 2) element targeting (mbridge action tap --text), 3) swipe + retry, 4) OCR verify as verification fallback

### Claude's Discretion
- Config persistence approach (JSON config file vs session-level memory)
- Deeplink discovery approach (subagent vs inline)
- Doctor check inclusion
- Exact content and order of Common Mistakes / Red Flags sections
- Workflow example selection and depth

</decisions>

<specifics>
## Specific Ideas

- mbridge commands are already deterministic (find + assert + interact in one shot) — the skill should emphasize this as the key advantage over mobilecli's dump-then-jq-then-tap pattern
- No test-helpers.sh equivalent needed — mbridge's --text/--id/--type flags on action commands replace what took 50+ bash functions
- Navigation strategy mirrors mobilecli's priority order but uses mbridge commands instead of mobilecli + jq + bash helpers
- Multi-step flow example: `mbridge app open-url $DEV myapp://signup && mbridge action type $DEV "user@test.com" --text "Email" && mbridge action tap $DEV --text "Sign Up" && mbridge verify text $DEV "Welcome"`
- Subagent pattern from mobilecli is still valuable for large UAT suites — same concept, mbridge commands instead

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- tools/mbridge/: complete CLI with device, app, ui, action, verify command groups
- mbridge action tap/swipe/type: element-based targeting with --text/--id/--type/--exact flags
- mbridge ui dump/find: normalized UI hierarchy, self-contained dump + query
- mbridge verify text: OCR-based screenshot verification with full OCR text on failure
- mbridge app open-url: deeplink navigation
- mbridge device list/info: device discovery with JSON output
- scripts/setup-credential.js: base module pattern for setup.js

### Established Patterns
- SKILL.md frontmatter: name, description, allowed-tools, optional disable-model-invocation
- ${CLAUDE_SKILL_DIR} for skill-local file references
- ${CLAUDE_PLUGIN_ROOT} for shared scripts
- setup.js pattern: check prerequisite -> install if missing -> verify -> confirm
- Heavy skill format: mobilecli (510 lines) as reference for structure and depth
- Doctor checks via scripts/checks/ modular system

### Integration Points
- skills/mbridge/: new directory for SKILL.md (and optional setup.js)
- skills/mobilecli/: to be deleted
- tools/mbridge/: CLI already installed via `uv tool install`
- scripts/checks/: potential mbridge doctor check
- hooks/session-start.sh: auto-discovers new skills from frontmatter

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-mbridge-skill-integration*
*Context gathered: 2026-03-14*
