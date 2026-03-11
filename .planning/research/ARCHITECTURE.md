# Architecture Patterns

**Domain:** Claude Code plugin + developer toolkit (private)
**Researched:** 2026-03-11
**Confidence:** HIGH (verified against official docs + real plugin structures on disk)

## Recommended Architecture

Single git repo, structured as a Claude Code plugin with a self-hosted marketplace of one. The repo IS the plugin -- everything lives at root level following the standard plugin layout, with additional top-level directories for tools and config that the plugin's skills/scripts reference.

```
ai-toolbelt/                          # Plugin root = repo root
  .claude-plugin/
    plugin.json                       # Plugin manifest (name, version, description)
    marketplace.json                  # Self-contained marketplace for install
  skills/                             # Auto-discovered by Claude Code
    gh-upload/
      SKILL.md
      setup.sh
      upload.sh
    mobilecli/
      SKILL.md
      test-helpers.sh
    contentful-cli/
      SKILL.md
    daily-summary/
      SKILL.md
    qa-description/
      SKILL.md
    ship-ticket/
      SKILL.md
    create-release-branch/
      SKILL.md
    mbridge/                          # New mobile automation skill
      SKILL.md
      references/
  commands/                           # Auto-discovered by Claude Code
    catchup.md
    github-issue.md
    github-pr.md
    investigate-sentry-issue.md
    jira.md
    pr-description.md
    reset-app-data.md
    upload-sentry-sourcemaps.md
  agents/                             # Subagent definitions
    attachment-documenter.md
  hooks/
    hooks.json                        # Session hooks (optional)
  scripts/                            # Shared helper scripts (bash/node)
    credentials/
      setup-all.sh                    # Master credential setup
      setup-gh-upload.sh
      setup-jira.sh
      setup-sentry.sh
      setup-contentful.sh
    node/                             # Node.js helper scripts
      ...
  tools/                              # Standalone CLI tools
    mbridge/                          # Python CLI (pip-installable)
      pyproject.toml
      src/
        mbridge/
          __init__.py
          cli.py
          ...
  config/
    CLAUDE.md                         # Global CLAUDE.md content
  bin/
    install.sh                        # One-command installer
    update.sh                         # Update mechanism
    uninstall.sh
```

## Component Boundaries

### Layer 1: Plugin Shell (Claude Code Integration)

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `.claude-plugin/plugin.json` | Plugin identity, version, metadata | Claude Code plugin system |
| `.claude-plugin/marketplace.json` | Self-contained marketplace for `plugin install` | Claude Code marketplace system |
| `skills/` | Auto-discovered SKILL.md files Claude reads | Claude Code skill loader |
| `commands/` | Auto-discovered command .md files for `/slash` commands | Claude Code command loader |
| `agents/` | Subagent definitions Claude can invoke | Claude Code agent system |
| `hooks/hooks.json` | Event handlers (SessionStart, PostToolUse, etc.) | Claude Code hook system |

This is the discovery layer. Claude Code scans these directories automatically when the plugin is loaded. No manual wiring required.

### Layer 2: Skill Implementations

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `skills/*/SKILL.md` | Instructions Claude follows for a task | Shell scripts, Node scripts, CLI tools |
| `skills/*/setup.sh` | Per-skill credential setup | macOS Keychain (`security` command) |
| `skills/*/*.sh` | Skill-specific helper scripts | External APIs, CLIs, device tools |
| `skills/*/references/` | Additional context docs for skills | Referenced by SKILL.md |

Skills are self-contained units. Each skill folder has everything it needs: the SKILL.md instruction file, any helper scripts, and optional reference material. Skills reference their own files via `${CLAUDE_PLUGIN_ROOT}/skills/<name>/` paths.

### Layer 3: Shared Infrastructure

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `scripts/credentials/` | Centralized credential setup for all skills | macOS Keychain |
| `scripts/node/` | Reusable Node.js helpers (offloaded from inline bash) | Called by skills via bash |
| `config/CLAUDE.md` | Global instructions template | Symlinked/copied to `~/.claude/CLAUDE.md` |

The shared layer avoids duplication. Credential scripts follow the gh-upload pattern (read from Keychain via `security find-generic-password`). Node scripts handle complex logic that's unwieldy in bash.

### Layer 4: Standalone Tools

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `tools/mbridge/` | Python CLI for mobile automation (UI dumps, OCR, device control) | iOS/Android devices via mobilecli, ADB, xcrun |
| `tools/mbridge/src/mbridge/cli.py` | CLI entry point (`mbridge` command) | Device bridge layer |

mbridge is a standalone Python package inside the repo. It gets installed via pip (local editable install or system-wide). The `mbridge` skill in `skills/mbridge/SKILL.md` teaches Claude how to use the `mbridge` CLI -- the skill and the tool are separate concerns.

### Layer 5: Distribution & Lifecycle

| Component | Responsibility | Talks To |
|-----------|---------------|----------|
| `bin/install.sh` | First-time setup on a new machine | git, pip, security, Claude Code CLI |
| `bin/update.sh` | Pull latest, re-run setup if needed | git, pip, Claude Code plugin system |
| `bin/uninstall.sh` | Clean removal | Claude Code CLI, pip, Keychain |

## Data Flow

### Plugin Discovery (how Claude finds capabilities)

```
User starts Claude Code
  -> Claude Code reads ~/.claude/settings.json
  -> Finds ai-toolbelt in enabledPlugins
  -> Reads ~/.claude/plugins/cache/ai-toolbelt-marketplace/ai-toolbelt/<version>/
  -> Scans skills/ -> loads SKILL.md files (name, description, allowed-tools from frontmatter)
  -> Scans commands/ -> loads .md files (frontmatter + content)
  -> Scans agents/ -> loads agent definitions
  -> Reads hooks/hooks.json -> registers event handlers
  -> All capabilities now available in session
```

### Skill Execution (how a skill runs)

```
Claude decides to use "gh-upload" skill (or user invokes /ai-toolbelt:gh-upload)
  -> Claude reads skills/gh-upload/SKILL.md
  -> SKILL.md says: run bash "${CLAUDE_PLUGIN_ROOT}/skills/gh-upload/upload.sh" <file>
  -> upload.sh reads credential from Keychain: security find-generic-password -s "gh-upload" ...
  -> upload.sh calls GitHub API with credential
  -> Returns result to Claude
```

### Credential Flow (how secrets work)

```
User runs: bash install.sh (or bash scripts/credentials/setup-all.sh)
  -> For each service needing credentials:
     -> Prompts user for value (interactive terminal)
     -> Stores via: security add-generic-password -s "<service>" -a "<account>" -w "<value>"
  -> Skills read at runtime via: security find-generic-password -s "<service>" -a "<account>" -w

Never stored in files. Never in env vars. Always Keychain.
```

### mbridge Tool Flow (how mobile automation works)

```
Claude reads skills/mbridge/SKILL.md
  -> SKILL.md teaches Claude to use `mbridge` CLI commands
  -> Claude runs: mbridge dump-ui --device <id>
  -> mbridge (Python) calls mobilecli or ADB/xcrun under the hood
  -> Returns UI tree JSON
  -> Claude uses jq to find elements, then: mbridge tap <x,y>
  -> For OCR verification: mbridge ocr --region <bounds>
```

### Install Flow (how a new machine gets set up)

```
User clones repo: git clone git@github.com:user/ai-toolbelt.git
  -> Runs: bash ai-toolbelt/bin/install.sh
  -> install.sh does:
     1. Add marketplace: claude plugin marketplace add ./ai-toolbelt
        (or register via settings.json directly)
     2. Install plugin: claude plugin install ai-toolbelt@ai-toolbelt-marketplace
     3. Install mbridge: cd tools/mbridge && pip install -e .
     4. Run credential setup: bash scripts/credentials/setup-all.sh
     5. Install/copy CLAUDE.md: cp config/CLAUDE.md ~/.claude/CLAUDE.md
        (or merge with existing)
  -> Done. All skills, commands, tools available.
```

### Update Flow

```
User runs /ai-toolbelt:update (or bash bin/update.sh)
  -> git pull origin main
  -> claude plugin update ai-toolbelt@ai-toolbelt-marketplace
  -> pip install -e tools/mbridge (picks up any Python changes)
  -> Done. /reload-plugins activates changes.
```

## Key Architectural Decisions

### 1. Single Marketplace with Single Plugin (not standalone files)

**Decision:** Package as a proper Claude Code plugin with marketplace, not bare files in `~/.claude/`.

**Rationale:**
- Plugin system provides namespacing (`/ai-toolbelt:jira`), version tracking, cache management
- Marketplace enables `plugin install` / `plugin update` workflow
- Files are cached by Claude Code -- original repo stays clean
- `/reload-plugins` picks up changes without restart
- `--plugin-dir ./ai-toolbelt` works for development (no install needed)

**Tradeoff:** Skills get namespaced names (`/ai-toolbelt:jira` not `/jira`). Acceptable for a personal toolkit.

### 2. Self-Contained Marketplace (marketplace.json in the same repo)

**Decision:** The marketplace.json lives in the same repo as the plugin, using a relative path source.

```json
{
  "name": "ai-toolbelt-marketplace",
  "plugins": [{
    "name": "ai-toolbelt",
    "source": "./",
    "version": "1.0.0"
  }]
}
```

**Rationale:**
- One repo, one `git pull` updates everything
- No need for a separate marketplace repo
- Relative path `"./"` points to the repo root (the plugin root)
- Private repo -- no need for separate access management

### 3. skills/ for SKILL.md Folders, commands/ for Simple .md Commands

**Decision:** Use both directories. Skills that need helper scripts/references go in `skills/<name>/SKILL.md`. Simple slash commands go in `commands/<name>.md`.

**Rationale:** This matches Claude Code's discovery convention:
- `skills/` = folder with SKILL.md + supporting files (scripts, references)
- `commands/` = single .md files for simpler slash commands
- Both are auto-discovered, both show up as `/plugin-name:command-name`

### 4. mbridge as Separate Python Package Inside the Repo

**Decision:** mbridge lives in `tools/mbridge/` with its own `pyproject.toml`, installed via `pip install -e .` (editable).

**Rationale:**
- Python CLI needs its own dependency management (pyproject.toml)
- Editable install means `git pull` immediately updates the tool
- Separate from the skill that teaches Claude to use it
- Clean separation: `skills/mbridge/SKILL.md` = instructions, `tools/mbridge/` = implementation
- Can be tested independently of Claude Code

### 5. Credential Setup Scripts per Service

**Decision:** Each service that needs credentials gets a setup script in `scripts/credentials/`. A master `setup-all.sh` runs them all.

**Rationale:**
- Follows proven gh-upload pattern (Keychain read/write via `security` command)
- Individual scripts allow re-running setup for one service
- Master script covers fresh machine setup
- Skills read credentials at runtime, never store them

### 6. CLAUDE.md as Distributable Config

**Decision:** Global CLAUDE.md lives in `config/CLAUDE.md` in the repo. Installer copies/merges it to `~/.claude/CLAUDE.md`.

**Rationale:**
- Version-controlled, updatable via git pull
- Same instructions on every machine
- Merge strategy needed if user has existing CLAUDE.md content

### 7. ${CLAUDE_PLUGIN_ROOT} for All Internal References

**Decision:** All scripts and SKILL.md files reference paths via `${CLAUDE_PLUGIN_ROOT}` (provided by Claude Code plugin system).

**Rationale:**
- Plugin files are COPIED to a cache directory on install (`~/.claude/plugins/cache/...`)
- Original repo path won't work after install
- `${CLAUDE_PLUGIN_ROOT}` resolves to wherever the cached copy lives
- For `--plugin-dir` development, it resolves to the original repo path

## Patterns to Follow

### Pattern 1: Skill with Helper Scripts

Every skill that needs external logic follows this structure:

```
skills/my-skill/
  SKILL.md          # Claude reads this
  helper.sh         # SKILL.md tells Claude to run this
  setup.sh          # Credential setup (optional)
```

SKILL.md references scripts via:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/my-skill/helper.sh" <args>
```

### Pattern 2: Keychain Credential Access

Every service credential follows this read/write pattern:

```bash
SERVICE_NAME="jira"
ACCOUNT="api-token"

security add-generic-password -s "$SERVICE_NAME" -a "$ACCOUNT" -w "$VALUE"

VALUE=$(security find-generic-password -s "$SERVICE_NAME" -a "$ACCOUNT" -w 2>/dev/null)
```

### Pattern 3: Skill Frontmatter

```yaml
---
name: skill-name
description: When to use this skill. Triggers on specific phrases.
allowed-tools: Bash(specific-command:*)
---
```

`allowed-tools` restricts what tools Claude can use when the skill is active. Use for security-sensitive skills (e.g., only allow specific CLI commands).

### Pattern 4: Command as Simple Instructions

Commands are single .md files with optional frontmatter:

```markdown
---
description: What this command does
---

Instructions for Claude when user runs /plugin-name:command-name.
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Files Outside Plugin Root

**What:** Referencing files via `../` or absolute paths outside the plugin directory.

**Why bad:** Plugin files are copied to cache on install. External references break. Claude Code blocks path traversal.

**Instead:** Keep everything inside the plugin root. Use symlinks if absolutely necessary (they are followed during cache copy).

### Anti-Pattern 2: Storing Secrets in Files or Env Vars

**What:** Writing credentials to `.env`, config files, or expecting `export TOKEN=...`.

**Why bad:** Files can leak via git, env vars visible in process lists.

**Instead:** Always use macOS Keychain (`security` command). Read at runtime in scripts.

### Anti-Pattern 3: Hardcoded Plugin Root Paths

**What:** Using `$HOME/.claude/plugins/cache/...` or the repo's git checkout path.

**Why bad:** Cache path changes per version. Repo path irrelevant after install.

**Instead:** Always use `${CLAUDE_PLUGIN_ROOT}`.

### Anti-Pattern 4: Mixing Skill Instructions and Tool Implementation

**What:** Putting mbridge's Python source code inside `skills/mbridge/`.

**Why bad:** Conflates what Claude reads (SKILL.md) with what gets executed (Python CLI). Makes the tool untestable outside Claude.

**Instead:** Skill folder has SKILL.md + references. Tool lives in `tools/` with its own build/install.

### Anti-Pattern 5: Interactive Scripts Called by Claude

**What:** Setup scripts that use `read` to prompt for input, called during normal skill execution.

**Why bad:** Claude can't interact with terminal prompts. Scripts hang.

**Instead:** Setup scripts are run manually by the user (documented in SKILL.md). Runtime scripts are non-interactive, reading credentials from Keychain.

## Suggested Build Order (Dependencies Between Components)

### Phase 1: Plugin Scaffolding + Install Mechanism

**Build first because:** Everything else needs to live inside a working plugin structure. Install mechanism validates the whole approach early.

- `.claude-plugin/plugin.json` + `marketplace.json`
- `bin/install.sh` (basic: register marketplace, install plugin)
- `bin/update.sh` (basic: git pull, plugin update)
- Verify: `claude --plugin-dir .` works, `plugin install` works

### Phase 2: Skill Migration (Commands + Simple Skills)

**Build second because:** These are pure .md files with no dependencies. Validates that discovery works.

- Migrate all `commands/*.md` files
- Migrate simple skills (qa-description, ship-ticket, create-release-branch, daily-summary)
- Verify: `/ai-toolbelt:jira`, `/ai-toolbelt:catchup` etc. all work

### Phase 3: Skills with Scripts + Credential System

**Build third because:** Depends on plugin structure (Phase 1) for `${CLAUDE_PLUGIN_ROOT}` path resolution.

- Migrate gh-upload (skill + setup.sh + upload.sh)
- Build `scripts/credentials/` system
- Migrate contentful-cli, investigate-sentry-issue, upload-sentry-sourcemaps
- Migrate mobilecli (skill + test-helpers.sh)
- Verify: credentials read from Keychain, scripts execute via `${CLAUDE_PLUGIN_ROOT}`

### Phase 4: Global CLAUDE.md Distribution

**Build fourth because:** Independent of skills but needs install mechanism from Phase 1.

- `config/CLAUDE.md` with current global instructions
- Install script merges/copies to `~/.claude/CLAUDE.md`
- Update script handles CLAUDE.md updates

### Phase 5: mbridge Python Tool

**Build fifth because:** Standalone tool, but the skill that wraps it (Phase 6) needs the CLI to exist.

- `tools/mbridge/` with pyproject.toml
- Core CLI: device discovery, UI dump, tap, OCR
- Install via pip in `bin/install.sh`

### Phase 6: mbridge Skill

**Build last because:** Depends on the mbridge tool (Phase 5) and the plugin structure (Phase 1).

- `skills/mbridge/SKILL.md` teaching Claude to use the CLI
- References from mobilecli skill (navigation patterns, cache strategy)
- Integration testing: Claude uses skill to automate a real device

## Component Interaction Diagram

```
                    Claude Code Session
                           |
                    Plugin Loader
                    /      |       \
              skills/   commands/   hooks/
              /    \       |          |
         SKILL.md  *.sh  *.md    hooks.json
              |      |
              v      v
         ${CLAUDE_PLUGIN_ROOT}/scripts/
              |
              v
         macOS Keychain (credentials)
              |
              v
         External APIs / CLIs
         (gh, acli, contentful, curl, mobilecli, mbridge)
              |
              v
         tools/mbridge/ (Python CLI)
              |
              v
         iOS/Android Devices
```

## Sources

- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- official plugin system documentation (HIGH confidence)
- [Claude Code Create Plugins](https://code.claude.com/docs/en/plugins) -- plugin creation guide (HIGH confidence)
- [Claude Code Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) -- marketplace distribution (HIGH confidence)
- Inspected on-disk plugin structures: skill-creator, superpowers v4.2.0, forgetful-plugin v1.1.0 (HIGH confidence)
- Inspected existing skills and commands in `~/.claude/skills/` and `~/.claude/commands/` (HIGH confidence)
- GSD update workflow in `~/.claude/get-shit-done/` (HIGH confidence)
