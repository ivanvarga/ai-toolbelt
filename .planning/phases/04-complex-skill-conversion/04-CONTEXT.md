# Phase 4: Complex Skill Conversion - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert 8 complex items (helper scripts, external tool dependencies, credential needs) from ~/.claude/commands/ and ~/.claude/skills/ to SKILL.md + frontmatter format with supporting files in the plugin's skills/ directory. Each skill must be invocable as /tb:skill-name with equivalent behavior to the original.

</domain>

<decisions>
## Implementation Decisions

### Helper script strategy
- Hybrid approach: shared utilities in scripts/ for cross-cutting concerns, skill-specific helpers alongside SKILL.md
- All heavy bash/logic converted to Node.js (preferred) or Python (only where Python dependencies like OCR exist)
- Shared utilities: scripts/keychain.js (Keychain access), scripts/sentry-api.js (Sentry API client), scripts/github-api.js (GitHub API client)
- Skill-specific helpers live alongside SKILL.md: skills/pr-upload/upload.js, skills/sentry-investigate/analyze.js, etc.
- SKILL.md calls helpers via `node ${CLAUDE_SKILL_DIR}/helper.js` for skill-local scripts or `node ${CLAUDE_PLUGIN_ROOT}/scripts/keychain.js` for shared utilities

### Credential handling
- All credentials stored in macOS Keychain — no Doppler, no sentryclirc, no env files
- Keychain service naming: `tb.{service}` pattern (e.g., tb.github-session, tb.sentry-token, tb.contentful-token, tb.jira-token)
- Each credential-needing skill gets a setup.js that prompts for the credential and stores via shared scripts/keychain.js
- Skills include basic 'first run' credential setup — not deferred to Phase 5
- Phase 5 later unifies these into a central setup-all flow

### Batching & waves
- Plan 1 (Wave 1): Shared infrastructure — scripts/keychain.js, scripts/sentry-api.js, scripts/github-api.js
- Plan 2 (Wave 2): gh-upload (→ pr-upload), investigate-sentry-issue (→ sentry-investigate), upload-sentry-sourcemaps (→ sentry-sourcemaps) — skills that consume shared infra
- Plan 3 (Wave 3): jira (→ task-jira), pr-description (→ pr-describe), contentful-cli (→ contentful), create-figma-component (→ figma-component) — remaining skills, forward refs accepted
- Plan 4 (Wave 3): mobilecli (→ mobilecli) — solo plan due to massive size (500+ line SKILL.md + 470-line test-helpers.sh)

### Conversion approach
- Full rewrite from scratch based on intent and behavior (same as Phase 3)
- Trigger-optimized descriptions with "Use when..." pattern
- Inter-skill orchestration preserved: orchestrating skills reference /tb:* names in SKILL.md instructions
- Forward references to not-yet-converted skills accepted (same pattern as Phase 3)
- External CLI dependencies (acli, sentry-cli, eas-cli, contentful CLI): Claude decides per skill whether to keep CLI or switch to direct API calls

### Skill naming
- All names follow PROJECT.md mapping:
  - gh-upload → pr-upload (pr family)
  - mobilecli → mobilecli (standalone)
  - contentful-cli → contentful (standalone)
  - create-figma-component → figma-component (figma family)
  - jira → task-jira (task family)
  - investigate-sentry-issue → sentry-investigate (sentry family)
  - pr-description → pr-describe (pr family)
  - upload-sentry-sourcemaps → sentry-sourcemaps (sentry family)

### Claude's Discretion
- Whether each external CLI should be preserved or replaced with direct API calls
- Exact Node.js helper structure per skill (what functions, what modules)
- SKILL.md content structure per skill (step-based vs template-based)
- How to handle mobilecli's 470-line test-helpers.sh decomposition

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- skills/doctor/SKILL.md, skills/update/SKILL.md: reference for frontmatter format
- scripts/checks/: modular check system — doctor can verify new skills
- hooks/session-start.sh: auto-discovers new skills via frontmatter scanning
- Phase 3 skills (pr-read, pr-qa, pr-submit, task-github, catchup, release-create, track-summary, mobile-reset): established conversion pattern

### Established Patterns
- Frontmatter: name, description, optional disable-model-invocation
- ${CLAUDE_SKILL_DIR} resolves in bash blocks within SKILL.md
- ${CLAUDE_PLUGIN_ROOT} works in hooks/scripts but NOT in SKILL.md markdown
- Family-action naming with hyphens (task-jira, pr-submit, sentry-investigate)
- Directory name matches SKILL.md frontmatter name
- Full rewrite with trigger-optimized descriptions
- Cross-references use /tb:* names

### Integration Points
- SessionStart hook auto-discovers skills from frontmatter
- scripts/ directory for shared utilities (already exists, contains checks/)
- tools/ directory available for CLI tools
- agents/attachment-documenter: referenced by task-jira and pr-read

</code_context>

<specifics>
## Specific Ideas

- gh-upload's Chrome session cookie extraction via AppleScript is a key pattern to preserve in the Node.js rewrite
- mobilecli's test-helpers.sh has 50+ bash functions for device interaction — decomposition strategy is critical
- pr-description orchestrates mobilecli + gh-upload + jira — a good integration test of the converted skills
- Sentry skills (investigate + sourcemaps) share API patterns — scripts/sentry-api.js serves both

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-complex-skill-conversion*
*Context gathered: 2026-03-12*
