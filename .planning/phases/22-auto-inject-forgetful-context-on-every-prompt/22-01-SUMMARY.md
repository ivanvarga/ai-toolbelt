---
phase: 22-auto-inject-forgetful-context-on-every-prompt
plan: 01
subsystem: hooks
tags: [forgetful, hooks, UserPromptSubmit, context-injection, mcp]

requires:
  - phase: 18-forgetful-mcp-client
    provides: forgetful-client.js MCP HTTP client module
provides:
  - UserPromptSubmit hook script for automatic Forgetful memory injection
  - Hook registration in hooks.json (synchronous, 10s timeout)
affects: [22-02, bootstrap, doctor]

tech-stack:
  added: []
  patterns: [UserPromptSubmit hookSpecificOutput JSON, session-scoped failure flag, temp file project ID cache]

key-files:
  created: [hooks/user-prompt-context.js]
  modified: [hooks/hooks.json]

key-decisions:
  - "additionalContext for failure notice (D-07) -- discrete injection vs stderr avoids bug #34713 false error labels"
  - "1-hour TTL for project ID cache (D-09) -- balances freshness with performance savings"
  - "process.ppid for session-scoped failure flag -- scopes flag to Claude session parent process"

patterns-established:
  - "UserPromptSubmit hook pattern: read stdin JSON, skip conditions, query API, output hookSpecificOutput"
  - "Session failure flag: temp file keyed by ppid, first failure delivers notice, subsequent are silent"
  - "Project ID cache: temp file keyed by repo name, 1-hour TTL"

requirements-completed: [CTXI-01, CTXI-02, CTXI-03, CTXI-04, CTXI-05, CTXI-06, CTXI-07, HOOK-01]

duration: 2min
completed: 2026-04-09
---

# Phase 22 Plan 01: Auto-inject Forgetful Context Summary

**UserPromptSubmit hook auto-queries Forgetful on every prompt with project scoping, importance filtering, and session-resilient failure handling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-09T14:22:57Z
- **Completed:** 2026-04-09T14:24:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created UserPromptSubmit hook that queries Forgetful for project-scoped memories on every user prompt
- Implemented skip logic for /gsd:, /tb:load-context, and trivial prompts (under 20 chars + pattern match)
- Added importance >= 7 filtering with k=5 retrieval, 300-char XML-tagged snippets as additionalContext
- Session-resilient failure handling: first failure delivers one-time notice, subsequent failures are fully silent
- Project ID cached to temp file with 1-hour TTL for ~100ms savings per prompt
- Registered hook in hooks.json (synchronous, 10s timeout, no matcher -- fires on all prompts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UserPromptSubmit hook script** - `55af260` (feat)
2. **Task 2: Register UserPromptSubmit hook in hooks.json** - `038fbd3` (feat)

## Files Created/Modified
- `hooks/user-prompt-context.js` - UserPromptSubmit hook: reads stdin, queries Forgetful, outputs additionalContext
- `hooks/hooks.json` - Added UserPromptSubmit entry alongside existing SessionStart

## Decisions Made
- Used additionalContext (not stderr) for failure notice per D-07 -- avoids triggering bug #34713 false error labels in transcript
- 1-hour TTL for project ID cache per D-09 -- reasonable balance between freshness and repeated list_projects savings
- process.ppid for session-scoped failure flag -- ensures flag is scoped to the Claude session process, not globally

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None -- no external service configuration required.

## Known Stubs
None -- all functionality is fully wired.

## Next Phase Readiness
- Hook script and registration complete, ready for Plan 02 (doctor check + settings.json fallback)
- Manual verification recommended: ask Claude "what additional context was injected?" to confirm bug #12151 is not blocking output capture

---
*Phase: 22-auto-inject-forgetful-context-on-every-prompt*
*Completed: 2026-04-09*

## Self-Check: PASSED
