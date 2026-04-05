# Phase 20: Bootstrap & Update - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a `/tb:bootstrap` skill for one-command environment setup (GSD, forgetful-plugin, GSD patches) and extend `/tb:update` to also update GSD, forgetful-plugin, and re-apply patches after updates.

</domain>

<decisions>
## Implementation Decisions

### GSD Installation Method
- **D-01:** Bootstrap guides the user to run GSD's own curl installer manually, then continues after. Does NOT automate the interactive installer.
- **D-02:** After user runs GSD installer, bootstrap auto-detects completion via the existing `gsd-installed.sh` doctor check script. If check fails, prompts to retry.
- **D-03:** Bootstrap only installs missing components, never updates existing ones. Updating is `/tb:update`'s job. Clean separation of concerns.

### forgetful-plugin Installation
- **D-04:** Bootstrap installs forgetful-plugin via git clone. The plugin is a Claude Code plugin with skills (NOT the Forgetful server itself — server is user-managed infrastructure, out of scope).
- **D-05:** Bootstrap discovers the forgetful-plugin repo URL from existing Claude settings (e.g., `~/.claude.json` or `settings.json`), not hardcoded.

### Update Skill Expansion
- **D-06:** Extend the existing `skills/update/SKILL.md` inline with new steps for GSD + forgetful-plugin + patch re-application. No separate skills or helper scripts.
- **D-07:** GSD update uses minimal approach: run `npx -y get-shit-done-cc@latest --claude --global` directly. No version check, changelog, or confirmation — user already chose to update.
- **D-08:** forgetful-plugin update via git pull on the plugin directory discovered from Claude settings.
- **D-09:** After GSD update, re-apply tb's patches via `patches/apply-all.sh`. After forgetful-plugin update, no special post-update steps needed.

### Idempotency Behavior
- **D-10:** When bootstrap finds components already installed, it reports status ("GSD: already installed (vX.Y.Z)") and skips. Informative but non-blocking.
- **D-11:** Bootstrap always runs `patches/apply-all.sh` regardless of whether patches are already applied. Patches are idempotent by design (check for markers, skip if present).

### Claude's Discretion
- Exact SKILL.md step ordering and bash commands for bootstrap
- Error messages and recovery guidance when GSD installer fails
- How to parse Claude settings to discover forgetful-plugin path/URL
- Order of operations in /tb:update (tb pull first, then GSD, then forgetful-plugin, then patches)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Bootstrap — BOOT-01 through BOOT-04 acceptance criteria
- `.planning/REQUIREMENTS.md` §Update — UPDT-01 through UPDT-03 acceptance criteria

### Existing Skills (modify/extend)
- `skills/update/SKILL.md` — Current update skill to extend with GSD + forgetful-plugin steps
- `skills/doctor/SKILL.md` — Doctor check mechanism, used by bootstrap for verification

### GSD Update Mechanism
- `~/.claude/get-shit-done/workflows/update.md` — GSD's own update flow: npm-based install via `npx -y get-shit-done-cc@latest`, version check via `npm view get-shit-done-cc version`, clean install that wipes directories, local patches auto-backed up

### Patch Infrastructure (from Phase 19)
- `patches/apply-all.sh` — Runs all patch scripts, then verify-patches.sh
- `patches/verify-patches.sh` — Verifies all 6 patches are applied via marker grep
- `patches/patch-*.sh` — Individual patch scripts (idempotent, check markers before applying)

### Doctor Check Scripts
- `scripts/checks/gsd-installed.sh` — Doctor check for GSD installation (used by bootstrap to verify)
- `scripts/checks/forgetful-plugin.sh` — Doctor check for forgetful-plugin installation
- `scripts/checks/forgetful-mcp.sh` — Doctor check for Forgetful MCP reachability

### Prior Phase Context
- `.planning/phases/18-foundation/18-CONTEXT.md` — Forgetful endpoint discovery from `~/.claude.json`, doctor "Integration" category
- `.planning/phases/19-gsd-workflow-patches/19-CONTEXT.md` — Patch mechanism, update survival via `gsd-local-patches/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/update/SKILL.md` — Existing update flow (git pull, version compare, changelog, copy global config, reload reminder). Extend with GSD + forgetful-plugin steps.
- `scripts/checks/gsd-installed.sh` — Can be called by bootstrap to verify GSD installation success
- `scripts/checks/forgetful-plugin.sh` — Can be called by bootstrap to verify forgetful-plugin installation
- `patches/apply-all.sh` — Already handles patch application + verification. Bootstrap and update both call this.

### Established Patterns
- Skills use `SKILL.md` with frontmatter (`name`, `description`, `disable-model-invocation`)
- Plugin root resolved via `PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."`
- Doctor checks output `PASS|FAIL|WARN <name> <message>`, always exit 0
- Patch scripts check for `TB_PATCH:` markers before applying (idempotent)
- GSD installs/updates via npm: `npx -y get-shit-done-cc@latest --claude --global`

### Integration Points
- `skills/bootstrap/SKILL.md` — New skill to create
- `skills/update/SKILL.md` — Existing skill to extend
- `patches/apply-all.sh` — Called by both bootstrap and update
- `~/.claude.json` or Claude settings — Source for forgetful-plugin path discovery

</code_context>

<specifics>
## Specific Ideas

- GSD is installed via npm (`npx -y get-shit-done-cc@latest --claude --global`) — bootstrap should guide user to this command, not a curl installer
- Update flow: tb pull -> GSD npx install -> forgetful-plugin git pull -> patches apply-all.sh

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-bootstrap-update*
*Context gathered: 2026-04-02*
