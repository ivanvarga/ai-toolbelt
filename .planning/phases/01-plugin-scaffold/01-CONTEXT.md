# Phase 1: Plugin Scaffold - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the repo as a valid Claude Code plugin with correct directory layout, plugin manifest, and marketplace config. No skills, commands, or tools are implemented — just the empty structure ready for content in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Plugin name & namespace
- Plugin name in plugin.json: "tb" (short for toolbelt)
- All skills invoked as /tb:skill-name
- Repo name stays "ai-toolbelt" on GitHub — plugin name and repo name are intentionally different
- Marketplace name: follows convention (e.g., "tb-marketplace" or similar)

### Skill naming convention
- Family-action pattern with hyphens: task-jira, pr-submit, sentry-investigate, release-create
- Standalone skills without family: catchup, mobilecli, contentful
- Mixed prefixed/unprefixed names in flat directory is fine
- Directory name MUST match SKILL.md frontmatter name (e.g., skills/task-jira/ has name: "task-jira")
- No colons in skill names — hyphens only (avoids conflict with plugin:skill separator)

### Directory structure
- Full layout created in Phase 1 — all directories from architecture research, not just bare minimum
- Empty directories use .gitkeep
- No commands/ directory — all items are skills per PROJECT.md decision
- Include agents/ directory (for attachment-documenter and future agents)
- Include hooks/ directory (for SessionStart hook in Phase 2)

### Plugin-level CLAUDE.md
- Created in Phase 1 with basic plugin info: name, naming convention, directory structure overview
- Not a placeholder — contains enough for Claude to understand the repo when working in it
- Full global CLAUDE.md distribution is Phase 6 scope

### Claude's Discretion
- Exact plugin.json fields (version, author, description, keywords)
- marketplace.json structure (following superpowers pattern)
- .gitignore contents
- Whether to include a README.md

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Superpowers plugin.json: reference for manifest structure (name, description, version, author fields)
- Superpowers marketplace.json: reference for self-hosted marketplace (source: "./" pattern)
- Forgetful-plugin plugin.json: alternative manifest reference

### Established Patterns
- Plugin root = repo root (not inside .claude-plugin/)
- Only plugin.json goes in .claude-plugin/ — all component dirs at root level
- Skills in flat subdirectories: skills/name/SKILL.md
- Skill frontmatter: name, description, allowed-tools fields
- ${CLAUDE_PLUGIN_ROOT} for all internal path references

### Integration Points
- ~/.claude/settings.json enabledPlugins for plugin registration
- ~/.claude/plugins/cache/ for installed plugin copies
- --plugin-dir for development/testing (bypasses cache)

</code_context>

<specifics>
## Specific Ideas

- Plugin name "tb" chosen for minimal typing — every skill invocation starts with /tb:
- Full directory layout from day one so the structure serves as a map of the project
- Naming convention updated from PROJECT.md: colons replaced with hyphens for compatibility (task:jira -> task-jira)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-plugin-scaffold*
*Context gathered: 2026-03-11*
