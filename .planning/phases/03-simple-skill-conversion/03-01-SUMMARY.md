---
phase: 03-simple-skill-conversion
plan: 01
subsystem: skills
tags: [skill-conversion, pr-workflow, github, qa, SKILL.md]

requires:
  - phase: 02-plugin-install-operations
    provides: Plugin scaffold with skill discovery (SessionStart hook, skills-valid.sh)
provides:
  - 4 PR-workflow and task skills (pr-read, pr-qa, pr-submit, task-github)
  - Established skill conversion pattern for Phase 3 Plan 2
affects: [04-complex-skill-conversion, 03-02]

tech-stack:
  added: []
  patterns: [trigger-optimized descriptions, cross-skill /tb:* references, disable-model-invocation for side-effect skills]

key-files:
  created:
    - skills/pr-read/SKILL.md
    - skills/pr-qa/SKILL.md
    - skills/pr-submit/SKILL.md
    - skills/task-github/SKILL.md
  modified: []

key-decisions:
  - "pr-read, pr-qa, task-github left without disable-model-invocation (read-only/safe for auto-trigger)"
  - "pr-submit marked disable-model-invocation: true (creates branches, commits, pushes, PRs)"
  - "Forward references to /tb:task-jira and /tb:pr-describe accepted (Phase 4 skills)"

patterns-established:
  - "Skill conversion: full rewrite from scratch based on behavioral intent, not copy-paste"
  - "Description pattern: 'Use when...' trigger-optimized phrasing"
  - "Cross-skill references: /tb:skill-name format even for not-yet-created skills"
  - "Agent references: generic name (attachment-documenter) for Claude to resolve"

requirements-completed: [MIGR-01]

duration: 3min
completed: 2026-03-12
---

# Phase 3 Plan 1: PR Workflow Skills Summary

**4 PR-workflow and task skills (pr-read, pr-qa, pr-submit, task-github) converted to SKILL.md format with trigger-optimized descriptions and cross-skill references**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T07:20:16Z
- **Completed:** 2026-03-12T07:22:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created pr-read skill for fetching and summarizing GitHub PRs with review comment and attachment handling
- Created pr-qa skill for generating QA testing tables with deeplinks and CMS links
- Created pr-submit skill (disable-model-invocation) for branch/commit/push/PR workflow with /tb:task-jira and /tb:pr-describe cross-references
- Created task-github skill for issue reading with codebase analysis and implementation plan generation
- All 6 skills (2 existing + 4 new) pass skills-valid.sh validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pr-read and pr-qa skills** - `fd53522` (feat)
2. **Task 2: Create pr-submit and task-github skills** - `7fb4979` (feat)

## Files Created/Modified
- `skills/pr-read/SKILL.md` - PR reading and summarizing with review comments and attachment handling
- `skills/pr-qa/SKILL.md` - QA testing table generation with deeplinks, CMS links, and common mistakes
- `skills/pr-submit/SKILL.md` - Full ship-ticket workflow: branch, commit, push, PR creation
- `skills/task-github/SKILL.md` - GitHub issue reading with codebase analysis and implementation plan

## Decisions Made
- pr-read, pr-qa, task-github left without disable-model-invocation (read-only/safe for auto-trigger)
- pr-submit marked disable-model-invocation: true (creates branches, commits, pushes, PRs)
- Forward references to /tb:task-jira and /tb:pr-describe accepted (Phase 4 skills)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Conversion pattern established for Plan 2 (catchup, release-create, track-summary, mobile-reset)
- All 4 new skills pass validation and are discoverable by SessionStart hook
- Forward references to Phase 4 skills (/tb:task-jira, /tb:pr-describe) accepted as planned

## Self-Check: PASSED

---
*Phase: 03-simple-skill-conversion*
*Completed: 2026-03-12*
