# tb -- Personal Dev Toolkit Plugin

Plugin name: **tb** (invoked as `/tb:skill-name` in Claude Code)

This is a Claude Code plugin that consolidates custom skills, credential management, and dev tools into a single installable repo.

## Skill Naming Convention

Skills use a **family-action** pattern with hyphens:
- `task-jira`, `pr-submit`, `sentry-investigate`, `release-create`
- Standalone skills without a family prefix: `catchup`, `mbridge`, `contentful`
- Directory name must match the `name` field in SKILL.md frontmatter
- All skill names MUST start with `tb:` prefix (e.g. `tb:doctor`, `tb:pr-submit`)

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

## Bash Command Structure (avoid permission prompts)

Claude Code has hardcoded safety rules that trigger manual approval regardless of allowlist. To avoid needless prompts:

- NEVER combine `cd` with output redirection (`>`, `2>`, `>>`) in one command — triggers path-resolution bypass check. When working in another directory: (a) issue `cd /foo` as a separate Bash call (working dir persists across Bash calls in the same session), then run the command in a follow-up call; or (b) use absolute paths. Bad: `cd /foo && ls 2>/dev/null`. Good: two calls — `cd /foo`, then `ls 2>/dev/null`. Also good: `ls /foo/* 2>/dev/null`.
- NEVER use backslash-escaped whitespace in paths. Quote the path instead. Bad: `ls /foo/Target\ Support\ Files`. Good: `ls "/foo/Target Support Files"`.
- PREFER single-stage commands over compound `;`/`&&` chains. Multi-stage chains don't match simple allowlist prefixes and trigger approval. Split into separate Bash calls — each matches the allowlist cleanly.
- When inspecting build artifacts in `~/Library/Developer/Xcode/DerivedData/`, expect dynamic hash paths — don't rely on "don't ask again" permission captures since they're literal-match.
