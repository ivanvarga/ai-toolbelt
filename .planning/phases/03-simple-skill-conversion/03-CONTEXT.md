# Phase 3: Simple Skill Conversion - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert 8 pure-markdown items (no helper scripts, no credentials) from ~/.claude/commands/ and ~/.claude/skills/ to SKILL.md + frontmatter format in the plugin's skills/ directory. Each skill must be invocable as /tb:skill-name and produce equivalent behavior to the original.

</domain>

<decisions>
## Implementation Decisions

### Skill naming
- All 8 names follow the PROJECT.md mapping exactly:
  - catchup → catchup (standalone)
  - github-issue → task-github (task family)
  - github-pr → pr-read (pr family)
  - qa-description → pr-qa (pr family)
  - ship-ticket → pr-submit (pr family)
  - create-release-branch → release-create (release family)
  - daily-summary → track-summary (track family)
  - reset-app-data → mobile-reset (mobile family)
- Directory name matches SKILL.md frontmatter name (e.g., skills/task-github/SKILL.md has name: "task-github")

### Cross-skill references
- Use new /tb:* names for all cross-references, even for skills that don't exist yet (Phase 4)
- pr-submit references /tb:task-jira and /tb:pr-describe (both Phase 4) — accept the gap, content is correct for final state
- Agent references (attachment-documenter) use generic names — Claude Code resolves from plugin's agents/ directory
- External tool references (acli, .mobilecli cache) kept as-is — they exist independently of the plugin

### Conversion approach
- Full rewrite of each skill from scratch, based on the original's intent and behavior
- Trigger-optimized descriptions: "Use when..." pattern matching how users invoke the skill
- Claude picks the best format for each skill's domain (step-based, template-based, etc.)
- Remove $ARGUMENTS (old command format) — keep inline argument documentation in the skill body
- No comments in generated code (per global CLAUDE.md)

### Batching strategy
- Plan 1 (wave 1): pr-read, pr-qa, pr-submit, task-github — the pr-* family + task-github (related workflow skills)
- Plan 2 (wave 2): catchup, release-create, track-summary, mobile-reset — standalone and single-family skills
- Sequential: Plan 1 establishes the conversion pattern, Plan 2 follows it

### Claude's Discretion
- Exact content structure and formatting per skill (step-based vs template-based vs hybrid)
- Frontmatter fields beyond name and description (allowed-tools, disable-model-invocation, etc.)
- How to handle the "Codebase Analysis" and "Implementation Plan" sections in task-github (may be heavy for a skill)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- skills/doctor/SKILL.md: reference for frontmatter format (name, description, disable-model-invocation)
- skills/update/SKILL.md: reference for ${CLAUDE_SKILL_DIR} path resolution pattern
- agents/attachment-documenter/: agent referenced by task-github and pr-read

### Established Patterns
- Frontmatter: name, description, optional disable-model-invocation
- ${CLAUDE_SKILL_DIR} resolves to the skill's subdirectory in bash blocks
- ${CLAUDE_PLUGIN_ROOT} NOT available in SKILL.md markdown content
- Skills in flat subdirectories: skills/name/SKILL.md
- SessionStart hook auto-discovers skills via frontmatter scanning

### Integration Points
- SessionStart hook reads name + description from SKILL.md frontmatter for /tb:* skill listing
- Plugin cache: skills load from ~/.claude/plugins/cache/ when installed
- --plugin-dir for development testing

</code_context>

<specifics>
## Specific Ideas

- pr-submit (ship-ticket) is the most complex of the "simple" 8 — it orchestrates branch creation, committing, pushing, and PR creation, plus calls two other skills
- qa-description has a very specific output template (table format with deeplinks) that must be preserved in the rewrite
- daily-summary is the largest skill content-wise — lots of detailed steps for multi-repo scanning and hour estimation
- catchup is the simplest and cleanest — good candidate for establishing the conversion pattern in Plan 1

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-simple-skill-conversion*
*Context gathered: 2026-03-11*
