---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Phase 5 context gathered
last_updated: "2026-03-12T12:09:34.565Z"
last_activity: 2026-03-12 -- Completed 04-03-PLAN.md (task-jira, pr-describe, contentful, figma-component)
progress:
  total_phases: 10
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 89
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** One repo, one install command -- every custom skill, credential setup, and dev tool available on any machine, always up to date.
**Current focus:** Phase 4: Complex Skill Conversion

## Current Position

Phase: 4 of 10 (Complex Skill Conversion) -- COMPLETE
Plan: 4 of 4 complete in current phase
Status: All Phase 4 plans complete
Last activity: 2026-03-12 -- Completed 04-03-PLAN.md (task-jira, pr-describe, contentful, figma-component)

Progress: [█████████░] 89%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 2min
- Total execution time: 0.03 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-plugin-scaffold | 1 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 01-01 (2min)
- Trend: starting

*Updated after each plan completion*
| Phase 02 P01 | 2min | 2 tasks | 3 files |
| Phase 02 P02 | 3min | 2 tasks | 7 files |
| Phase 03 P01 | 3min | 2 tasks | 4 files |
| Phase 03 P02 | 2min | 2 tasks | 4 files |
| Phase 04 P01 | 2min | 2 tasks | 3 files |
| Phase 04 P02 | 5min | 2 tasks | 5 files |
| Phase 04 P03 | 5min | 2 tasks | 6 files |
| Phase 04 P04 | 4min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Plugin scaffold first, then conversion, then mbridge as independent track
- [Roadmap]: Fine granularity -- 10 phases, each focused on one coherent capability
- [Roadmap revision]: All 16 items (9 commands + 7 skills) converted to SKILL.md + frontmatter format, not just migrated as-is
- [Roadmap revision]: Phases 3/4 reorganized by complexity (simple vs complex) instead of origin (commands vs skills)
- [01-01]: Plugin name 'tb' set in manifest, marketplace uses source './' for self-hosted pattern
- [01-01]: Component directories at repo root level, only plugin.json and marketplace.json inside .claude-plugin/
- [Phase 02]: Followed superpowers hook pattern exactly for proven compatibility
- [Phase 02]: Dynamic skill discovery via grep/sed on SKILL.md frontmatter -- no YAML parser dependency
- [02-02]: Check scripts use python3 for JSON parsing (available on macOS/Linux)
- [02-02]: hooks-valid parses nested hooks.json structure (hooks -> event -> matchers -> hooks -> command)
- [Phase 03]: pr-read, pr-qa, task-github: no disable-model-invocation (safe for auto-trigger)
- [Phase 03]: pr-submit: disable-model-invocation true (creates branches, commits, pushes, PRs)
- [Phase 03]: Forward references to /tb:task-jira and /tb:pr-describe accepted (Phase 4 skills)
- [Phase 03]: release-create: disable-model-invocation true (creates branches, commits, pushes, PRs)
- [Phase 03]: mobile-reset: project-agnostic, reads bundle IDs from project config
- [Phase 03]: track-summary: preserved full identity cascade and snowball pattern
- [Phase 04]: keychain.js uses -a flag with service name as account for add-generic-password
- [Phase 04]: github-api.js uses curl for multipart uploads (same as original upload.sh)
- [Phase 04]: sentry-api.js uses Node.js https module with promise wrapper for API calls
- [Phase 04]: pr-upload references github-api.js directly (no skill-local upload.js wrapper needed)
- [Phase 04]: sentry-investigate setup.js serves both Sentry skills via shared tb.sentry-token
- [Phase 04]: sentry-sourcemaps passes token as SENTRY_AUTH_TOKEN env var to sentry-cli
- [Phase 04]: test-helpers.sh preserved as bash (not Node.js) due to deeply bash-idiomatic patterns
- [Phase 04]: task-jira setup.js verifies acli install/auth rather than storing credentials (acli manages own OAuth)
- [Phase 04]: pr-describe is pure orchestrator delegating to /tb:task-jira and /tb:pr-upload, no own credentials
- [Phase 04]: contentful kept as single large SKILL.md with migration DSL reference inline (splitting hurts usability)
- [Phase 04]: contentful uses Keychain tb.contentful-token via -a flag (replacing Doppler)

### Pending Todos

None yet.

### Blockers/Concerns

- Plugin cache staleness bug (GitHub #15642) may require workarounds during development
- RESOLVED: `${CLAUDE_SKILL_DIR}` works in SKILL.md bash commands, `${CLAUDE_PLUGIN_ROOT}` works in hooks/scripts/MCP configs but NOT in markdown content

## Session Continuity

Last session: 2026-03-12T12:09:34.563Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-credential-system/05-CONTEXT.md
