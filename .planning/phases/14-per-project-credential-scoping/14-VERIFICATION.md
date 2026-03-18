---
phase: 14-per-project-credential-scoping
verified: 2026-03-18T17:30:00Z
status: passed
score: 23/23 must-haves verified
re_verification: false
---

# Phase 14: Per-Project Credential Scoping Verification Report

**Phase Goal:** The credential system is organization-aware: credentials resolve as tb.{service}.{org} (auto-detected from git remote) with tb.{service} as fallback. Setup, doctor, API scripts, SKILL.md auto-detect, and the agent all use the org-aware resolution layer. A migration script copies globals to org-scoped keys.
**Verified:** 2026-03-18T17:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | resolveOrg() returns org from SSH git remote | VERIFIED | `scripts/resolve-org.js` line 15: `url.match(/:([^/]+)\/[^/]+?$/)` |
| 2 | resolveOrg() returns org from HTTPS git remote | VERIFIED | `scripts/resolve-org.js` line 18: `url.match(/\/\/[^/]+\/([^/]+)\/[^/]+?$/)` |
| 3 | resolveOrg() returns org from ssh:// git remote | VERIFIED | Same slash-based regex handles ssh:// format |
| 4 | resolveOrg() returns null when no git remote | VERIFIED | `scripts/resolve-org.js` lines 11-13: catch returns null |
| 5 | getCredential tries tb.{service}.{org} first, falls back to tb.{service} | VERIFIED | `scripts/resolve-credential.js` lines 19-24: org-scoped lookup then `keychainGet(service)` |
| 6 | getCredential returns global credential when no git remote | VERIFIED | When `resolveOrg()` returns null, org block is skipped, falls through to global `keychainGet(service)` |
| 7 | resolve-credential.js works as CLI (stdout + exit 1 on missing) | VERIFIED | Lines 27-38: `require.main === module` block; verified `node scripts/resolve-credential.js tb.test` exits 1 |
| 8 | resolve-credential.js works as require() module | VERIFIED | `module.exports = { getCredential }` at line 40 |
| 9 | Running setup.js from a project directory auto-detects org and stores to tb.{service}.{org} | VERIFIED | `scripts/setup-credential.js` line 37: `effectiveService = ... \`${config.service}.${org}\`` |
| 10 | Running setup.js with --global flag stores to tb.{service} | VERIFIED | `scripts/setup-credential.js` line 36-37: `globalFlag = process.argv.includes('--global')` overrides to `config.service` |
| 11 | Running setup.js outside a git repo stores to tb.{service} (global) | VERIFIED | `effectiveService = (globalFlag \|\| !org) ? config.service : ...` — null org uses global |
| 12 | Setup shows detected org message | VERIFIED | `scripts/setup-credential.js` lines 39-41: `Detected org: ${org}. Storing ${config.name.toLowerCase()} for ${org}.` |
| 13 | setup-all.js shows which org is being configured | VERIFIED | `scripts/setup-all.js` lines 12-17: prints org context before running setups |
| 14 | sentry-api.js resolves Sentry token through org-first lookup | VERIFIED | `scripts/sentry-api.js` lines 3,6: `require('./resolve-credential')` + `getCredential('tb.sentry-token')` |
| 15 | github-api.js resolves GitHub session through org-first lookup | VERIFIED | `scripts/github-api.js` lines 5,8: `require('./resolve-credential')` + `getCredential('tb.github-session')` |
| 16 | SKILL.md auto-detect blocks use resolve-credential.js | VERIFIED | All 4 SKILL.md files: `node "$PLUGIN_ROOT/scripts/resolve-credential.js"` in auto-detect; no `security find-generic-password -s "tb.*"` remains in skills/ |
| 17 | SKILL.md runtime retrieval uses resolve-credential.js | VERIFIED | sentry-sourcemaps: 6 occurrences; contentful: 3 occurrences — all use resolve-credential.js |
| 18 | attachment-documenter agent uses resolve-credential.js with plugin path discovery | VERIFIED | `agents/attachment-documenter.md` lines 41-46: `find ~/.claude/plugins -name resolve-credential.js` with `security` fallback |
| 19 | task-jira/setup.js checks org-scoped credential via resolve-credential.js | VERIFIED | `skills/task-jira/setup.js` line 21: `node "${path.join(__dirname, '../../scripts/resolve-credential.js')}" tb.jira-token` |
| 20 | Doctor checks report org-scoped credential status when run from project | VERIFIED | All 4 check scripts: `ORG=$(node "${PLUGIN_ROOT}/scripts/resolve-org.js")` then tries `tb.SERVICE.${ORG}` first |
| 21 | Doctor checks distinguish org-scoped hit, global fallback, and missing | VERIFIED | 3-tier output: `(org: ${ORG})`, `(global fallback, no org-specific for ${ORG})`, `FAIL ... missing` |
| 22 | Migration script discovers repos and groups by org | VERIFIED | `scripts/migrate-credentials.js`: `find "${dir}" -name .git -maxdepth 3`, maps org -> repos |
| 23 | Migration script copies globals to org-scoped keys with confirmation, preserves originals | VERIFIED | Lines 127-142: per-org `prompt`, skips existing, copies with `keychainSet`, line 144: `Global credentials preserved as fallback` |

**Score:** 23/23 truths verified

---

### Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `scripts/resolve-org.js` | 14-01 | VERIFIED | Exists, exports `resolveOrg`, handles SSH/HTTPS/ssh://, CLI + module mode |
| `scripts/resolve-credential.js` | 14-01 | VERIFIED | Exists, exports `{ getCredential }`, org-first fallback, CLI + module mode |
| `scripts/setup-credential.js` | 14-02 | VERIFIED | Modified, contains `resolveOrg`, `effectiveService`, `--global` flag, all keychainSet/Get use effectiveService |
| `scripts/setup-all.js` | 14-02 | VERIFIED | Modified, contains `resolveOrg`, org context display |
| `scripts/sentry-api.js` | 14-03 | VERIFIED | Uses `getCredential('tb.sentry-token')` via resolve-credential; no KEYCHAIN constant |
| `scripts/github-api.js` | 14-03 | VERIFIED | Uses `getCredential('tb.github-session')` via resolve-credential; no KEYCHAIN constant for auth |
| `skills/sentry-investigate/SKILL.md` | 14-03 | VERIFIED | Auto-detect uses resolve-credential.js |
| `skills/sentry-sourcemaps/SKILL.md` | 14-03 | VERIFIED | Auto-detect + 6 runtime retrievals use resolve-credential.js |
| `skills/pr-upload/SKILL.md` | 14-03 | VERIFIED | Auto-detect uses resolve-credential.js |
| `skills/contentful/SKILL.md` | 14-03 | VERIFIED | Auto-detect + 3 runtime retrievals use resolve-credential.js |
| `skills/task-jira/setup.js` | 14-03 | VERIFIED | Credential check uses resolve-credential.js path |
| `agents/attachment-documenter.md` | 14-03 | VERIFIED | Plugin path discovery + resolve-credential.js with security fallback |
| `scripts/checks/cred-sentry.sh` | 14-04 | VERIFIED | Org-aware: resolve-org.js, tb.sentry-token.${ORG}, global fallback, 3-tier reporting |
| `scripts/checks/cred-github.sh` | 14-04 | VERIFIED | Org-aware: resolve-org.js, tb.github-session.${ORG}, global fallback, 3-tier reporting |
| `scripts/checks/cred-contentful.sh` | 14-04 | VERIFIED | Org-aware: resolve-org.js, tb.contentful-token.${ORG}, global fallback, 3-tier reporting |
| `scripts/checks/cred-jira-token.sh` | 14-04 | VERIFIED | Org-aware: resolve-org.js, tb.jira-token.${ORG}, global fallback, 3-tier reporting |
| `scripts/migrate-credentials.js` | 14-04 | VERIFIED | Exists, DEFAULT_SCAN_DIRS (Projects/Work), all 4 SERVICES, per-org confirmation, skip existing, preserve globals |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/resolve-credential.js` | `scripts/resolve-org.js` | `require('./resolve-org')` | WIRED | Line 4 |
| `scripts/resolve-credential.js` | `scripts/keychain.js` | `execSync node keychain.js get` | WIRED | Line 10 |
| `scripts/setup-credential.js` | `scripts/resolve-org.js` | `require('./resolve-org')` | WIRED | Line 6 |
| `skills/sentry-investigate/setup.js` | `scripts/setup-credential.js` | `require('../../scripts/setup-credential')` | WIRED | Wrapper passes through to base module |
| `scripts/sentry-api.js` | `scripts/resolve-credential.js` | `require('./resolve-credential')` | WIRED | Line 3 |
| `scripts/github-api.js` | `scripts/resolve-credential.js` | `require('./resolve-credential')` | WIRED | Line 5 |
| `skills/sentry-investigate/SKILL.md` | `scripts/resolve-credential.js` | `node $PLUGIN_ROOT/scripts/resolve-credential.js` | WIRED | Line 15 |
| `agents/attachment-documenter.md` | `scripts/resolve-credential.js` | `find ~/.claude/plugins -name resolve-credential.js` | WIRED | Lines 41-46 |
| `scripts/checks/cred-sentry.sh` | `scripts/resolve-org.js` | `node "${PLUGIN_ROOT}/scripts/resolve-org.js"` | WIRED | Line 4 |
| `scripts/migrate-credentials.js` | `scripts/keychain.js` | `node "${KEYCHAIN}" get/set` | WIRED | Lines 27, 37 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCOPE-01 | 14-01 | Org extraction from git remote URL (SSH, HTTPS, ssh:// formats) | SATISFIED | `resolve-org.js` handles all 3 URL patterns with two regex patterns |
| SCOPE-02 | 14-01 | Org-aware credential resolution with global fallback | SATISFIED | `resolve-credential.js` getCredential() tries org-scoped first, falls back to global |
| SCOPE-03 | 14-02 | Setup scripts auto-detect org and store to scoped Keychain key | SATISFIED | `setup-credential.js` effectiveService = `${config.service}.${org}` |
| SCOPE-04 | 14-02 | --global flag on setup scripts to bypass org scoping | SATISFIED | `process.argv.includes('--global')` forces `config.service` as effectiveService |
| SCOPE-05 | 14-03 | API scripts (sentry-api.js, github-api.js) use org-aware resolution | SATISFIED | Both use `getCredential()` from resolve-credential.js |
| SCOPE-06 | 14-03 | SKILL.md auto-detect and runtime retrieval use resolve-credential.js | SATISFIED | All 4 SKILL.md auto-detect blocks + 9 runtime retrievals migrated; no `security find-generic-password -s "tb.*"` in skills/ |
| SCOPE-07 | 14-04 | Doctor credential checks report org-scoped vs global vs missing status | SATISFIED | All 4 check scripts implement 3-tier reporting |
| SCOPE-08 | 14-04 | One-time migration script copies global credentials to org-scoped keys | SATISFIED | `migrate-credentials.js` discovers orgs, confirms per-org, skips existing, preserves globals |

All 8 requirements satisfied. No orphaned requirements.

---

### Anti-Patterns Found

None. No TODO/FIXME/HACK/placeholder comments in any phase 14 files. No stub implementations. No empty handlers.

Note: `security find-generic-password` calls in `scripts/checks/cred-*.sh` are intentional — doctor checks use the macOS security command directly to check both org-scoped and global keychain entries. This is correct design, not a regression.

Note: `security find-generic-password` fallback in `agents/attachment-documenter.md` line 43 is the intentional portability fallback when the plugin path cannot be discovered. Correct design.

---

### Human Verification Required

None required. All automated checks passed. The org-detection logic (reading git remote) is deterministic and verifiable programmatically. The confirmed output of `node scripts/resolve-org.js` returning `ivanvarga` with exit 0 confirms the end-to-end CLI path works in the actual repo.

---

### Commit Audit

All documented commits verified present in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `9e7d6de` | 14-01 | feat(14-01): add resolve-org and resolve-credential foundation modules |
| `17b8c52` | 14-02 | feat(14-02): add org-aware credential storage to setup-credential.js |
| `e1c84d3` | 14-02 | feat(14-02): show detected org in setup-all.js before running setups |
| `33b1857` | 14-03 | feat(14-03): update API scripts to use resolve-credential.js |
| `18dc817` | 14-03 | feat(14-03): update SKILL.md files and agent to use resolve-credential.js |
| `f89350a` | 14-04 | feat(14-04): update doctor credential checks to be org-aware |
| `ab9c573` | 14-04 | feat(14-04): add one-time credential migration script |

Note: 14-03-SUMMARY.md cites `e1c84d3` as the commit for Task 2 (SKILL.md/agent updates) — this is a documentation error. The actual commit is `18dc817`. The code changes are correct and present; only the summary hash reference is wrong.

---

_Verified: 2026-03-18T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
