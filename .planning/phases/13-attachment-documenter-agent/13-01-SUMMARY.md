---
phase: 13-attachment-documenter-agent
plan: 01
subsystem: agents
tags: [subagent, attachment-documenter, haiku, keychain, macOS-security]

requires:
  - phase: 04-complex-skills
    provides: Consumer skills (task-jira, sentry-investigate, task-github, pr-read) with attachment-documenter invocation sections
provides:
  - Agent definition at agents/attachment-documenter.md with keychain auth and haiku model
  - Orchestrating skill at skills/attachment-documenter/ with named subagent_type pattern
  - All 4 consumer skills updated to use Agent tool with subagent_type attachment-documenter
affects: []

tech-stack:
  added: []
  patterns: [named-subagent-type, macOS-security-keychain-in-agent-prompt, acli-email-extraction]

key-files:
  created:
    - agents/attachment-documenter.md
    - skills/attachment-documenter/SKILL.md
  modified:
    - skills/task-jira/SKILL.md
    - skills/sentry-investigate/SKILL.md
    - skills/task-github/SKILL.md
    - skills/pr-read/SKILL.md

key-decisions:
  - "macOS security command used directly in agent body for keychain access (avoids path resolution issues with CLAUDE_PLUGIN_ROOT)"
  - "acli jira auth status used for email extraction at runtime (no separate keychain entry for email)"
  - "GitHub auth is optional -- falls back to unauthenticated for public repos"
  - "Agent definition is flat file at agents/attachment-documenter.md (not in subdirectory)"

patterns-established:
  - "Named subagent_type pattern: consumer skills specify subagent_type instead of general-purpose + model"
  - "Agent-level keychain access: use security find-generic-password directly in agent system prompts"

requirements-completed: [MIGR-02]

duration: 3min
completed: 2026-03-14
---

# Phase 13 Plan 01: Create attachment-documenter Agent Summary

**Ported attachment-documenter agent definition with keychain auth (tb.jira-token, tb.github-session) and updated 4 consumer skills to use named subagent_type pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T17:25:28Z
- **Completed:** 2026-03-14T17:28:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created agent definition at agents/attachment-documenter.md with haiku model, macOS Keychain auth for Jira (tb.jira-token) and GitHub (tb.github-session), and acli-based email extraction
- Created orchestrating skill at skills/attachment-documenter/SKILL.md with named subagent_type: "attachment-documenter" pattern, full naming conventions, flow diagram, examples, and anti-patterns
- Updated all 4 consumer skills (task-jira, sentry-investigate, task-github, pr-read) to use Agent tool with subagent_type: "attachment-documenter"
- Removed original files from ~/.claude/agents/ and ~/.claude/skills/attachment-documenter/
- Removed agents/.gitkeep (replaced by real agent definition)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create agent definition and orchestrating skill** - `bb80f91` (feat)
2. **Task 2: Update consumer skills, remove originals** - `2247cc8` (feat)

## Files Created/Modified
- `agents/attachment-documenter.md` - Agent definition with keychain auth, haiku model, download/analyze/cache process
- `skills/attachment-documenter/SKILL.md` - Orchestrating skill with naming conventions, flow diagram, example workflows
- `skills/task-jira/SKILL.md` - Updated attachment invocation to Agent tool with subagent_type
- `skills/sentry-investigate/SKILL.md` - Updated attachment invocation to Agent tool with subagent_type
- `skills/task-github/SKILL.md` - Updated attachment invocation to Agent tool with subagent_type
- `skills/pr-read/SKILL.md` - Updated attachment invocation to Agent tool with subagent_type

## Decisions Made
- Used macOS `security` command directly in agent body instead of keychain.js (avoids CLAUDE_PLUGIN_ROOT path resolution issues in agent system prompts)
- Kept `acli jira auth status` for runtime email extraction (no separate keychain entry needed)
- GitHub token is optional: try authenticated first, fall back to unauthenticated for public repos; Jira always requires auth
- Agent definition placed as flat file at agents/attachment-documenter.md per official docs pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INT-03 gap from milestone audit is now closed
- MIGR-02 requirement fully satisfied
- All attachment-documenter functionality is now within the plugin

## Self-Check: PASSED

All created files found. All commit hashes verified.

---
*Phase: 13-attachment-documenter-agent*
*Completed: 2026-03-14*
