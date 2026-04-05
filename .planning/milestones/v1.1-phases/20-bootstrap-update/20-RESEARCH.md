# Phase 20: Bootstrap & Update - Research

**Researched:** 2026-04-02
**Domain:** Claude Code plugin skills (bash-based SKILL.md orchestration), plugin management CLI, GSD npm lifecycle
**Confidence:** HIGH

## Summary

Phase 20 creates a new `/tb:bootstrap` skill and extends the existing `/tb:update` skill. Bootstrap orchestrates first-time setup of GSD, forgetful-plugin, and GSD patches. Update extends the existing tb self-update flow with GSD update, forgetful-plugin update, and patch re-application.

The implementation is entirely SKILL.md authoring -- no new scripts, no new modules. Both skills call existing infrastructure: doctor check scripts for verification, `patches/apply-all.sh` for patch application, `claude plugin` CLI for forgetful-plugin management, and `npx` for GSD installation/update.

**Primary recommendation:** Create `skills/bootstrap/SKILL.md` as a new skill and modify `skills/update/SKILL.md` inline. Both are sequential bash step flows. Use `claude plugin install` and `claude plugin update` CLI commands for forgetful-plugin management (verified available). Use `npx -y get-shit-done-cc@latest --claude --global` for GSD install/update (consistent with GSD's own update workflow).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bootstrap guides the user to run GSD's own install command manually, then continues after. Does NOT automate the interactive installer.
- **D-02:** After user runs GSD installer, bootstrap auto-detects completion via the existing `gsd-installed.sh` doctor check script. If check fails, prompts to retry.
- **D-03:** Bootstrap only installs missing components, never updates existing ones. Updating is `/tb:update`'s job. Clean separation of concerns.
- **D-04:** Bootstrap installs forgetful-plugin via git clone. The plugin is a Claude Code plugin with skills (NOT the Forgetful server itself).
- **D-05:** Bootstrap discovers the forgetful-plugin repo URL from existing Claude settings (e.g., `~/.claude.json` or `settings.json`), not hardcoded.
- **D-06:** Extend the existing `skills/update/SKILL.md` inline with new steps for GSD + forgetful-plugin + patch re-application. No separate skills or helper scripts.
- **D-07:** GSD update uses minimal approach: run `npx -y get-shit-done-cc@latest --claude --global` directly. No version check, changelog, or confirmation.
- **D-08:** forgetful-plugin update via git pull on the plugin directory discovered from Claude settings.
- **D-09:** After GSD update, re-apply tb's patches via `patches/apply-all.sh`. After forgetful-plugin update, no special post-update steps needed.
- **D-10:** When bootstrap finds components already installed, it reports status and skips. Informative but non-blocking.
- **D-11:** Bootstrap always runs `patches/apply-all.sh` regardless of whether patches are already applied. Patches are idempotent by design.

### Claude's Discretion
- Exact SKILL.md step ordering and bash commands for bootstrap
- Error messages and recovery guidance when GSD installer fails
- How to parse Claude settings to discover forgetful-plugin path/URL
- Order of operations in /tb:update (tb pull first, then GSD, then forgetful-plugin, then patches)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOOT-01 | User can run /tb:bootstrap to install GSD if missing | GSD detection via `gsd-installed.sh`, install via `npx -y get-shit-done-cc@latest --claude --global` |
| BOOT-02 | User can run /tb:bootstrap to install forgetful-plugin if missing | Detection via `forgetful-plugin.sh`, install via `claude plugin install forgetful-plugin@forgetful-plugins` |
| BOOT-03 | User can run /tb:bootstrap to apply GSD patches for Forgetful integration | Patch application via `patches/apply-all.sh` (idempotent by design) |
| BOOT-04 | Bootstrap is idempotent -- safe to run multiple times without side effects | Doctor checks detect existing installs, patches check markers before applying |
| UPDT-01 | /tb:update also updates GSD to latest version | `npx -y get-shit-done-cc@latest --claude --global` (same as GSD's own update workflow) |
| UPDT-02 | /tb:update also updates forgetful-plugin | `claude plugin update forgetful-plugin@forgetful-plugins` CLI command (verified available) |
| UPDT-03 | /tb:update re-applies GSD patches after GSD update | Call `patches/apply-all.sh` after GSD install completes |
</phase_requirements>

## Standard Stack

No external libraries needed. This phase is purely SKILL.md authoring using existing tools.

### Core Tools (already available)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| claude CLI | current | Plugin management (install/update) | Official CLI, `claude plugin update` verified available |
| npx | 11.6.2 | GSD installation/update | GSD's own install mechanism via npm |
| bash | system | SKILL.md step execution | Plugin skill runtime |
| jq | 1.7.1 | JSON parsing for settings discovery | Already used by existing doctor checks |
| git | 2.50.1 | tb self-update (existing flow) | Version control operations |

### Existing Project Assets (reuse, don't rebuild)
| Asset | Location | Purpose |
|-------|----------|---------|
| `gsd-installed.sh` | `scripts/checks/gsd-installed.sh` | Detect GSD presence + version |
| `forgetful-plugin.sh` | `scripts/checks/forgetful-plugin.sh` | Detect forgetful-plugin presence |
| `apply-all.sh` | `patches/apply-all.sh` | Apply + verify all GSD patches |
| `update SKILL.md` | `skills/update/SKILL.md` | Existing update flow to extend |

## Architecture Patterns

### New File
```
skills/
├── bootstrap/
│   └── SKILL.md          # New: /tb:bootstrap skill
```

### Modified File
```
skills/
├── update/
│   └── SKILL.md          # Modified: extend with GSD + forgetful + patches
```

### Pattern 1: SKILL.md Frontmatter Convention
**What:** All skills use YAML frontmatter with `name`, `description`, and optionally `disable-model-invocation`.
**When to use:** Every new skill.
**Example:**
```yaml
---
name: bootstrap
description: Set up GSD, forgetful-plugin, and GSD patches in one command
disable-model-invocation: true
---
```

### Pattern 2: Plugin Root Resolution
**What:** Every skill resolves plugin root via `PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."` for referencing scripts and patches.
**When to use:** Any bash step that calls shared scripts.
**Example:**
```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh"
```

### Pattern 3: Doctor Check Output Protocol
**What:** Check scripts output `PASS|FAIL|WARN <name> <message>` and always exit 0.
**When to use:** Bootstrap uses doctor checks to detect component status.
**Example:**
```bash
RESULT=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
if echo "$RESULT" | grep -q "^PASS"; then
  # GSD is installed, extract version
  GSD_VERSION=$(echo "$RESULT" | sed 's/.*GSD v//')
fi
```

### Pattern 4: Forgetful Plugin Discovery from Claude Settings
**What:** Parse `~/.claude/plugins/installed_plugins.json` to find forgetful-plugin install path.
**When to use:** Bootstrap (detect if installed), update (find directory for git pull).

The installed_plugins.json structure:
```json
{
  "version": 2,
  "plugins": {
    "forgetful-plugin@forgetful-plugins": [
      {
        "scope": "user",
        "installPath": "/Users/.../.claude/plugins/cache/forgetful-plugins/forgetful-plugin/1.1.0",
        "version": "1.1.0",
        "installedAt": "2026-03-04T08:57:50.738Z",
        "lastUpdated": "2026-03-04T08:57:50.738Z",
        "gitCommitSha": "563e07c29af3403db269d26299dc38e5bf70c6c9"
      }
    ]
  }
}
```

The marketplace source is in `~/.claude/plugins/known_marketplaces.json`:
```json
{
  "forgetful-plugins": {
    "source": {
      "source": "github",
      "repo": "ScottRBK/forgetful-plugin"
    },
    "installLocation": "/Users/.../.claude/plugins/marketplaces/forgetful-plugins"
  }
}
```

Key discovery: The plugin cache directory IS a git repo (verified). The `claude plugin update <name>` CLI command exists and handles the full update lifecycle including git operations.

### Pattern 5: Claude Plugin CLI Commands
**What:** `claude plugin install` and `claude plugin update` are non-interactive CLI commands.
**When to use:** Bootstrap for install, update for refresh.

```bash
# Install (non-interactive)
claude plugin install forgetful-plugin@forgetful-plugins --scope user

# Update (non-interactive)
claude plugin update forgetful-plugin@forgetful-plugins --scope user
```

### Anti-Patterns to Avoid
- **Manual git clone for plugin install:** Use `claude plugin install` instead -- it handles marketplace resolution, version tracking, and cache paths.
- **Hardcoding forgetful-plugin repo URL:** D-05 says discover from settings. Use the existing `forgetful-plugin.sh` check or parse `installed_plugins.json`.
- **Running GSD update with version check/confirmation:** D-07 says minimal approach -- just `npx` directly.
- **Creating helper scripts:** D-06 says extend SKILL.md inline. All logic goes in SKILL.md step blocks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GSD presence detection | Custom check | `scripts/checks/gsd-installed.sh` | Already outputs PASS/FAIL with version |
| Forgetful plugin detection | Custom JSON parse | `scripts/checks/forgetful-plugin.sh` | Already checks installed_plugins.json |
| Patch application | Custom loop | `patches/apply-all.sh` | Already runs all patches + verify |
| Plugin install/update | Manual git clone | `claude plugin install/update` | CLI handles paths, versions, marketplace |
| GSD install/update | Custom npm wrapper | `npx -y get-shit-done-cc@latest --claude --global` | GSD's own mechanism |

## Common Pitfalls

### Pitfall 1: GSD Install is Not Non-Interactive
**What goes wrong:** Trying to script `npx -y get-shit-done-cc@latest --claude --global` silently. The GSD installer may have interactive prompts.
**Why it happens:** D-01 explicitly says "guides the user to run GSD's own install command manually."
**How to avoid:** Bootstrap should instruct the user to run the command, then check completion after. Do not try to pipe input or suppress prompts.
**Warning signs:** Skill tries to run the npx command directly in a bash block.

### Pitfall 2: Parsing Doctor Check Output Incorrectly
**What goes wrong:** Using exact string matching instead of prefix matching on doctor check output.
**Why it happens:** Doctor checks output `PASS gsd-installed GSD v1.30.0` -- the message part varies.
**How to avoid:** Match on `^PASS` or `^FAIL` prefix only.
**Warning signs:** Bootstrap breaks when GSD version string format changes.

### Pitfall 3: Plugin Update vs Plugin Install Confusion
**What goes wrong:** Using `claude plugin install` when plugin is already installed, or `claude plugin update` when not installed.
**Why it happens:** Different commands for different states.
**How to avoid:** Bootstrap checks if installed first (via doctor check), only installs if missing. Update assumes already installed (it's the update flow).
**Warning signs:** Error message about plugin already installed or not found.

### Pitfall 4: Patches Fail After GSD Update Due to Missing Workflow Files
**What goes wrong:** GSD update wipes `~/.claude/get-shit-done/workflows/` and new version may have different file structure.
**Why it happens:** GSD does a clean install -- wipes and replaces directories.
**How to avoid:** `patches/apply-all.sh` individual patches already handle missing files (output "SKIP" and exit 0). This is resilient by design.
**Warning signs:** Patch scripts failing with file not found errors (would indicate a broken patch script, not a missing workflow).

### Pitfall 5: CONTEXT.md D-05 vs D-04 Tension
**What goes wrong:** D-04 says "installs forgetful-plugin via git clone" but D-05 says "discovers repo URL from Claude settings." Meanwhile, `claude plugin install` handles both.
**Why it happens:** The context discussion preceded discovery that `claude plugin install` CLI exists.
**How to avoid:** Use `claude plugin install forgetful-plugin@forgetful-plugins` which does git clone internally. This satisfies both D-04 (git-based install) and D-05 (discovers from marketplace config). Report this reconciliation to planner.
**Warning signs:** Manually implementing git clone when CLI handles it.

### Pitfall 6: Update Order Matters
**What goes wrong:** Applying patches before GSD update, or updating forgetful-plugin before tb self-update.
**Why it happens:** Dependencies between steps not respected.
**How to avoid:** Follow the order: (1) tb pull, (2) GSD update, (3) forgetful-plugin update, (4) re-apply patches. Patches must come last because GSD update wipes the workflow files they target.
**Warning signs:** Patches applied but then immediately overwritten by GSD update.

## Code Examples

### Bootstrap SKILL.md Structure (recommended step flow)

```markdown
---
name: bootstrap
description: Set up GSD, forgetful-plugin, and GSD patches in one command
disable-model-invocation: true
---

# Bootstrap

Set up the complete tb integration environment: GSD, forgetful-plugin, and GSD workflow patches.

## Steps

### 1. Resolve plugin root
```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
```

### 2. Check GSD status
```bash
RESULT=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
echo "$RESULT"
```
If PASS: report "GSD: already installed (vX.Y.Z)" and continue.
If FAIL: guide user to run install command, then re-check.

### 3. Check forgetful-plugin status
```bash
RESULT=$(bash "$PLUGIN_ROOT/scripts/checks/forgetful-plugin.sh" "$PLUGIN_ROOT")
echo "$RESULT"
```
If PASS: report "forgetful-plugin: already installed" and continue.
If FAIL: install via claude plugin install.

### 4. Apply GSD patches
```bash
bash "$PLUGIN_ROOT/patches/apply-all.sh"
```
Always run regardless of prior state (idempotent).

### 5. Summary
Report final status of all components.
```

### Update SKILL.md Extension (new steps after existing step 9)

The existing update skill has 9 steps (detect env, capture state, stash, pull, pop stash, copy config, compare versions, show changelog, remind reload). Add after step 9:

```markdown
### 10. Update GSD
```bash
GSD_CHECK=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
```
If GSD is installed (PASS), run update. If not installed, skip.

### 11. Update forgetful-plugin
```bash
FP_CHECK=$(bash "$PLUGIN_ROOT/scripts/checks/forgetful-plugin.sh" "$PLUGIN_ROOT")
```
If installed (PASS), update via claude plugin update.

### 12. Re-apply GSD patches
```bash
bash "$PLUGIN_ROOT/patches/apply-all.sh"
```
Only run if GSD is installed.

### 13. Summary
Report what was updated.
```

### forgetful-plugin Install Command
```bash
claude plugin install forgetful-plugin@forgetful-plugins --scope user
```

### forgetful-plugin Update Command
```bash
claude plugin update forgetful-plugin@forgetful-plugins --scope user
```

### GSD Install/Update Command
```bash
npx -y get-shit-done-cc@latest --claude --global
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual git clone for plugins | `claude plugin install` CLI | claude-code 2.0+ | Non-interactive, handles marketplace resolution |
| No plugin update CLI | `claude plugin update` CLI | claude-code 2.0+ | Proper version tracking and cache management |
| Manual GSD install via curl | `npx -y get-shit-done-cc@latest` npm package | GSD 1.25+ | Simplified, npm-based lifecycle |

## Open Questions

1. **`claude plugin install` non-interactive behavior**
   - What we know: CLI command exists with `--scope user` flag.
   - What's unclear: Whether it truly runs without prompts in all cases (marketplace not registered, network failure, etc.).
   - Recommendation: Test during implementation. If it prompts, fall back to guiding user like GSD install. LOW confidence on fully non-interactive behavior.

2. **D-04/D-05 reconciliation with `claude plugin install`**
   - What we know: D-04 says "git clone" and D-05 says "discover URL from settings." `claude plugin install` does git clone internally using marketplace config.
   - What's unclear: Whether the user intended manual git clone or is satisfied with CLI-managed install.
   - Recommendation: Use `claude plugin install` as it satisfies the intent of both decisions. Flag to planner for user confirmation if needed.

3. **GSD npx install interactivity**
   - What we know: GSD's own update workflow runs `npx -y get-shit-done-cc@latest --claude --global`.
   - What's unclear: Whether this command has interactive prompts when run fresh (first install vs update).
   - Recommendation: D-01 says "guides user to run manually" for bootstrap. For update (D-07), run directly since GSD is already installed and the command is the same as GSD's own update flow.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node/npm/npx | GSD install/update | Yes | v24.12.0 / 11.6.2 | -- |
| claude CLI | Plugin install/update | Yes | current | -- |
| jq | Settings JSON parsing | Yes | 1.7.1 | python3 json module |
| git | tb self-update | Yes | 2.50.1 | -- |
| bash | SKILL.md execution | Yes | system | -- |
| GSD (get-shit-done) | Patch target | Yes | 1.30.0 | Bootstrap installs it |
| forgetful-plugin | Plugin target | Yes | 1.1.0 | Bootstrap installs it |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual skill invocation (no automated test framework in project) |
| Config file | none |
| Quick run command | `/tb:bootstrap` then `/tb:doctor` |
| Full suite command | `/tb:bootstrap` twice (idempotency) then `/tb:update` then `/tb:doctor` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOT-01 | Bootstrap installs GSD if missing | manual | Uninstall GSD, run `/tb:bootstrap`, verify via `/tb:doctor` | N/A |
| BOOT-02 | Bootstrap installs forgetful-plugin if missing | manual | Uninstall plugin, run `/tb:bootstrap`, verify via `/tb:doctor` | N/A |
| BOOT-03 | Bootstrap applies GSD patches | manual | Run `/tb:bootstrap`, check `patches/verify-patches.sh` output | N/A |
| BOOT-04 | Bootstrap is idempotent | manual | Run `/tb:bootstrap` twice, verify no errors second run | N/A |
| UPDT-01 | Update updates GSD | manual | Run `/tb:update`, check new GSD version | N/A |
| UPDT-02 | Update updates forgetful-plugin | manual | Run `/tb:update`, check plugin version | N/A |
| UPDT-03 | Update re-applies patches after GSD update | manual | Run `/tb:update`, then `patches/verify-patches.sh` | N/A |

### Sampling Rate
- **Per task commit:** Run `/tb:doctor` to verify Integration checks pass
- **Per wave merge:** Run `/tb:bootstrap` and `/tb:update` manually
- **Phase gate:** Full manual validation of all 7 requirements

### Wave 0 Gaps
None -- this phase produces SKILL.md files (markdown), not code modules. No test framework needed. Verification is through manual skill invocation and existing doctor checks.

## Sources

### Primary (HIGH confidence)
- `skills/update/SKILL.md` -- existing update flow (9 steps) read directly
- `skills/doctor/SKILL.md` -- doctor check mechanism read directly
- `scripts/checks/gsd-installed.sh` -- GSD detection logic verified
- `scripts/checks/forgetful-plugin.sh` -- forgetful-plugin detection verified
- `patches/apply-all.sh` -- patch application + verification flow verified
- `~/.claude/get-shit-done/workflows/update.md` -- GSD's own update mechanism verified
- `~/.claude/plugins/installed_plugins.json` -- plugin registry structure verified (v2 format, dict-based)
- `~/.claude/plugins/known_marketplaces.json` -- marketplace source URLs verified
- `claude plugin --help` -- CLI commands verified: install, update, uninstall, list

### Secondary (MEDIUM confidence)
- `claude plugin update` non-interactive behavior -- command exists and help verified, but exact behavior in edge cases unverified

### Tertiary (LOW confidence)
- GSD npx install interactivity -- whether first-time install via `npx -y get-shit-done-cc@latest --claude --global` has interactive prompts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools verified available on system
- Architecture: HIGH -- existing SKILL.md patterns well-established, 19 skills as reference
- Pitfalls: HIGH -- based on direct code reading of existing infrastructure
- Plugin CLI: MEDIUM -- `claude plugin install/update` help verified but runtime behavior untested

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable -- SKILL.md format unlikely to change)
