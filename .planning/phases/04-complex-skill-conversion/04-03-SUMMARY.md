---
phase: 04-complex-skill-conversion
plan: 03
subsystem: skills
tags: [task-jira, pr-describe, contentful, figma-component, acli, contentful-migration, figma-mcp, keychain, cross-skill-orchestration]

requires:
  - phase: 04-complex-skill-conversion
    provides: shared scripts (keychain.js, sentry-api.js, github-api.js) from Plan 01, pr-upload skill from Plan 02
provides:
  - skills/task-jira with SKILL.md and setup.js for Jira ticket reading via acli
  - skills/pr-describe with SKILL.md orchestrating /tb:task-jira and /tb:pr-upload
  - skills/contentful with SKILL.md and setup.js for Contentful CMS operations with Keychain token
  - skills/figma-component with SKILL.md for Figma-to-React-Native component creation
affects: [04-04 mobilecli (final Phase 4 skill), 05 credential-system (contentful setup.js), pr-submit forward refs resolved]

tech-stack:
  added: [acli CLI for Jira, contentful-migration CLI, mcp__figma-desktop__get_design_context MCP tool]
  patterns: [cross-skill orchestration via /tb:* references in SKILL.md, Keychain token for contentful-migration -a flag, acli setup.js verifies CLI install+auth rather than storing credentials]

key-files:
  created: [skills/task-jira/SKILL.md, skills/task-jira/setup.js, skills/pr-describe/SKILL.md, skills/contentful/SKILL.md, skills/contentful/setup.js, skills/figma-component/SKILL.md]
  modified: []

key-decisions:
  - "task-jira setup.js verifies acli installation and authentication rather than storing credentials (acli manages its own auth via OAuth)"
  - "pr-describe references /tb:task-jira and /tb:pr-upload for delegation rather than embedding their logic"
  - "contentful SKILL.md preserved as single large file with full migration DSL reference (splitting would hurt usability)"
  - "contentful uses Keychain tb.contentful-token passed via -a flag to contentful-migration (replacing Doppler)"

patterns-established:
  - "CLI verification setup.js: checks tool installation and auth status rather than storing credentials (for tools with own auth)"
  - "Orchestrator skill pattern: pr-describe delegates to other /tb:* skills, owns no credentials"
  - "Large reference SKILL.md: contentful keeps migration DSL inline for single-file discoverability"

requirements-completed: [MIGR-02, MIGR-03]

duration: 5min
completed: 2026-03-12
---

# Phase 4 Plan 3: Complex Skill Conversion (task-jira, pr-describe, contentful, figma-component) Summary

**Four skills: Jira ticket reading via acli with implementation planning, PR description orchestrator delegating to task-jira and pr-upload, Contentful CMS operations with safety rules and migration DSL reference using Keychain token, and Figma-to-RN component creation via MCP tool**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T09:42:13Z
- **Completed:** 2026-03-12T09:47:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- task-jira skill with 9-step checklist flow (acli commands, attachment-documenter agent, codebase analysis, implementation planning) and setup.js verifying acli installation/authentication
- pr-describe orchestrator skill delegating to /tb:task-jira for ticket context and /tb:pr-upload for screenshot/video uploads
- contentful skill with safety rules, required flow, CLI reference, and complete migration DSL reference (field types, validations, widget IDs, transforms, editor layouts, tags) using Keychain token instead of Doppler
- figma-component skill with Figma MCP tool integration, RN component patterns, design tokens, spacing verification, and Storybook conventions
- Forward references from Phase 3 pr-submit (/tb:task-jira and /tb:pr-describe) now resolved
- All 18 skills pass skills-valid.sh validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create task-jira and pr-describe skills** - `7285456` (feat)
2. **Task 2: Create contentful and figma-component skills** - `511a752` (feat)

## Files Created/Modified
- `skills/task-jira/SKILL.md` - Jira ticket reading skill with acli commands, attachment handling, codebase analysis, implementation planning
- `skills/task-jira/setup.js` - Verifies acli CLI installation and authentication status
- `skills/pr-describe/SKILL.md` - PR description generator orchestrating /tb:task-jira and /tb:pr-upload with screenshot/video capture flow
- `skills/contentful/SKILL.md` - Contentful CMS operations with safety rules, migration DSL reference, and Keychain-based authentication
- `skills/contentful/setup.js` - Interactive/CLI credential setup for tb.contentful-token Keychain entry
- `skills/figma-component/SKILL.md` - Figma-to-React-Native component creation with MCP tool, design tokens, spacing verification

## Decisions Made
- task-jira's setup.js verifies acli is installed and authenticated rather than storing a Keychain credential, since acli manages its own auth via `acli login` OAuth flow
- pr-describe is a pure orchestrator with no credentials of its own; it delegates to /tb:task-jira and /tb:pr-upload
- contentful SKILL.md kept as a single large file (~500 lines) with the migration DSL reference inline, since splitting would reduce usability
- Replaced all Doppler references in contentful with Keychain pattern: `node "$PLUGIN_ROOT/scripts/keychain.js" get tb.contentful-token`

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- All Wave 3 skills complete; only mobilecli remains (Plan 04)
- Forward references from pr-submit (/tb:task-jira, /tb:pr-describe) now fully resolved
- No blockers for Plan 04

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (7285456, 511a752) verified in git log.

---
*Phase: 04-complex-skill-conversion*
*Completed: 2026-03-12*
