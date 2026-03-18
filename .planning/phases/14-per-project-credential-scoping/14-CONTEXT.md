# Phase 14: Per-Organization Credential Scoping - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the credential system organization-aware so different GitHub orgs can use different Sentry tokens, Contentful spaces, Jira instances, etc. The org is auto-detected from the git remote URL. Existing global credentials become the fallback layer. A one-time migration script re-scopes existing globals into org-scoped keys.

</domain>

<decisions>
## Implementation Decisions

### Organization identification
- Extract org/owner from git remote URL (`git remote get-url origin`)
- For `git@github.com:org-x/my-app.git` → org is `org-x`
- When no git remote exists, check with user (prompt: "No git remote found — use global credentials or specify an org name?")
- No config file needed — git remote is the source of truth

### Keychain naming
- Org-scoped: `tb.{service}.{org}` (e.g., `tb.sentry-token.org-x`)
- Global: `tb.{service}` (unchanged, kept as fallback)

### Credential resolution order
- Try `tb.{service}.{org}` first (org-scoped)
- Fall back to `tb.{service}` (global)
- All four credentials (Sentry, GitHub session, Contentful, Jira) use org scoping uniformly

### Setup experience
- Running setup.js from a project directory auto-detects org from git remote
- Shows detected org and confirms: "Detected org: org-x. Storing sentry token for org-x."
- `--global` flag overrides auto-detection, stores to `tb.{service}` regardless
- Non-interactive mode (CLI argument) also respects auto-detected org

### One-time migration
- Migration script scans common directories (~/Projects, ~/Work) for git repos
- Groups repos by org extracted from git remote
- Asks user to confirm org-credential mapping
- Copies existing `tb.{service}` globals to `tb.{service}.{org}` for confirmed orgs
- Keeps original global credentials as fallback after migration

### Doctor integration
- Doctor shows all org-scoped credentials found plus global
- Lists each org with its credential status (e.g., "Sentry: org-x ✓, org-y ✓, global ✓")

### Claude's Discretion
- Exact migration script UX (interactive prompts, confirmation flow)
- Which directories to scan during migration (configurable list vs hardcoded)
- How to handle SSH vs HTTPS git remote URL parsing edge cases
- Whether setup-credential.js absorbs org detection or a separate utility extracts it

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Credential system
- `scripts/keychain.js` — Low-level Keychain get/set/delete abstraction (needs org-awareness or callers pass full service name)
- `scripts/setup-credential.js` — Shared setup base module (needs org auto-detection + --global flag)
- `skills/sentry-investigate/setup.js` — Example credential setup wrapper (pattern for all 4)
- `skills/pr-upload/setup.js` — GitHub session setup wrapper
- `skills/contentful/setup.js` — Contentful setup wrapper
- `skills/task-jira/setup.js` — Jira CLI-check mode setup

### Credential consumption
- `scripts/sentry-api.js` — Hardcoded `tb.sentry-token` get (needs org-first resolution)
- `scripts/github-api.js` — Hardcoded `tb.github-session` get (needs org-first resolution)
- `agents/attachment-documenter.md` — Direct `security` command for `tb.jira-token` (needs org-first resolution)

### Doctor checks
- `scripts/checks/` — Drop-in credential check scripts (need org-scoped reporting)

### Phase 5 context
- `.planning/phases/05-credential-system/05-CONTEXT.md` — Original credential system decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/keychain.js`: Already abstracts Keychain operations — callers can pass the full `tb.{service}.{org}` key without changing keychain.js
- `scripts/setup-credential.js`: Shared base with verify callback, TTY/non-TTY modes — needs org detection layer added
- `scripts/checks/*.sh`: Doctor check pattern — need to iterate over org-scoped entries

### Established Patterns
- Keychain service naming: `tb.{service}` with `-a` flag using service name as account
- setup.js wrappers are thin 3-line files calling shared base with config object
- Auto-detect pattern: skills check Keychain first, run setup.js inline if missing
- SKILL.md credential checks use `security find-generic-password -s "tb.{service}"`

### Integration Points
- Every SKILL.md that references `tb.{service}` needs to use org-first resolution
- `sentry-api.js` and `github-api.js` hardcode service names — need to accept org context
- `attachment-documenter.md` agent uses direct `security` command — needs org-first lookup
- setup-all.js orchestrator needs org-awareness

</code_context>

<specifics>
## Specific Ideas

- Changed from "per-project" to "per-organization" scoping — credentials belong at the org level, not individual repos
- Migration should scan ~/Projects and ~/Work to discover repos and their orgs
- The `--global` escape hatch is important for credentials that truly are personal, not org-specific

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-per-project-credential-scoping*
*Context gathered: 2026-03-18*
