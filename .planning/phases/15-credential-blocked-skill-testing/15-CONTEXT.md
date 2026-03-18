# Phase 15: Credential-Blocked Skill Testing - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Manual verification phase: hands-on testing to confirm the entire credential system works end-to-end across all credential-dependent skills. Covers credential resolution paths, setup flows, skill invocation with real credentials, and doctor reporting. Deliverable is a test plan/checklist that gets executed, not automated test code.

</domain>

<decisions>
## Implementation Decisions

### Test approach
- Manual verification only — no automated test framework or test files
- Deliverable is an executable test checklist, not code
- Testing is performed by invoking real scripts and skills against real Keychain entries

### Credential resolution testing
- Verify resolve-credential.js tries org-scoped first, falls back to global for each service (Sentry, GitHub, Contentful, Jira)
- Test with two real orgs to confirm independent resolution
- Use fake org (temp git repo pointed at nonexistent org) to test missing-credential paths safely
- Temporarily remove real org-scoped keys to test global fallback, restore after

### Setup flow testing
- Run each setup.js end-to-end: prompt → verification → Keychain storage → org-scoped naming
- Confirm --global flag bypasses org detection
- Test both interactive (TTY) and non-interactive (CLI argument) modes

### Skill auto-detect testing
- Two-phase approach: audit first, then invoke
- Phase 1: Read each SKILL.md auto-detect block, verify it references resolve-credential.js with correct service name
- Phase 2: Full round-trip per skill — remove credential → invoke skill → confirm setup.js fires → provide credential → verify stored → re-invoke skill → confirm success
- Skills to test: sentry-investigate, sentry-sourcemaps, pr-upload, contentful, task-jira

### Doctor check testing
- Verify doctor correctly reports PASS when org-scoped credentials are present
- Focus on status correctness (PASS/FAIL), not exact output wording
- Test all 5 credential check scripts: cred-sentry, cred-github, cred-contentful, cred-acli, cred-jira-token

### Claude's Discretion
- Exact ordering of test steps in the checklist
- How to structure the test plan document (single file vs per-service)
- Whether to capture test results inline in the checklist or in a separate results file

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Credential resolution
- `scripts/resolve-credential.js` — Org-first credential lookup with global fallback
- `scripts/resolve-org.js` — Git remote → org extraction
- `scripts/keychain.js` — Low-level Keychain get/set/delete

### Setup infrastructure
- `scripts/setup-credential.js` — Shared setup base module with verify callback, retry, org detection
- `skills/sentry-investigate/setup.js` — Sentry setup wrapper
- `skills/pr-upload/setup.js` — GitHub session setup wrapper
- `skills/contentful/setup.js` — Contentful setup wrapper
- `skills/task-jira/setup.js` — Jira CLI-check mode setup

### SKILL.md auto-detect patterns
- `skills/sentry-investigate/SKILL.md` — Auto-detect block (lines 15-18)
- `skills/sentry-sourcemaps/SKILL.md` — Auto-detect block (lines 15-17)
- `skills/pr-upload/SKILL.md` — Auto-detect block (lines 15-18)
- `skills/contentful/SKILL.md` — Auto-detect block (lines 28-31)
- `skills/task-jira/SKILL.md` — Auto-detect block (line 15)

### Doctor checks
- `scripts/checks/cred-sentry.sh` — Sentry credential check
- `scripts/checks/cred-github.sh` — GitHub credential check
- `scripts/checks/cred-contentful.sh` — Contentful credential check
- `scripts/checks/cred-acli.sh` — acli install/auth check
- `scripts/checks/cred-jira-token.sh` — Jira token check

### Prior phase context
- `.planning/phases/05-credential-system/05-CONTEXT.md` — Original credential system decisions
- `.planning/phases/14-per-project-credential-scoping/14-CONTEXT.md` — Org-scoping decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolve-credential.js`: Pure function, testable by running `node scripts/resolve-credential.js tb.{service}` from different git repo contexts
- `resolve-org.js`: Pure function, testable by running from repos with different remotes
- Doctor check scripts: Self-contained, runnable with `bash scripts/checks/cred-*.sh /path/to/plugin`

### Established Patterns
- Keychain naming: `tb.{service}.{org}` (org-scoped), `tb.{service}` (global)
- Auto-detect: SKILL.md checks `resolve-credential.js` exit code, runs setup.js on failure
- Doctor checks: PASS/FAIL prefix with descriptive message
- Setup wrappers: 3-line files calling shared base with config object

### Integration Points
- `attachment-documenter.md` agent also uses credentials (Jira, GitHub, Sentry) — should be included in verification
- `sentry-sourcemaps` shares `sentry-investigate`'s credential — verify shared setup works
- `pr-describe` delegates to `task-jira` + `pr-upload` — verify transitive credential resolution

</code_context>

<specifics>
## Specific Ideas

- Use two real orgs the user has credentials for to test independent org resolution
- Create a temp git repo with fake org remote for safe missing-credential testing
- Full round-trip testing: remove cred → invoke skill → setup fires → re-enter cred → skill succeeds
- Test plan should be structured as a runnable checklist that can be executed step-by-step

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-credential-blocked-skill-testing*
*Context gathered: 2026-03-18*
