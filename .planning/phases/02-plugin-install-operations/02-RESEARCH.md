# Phase 2: Plugin Install + Operations - Research

**Researched:** 2026-03-11
**Domain:** Claude Code plugin lifecycle -- install, update, health check, session hooks
**Confidence:** HIGH

## Summary

Phase 2 creates the operational layer for the tb plugin: install documentation, an update skill (`/tb:update`), a doctor/health-check skill (`/tb:doctor`), and a SessionStart hook for context injection. The foundational plugin scaffold from Phase 1 is already in place with `plugin.json`, `marketplace.json`, and all component directories.

The install mechanism uses Claude Code's native plugin system: users add the marketplace via `claude plugin marketplace add ivarga/ai-toolbelt`, then install with `claude plugin install tb@tb-marketplace`. No custom install script is needed. Skills are SKILL.md files in `skills/<name>/SKILL.md` with YAML frontmatter. The SessionStart hook uses the proven superpowers pattern: `hooks/hooks.json` pointing to a bash script that outputs JSON with `hookSpecificOutput.additionalContext`.

**Primary recommendation:** Follow the superpowers hook pattern exactly (already installed locally at `~/.claude/plugins/cache/superpowers-marketplace/superpowers/4.2.0/`). Use `disable-model-invocation: true` for both `/tb:update` and `/tb:doctor` since they are user-initiated operations with side effects. Design the doctor check system with a modular `scripts/checks/` directory from day one so later phases can drop in checks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use Claude Code's native plugin install -- no custom install script
- Users install via direct GitHub repo URL (e.g., `claude plugin marketplace add ivarga/ai-toolbelt` then `claude plugin install tb@tb-marketplace`)
- marketplace.json already configured from Phase 1 with self-hosted source
- Create a README.md at repo root with install instructions
- Skill-based update invoked as `/tb:update` from within Claude Code
- Stash local changes before pull, unstash after -- handles dirty working tree gracefully
- Show changelog after pull (what changed -- new/updated skills, version bumps)
- Use semantic versioning in plugin.json -- compare before/after version
- Remind user to `/reload-plugins` after update
- Skill-based health check invoked as `/tb:doctor`
- Checks: plugin registered in Claude Code, all SKILL.md files parse correctly, hooks.json is valid, skill dirs have SKILL.md
- Credentials and external tools checked in later phases (Phase 5+)
- Output format: pass/fail checklist with checkmark/cross per component
- Failed items show a one-line fix hint (don't auto-fix)
- Modular check system: checks defined in scripts/checks/ so later phases can drop in new checks without modifying doctor skill
- Dynamic skill discovery -- hook script scans skills/ directory at runtime, reads SKILL.md frontmatter for name + description
- Injects skill inventory with one-line descriptions so Claude knows available /tb:* skills
- Fires on all session events: startup, resume, clear, compact (matches superpowers pattern)
- Runs async (non-blocking) for faster perceived startup
- Follows superpowers pattern: hooks/hooks.json + hooks/session-start.sh outputting JSON with hookSpecificOutput.additionalContext

### Claude's Discretion
- README.md structure and content beyond install instructions
- Exact changelog format in /tb:update
- Hook output formatting and context injection wording
- Check script interface/convention for modular doctor checks

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-02 | Install script that clones repo and registers plugin in Claude Code | Native plugin install via marketplace add + plugin install; README.md documents the two-step process |
| PLUG-03 | Update mechanism for pulling latest changes | `/tb:update` skill with git stash/pull/unstash, version comparison, changelog display |
| PLUG-04 | Health check / doctor command that verifies all components working | `/tb:doctor` skill with modular check scripts in `scripts/checks/` |
| PLUG-05 | SessionStart hook that injects toolkit context | `hooks/hooks.json` + `hooks/session-start.sh` following superpowers pattern with dynamic skill discovery |
</phase_requirements>

## Standard Stack

### Core
| Component | Version/Source | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| SKILL.md frontmatter | Agent Skills spec | Skill definition format | Official Claude Code standard, YAML frontmatter with name + description |
| hooks/hooks.json | Claude Code plugin spec | Hook registration | Official plugin hooks location, merged with user hooks when plugin enabled |
| bash scripts | sh/bash | Hook execution, doctor checks, update logic | Claude Code hooks execute shell commands; proven in superpowers pattern |
| `${CLAUDE_PLUGIN_ROOT}` | Claude Code env var | Path resolution in hooks/scripts | Official plugin path variable, resolves at runtime |
| `${CLAUDE_SKILL_DIR}` | Claude Code env var | Path resolution in SKILL.md | Official skill path variable, resolves in SKILL.md content |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `jq` | JSON parsing in bash scripts | Parsing plugin.json version, SKILL.md frontmatter extraction |
| `git` | Version control operations | Update skill (stash/pull/unstash), version tracking |
| `sed`/`awk`/`grep` | Text processing | SKILL.md frontmatter parsing in session-start hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bash for hooks | python3 or node | Bash has zero dependencies, faster startup for async hooks; python/node adds dependency |
| `grep`/`sed` for frontmatter parsing | `yq` YAML parser | `yq` is more correct for edge cases but adds a dependency; `grep`/`sed` sufficient for simple `name:` and `description:` extraction |
| Modular check scripts | Single monolithic doctor script | Modular is the locked decision; enables Phase 5+ to add checks without modifying core |

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
ai-toolbelt/
├── .claude-plugin/
│   ├── plugin.json          # (existing) version tracked for update comparison
│   └── marketplace.json     # (existing) self-hosted source: "./"
├── hooks/
│   ├── hooks.json           # NEW: SessionStart hook registration
│   └── session-start.sh     # NEW: Dynamic skill discovery + context injection
├── skills/
│   ├── update/
│   │   └── SKILL.md         # NEW: /tb:update skill
│   └── doctor/
│       └── SKILL.md         # NEW: /tb:doctor skill
├── scripts/
│   └── checks/              # NEW: Modular doctor check scripts
│       ├── plugin-registered.sh
│       ├── skills-valid.sh
│       └── hooks-valid.sh
├── CLAUDE.md                # (existing)
├── README.md                # NEW: Install instructions
└── .gitignore               # (existing)
```

### Pattern 1: Plugin hooks.json (SessionStart)
**What:** Register a SessionStart hook via the plugin's `hooks/hooks.json`
**When to use:** Any plugin that needs to inject context at session start
**Example:**
```json
// Source: superpowers plugin (local cache) + official hooks docs
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Pattern 2: Hook script JSON output
**What:** Hook script outputs JSON with `hookSpecificOutput.additionalContext`
**When to use:** When injecting context that Claude should see at session start
**Example:**
```bash
#!/usr/bin/env bash
# Source: superpowers session-start.sh pattern
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

# Build context string...
context="Your context here"
escaped=$(escape_for_json "$context")

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${escaped}"
  }
}
EOF
exit 0
```

### Pattern 3: SKILL.md with disable-model-invocation
**What:** User-only skills for operations with side effects
**When to use:** Skills like update and doctor that should never be auto-invoked by Claude
**Example:**
```yaml
---
name: update
description: Pull latest plugin changes and show what was updated
disable-model-invocation: true
---

# Update tb Plugin

... instructions ...
```

### Pattern 4: Modular check scripts
**What:** Each health check is an independent bash script in `scripts/checks/`
**When to use:** Doctor/health-check systems that need to grow over time
**Convention:** Each check script:
- Receives `$PLUGIN_ROOT` as first argument
- Outputs one line: `PASS|FAIL <check-name> <message>`
- Exit code 0 always (the PASS/FAIL is in output, not exit code)
- Scripts are discovered by globbing `scripts/checks/*.sh`

### Pattern 5: Dynamic skill discovery in session-start hook
**What:** Scan `skills/*/SKILL.md` at runtime, extract name + description from frontmatter
**When to use:** Plugins where skills are added incrementally across phases
**Approach:**
```bash
skill_list=""
for skill_dir in "${PLUGIN_ROOT}"/skills/*/; do
    skill_md="${skill_dir}SKILL.md"
    if [ -f "$skill_md" ]; then
        name=$(grep -m1 '^name:' "$skill_md" | sed 's/^name:[[:space:]]*//')
        desc=$(grep -m1 '^description:' "$skill_md" | sed 's/^description:[[:space:]]*//' | sed "s/^['\"]//;s/['\"]$//")
        skill_list="${skill_list}\n- /tb:${name} -- ${desc}"
    fi
done
```

### Anti-Patterns to Avoid
- **Hardcoding skill lists in session-start.sh:** Defeats dynamic discovery. Scan at runtime instead.
- **Using exit code 2 in SessionStart hooks:** SessionStart cannot block -- exit 2 only shows stderr to user, does not inject context. Always exit 0 with JSON.
- **Putting hooks inside .claude-plugin/:** Hooks directory must be at plugin root level. Only plugin.json goes inside .claude-plugin/.
- **Omitting hookEventName from JSON output:** Since ~v2.1.42, omitting `hookEventName` from `hookSpecificOutput` causes silent failure. Always include it.
- **Using `jq` without checking if installed:** Not all systems have `jq`. For simple JSON construction, use bash heredoc with `cat <<EOF`. For reading JSON, consider `grep`/`sed` on known-format files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin installation | Custom clone + register script | `claude plugin marketplace add` + `claude plugin install` | Native Claude Code flow handles caching, versioning, scope |
| Plugin update mechanism | Custom version tracking system | `git stash && git pull && git stash pop` + version diff from plugin.json | Git handles the heavy lifting; version is already in plugin.json |
| YAML frontmatter parsing | Full YAML parser in bash | Simple `grep -m1 '^name:'` / `grep -m1 '^description:'` | SKILL.md frontmatter is always simple key: value; no nested YAML needed |
| JSON escaping | Character-by-character loop | Bash parameter substitution (`${s//old/new}`) | Superpowers' proven `escape_for_json` function handles all edge cases efficiently |
| Hook JSON output | Complex JSON builder | `cat <<EOF` heredoc with escaped interpolation | Hook output is a fixed-structure JSON object; heredoc is sufficient |

## Common Pitfalls

### Pitfall 1: Plugin hook additionalContext not surfacing (CRITICAL)
**What goes wrong:** Plugin-defined SessionStart hooks execute but `additionalContext` is not injected into Claude's context. Claude only sees a generic success message.
**Why it happens:** Known open bug (GitHub #16538, confirmed on v2.1.45+). Plugin hook stdout is captured but not routed to model context. Works for native hooks in `~/.claude/settings.json` but not plugin `hooks/hooks.json`.
**How to avoid:** Two strategies:
1. Primary: Implement in plugin hooks.json as designed. The superpowers plugin (v4.2.0) works with this pattern when installed from a GitHub marketplace -- the key is that the plugin must be installed via the marketplace system (not `--plugin-dir` for dev).
2. Fallback: If the bug manifests, document workaround in README -- user copies the hook definition to their `~/.claude/settings.json` or `~/.claude/settings.local.json` with absolute path.
**Warning signs:** After install, ask Claude "what tb skills are available?" -- if Claude doesn't know, the hook context isn't being injected.

### Pitfall 2: Local development hooks don't fire
**What goes wrong:** Hooks work when plugin is installed from marketplace but not with `--plugin-dir ./`.
**Why it happens:** Known issue (#11509). Local file-based marketplace plugins have hooks that execute but stdout is not captured.
**How to avoid:** During development, test hooks by temporarily adding them to `~/.claude/settings.local.json`. For production use, install via marketplace. Document this in README.

### Pitfall 3: SKILL.md description parsing with quotes
**What goes wrong:** Frontmatter description wrapped in quotes includes the quotes in parsed output.
**Why it happens:** Simple `grep`/`sed` doesn't strip YAML string quoting.
**How to avoid:** Strip leading/trailing quotes after grep: `sed "s/^['\"]//;s/['\"]$//"`. Also handle descriptions that span multiple lines by only reading the first line (use `-m1` flag).

### Pitfall 4: git stash pop conflicts in update
**What goes wrong:** `git stash pop` fails if pulled changes conflict with stashed local changes.
**Why it happens:** User modified files that were also changed upstream.
**How to avoid:** Use `git stash pop` and check exit code. If it fails, inform user that stash was preserved and they need to resolve manually. Never force or silently discard.

### Pitfall 5: Plugin cache staleness
**What goes wrong:** After `git pull` in the source repo, the installed plugin doesn't reflect changes.
**Why it happens:** Claude Code caches plugins at install time. Known issue (GitHub #15642 per STATE.md).
**How to avoid:** The `/tb:update` skill should remind users to run `/reload-plugins` after update. For marketplace-installed plugins, `claude plugin update tb@tb-marketplace` refreshes the cache.

### Pitfall 6: session-start.sh not executable
**What goes wrong:** Hook fails silently because the script doesn't have execute permission.
**Why it happens:** Git doesn't always preserve execute bits, especially on Windows or after certain clone operations.
**How to avoid:** Always `chmod +x hooks/session-start.sh` and add a note in README. Also verify in doctor checks.

### Pitfall 7: Shell profile interference with JSON output
**What goes wrong:** Hook outputs extra text before the JSON (from .bashrc, .zshrc login messages).
**Why it happens:** Claude Code uses the user's shell environment, which may print text on startup.
**How to avoid:** Use `#!/usr/bin/env bash` (not login shell), `set -euo pipefail`, and ensure the JSON is the only stdout. The superpowers pattern handles this correctly.

## Code Examples

### hooks/hooks.json -- Complete SessionStart registration
```json
// Source: Superpowers plugin pattern (verified locally)
// + official Claude Code hooks reference
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### SKILL.md frontmatter for user-only skill
```yaml
# Source: Official Claude Code skills docs
---
name: update
description: Pull latest tb plugin changes, show changelog, and remind to reload
disable-model-invocation: true
---
```

### Frontmatter extraction in bash (for session-start.sh)
```bash
# Source: Derived from superpowers pattern + Claude Code SKILL.md spec
# Extract name and description from SKILL.md frontmatter
extract_frontmatter() {
    local skill_md="$1"
    local in_frontmatter=false
    local name="" desc=""

    while IFS= read -r line; do
        if [[ "$line" == "---" ]]; then
            if $in_frontmatter; then break; fi
            in_frontmatter=true
            continue
        fi
        if $in_frontmatter; then
            case "$line" in
                name:*) name="${line#name:}"; name="${name#"${name%%[![:space:]]*}"}" ;;
                description:*) desc="${line#description:}"; desc="${desc#"${desc%%[![:space:]]*}"}"; desc="${desc#\"}"; desc="${desc%\"}" ; desc="${desc#\'}"; desc="${desc%\'}" ;;
            esac
        fi
    done < "$skill_md"

    printf '%s\t%s' "$name" "$desc"
}
```

### Modular check script interface
```bash
#!/usr/bin/env bash
# scripts/checks/plugin-registered.sh
# Convention: receives $1 = PLUGIN_ROOT, outputs "PASS|FAIL <name> <message>"

PLUGIN_ROOT="$1"
CHECK_NAME="plugin-registered"

settings_file="$HOME/.claude/settings.json"
if [ -f "$settings_file" ] && grep -q "tb@" "$settings_file"; then
    echo "PASS ${CHECK_NAME} Plugin is registered in Claude Code"
else
    installed_file="$HOME/.claude/plugins/installed_plugins.json"
    if [ -f "$installed_file" ] && grep -q "tb@" "$installed_file"; then
        echo "PASS ${CHECK_NAME} Plugin is installed in Claude Code"
    else
        echo "FAIL ${CHECK_NAME} Plugin not found -- run: claude plugin marketplace add ivarga/ai-toolbelt && claude plugin install tb@tb-marketplace"
    fi
fi
```

### Update skill version comparison
```bash
# Source: Derived from plugin.json semantic versioning pattern
# Compare before/after versions
old_version=$(grep '"version"' "${PLUGIN_ROOT}/.claude-plugin/plugin.json" | head -1 | sed 's/.*"version":[[:space:]]*"\(.*\)".*/\1/')

git stash --include-untracked -q 2>/dev/null || true
git pull --rebase origin main

new_version=$(grep '"version"' "${PLUGIN_ROOT}/.claude-plugin/plugin.json" | head -1 | sed 's/.*"version":[[:space:]]*"\(.*\)".*/\1/')

git stash pop -q 2>/dev/null || true

if [ "$old_version" != "$new_version" ]; then
    echo "Updated: ${old_version} -> ${new_version}"
fi
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` | `.claude/skills/<name>/SKILL.md` | Claude Code 1.0.33+ | Skills support frontmatter, supporting files, subagent execution |
| Manual hook setup in settings.json | Plugin `hooks/hooks.json` auto-merged | Claude Code plugin system | Hooks distributed with plugin, no manual user config needed |
| `hookSpecificOutput` without `hookEventName` | `hookEventName` required | ~v2.1.42 | Omitting causes silent failure; always include it |

**Deprecated/outdated:**
- `.claude/commands/` still works but `.claude/skills/` is preferred (commands are now aliases for skills)
- Hooks without `hookEventName` in `hookSpecificOutput` -- silently dropped since ~v2.1.42

## Open Questions

1. **Plugin hook additionalContext bug status**
   - What we know: Open issue #16538, confirmed broken as of v2.1.45. Superpowers works (installed from GitHub marketplace, cached properly).
   - What's unclear: Whether the bug affects GitHub marketplace plugins (superpowers works) or only local/URL-based marketplaces. Current version is 2.1.72 -- may be fixed.
   - Recommendation: Implement hooks.json as designed. Test after install from marketplace. Document fallback workaround in README if needed.

2. **`claude plugin update` behavior for self-hosted plugins**
   - What we know: `claude plugin update tb@tb-marketplace` exists as a CLI command.
   - What's unclear: Whether this properly re-fetches from the GitHub repo for self-hosted plugins, or if it only works for plugins with explicit version URLs in marketplace.json.
   - Recommendation: The `/tb:update` skill does `git pull` in the plugin source. After marketplace install, the plugin is cached separately -- so the update skill operates on the cached copy. Need to verify whether `${CLAUDE_PLUGIN_ROOT}` in the hook resolves to the cache or the source. If cache, the skill needs to operate on the cache path.

3. **CLAUDE_PLUGIN_ROOT resolution for different install methods**
   - What we know: `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin's root. For cached plugins, this is `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
   - What's unclear: For the update skill, running `git pull` inside the cached directory may not be a git repo. The source repo is separate.
   - Recommendation: The update skill should detect whether it's running from cache or from `--plugin-dir` source. If from cache, use `claude plugin update` CLI instead of `git pull`. If from source (development), use `git pull`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bash + manual verification (no automated test framework in project) |
| Config file | none -- shell scripts validated by execution |
| Quick run command | `claude plugin validate .` |
| Full suite command | manual: load plugin via `--plugin-dir ./`, invoke skills, check hook output |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-02 | Plugin installable from marketplace | manual | `claude plugin marketplace add . && claude plugin install tb@tb-marketplace` | N/A |
| PLUG-03 | Update pulls latest changes | manual | `/tb:update` in Claude Code session | Wave 0 |
| PLUG-04 | Doctor reports component status | smoke | `bash scripts/checks/*.sh /path/to/plugin` | Wave 0 |
| PLUG-05 | SessionStart injects skill inventory | manual | Start session, ask Claude "what tb skills are available?" | Wave 0 |

### Sampling Rate
- **Per task commit:** `claude plugin validate .` (validates plugin structure)
- **Per wave merge:** Load via `--plugin-dir ./` and verify skills + hook
- **Phase gate:** Full manual verification of all 4 requirements

### Wave 0 Gaps
- [ ] `hooks/hooks.json` -- SessionStart hook registration
- [ ] `hooks/session-start.sh` -- hook script (must be executable)
- [ ] `skills/update/SKILL.md` -- update skill definition
- [ ] `skills/doctor/SKILL.md` -- doctor skill definition
- [ ] `scripts/checks/` -- at least 3 check scripts for core validations
- [ ] `README.md` -- install instructions

## Sources

### Primary (HIGH confidence)
- Superpowers plugin v4.2.0 (local cache at `~/.claude/plugins/cache/superpowers-marketplace/superpowers/4.2.0/`) -- hooks.json format, session-start.sh pattern, escape_for_json, SKILL.md frontmatter format
- [Official Claude Code hooks reference](https://code.claude.com/docs/en/hooks) -- SessionStart spec, hookSpecificOutput format, matcher patterns, async behavior, exit code semantics
- [Official Claude Code skills reference](https://code.claude.com/docs/en/skills) -- SKILL.md frontmatter fields, disable-model-invocation, ${CLAUDE_SKILL_DIR}, invocation patterns
- [Official Claude Code plugins guide](https://code.claude.com/docs/en/plugins) -- plugin structure, hooks/hooks.json location, --plugin-dir testing
- [Official plugin discovery/install guide](https://code.claude.com/docs/en/discover-plugins) -- marketplace add flow, plugin install flow, update mechanism
- Local `~/.claude/settings.json` and `~/.claude/plugins/installed_plugins.json` -- verified plugin registration format, enabledPlugins key structure

### Secondary (MEDIUM confidence)
- [GitHub issue #16538](https://github.com/anthropics/claude-code/issues/16538) -- Plugin SessionStart hooks don't surface additionalContext (still OPEN as of 2026-02-24, confirmed on v2.1.45)
- [GitHub issue #11509](https://github.com/anthropics/claude-code/issues/11509) -- Local file-based marketplace hooks never execute (OPEN)
- Multiple Claude Code hookify plugin patterns (verified against official docs)

### Tertiary (LOW confidence)
- Whether issue #16538 affects GitHub-marketplace-installed plugins (superpowers works, suggesting it may only affect local marketplaces)
- Whether `claude plugin update` properly refreshes self-hosted GitHub plugins

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- verified against official docs and working superpowers plugin
- Architecture: HIGH -- patterns directly from superpowers (proven, production-tested) + official docs
- Pitfalls: HIGH -- verified via GitHub issues with reproduction steps and community confirmation
- Hook bug risk: MEDIUM -- known issue may or may not affect this specific install pattern

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (30 days -- hooks system is evolving, bug may get fixed)
