# tb -- Personal Dev Toolkit Plugin

Plugin name: **tb** (invoked as `/tb:skill-name` in Claude Code)

This is a Claude Code plugin that consolidates custom skills, credential management, and dev tools into a single installable repo.

## Skill Naming Convention

Skills use a **family-action** pattern with hyphens:
- `task-jira`, `pr-submit`, `sentry-investigate`, `release-create`
- Standalone skills without a family prefix: `catchup`, `mbridge`, `contentful`
- Directory name must match the `name` field in SKILL.md frontmatter
- No colons in skill names -- hyphens only

## Directory Structure

```
skills/     Skills with SKILL.md + optional supporting files
agents/     Subagent definitions (e.g., attachment-documenter)
hooks/      Hook configs (e.g., SessionStart for context injection)
tools/      CLI tools (e.g., mbridge for mobile automation)
scripts/    Shared utility scripts referenced by hooks and tools
```

## Path Variables

- `${CLAUDE_PLUGIN_ROOT}` -- resolves to plugin root directory. Use in hooks, MCP configs, and scripts. Does NOT work in SKILL.md markdown content.
- `${CLAUDE_SKILL_DIR}` -- resolves to the skill's subdirectory. Use in SKILL.md bash commands.

## Development Workflow

```bash
claude --plugin-dir ./          # Load plugin directly from source
/reload-plugins                 # Hot-reload changes without restarting
claude --debug --plugin-dir ./  # Debug plugin loading issues
```
