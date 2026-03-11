# Phase 2: Plugin Install + Operations - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can install the plugin on a fresh machine and keep it updated, with health checking and automatic context injection. Covers: install documentation, update skill, doctor/health-check skill, and SessionStart hook.

</domain>

<decisions>
## Implementation Decisions

### Install mechanism
- Use Claude Code's native plugin install — no custom install script
- Users install via direct GitHub repo URL (e.g., `claude plugin install github:ivarga/ai-toolbelt`)
- marketplace.json already configured from Phase 1 with self-hosted source
- Create a README.md at repo root with install instructions

### Update mechanism (/tb:update)
- Skill-based update invoked as `/tb:update` from within Claude Code
- Stash local changes before pull, unstash after — handles dirty working tree gracefully
- Show changelog after pull (what changed — new/updated skills, version bumps)
- Use semantic versioning in plugin.json — compare before/after version
- Remind user to `/reload-plugins` after update

### Doctor / health-check (/tb:doctor)
- Skill-based health check invoked as `/tb:doctor`
- Checks: plugin registered in Claude Code, all SKILL.md files parse correctly, hooks.json is valid, skill dirs have SKILL.md
- Credentials and external tools checked in later phases (Phase 5+)
- Output format: pass/fail checklist with checkmark/cross per component
- Failed items show a one-line fix hint (don't auto-fix)
- Modular check system: checks defined in scripts/checks/ so later phases can drop in new checks without modifying doctor skill

### SessionStart hook
- Dynamic skill discovery — hook script scans skills/ directory at runtime, reads SKILL.md frontmatter for name + description
- Injects skill inventory with one-line descriptions so Claude knows available /tb:* skills
- Fires on all session events: startup, resume, clear, compact (matches superpowers pattern)
- Runs async (non-blocking) for faster perceived startup
- Follows superpowers pattern: hooks/hooks.json + hooks/session-start.sh outputting JSON with hookSpecificOutput.additionalContext

### Claude's Discretion
- README.md structure and content beyond install instructions
- Exact changelog format in /tb:update
- Hook output formatting and context injection wording
- Check script interface/convention for modular doctor checks

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Superpowers hooks.json: reference pattern for SessionStart hook configuration (matcher, command, async)
- Superpowers session-start.sh: reference for JSON output format, escape_for_json function, hookSpecificOutput structure
- marketplace.json: already configured with self-hosted source pattern

### Established Patterns
- Plugin root = repo root (from Phase 1)
- ${CLAUDE_PLUGIN_ROOT} for internal path references in hooks and scripts
- hooks/ directory at repo root (created in Phase 1, currently has .gitkeep)
- scripts/ directory at repo root for shared utilities
- Skills in flat subdirectories: skills/name/SKILL.md

### Integration Points
- ~/.claude/settings.json enabledPlugins for plugin registration verification
- ~/.claude/plugins/installed_plugins.json for install status checking
- .claude-plugin/plugin.json version field for semantic version tracking
- hooks/hooks.json for hook registration (read by Claude Code plugin system)

</code_context>

<specifics>
## Specific Ideas

- Follow superpowers hook pattern exactly — proven to work with Claude Code's plugin system
- Dynamic skill discovery means no maintenance when adding skills in Phases 3-4
- Modular doctor checks (scripts/checks/) designed so Phase 5 (credentials) and Phase 7+ (mbridge) just drop in check files

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-plugin-install-operations*
*Context gathered: 2026-03-11*
