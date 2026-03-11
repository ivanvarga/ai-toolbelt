# Feature Research

**Domain:** Personal developer toolkit / Claude Code private plugin
**Researched:** 2026-03-11
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features the single user (Ivan) expects to work immediately on any machine after install. Missing any of these = the toolkit doesn't deliver on its core promise.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plugin manifest + structure | Claude Code requires `.claude-plugin/plugin.json` + correct directory layout to load skills/commands | LOW | Straightforward: manifest file, `skills/`, `commands/` dirs at plugin root. All skills namespaced as `/ai-toolbelt:skillname`. |
| Skill migration (commands + skills) | The 9 commands and 7+ skills are the entire value of the toolkit today. Without them, there's nothing. | MEDIUM | Must migrate `.claude/commands/*.md` to `commands/` and `.claude/skills/*/` to `skills/`. Need to audit all path references (`$HOME/.claude/skills/...` becomes `${CLAUDE_SKILL_DIR}/...` or `${CLAUDE_PLUGIN_ROOT}/...`). |
| Script offloading (helper scripts) | gh-upload already proves the pattern. Skills with inline bash are fragile. Scripts are testable, debuggable, and cross-platform-ready. | MEDIUM | Convert inline bash/logic in skills to Node.js/bash scripts in `skills/<name>/scripts/`. Update SKILL.md to reference `${CLAUDE_SKILL_DIR}/scripts/...`. gh-upload pattern (setup.sh + upload.sh) is the model. |
| Keychain credential setup | Skills like Jira (acli), Sentry, Contentful, gh-upload need secrets. Keychain is the proven secure approach. | MEDIUM | Unified setup flow per skill. Each skill needing credentials gets a `setup.sh` in its directory. Master `install.sh` calls all of them. Pattern: `security add-generic-password -s "<service>" -a "<account>" -w "<value>"`. |
| Global CLAUDE.md inclusion | Personal coding guidelines, verification rules, commit style -- these define how Claude behaves. Must ship with the plugin. | LOW | Claude Code plugin system supports `CLAUDE.md` at plugin root. This gets loaded when the plugin is active. Direct copy of existing `~/.claude/CLAUDE.md` into the plugin. |
| Install mechanism | "One repo, one install" is the core promise. Must work from a fresh machine. | LOW | Claude Code native: `/plugin marketplace add <owner>/<repo>` or `/plugin install` from a private marketplace. The plugin system handles cloning and caching. Install script handles credentials + dependencies. |
| Update mechanism | Skills evolve. Updates must be frictionless. | LOW | Claude Code plugin system: `/plugin marketplace update` + `/plugin update`. For private repos, `GITHUB_TOKEN` or `gh auth login` enables auto-updates at startup. No custom mechanism needed. |
| Repo structure | Organized for skills, commands, tools, configs. Clear separation of concerns. | LOW | Standard plugin layout: `.claude-plugin/`, `skills/`, `commands/`, `scripts/`, `hooks/`, `CLAUDE.md`. |

### Differentiators (Competitive Advantage)

This is a private toolkit, so "competitive advantage" means: features that make this toolkit dramatically more useful than scattered dotfiles and manually-copied skills.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| mbridge mobile automation skill | UI dump + OCR approach is faster and more reliable than screenshot-based vision. Leverages mobilecli cache/context system. Makes mobile QA automation a first-class skill. | HIGH | Python-based. Needs: device interaction (adb/xcrun), UI tree parsing, OCR integration, navigation helpers. Should import mobilecli's existing cache system. Biggest scope item in the toolkit. |
| Master credential installer | Single `./install.sh` that detects missing credentials and walks through setup for all skills. Not just per-skill setup, but unified first-run experience. | MEDIUM | Aggregate all skills' credential needs. Check Keychain for existing entries. Only prompt for missing ones. Show clear progress. Skills: gh-upload (GitHub session), acli/Jira (API token), Sentry (auth token), Contentful (management token), GitHub CLI (gh auth). |
| Skill health checks / diagnostics | `./scripts/doctor.sh` that verifies all dependencies are installed, credentials are valid (not expired), and tools are reachable. | LOW | Check: `gh auth status`, `acli` exists, `sentry-cli` exists, Keychain entries present, `mobilecli` available, Python 3 available. Output pass/fail per skill. |
| Hooks integration | Session hooks for context injection, status line, update checks -- like GSD's hook pattern. | MEDIUM | Plugin `hooks/hooks.json` can define SessionStart, PreToolUse, PostToolUse hooks. Could include: update check on session start, credential expiry warnings, context injection for work-specific defaults. |
| Version-pinned dependency manifest | Declare which external CLI tools each skill needs (acli, sentry-cli, mobilecli, gh) with minimum versions. Install script validates. | LOW | Simple JSON or shell-based check. Fails fast with clear error messages instead of cryptic skill failures. |
| Offline-first skill design | Skills work without network where possible. UI dumps cached locally, OCR runs locally, context files persisted. | MEDIUM | Applies mainly to mbridge. Use Apple's Vision framework for OCR (no API calls). Cache UI dumps in `.mobilecli/cache/`. Persist app navigation context across sessions. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Generic/open-source skills | "Others could benefit from these skills" | Skills reference work-specific tools (Jira instance, Sentry org, Contentful spaces). Generalizing adds config complexity for zero personal benefit. Private repo by design. | Keep private. If a pattern is universally useful, extract it as a separate open-source plugin later. |
| MCP server for mbridge | "MCP is the standard for tool integration" | Adds Node.js/Python server process management, IPC complexity, and startup overhead. Skill-based approach is simpler: SKILL.md + scripts, no background process needed. | Skill with helper scripts. Claude calls scripts directly via bash. Proven pattern with gh-upload. |
| GUI installer / web dashboard | "Nice setup wizard" | Over-engineering for a single user. Terminal-based setup is faster and scriptable. GUI adds a maintenance surface for zero ROI. | Interactive terminal prompts in `install.sh`. Clear, step-by-step, fast. |
| Auto-sync with ~/.claude | "Keep plugin and local ~/.claude in sync" | Creates confusion about source of truth. Two copies of the same skills will diverge. | Plugin IS the source of truth. Remove skills from `~/.claude/` after migration. Single source. |
| n8n workflow integration (v1) | "Automate complex multi-step workflows" | Out of scope for v1 per PROJECT.md. Adds Node.js runtime dependency, n8n server management, and significant complexity. | Defer to v2+. Structure the repo to accommodate `workflows/` directory later but don't build the integration now. |
| Cross-platform support (Linux/Windows) | "Works everywhere" | macOS Keychain is the credential store. mobilecli targets iOS/Android devices via macOS tooling (xcrun, adb). Most skills use macOS-specific features. Supporting other platforms doubles complexity. | macOS-only. Document as constraint. If needed later, abstract credential store behind an interface. |
| Screenshot-based vision for mbridge | "Vision models can understand UI" | Slower (encode image, send to API, wait for response), more expensive (token cost), less reliable (hallucination risk), and redundant when accessibility/UI dumps provide structured data. | UI dumps + local OCR. 85% success rate with 10x fewer resources per accessibility research. |
| Plugin marketplace submission | "Make it discoverable on the official marketplace" | This is a private toolkit with work-specific references. Public marketplace requires review and would expose internal tooling. | Private GitHub repo. Install via direct repo URL or private marketplace. |

## Feature Dependencies

```
[Plugin Manifest + Structure]
    |
    +-- requires nothing (foundation)
    |
    v
[Skill Migration]
    |
    +-- requires [Plugin Manifest + Structure]
    |
    v
[Script Offloading]
    |
    +-- requires [Skill Migration] (must migrate skills first, then refactor)
    |
    v
[Keychain Credential Setup]
    |
    +-- requires [Script Offloading] (setup.sh scripts live alongside skill scripts)
    |
    v
[Master Credential Installer]
    |
    +-- requires [Keychain Credential Setup] (aggregates individual setup scripts)

[Global CLAUDE.md]
    |
    +-- requires [Plugin Manifest + Structure]
    +-- independent of skill migration

[Install Mechanism]
    |
    +-- requires [Plugin Manifest + Structure]
    +-- enhanced-by [Master Credential Installer]
    +-- enhanced-by [Version-Pinned Dependency Manifest]

[Skill Health Checks]
    |
    +-- requires [Keychain Credential Setup] (knows what to check)
    +-- enhanced-by [Version-Pinned Dependency Manifest]

[Hooks Integration]
    |
    +-- requires [Plugin Manifest + Structure]
    +-- independent of skills (operates at plugin level)

[mbridge Mobile Automation]
    |
    +-- requires [Plugin Manifest + Structure]
    +-- requires [Script Offloading] (Python scripts as helpers)
    +-- enhanced-by [mobilecli existing cache system]
    +-- independent of other skill migration (can be built in parallel)
```

### Dependency Notes

- **Skill Migration requires Plugin Manifest:** Skills need the plugin directory structure to exist before they can be placed into it.
- **Script Offloading requires Skill Migration:** Must have the skills in the repo before refactoring their internals to use helper scripts.
- **Keychain Credential Setup requires Script Offloading:** Setup scripts are helper scripts that live alongside the skill. The pattern depends on the script offloading structure being established.
- **Master Credential Installer requires all individual Keychain setups:** Cannot aggregate what doesn't exist yet.
- **mbridge is independent of skill migration:** Can be built from scratch in parallel since it's a new skill, not a migration. Only needs the plugin structure.
- **Install Mechanism leverages Claude Code native plugin system:** No custom install mechanism needed beyond `install.sh` for credentials and dependencies. The plugin system handles code distribution.

## MVP Definition

### Launch With (v1)

Minimum viable: "install on new machine, get all existing skills working."

- [ ] Plugin manifest (`.claude-plugin/plugin.json`) -- foundation for everything
- [ ] Repo structure (`skills/`, `commands/`, `scripts/`, `hooks/`) -- organized layout
- [ ] Skill migration (all 9 commands + 7 skills) -- the actual value
- [ ] Script offloading for skills with inline bash (at least gh-upload, mobilecli, daily-summary) -- reliability
- [ ] Keychain credential setup per skill (setup.sh scripts) -- skills that need secrets must work
- [ ] Global CLAUDE.md as plugin CLAUDE.md -- consistent Claude behavior
- [ ] Install script (`install.sh`) with dependency checks and credential aggregation -- one-command setup
- [ ] Basic health check (`scripts/doctor.sh`) -- verify everything works post-install

### Add After Validation (v1.x)

Features to add once core plugin is working on at least 2 machines.

- [ ] Hooks integration (session start context, update checks) -- once the plugin lifecycle is proven stable
- [ ] Version-pinned dependency manifest -- once dependency version mismatches are actually encountered
- [ ] Enhanced credential diagnostics (expiry detection, auto-refresh prompts) -- once credential rotation pain points are identified
- [ ] Skill improvements based on usage (better error messages, edge case handling) -- iterative quality

### Future Consideration (v2+)

- [ ] mbridge mobile automation -- HIGH complexity, independent workstream, defer until v1 core is solid
- [ ] n8n workflow integration -- explicitly out of scope per PROJECT.md
- [ ] Skill benchmarking integration (using /skill-creator evals) -- after skills are stable
- [ ] Cross-skill context sharing (skills reading from each other's caches) -- premature optimization

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Plugin manifest + structure | HIGH | LOW | P1 |
| Skill migration | HIGH | MEDIUM | P1 |
| Script offloading | HIGH | MEDIUM | P1 |
| Keychain credential setup | HIGH | MEDIUM | P1 |
| Global CLAUDE.md | HIGH | LOW | P1 |
| Install script (install.sh) | HIGH | LOW | P1 |
| Health check (doctor.sh) | MEDIUM | LOW | P1 |
| Master credential installer | MEDIUM | MEDIUM | P2 |
| Hooks integration | MEDIUM | MEDIUM | P2 |
| Version-pinned dependency manifest | LOW | LOW | P2 |
| Skill health checks (enhanced) | LOW | LOW | P2 |
| mbridge mobile automation | HIGH | HIGH | P3 |
| n8n workflows | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- delivers on "one repo, one install" promise
- P2: Should have, add when possible -- improves reliability and DX
- P3: Nice to have, future consideration -- significant scope, independent workstreams

## Competitor Feature Analysis

No direct competitors (this is a personal private toolkit), but comparable projects inform feature expectations.

| Feature | superpowers plugin (obra) | awesome-claude-code-toolkit | GSD (get-shit-done) | Our Approach |
|---------|--------------------------|----------------------------|---------------------|--------------|
| Plugin structure | Standard `.claude-plugin/` with skills only | Collection of skills, not a plugin | npm package with custom install | Standard `.claude-plugin/` plugin |
| Distribution | Public marketplace (MIT) | Copy-paste from curated list | `npx` install, updates via hooks | Private GitHub repo, `/plugin marketplace add` |
| Credential management | None (skills don't need secrets) | None | None | macOS Keychain with per-skill setup.sh scripts |
| Install experience | `/plugin install superpowers` | Manual copy | `npx get-shit-done@latest` | `/plugin marketplace add <repo>` + `install.sh` for credentials |
| Update mechanism | Marketplace update (daily check proposed) | Manual re-copy | Background check on SessionStart hook | Native plugin update + optional hook for notifications |
| Helper scripts | Minimal (mostly SKILL.md only) | None | Node.js CLI tool (gsd-tools.cjs) | Bash/Node.js scripts per skill |
| Hooks | Post-tool-use hooks in some skills | None | SessionStart, StatusLine, Context Monitor | SessionStart for context, update checks |
| Mobile automation | None | None | None | mbridge (v2): UI dump + OCR, Python-based |
| Scope | Generic coding best practices | Curated collection of community skills | Project management framework | Personal work-specific toolkit |

## Key Insights from Research

### Plugin System Capabilities (HIGH confidence -- from official docs)

1. **Plugin caching**: Plugins are copied to `~/.claude/plugins/cache/`. Files outside the plugin directory are NOT copied. All paths must be self-contained or use `${CLAUDE_PLUGIN_ROOT}`.
2. **`${CLAUDE_SKILL_DIR}`**: Points to the skill's own directory. Use for referencing helper scripts within a skill.
3. **`${CLAUDE_PLUGIN_ROOT}`**: Points to the plugin's root directory. Use for referencing shared resources across skills.
4. **Private repo support**: Works if `git clone` works. `GITHUB_TOKEN` or `gh auth login` enables auto-updates.
5. **No marketplace needed for single user**: Can install directly via `/plugin marketplace add owner/repo` pointing at the private GitHub repo.
6. **Skills in plugins are namespaced**: `/ai-toolbelt:jira` instead of `/jira`. This is a minor DX change to get used to.
7. **`allowed-tools` frontmatter**: Works in CLI only (not SDK). Useful for restricting what Claude can do during a skill execution.
8. **`context: fork`**: Runs skill in isolated subagent. Useful for heavy skills like mbridge that shouldn't pollute conversation context.

### Credential Pattern (HIGH confidence -- from existing code)

The gh-upload pattern is the proven model:
- `security add-generic-password -s "<service>" -a "<account>" -w "<value>"` to store
- `security find-generic-password -s "<service>" -a "<account>" -w` to retrieve
- Interactive `setup.sh` for first-time configuration
- Fallback instructions for manual setup

### Migration Risks (MEDIUM confidence)

1. **Path references**: Every `$HOME/.claude/skills/...` or `$HOME/.claude/commands/...` path in existing skills must be updated to `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}`.
2. **Skill naming**: Current skills like `/jira` will become `/ai-toolbelt:jira`. Muscle memory adjustment needed.
3. **File not found after install**: Plugin caching copies files to a cache directory. Any skill referencing files outside the plugin will break. Self-containment is critical.
4. **acli/sentry-cli binary availability**: These are external binaries, not part of the plugin. Install script must verify they exist.

## Sources

- [Claude Code Plugin Documentation](https://code.claude.com/docs/en/plugins) -- official plugin structure, manifest schema, plugin lifecycle
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- SKILL.md format, frontmatter fields, script offloading, `${CLAUDE_SKILL_DIR}` variable
- [Claude Code Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) -- private repo distribution, marketplace.json schema, update mechanisms
- [Superpowers plugin](https://github.com/obra/superpowers) -- reference implementation for plugin structure with skills
- [Anthropic official plugins](https://github.com/anthropics/claude-plugins-official) -- official marketplace structure
- [macOS Keychain CLI](https://ss64.com/mac/security.html) -- `security` command reference
- [Stop Putting Secrets in .env Files](https://jonmagic.com/posts/stop-putting-secrets-in-dotenv-files/) -- keychain-based credential management rationale

---
*Feature research for: ai-toolbelt (personal developer toolkit / Claude Code private plugin)*
*Researched: 2026-03-11*
