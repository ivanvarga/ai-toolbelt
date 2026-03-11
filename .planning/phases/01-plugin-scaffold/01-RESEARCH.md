# Phase 1: Plugin Scaffold - Research

**Researched:** 2026-03-11
**Domain:** Claude Code plugin system -- manifest, marketplace, directory structure
**Confidence:** HIGH

## Summary

Phase 1 creates the foundational plugin structure for "ai-toolbelt" -- a valid Claude Code plugin with manifest, marketplace config, and directory layout. The Claude Code plugin system is well-documented with a straightforward schema: `.claude-plugin/plugin.json` is the only required file (with `name` as the only required field), and Claude Code auto-discovers components in default directories (`skills/`, `agents/`, `hooks/`, `commands/`).

The marketplace system supports self-hosted private repos via a `marketplace.json` file in `.claude-plugin/`. For a single-plugin repo like ai-toolbelt, the marketplace entry uses a relative path `"source": "./"` pointing to the repo root itself. Users add the marketplace via git URL and install the plugin from it. Private repos work seamlessly when the user has git credentials configured (e.g., `gh auth login`).

Two environment variables are available for path references: `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin root directory (works in hooks, MCP configs, and scripts), and `${CLAUDE_SKILL_DIR}` resolves to the specific skill's subdirectory (works in bash injection commands within SKILL.md files). Both are confirmed in official documentation, resolving the blocker noted in STATE.md.

**Primary recommendation:** Create a minimal but complete plugin with `plugin.json` (name: "tb"), `marketplace.json` (self-hosted, source: "./"), all planned directories with `.gitkeep`, and a plugin-level CLAUDE.md with project context.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Plugin name in plugin.json: "tb" (short for toolbelt)
- All skills invoked as /tb:skill-name
- Repo name stays "ai-toolbelt" on GitHub -- plugin name and repo name are intentionally different
- Skill naming: family-action pattern with hyphens (task-jira, pr-submit, sentry-investigate)
- Standalone skills without family: catchup, mobilecli, contentful
- Directory name MUST match SKILL.md frontmatter name
- No colons in skill names -- hyphens only
- Full layout created in Phase 1 -- all directories from architecture research
- Empty directories use .gitkeep
- No commands/ directory -- all items are skills per PROJECT.md decision
- Include agents/ directory (for attachment-documenter and future agents)
- Include hooks/ directory (for SessionStart hook in Phase 2)
- Plugin-level CLAUDE.md created in Phase 1 with basic plugin info
- Not a placeholder -- contains enough for Claude to understand the repo

### Claude's Discretion
- Exact plugin.json fields (version, author, description, keywords)
- marketplace.json structure (following superpowers pattern)
- .gitignore contents
- Whether to include a README.md

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-01 | Plugin manifest with `.claude-plugin/plugin.json` and marketplace.json for private distribution | Full plugin.json schema documented; marketplace.json schema documented; self-hosted private repo pattern verified with official examples |
</phase_requirements>

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `.claude-plugin/plugin.json` | Schema v1 | Plugin manifest with metadata | Only file that goes in .claude-plugin/; `name` is the only required field |
| `.claude-plugin/marketplace.json` | Schema v1 | Self-hosted marketplace for private distribution | Enables `claude plugin install tb@tb-marketplace` flow |
| `skills/` directory | - | Agent Skills with SKILL.md files | Default auto-discovered location for skills |
| `agents/` directory | - | Subagent definitions | Default auto-discovered location for agents |
| `hooks/` directory | - | Event handler configs | Default location; hooks.json goes here in Phase 2 |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `tools/` directory | CLI tools (mbridge in Phase 7+) | Houses non-skill tools like Python CLIs |
| `scripts/` directory | Hook and utility scripts | Referenced by hooks and MCP configs |
| `CLAUDE.md` at plugin root | Plugin-level instructions | Loaded when plugin is active; provides context to Claude |
| `.gitignore` | Exclude generated/temp files | Standard git hygiene |

### Not Using
| Component | Reason |
|-----------|--------|
| `commands/` directory | User decision: all items are skills, not commands |
| `settings.json` | No default settings needed for this plugin |
| `.mcp.json` | No MCP servers in this plugin |
| `.lsp.json` | No LSP servers in this plugin |

## Architecture Patterns

### Recommended Directory Structure
```
ai-toolbelt/                    # Repo root = plugin root
├── .claude-plugin/
│   ├── plugin.json             # Plugin manifest (name: "tb")
│   └── marketplace.json        # Self-hosted marketplace config
├── skills/                     # All skills live here (Phase 3-4)
│   └── .gitkeep
├── agents/                     # Subagents (attachment-documenter etc.)
│   └── .gitkeep
├── hooks/                      # Hook configs (SessionStart in Phase 2)
│   └── .gitkeep
├── tools/                      # CLI tools (mbridge in Phase 7+)
│   └── .gitkeep
├── scripts/                    # Shared utility scripts
│   └── .gitkeep
├── CLAUDE.md                   # Plugin-level instructions for Claude
├── .gitignore                  # Standard ignores
└── .planning/                  # (already exists) GSD planning docs
```

### Pattern 1: Self-Hosted Single-Plugin Marketplace
**What:** The repo IS both the marketplace and the plugin. marketplace.json points to "./" as the plugin source.
**When to use:** Private single-plugin repos distributed via git.
**Example:**
```json
// .claude-plugin/marketplace.json
// Source: https://code.claude.com/docs/en/plugin-marketplaces
{
  "name": "tb-marketplace",
  "owner": {
    "name": "Ivan Varga"
  },
  "plugins": [
    {
      "name": "tb",
      "source": "./",
      "description": "Personal toolkit plugin for Claude Code"
    }
  ]
}
```

### Pattern 2: Minimal Plugin Manifest
**What:** plugin.json with only essential fields. Name is the only required field.
**When to use:** Always start minimal; add fields as needed.
**Example:**
```json
// .claude-plugin/plugin.json
// Source: https://code.claude.com/docs/en/plugins-reference
{
  "name": "tb",
  "description": "Personal dev toolkit -- skills, credentials, and tools for Claude Code",
  "version": "0.1.0",
  "author": {
    "name": "Ivan Varga"
  },
  "repository": "https://github.com/ivarga/ai-toolbelt"
}
```

### Pattern 3: Skill Directory Convention
**What:** Each skill is a directory under `skills/` containing `SKILL.md` as entrypoint plus optional supporting files.
**When to use:** All skills follow this pattern.
**Example:**
```
skills/
├── task-jira/
│   ├── SKILL.md          # Required: frontmatter + instructions
│   ├── reference.md      # Optional: detailed docs
│   └── scripts/
│       └── fetch.js      # Optional: helper scripts
└── catchup/
    └── SKILL.md
```

### Anti-Patterns to Avoid
- **Putting component dirs inside .claude-plugin/**: Only plugin.json (and marketplace.json) go in .claude-plugin/. Skills, agents, hooks, etc. MUST be at plugin root level.
- **Using absolute paths in configs**: All paths must be relative and start with `./`. Use `${CLAUDE_PLUGIN_ROOT}` for runtime resolution.
- **Using commands/ directory for new skills**: Commands are legacy. Use skills/ with SKILL.md format for all new content.
- **Referencing files outside plugin directory**: Plugin cache copies only the plugin dir. External refs via `../` will break after installation. Use symlinks if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin manifest format | Custom config format | `.claude-plugin/plugin.json` with standard schema | Claude Code validates and loads this automatically |
| Distribution mechanism | Custom install scripts | `marketplace.json` + `claude plugin install` | Built-in versioning, caching, updates |
| Skill discovery | Manual registration | `skills/` directory convention | Auto-discovered by Claude Code |
| Path resolution | Hardcoded paths | `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_SKILL_DIR}` | Works regardless of install location |

## Common Pitfalls

### Pitfall 1: Component Directories Inside .claude-plugin/
**What goes wrong:** Skills, agents, hooks placed inside `.claude-plugin/` are not discovered.
**Why it happens:** Intuition says "plugin stuff goes in the plugin dir."
**How to avoid:** Only `plugin.json` and `marketplace.json` go in `.claude-plugin/`. Everything else at repo root.
**Warning signs:** `claude --debug` shows no components loaded.

### Pitfall 2: Version Not Bumped = No Updates
**What goes wrong:** Users don't receive plugin updates despite pushing code changes.
**Why it happens:** Claude Code uses version to determine update eligibility. Same version = cached copy used.
**How to avoid:** Always bump version in plugin.json (or marketplace.json for relative-path plugins) before distributing changes.
**Warning signs:** Changes work with `--plugin-dir` but not after `plugin update`.

### Pitfall 3: ${CLAUDE_PLUGIN_ROOT} Not Available in Markdown
**What goes wrong:** `${CLAUDE_PLUGIN_ROOT}` referenced in SKILL.md content doesn't resolve.
**Why it happens:** Known limitation (GitHub issue #9354): the variable works in JSON configs (hooks, MCP) but not in command/skill markdown content.
**How to avoid:** In SKILL.md, use `${CLAUDE_SKILL_DIR}` for referencing files relative to the skill directory. Use `${CLAUDE_PLUGIN_ROOT}` only in hooks.json, .mcp.json, and scripts.
**Warning signs:** Paths in skill instructions don't resolve at runtime.

### Pitfall 4: Plugin Cache Staleness
**What goes wrong:** Installed plugin doesn't reflect latest changes during development.
**Why it happens:** Marketplace plugins are cached at `~/.claude/plugins/cache/`. Changes to source don't auto-propagate.
**How to avoid:** During development, use `--plugin-dir ./` to load directly from source. Use `/reload-plugins` for hot-reloading changes within a session.
**Warning signs:** Old behavior persists after code changes.

### Pitfall 5: marketplace.json With Relative Paths via URL
**What goes wrong:** `source: "./"` fails when marketplace added via direct URL.
**Why it happens:** URL-based marketplace addition only downloads the JSON file, not the repo.
**How to avoid:** Always add the marketplace via git URL (e.g., `github owner/repo`), not a direct URL to the JSON file.
**Warning signs:** "path not found" errors on plugin install.

## Code Examples

### Complete plugin.json for ai-toolbelt
```json
// Source: https://code.claude.com/docs/en/plugins-reference#complete-schema
{
  "name": "tb",
  "description": "Personal dev toolkit -- skills, credentials, and tools for Claude Code",
  "version": "0.1.0",
  "author": {
    "name": "Ivan Varga"
  },
  "repository": "https://github.com/ivarga/ai-toolbelt",
  "keywords": ["toolkit", "skills", "automation", "mobile"]
}
```

### Complete marketplace.json for self-hosted distribution
```json
// Source: https://code.claude.com/docs/en/plugin-marketplaces#create-the-marketplace-file
// Pattern: https://github.com/anthropics/claude-plugins-official/.claude-plugin/marketplace.json
{
  "name": "tb-marketplace",
  "owner": {
    "name": "Ivan Varga"
  },
  "plugins": [
    {
      "name": "tb",
      "source": "./",
      "description": "Personal dev toolkit -- skills, credentials, and tools for Claude Code"
    }
  ]
}
```

### Installation flow (for reference -- Phase 2 scope)
```bash
# Add the marketplace (git-based for relative path support)
claude plugin marketplace add ivarga/ai-toolbelt

# Install the plugin
claude plugin install tb@tb-marketplace

# For development, load directly without install
claude --plugin-dir /path/to/ai-toolbelt
```

### Testing the plugin during development
```bash
# Load plugin directly from source directory
claude --plugin-dir ./

# Inside Claude Code, verify plugin loaded
/tb:          # Tab-complete should show "tb:" namespace

# Reload after changes without restarting
/reload-plugins

# Debug plugin loading issues
claude --debug --plugin-dir ./
```

### SKILL.md frontmatter example (for reference -- Phase 3 scope)
```yaml
# Source: https://code.claude.com/docs/en/skills
---
name: task-jira
description: Fetch and summarize a Jira ticket. Use when working on a task referenced by Jira ID.
allowed-tools: Bash(node *)
---

# Instructions for Claude...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` | `skills/name/SKILL.md` with frontmatter | 2025 (commands merged into skills) | Skills support frontmatter, supporting files, model invocation control |
| Manual file copying | Plugin marketplace system | Oct 2025 | Versioned distribution with auto-updates |
| `$HOME/.claude/` paths | `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SKILL_DIR}` | Oct 2025 | Location-independent path resolution |

**Key environment variables:**
- `${CLAUDE_PLUGIN_ROOT}`: Plugin root directory. Works in hooks, MCP configs, scripts. Does NOT work in SKILL.md markdown content.
- `${CLAUDE_SKILL_DIR}`: Skill subdirectory (e.g., `skills/task-jira/`). Works in SKILL.md bash injection (`!`command``). For plugin skills, this is the skill's subdirectory, not plugin root.
- `${CLAUDE_SESSION_ID}`: Current session ID. Works in SKILL.md content.
- `$ARGUMENTS`: User arguments passed to a skill. Works in SKILL.md content.

## Open Questions

1. **Exact GitHub username for repository URL**
   - What we know: Repo is "ai-toolbelt" on GitHub, user context suggests "ivarga"
   - What's unclear: Exact GitHub org/username for the repository field
   - Recommendation: Use the actual GitHub URL; can be corrected in the plan if wrong

2. **Plugin cache staleness bug (GitHub #15642)**
   - What we know: Mentioned in STATE.md as a potential concern
   - What's unclear: Whether it affects development workflow or only installed plugins
   - Recommendation: Use `--plugin-dir` during development to bypass cache entirely; this is the recommended dev workflow anyway

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual validation (no automated test framework for plugin structure) |
| Config file | none |
| Quick run command | `claude --plugin-dir ./ --debug 2>&1 \| head -50` |
| Full suite command | `claude plugin validate .` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | plugin.json exists and is valid | smoke | `claude plugin validate .` | Wave 0 |
| PLUG-01 | Plugin loads without errors | smoke | `claude --plugin-dir ./ --debug 2>&1 \| grep -i "error\|loading plugin"` | Wave 0 |
| PLUG-01 | marketplace.json exists and is valid | smoke | `python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))"` | Wave 0 |
| PLUG-01 | Directory structure complete | smoke | `test -d skills && test -d agents && test -d hooks && test -d tools && test -d scripts && echo "PASS"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `claude plugin validate .`
- **Per wave merge:** Full validation: `claude --plugin-dir ./` and verify `/tb:` namespace appears
- **Phase gate:** Plugin loads cleanly with `--plugin-dir`, validate passes, all directories exist

### Wave 0 Gaps
None -- validation uses built-in Claude Code CLI commands (`plugin validate`, `--debug` flag). No test framework needed.

## Sources

### Primary (HIGH confidence)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference) - Complete plugin.json schema, directory structure, environment variables, debugging
- [Create plugins](https://code.claude.com/docs/en/plugins) - Plugin creation guide, quickstart, skill structure
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) - marketplace.json schema, self-hosted distribution, private repos
- [Skills](https://code.claude.com/docs/en/skills) - SKILL.md format, frontmatter fields, `${CLAUDE_SKILL_DIR}`, supporting files

### Secondary (MEDIUM confidence)
- [claude-plugins-official marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json) - Official marketplace structure reference (verified via gh API)
- [claude-code marketplace.json](https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json) - Bundled plugin marketplace reference (verified via gh API)
- [GitHub issue #9354](https://github.com/anthropics/claude-code/issues/9354) - ${CLAUDE_PLUGIN_ROOT} limitation in markdown content

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All from official Claude Code documentation
- Architecture: HIGH - Directory structure verified against official docs and real plugin examples
- Pitfalls: HIGH - Documented issues from official troubleshooting guides and known GitHub issues

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (plugin system is stable, unlikely to change significantly in 30 days)
