---
phase: 22-auto-inject-forgetful-context-on-every-prompt
plan: 02
subsystem: hooks
tags: [doctor, bootstrap, UserPromptSubmit, settings.json, fallback, hook-validation]

requires:
  - phase: 22-01
    provides: UserPromptSubmit hook script and hooks.json registration
provides:
  - Doctor check for UserPromptSubmit hook registration and script existence
  - Bootstrap settings.json fallback registration for bug #12151
affects: [doctor, bootstrap]

tech-stack:
  added: []
  patterns: [doctor check with dual-source detection (hooks.json + settings.json), bootstrap fallback registration via python3 json merge]

key-files:
  created: [scripts/checks/user-prompt-hook.sh]
  modified: [skills/bootstrap/SKILL.md]

key-decisions:
  - "Dual-source detection in doctor check -- checks hooks.json first, falls back to settings.json, reports which source is active"
  - "Bootstrap provides fallback command but does not auto-register -- detection of silent output discard requires user verification"

patterns-established:
  - "Dual-source hook detection: check plugin hooks.json first, then user settings.json as fallback"
  - "Bootstrap fallback pattern: inform user of primary mode, provide manual fallback registration command"

requirements-completed: [HOOK-02, HOOK-03]

duration: 2min
completed: 2026-04-09
---

# Phase 22 Plan 02: Doctor Check & Bootstrap Fallback Summary

**Doctor check validates UserPromptSubmit registration across hooks.json and settings.json; bootstrap extended with fallback registration for bug #12151**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-09T14:28:23Z
- **Completed:** 2026-04-09T14:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created doctor check that detects UserPromptSubmit registration in hooks.json (primary) or settings.json (fallback) and verifies hook script exists at registered path
- Extended bootstrap skill from 5 steps to 6 with new step 5 for UserPromptSubmit hook verification and settings.json fallback registration
- Bootstrap summary (step 6) now reports hook status alongside GSD, forgetful-plugin, and patches

## Task Commits

Each task was committed atomically:

1. **Task 1: Create doctor check for UserPromptSubmit hook** - `cc87f0f` (feat)
2. **Task 2: Extend bootstrap skill with settings.json fallback registration** - `1c5437a` (feat)

## Files Created/Modified
- `scripts/checks/user-prompt-hook.sh` - Doctor check: validates UserPromptSubmit registration in hooks.json or settings.json, verifies script file exists
- `skills/bootstrap/SKILL.md` - Extended with step 5 (UserPromptSubmit hook verification and fallback registration) and step 6 (summary with hook status)

## Decisions Made
- Doctor check uses dual-source detection (hooks.json primary, settings.json fallback) with registration source reported in output message
- Bootstrap provides fallback registration command but does not auto-register because detecting silent output discard requires user verification (ask Claude "what Forgetful context was injected?")

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None -- no external service configuration required.

## Known Stubs
None -- all functionality is fully wired.

## Next Phase Readiness
- Phase 22 complete: UserPromptSubmit hook script (Plan 01) + doctor check and bootstrap fallback (Plan 02)
- User should verify hook output capture by asking Claude "what Forgetful context was injected?" after their next prompt
- If output is not captured (bug #12151), run `/tb:bootstrap` and follow step 5 to register fallback in settings.json

---
*Phase: 22-auto-inject-forgetful-context-on-every-prompt*
*Completed: 2026-04-09*

## Self-Check: PASSED
