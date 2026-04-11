# Phase 23: Adopt playwright-cli and visualize-changes into tb plugin - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Copy, rename, and polish two standalone skills (`playwright-cli` and `visualize-changes` from `~/.claude/skills/`) into the tb plugin as `tb:browser` and `tb:change-map`. Light polish for browser skill, deeper improvement via skill-creator for change-map. Remove originals manually after adoption.

</domain>

<decisions>
## Implementation Decisions

### Naming convention
- **D-01:** `playwright-cli` becomes `tb:browser` — generic capability name, directory `skills/browser/`
- **D-02:** `visualize-changes` becomes `tb:change-map` — matches the skill's output concept, directory `skills/change-map/`

### Improvement scope
- **D-03:** `tb:browser` gets light polish only — rename frontmatter, fix path references, review description for tb consistency, fix any obvious issues
- **D-04:** `tb:change-map` gets deeper improvement via skill-creator workflow — address known issues, improve quality, all within this phase
- **D-05:** Both skills delivered in final form when phase completes

### Coexistence strategy
- **D-06:** Remove original standalone skills from `~/.claude/skills/` after tb versions confirmed working
- **D-07:** Cleanup is manual — user runs `rm -rf ~/.claude/skills/playwright-cli/ ~/.claude/skills/visualize-changes/` after verification
- **D-08:** No automated cleanup in install.sh or bootstrap

### File organization
- **D-09:** Supporting files stay inside their skill directories (self-contained)
- **D-10:** `tb:browser` keeps `references/` subdir with all 7 markdown docs
- **D-11:** `tb:change-map` keeps `scripts/` subdir with `file-deps.mjs` and `symbol-map.mjs`
- **D-12:** `${CLAUDE_SKILL_DIR}` used for all path references within SKILL.md

### Claude's Discretion
- Exact wording of polished descriptions
- Specific issues to fix in tb:change-map during skill-creator pass
- Order of operations (browser first vs change-map first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source skills (copy from these)
- `~/.claude/skills/playwright-cli/SKILL.md` — Original playwright-cli skill, 278 lines, comprehensive browser automation docs
- `~/.claude/skills/playwright-cli/references/` — 7 reference docs (request-mocking, running-code, session-management, storage-state, test-generation, tracing, video-recording)
- `~/.claude/skills/visualize-changes/SKILL.md` — Original visualize-changes skill, 160 lines, subagent-based mermaid diagram generation
- `~/.claude/skills/visualize-changes/scripts/file-deps.mjs` — File dependency graph generator (11KB)
- `~/.claude/skills/visualize-changes/scripts/symbol-map.mjs` — Symbol map generator (4.7KB)

### tb plugin conventions (follow these patterns)
- `skills/catchup/SKILL.md` — Reference for tb skill frontmatter format (name with tb: prefix, description, CLAUDE_SKILL_DIR usage)
- `CLAUDE.md` — Skill naming convention: family-action pattern with hyphens, tb: prefix, directory name matches name field
- `.claude-plugin/plugin.json` — Plugin metadata

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 21 existing skills in `skills/` — established SKILL.md frontmatter pattern to follow
- `${CLAUDE_SKILL_DIR}` variable — resolves to skill subdirectory, used in SKILL.md bash commands
- `${CLAUDE_PLUGIN_ROOT}` variable — resolves to plugin root, used in hooks and scripts (not in SKILL.md content)

### Established Patterns
- Frontmatter: `name: tb:<skill-name>`, `description:`, optional `allowed-tools:`
- Supporting files live alongside SKILL.md in the skill directory
- Skills reference supporting files via `${CLAUDE_SKILL_DIR}/path`

### Integration Points
- `skills/` directory — new skill directories registered automatically by plugin system
- Plugin cache copies files on install — no symlinks needed

</code_context>

<specifics>
## Specific Ideas

- tb:change-map should be improved using the skill-creator workflow to address its issues (user noted it has more problems than playwright-cli)
- Names chosen for brevity and clarity: `browser` (capability) over `playwright-cli` (implementation), `change-map` (output) over `visualize-changes` (action)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-adopt-playwright-cli-and-visualize-changes-into-tb-plugin*
*Context gathered: 2026-04-11*
