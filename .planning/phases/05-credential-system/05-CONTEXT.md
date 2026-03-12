# Phase 5: Credential System - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Every skill that needs secrets has a keychain-based setup script following a consistent pattern. Refactor the 4 existing per-skill setup.js files into a shared base, add API verification on setup, integrate credential checks into /tb:doctor, audit all 18 skills for missed credentials, and create a setup-all flow.

</domain>

<decisions>
## Implementation Decisions

### Setup script consistency
- Create `scripts/setup-credential.js` as a shared base module
- Supports two modes: `keychain` (store/retrieve secret) and `cli-check` (verify CLI tool installed + authenticated)
- Each skill keeps a thin `setup.js` wrapper (3-line file) calling the shared base with a config
- task-jira uses the `cli-check` mode (verifies acli install/auth)
- pr-upload, sentry-investigate, contentful use `keychain` mode
- sentry-sourcemaps continues to share sentry-investigate's setup (no own setup.js)
- Interface design: Claude's discretion (config object vs CLI args)

### Verification flow
- Setup scripts verify credentials via a lightweight test API call after storing
- If verification fails: reject the credential and re-prompt (don't store invalid tokens)
- Retry count: Claude's discretion
- After max retries: offer to store anyway with warning or abort
- Exception: GitHub session cookie (pr-upload) is store-only, no API verification (cookie validation too fragile)

### Doctor integration
- One check script per credential service (cred-github.sh, cred-sentry.sh, cred-contentful.sh, cred-acli.sh)
- Checks Keychain presence only (no API calls) for fast, offline-safe health checks
- FAIL output includes the exact setup command to fix (e.g., "Run: node skills/sentry-investigate/setup.js")
- Fits the existing drop-in `scripts/checks/*.sh` pattern
- Add a `/tb:setup-all` skill or `scripts/setup-all.js` that runs all credential setups in sequence

### Credentials audit
- Audit all 18 skills for credential needs (not just the known 4)
- If a skill needs credentials without a setup.js, create one using the shared base
- Standardize SKILL.md "First-time Setup" section wording across all credential-needing skills
- SKILL.md instructions tell Claude to auto-detect missing credentials (check Keychain first) and run setup.js if missing, rather than just documenting the manual command

### Claude's Discretion
- Shared base interface design (config object vs CLI arguments)
- Retry count for failed verification
- Which API endpoints to use for verification per service
- setup-all implementation (skill vs standalone script)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/keychain.js`: get/set/delete Keychain entries, already used by all credential skills
- `skills/pr-upload/setup.js`, `skills/sentry-investigate/setup.js`, `skills/contentful/setup.js`: near-identical Keychain setup pattern (prompt, store, verify retrieval)
- `skills/task-jira/setup.js`: different pattern (checks acli CLI install + auth)
- `scripts/checks/*.sh`: doctor check pattern (PASS|FAIL output, accepts $1 as plugin root)
- `scripts/sentry-api.js`, `scripts/github-api.js`: existing API clients that could inform verification endpoints

### Established Patterns
- Keychain service naming: `tb.{service}` (tb.github-session, tb.sentry-token, tb.contentful-token)
- setup.js accepts optional CLI argument for non-interactive use
- Non-TTY detection falls back to argument-based input
- Doctor discovers checks via `ls scripts/checks/*.sh`
- SKILL.md uses `${CLAUDE_SKILL_DIR}` for skill-local paths, `${CLAUDE_PLUGIN_ROOT}` not available in SKILL.md

### Integration Points
- `/tb:doctor` auto-discovers new check scripts from `scripts/checks/`
- SessionStart hook lists skills but doesn't check credentials
- sentry-sourcemaps references sentry-investigate's setup.js (shared credential)
- pr-describe delegates to task-jira + pr-upload (no own credentials)

</code_context>

<specifics>
## Specific Ideas

- The shared base script should handle both interactive (TTY) and non-interactive (argument) modes, matching the existing pattern
- setup-all should run setups in dependency order: shared credentials first (Sentry serves two skills)
- Doctor credential checks should use `node scripts/keychain.js get tb.{service}` for consistency rather than calling `security` directly

</specifics>

<deferred>
## Deferred Ideas

- Auto-refresh for expiring credentials (v2 requirement SETU-03)
- Credential health check that verifies all secrets present AND valid via API (v2 requirement SETU-02, doctor currently checks presence only)

</deferred>

---

*Phase: 05-credential-system*
*Context gathered: 2026-03-12*
