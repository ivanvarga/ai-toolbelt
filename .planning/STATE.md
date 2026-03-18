---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 14-03-PLAN.md
last_updated: "2026-03-18T16:08:11.810Z"
last_activity: 2026-03-18 -- Completed 14-04-PLAN.md (doctor checks & credential migration)
progress:
  total_phases: 16
  completed_phases: 14
  total_plans: 29
  completed_plans: 29
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** One repo, one install command -- every custom skill, credential setup, and dev tool available on any machine, always up to date.
**Current focus:** Phase 14: Per-Project Credential Scoping

## Current Position

Phase: 14 of 16 (Per-Project Credential Scoping)
Plan: 2 of 4 complete in current phase
Status: In Progress
Last activity: 2026-03-18 -- Completed 14-04-PLAN.md (doctor checks & credential migration)

Progress: [██████████] 100%

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
| Phase 05 P02 | 1min | 2 tasks | 4 files |
| Phase 05 P01 | 2min | 2 tasks | 5 files |
| Phase 05 P03 | 2min | 2 tasks | 5 files |
| Phase 06 P01 | 2min | 3 tasks | 4 files |
| Phase 06 P02 | 2min | 2 tasks | 0 files |
| Phase 07 P01 | 2min | 2 tasks | 11 files |
| Phase 07 P01 | 2min | 2 tasks | 11 files |
| Phase 07 P02 | 2min | 2 tasks | 5 files |
| Phase 07 P03 | 2min | 1 tasks | 2 files |
| Phase 08 P01 | 3min | 2 tasks | 13 files |
| Phase 08 P02 | 2min | 2 tasks | 3 files |
| Phase 09 P01 | 2min | 1 tasks | 4 files |
| Phase 09 P02 | 2min | 1 tasks | 6 files |
| Phase 10 P01 | 3min | 2 tasks | 5 files |
| Phase 11 P01 | 2min | 3 tasks | 3 files |
| Phase 12 P01 | 2min | 2 tasks | 6 files |
| Phase 13 P01 | 3min | 2 tasks | 6 files |
| Phase 14 P01 | 1min | 1 tasks | 2 files |
| Phase 14 P04 | 1min | 2 tasks | 5 files |
| Phase 14 P02 | 2min | 2 tasks | 2 files |
| Phase 14 P03 | 1min | 2 tasks | 8 files |

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
- [Phase 05]: Keychain checks use keychain.js get (not raw security command) for consistency
- [Phase 05]: acli check uses command -v + --help subcommand to verify install and auth without side effects
- [Phase 05]: verify callback returns true/false/null (null = connection error, triggers store-anyway prompt)
- [Phase 05]: 3 retry attempts for failed verification before offering store-anyway fallback
- [Phase 05]: setup-all.js runs setups in dependency order: Sentry first (serves two skills), then Contentful, GitHub Upload, Jira
- [Phase 05]: Auto-detect pattern runs setup.js inline instead of exit 1, so Claude self-heals missing credentials
- [Phase 06]: Used cmp -s for byte-exact config comparison (avoids false failures from whitespace)
- [Phase 06]: Config copy step placed after stash pop to use freshly pulled content
- [Phase 06]: All 18 skills passed verification without modifications
- [Phase 06]: contentful (594 lines) and mobilecli (511 lines) exceed 500-line guideline but are deliberate design decisions
- [Phase 07]: verify group function named verify_group with @click.group('verify') to avoid Python builtin shadowing
- [Phase 07]: verify group function named verify_group with @click.group('verify') to avoid Python builtin shadowing
- [Phase 07]: xcrun simctl io enumerate fallback for screen info on shutdown simulators
- [Phase 07]: iOS _dataPath/_deviceTypeIdentifier internal fields stripped before command output
- [Phase 07]: Android returns empty list when adb unavailable for unfiltered device list
- [Phase 07]: screen_logical_size returns None when scale is unavailable (shutdown simulators)
- [Phase 07]: logical_width and logical_height added to screen dict only when computable
- [Phase 08]: idb called as CLI subprocess (not fb-idb Python import) consistent with xcrun/adb pattern
- [Phase 08]: iOS elements have children=[] (idb returns flat list per known limitation)
- [Phase 08]: Android accessibility_id prefers content-desc, falls back to resource-id with package stripped
- [Phase 08]: Integer division for compute_center; float iOS frame values rounded to int
- [Phase 08]: XPath queries auto-prefixed with . (ElementTree requires relative paths on elements)
- [Phase 08]: Shared _capture_dump helper extracts dump logic for reuse between dump and find subcommands
- [Phase 09]: Escape sequences parsed from raw backslash-letter input for CLI-friendly usage
- [Phase 09]: Android text encoding handles %/space/shell metacharacters via _encode_adb_text helper
- [Phase 09]: iOS clear sends 500 backspaces; Android sends MOVE_END then 200 DEL keyevents
- [Phase 09]: type command named type_text_cmd internally to avoid Python builtin shadowing
- [Phase 09]: Android screenshot_bytes uses binary subprocess.run (no text=True) to preserve raw PNG bytes
- [Phase 09]: iOS screenshot uses temp file with finally-block cleanup; Android streams bytes via BytesIO
- [Phase 10]: JSON config file at .mbridge/config.json for persistent device/bundle/scheme settings
- [Phase 10]: Doctor check with 3 prerequisite checks: mbridge CLI, Python 3.12+, tesseract
- [Phase 10]: Direct CLI skill pattern: no test-helpers.sh, no sourcing, each mbridge command is self-contained
- [Phase 11]: click.version_option with __version__ import for CLI version detection
- [Phase 11]: setup.js compares pyproject.toml version vs mbridge --version (replaces --help check)
- [Phase 11]: Doctor check consolidated to 1 line with fast-path/slow-path pattern
- [Phase 12]: settings.local.json is gitignored so mobilecli removal is local-only
- [Phase 13]: macOS security command used directly in agent body for keychain access (avoids CLAUDE_PLUGIN_ROOT path issues)
- [Phase 13]: acli jira auth status for runtime email extraction (no separate keychain entry for email)
- [Phase 13]: GitHub auth optional -- falls back to unauthenticated for public repos
- [Phase 13]: Agent definition as flat file at agents/attachment-documenter.md per official docs pattern

- [Dev workflow]: Always run `claude --plugin-dir ./` from repo root for live skill/agent testing without formal install
- [Phase 14]: Regex-based URL parsing for git remote org extraction (no URL library dependency)
- [Phase 14]: keychainGet helper wraps keychain.js CLI call for clean credential resolution
- [Phase 14]: Doctor checks try org-scoped key first, fall back to global, report mode in PASS message
- [Phase 14]: Migration script preserves global credentials as fallback after copying to org-scoped keys
- [Phase 14]: effectiveService computed once at function start, used throughout all code paths
- [Phase 14]: --global flag checked via process.argv.includes (available from any position)
- [Phase 14]: Agent uses plugin path discovery (find ~/.claude/plugins) with direct security fallback for portability

### Roadmap Evolution

- Phase 14 added: Per-Project Credential Scoping

### Pending Todos

None yet.

### Blockers/Concerns

- Plugin cache staleness bug (GitHub #15642) may require workarounds during development
- RESOLVED: `${CLAUDE_SKILL_DIR}` works in SKILL.md bash commands, `${CLAUDE_PLUGIN_ROOT}` works in hooks/scripts/MCP configs but NOT in markdown content

## Session Continuity

Last session: 2026-03-18T16:02:51.967Z
Stopped at: Completed 14-03-PLAN.md
