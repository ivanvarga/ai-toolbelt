---
phase: 04-complex-skill-conversion
plan: 02
subsystem: skills
tags: [pr-upload, sentry-investigate, sentry-sourcemaps, keychain, github-api, sentry-api, credential-setup]

requires:
  - phase: 04-complex-skill-conversion
    provides: shared scripts (keychain.js, sentry-api.js, github-api.js) from Plan 01
provides:
  - skills/pr-upload with SKILL.md and setup.js for GitHub CDN uploads
  - skills/sentry-investigate with SKILL.md and setup.js for Sentry issue investigation
  - skills/sentry-sourcemaps with SKILL.md for sourcemap upload guidance
affects: [04-03 pr-describe references pr-upload, 05 credential-system unifies setup scripts]

tech-stack:
  added: []
  patterns: [setup.js credential pattern with CLI arg / Keychain check / interactive prompt, PLUGIN_ROOT path resolution from SKILL.md, SENTRY_AUTH_TOKEN env var from Keychain for sentry-cli]

key-files:
  created: [skills/pr-upload/SKILL.md, skills/pr-upload/setup.js, skills/sentry-investigate/SKILL.md, skills/sentry-investigate/setup.js, skills/sentry-sourcemaps/SKILL.md]
  modified: []

key-decisions:
  - "pr-upload references github-api.js directly (no skill-local upload.js wrapper needed since github-api.js already implements full upload flow)"
  - "sentry-investigate setup.js serves both sentry-investigate and sentry-sourcemaps via shared tb.sentry-token Keychain entry"
  - "sentry-sourcemaps passes token as SENTRY_AUTH_TOKEN env var to sentry-cli (avoids sentryclirc dependency)"
  - "Replaced Doppler references in sentry-sourcemaps with Keychain pattern"

patterns-established:
  - "setup.js 3-mode pattern: (1) CLI argument -> store directly, (2) check Keychain -> exit if found, (3) interactive terminal -> prompt via readline"
  - "Shared credential via setup.js in one skill consumed by another (sentry-investigate setup serves sentry-sourcemaps)"
  - "PLUGIN_ROOT path resolution: PLUGIN_ROOT=${CLAUDE_SKILL_DIR}/../.. for accessing shared scripts from SKILL.md"

requirements-completed: [MIGR-02, MIGR-03, MIGR-04]

duration: 5min
completed: 2026-03-12
---

# Phase 4 Plan 2: Complex Skill Conversion (pr-upload, sentry-investigate, sentry-sourcemaps) Summary

**Three skills consuming shared infrastructure: GitHub CDN upload with session cookie setup, Sentry issue investigation with API integration, and sourcemap upload guidance with Keychain-based token passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T09:31:54Z
- **Completed:** 2026-03-12T09:37:08Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- pr-upload skill with setup.js for GitHub session cookie management, references github-api.js for CDN uploads
- sentry-investigate skill with full investigation flow (9 steps), error pattern tables, severity assessment, breadcrumb analysis, and shared setup.js for Sentry token
- sentry-sourcemaps skill with two upload methods (Local Native Build and OTA Export), Keychain token passed via SENTRY_AUTH_TOKEN env var
- All 3 skills validated by skills-valid.sh (13 total skills), no legacy path references

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pr-upload skill with setup.js** - `8c28981` (feat)
2. **Task 2: Create sentry-investigate and sentry-sourcemaps skills** - `3d780ae` (feat)

## Files Created/Modified
- `skills/pr-upload/SKILL.md` - GitHub CDN upload skill with setup instructions, usage examples, error table
- `skills/pr-upload/setup.js` - Interactive/CLI credential setup for tb.github-session Keychain entry
- `skills/sentry-investigate/SKILL.md` - Full Sentry investigation flow with API integration, RN error patterns, severity assessment
- `skills/sentry-investigate/setup.js` - Interactive/CLI credential setup for tb.sentry-token (shared with sentry-sourcemaps)
- `skills/sentry-sourcemaps/SKILL.md` - Two-method sourcemap upload guide with Keychain token passing

## Decisions Made
- pr-upload references github-api.js directly rather than having a skill-local upload.js, since github-api.js already implements the complete upload flow
- sentry-investigate's setup.js serves both Sentry skills via the shared tb.sentry-token Keychain entry
- sentry-sourcemaps passes token as SENTRY_AUTH_TOKEN env var to sentry-cli, cleanly replacing the old sentryclirc and Doppler patterns
- Removed all Doppler references from sentry-sourcemaps, replaced with Keychain lookups

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- All 3 Wave 2 skills ready; pr-upload available for pr-describe orchestration in Plan 03
- Shared Sentry credential pattern established for any future Sentry-related skills
- No blockers for Plan 03

---
*Phase: 04-complex-skill-conversion*
*Completed: 2026-03-12*
