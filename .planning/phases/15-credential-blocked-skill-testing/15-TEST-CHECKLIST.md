# Phase 15: Credential System Test Checklist

Status: Ready for execution
Date: 2026-03-19

## Static Audit Results

Static code audit of all credential-related files. Each check verified via grep against source files.

### SKILL.md Auto-Detect Blocks

| # | File | Expected Pattern | Result |
|---|------|-----------------|--------|
| 1 | skills/sentry-investigate/SKILL.md | `resolve-credential.js" tb.sentry-token` | PASS -- line 15 |
| 2 | skills/sentry-sourcemaps/SKILL.md | `resolve-credential.js" tb.sentry-token` | PASS -- line 15 |
| 3 | skills/pr-upload/SKILL.md | `resolve-credential.js" tb.github-session` | PASS -- line 15 |
| 4 | skills/contentful/SKILL.md | `resolve-credential.js" tb.contentful-token` | PASS -- line 28 |
| 5 | skills/task-jira/SKILL.md | No resolve-credential.js (uses setup.js CLI check) | PASS -- no match |

### Setup.js Service Names

| # | File | Expected Service | Result |
|---|------|-----------------|--------|
| 6 | skills/sentry-investigate/setup.js | `service: 'tb.sentry-token'` | PASS -- line 5 |
| 7 | skills/pr-upload/setup.js | `service: 'tb.github-session'` | PASS -- line 5 |
| 8 | skills/contentful/setup.js | `service: 'tb.contentful-token'` | PASS -- line 5 |
| 9 | skills/task-jira/setup-token.js | `service: 'tb.jira-token'` | PASS -- line 5 |
| 10 | skills/task-jira/setup.js | CLI-check mode (acli + resolve-credential.js for tb.jira-token) | PASS -- line 21 |

### Doctor Check Scripts

| # | File | Expected: resolve-org.js | Expected: Org-Scoped Key | Expected: Global Fallback | Result |
|---|------|-------------------------|--------------------------|--------------------------|--------|
| 11 | scripts/checks/cred-sentry.sh | PASS -- line 4 | `tb.sentry-token.${ORG}` -- line 7 | `tb.sentry-token` -- line 13 | PASS |
| 12 | scripts/checks/cred-github.sh | PASS -- line 4 | `tb.github-session.${ORG}` -- line 7 | `tb.github-session` -- line 13 | PASS |
| 13 | scripts/checks/cred-contentful.sh | PASS -- line 4 | `tb.contentful-token.${ORG}` -- line 7 | `tb.contentful-token` -- line 13 | PASS |
| 14 | scripts/checks/cred-jira-token.sh | PASS -- line 4 | `tb.jira-token.${ORG}` -- line 7 | `tb.jira-token` -- line 13 | PASS |
| 15 | scripts/checks/cred-acli.sh | N/A (no Keychain) | `command -v acli` -- line 4 | `acli jira workitem view --help` -- line 9 | PASS |

### API Scripts

| # | File | Expected Import | Expected Service | Result |
|---|------|----------------|-----------------|--------|
| 16 | scripts/sentry-api.js | `require('./resolve-credential')` | `getCredential('tb.sentry-token')` | PASS -- lines 3, 6 |
| 17 | scripts/github-api.js | `require('./resolve-credential')` | `getCredential('tb.github-session')` | PASS -- lines 5, 8 |

### Setup Infrastructure

| # | File | Expected Pattern | Result |
|---|------|-----------------|--------|
| 18 | scripts/setup-credential.js | effectiveService uses `config.service.${org}` | PASS -- line 37 |
| 19 | scripts/setup-all.js | Runs Sentry, Contentful, GitHub Upload, Jira setups | PASS -- lines 20-24 |
| 20 | scripts/resolve-credential.js | Tries `${service}.${org}` first, falls back to `${service}` | PASS -- lines 18-25 |
| 21 | scripts/resolve-org.js | Parses git remote URL for org | PASS -- lines 4-22 |

### Migration Script

| # | File | Expected SERVICES | Result |
|---|------|------------------|--------|
| 22 | scripts/migrate-credentials.js | `['tb.sentry-token', 'tb.github-session', 'tb.contentful-token', 'tb.jira-token']` | PASS -- line 12 |

### Agent

| # | File | Expected Pattern | Result |
|---|------|-----------------|--------|
| 23 | agents/attachment-documenter.md | Plugin path discovery with security fallback | PASS -- lines 41-46 |

**Static Audit Summary: 23/23 checks PASS**

---

## Section 1: Credential Resolution

Tests for `resolve-credential.js` and `resolve-org.js` core modules.

### 1.1 Org Detection from ai-toolbelt repo

- [ ] **Test:** Run `node scripts/resolve-org.js` from the ai-toolbelt repo root
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/resolve-org.js; echo "exit: $?"
  ```
  **Expected:** Prints the GitHub org from git remote (e.g., `ivarga` or org name), exit code 0

### 1.2 Org Detection from no-git directory

- [ ] **Test:** Run resolve-org.js from /tmp (no git repo)
  ```bash
  cd /tmp && node /Users/ivarga/Projects/ai-toolbelt/scripts/resolve-org.js; echo "exit: $?"
  ```
  **Expected:** No output, exit code 1

### 1.3 Org Detection from fake org repo

- [ ] **Test:** Create temp repo with fake remote and test org extraction
  ```bash
  mkdir -p /tmp/test-cred-resolve && cd /tmp/test-cred-resolve && git init && git remote add origin git@github.com:fakeorg/fakerepo.git && node /Users/ivarga/Projects/ai-toolbelt/scripts/resolve-org.js; echo "exit: $?"
  ```
  **Expected:** Prints `fakeorg`, exit code 0

### 1.4 Credential Resolution -- Sentry (org-scoped)

- [ ] **Test:** Resolve Sentry token from ai-toolbelt repo
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/resolve-credential.js tb.sentry-token >/dev/null 2>&1; echo "exit: $?"
  ```
  **Expected:** Exit code 0 (credential found -- org-scoped or global)

### 1.5 Credential Resolution -- GitHub (org-scoped)

- [ ] **Test:** Resolve GitHub session from ai-toolbelt repo
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/resolve-credential.js tb.github-session >/dev/null 2>&1; echo "exit: $?"
  ```
  **Expected:** Exit code 0 (credential found -- org-scoped or global)

### 1.6 Credential Resolution -- Contentful (org-scoped)

- [ ] **Test:** Resolve Contentful token from ai-toolbelt repo
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/resolve-credential.js tb.contentful-token >/dev/null 2>&1; echo "exit: $?"
  ```
  **Expected:** Exit code 0 (credential found -- org-scoped or global)

### 1.7 Credential Resolution -- Jira (org-scoped)

- [ ] **Test:** Resolve Jira token from ai-toolbelt repo
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/resolve-credential.js tb.jira-token >/dev/null 2>&1; echo "exit: $?"
  ```
  **Expected:** Exit code 0 (credential found -- org-scoped or global)

### 1.8 Credential Resolution -- Global Fallback from Fake Org

- [ ] **Test:** Resolve Sentry token from fake org repo (no fakeorg-scoped key)
  ```bash
  cd /tmp/test-cred-resolve && node /Users/ivarga/Projects/ai-toolbelt/scripts/resolve-credential.js tb.sentry-token >/dev/null 2>&1; echo "exit: $?"
  ```
  **Expected:** Exit code 0 if global fallback exists, exit code 1 if no global key either

### 1.9 Cleanup

- [ ] **Test:** Remove temp repo
  ```bash
  rm -rf /tmp/test-cred-resolve
  ```
  **Expected:** No errors

---

## Section 2: Setup Flows

Tests for `setup-credential.js` and individual `setup.js` wrappers.

### 2.1 Sentry Setup -- Already Configured

- [ ] **Test:** Run Sentry setup (should detect existing credential)
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node skills/sentry-investigate/setup.js
  ```
  **Expected:** Prints `Detected org: <org>` and `Sentry auth token already configured (tb.sentry-token.<org>).`, exit code 0

### 2.2 GitHub Upload Setup -- Already Configured

- [ ] **Test:** Run GitHub session setup
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node skills/pr-upload/setup.js
  ```
  **Expected:** Prints `Detected org: <org>` and `GitHub session cookie already configured (tb.github-session.<org>).`, exit code 0

### 2.3 Contentful Setup -- Already Configured

- [ ] **Test:** Run Contentful setup
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node skills/contentful/setup.js
  ```
  **Expected:** Prints `Detected org: <org>` and `Contentful management token already configured (tb.contentful-token.<org>).`, exit code 0

### 2.4 Jira Setup -- acli + Token Check

- [ ] **Test:** Run Jira setup (CLI-check mode)
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node skills/task-jira/setup.js
  ```
  **Expected:** Prints `acli (Atlassian CLI) is installed and configured.` and `Jira API token configured.`, exit code 0

### 2.5 Sentry Setup -- Global Flag

- [ ] **Test:** Run Sentry setup with --global to bypass org detection
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node skills/sentry-investigate/setup.js --global
  ```
  **Expected:** Prints `Sentry auth token already configured (tb.sentry-token).` (no org suffix), exit code 0

### 2.6 Setup-All Batch Orchestrator

- [ ] **Test:** Run setup-all.js
  ```bash
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/setup-all.js
  ```
  **Expected:** Prints detected org, runs all 4 setups (Sentry, Contentful, GitHub Upload, Jira), prints summary with `Succeeded: 4/4`

### 2.7 (Manual) Setup Re-entry Flow

- [ ] **Test:** For one service, delete org-scoped key, run setup interactively, re-enter token
  ```bash
  # Step 1: Note current org
  cd /Users/ivarga/Projects/ai-toolbelt && node scripts/resolve-org.js

  # Step 2: Delete org-scoped key (replace <ORG> with actual org)
  security delete-generic-password -s "tb.sentry-token.<ORG>"

  # Step 3: Run setup -- it should prompt for new token
  node skills/sentry-investigate/setup.js

  # Step 4: Verify it stored with org-scoped name
  node scripts/resolve-credential.js tb.sentry-token >/dev/null && echo "PASS" || echo "FAIL"
  ```
  **Expected:** Setup prompts for token (or accepts as CLI argument), stores as `tb.sentry-token.<ORG>`, resolve-credential.js returns exit 0

---

## Section 3: SKILL.md Auto-Detect

Tests confirming auto-detect blocks in each SKILL.md correctly wire to credential resolution and setup.

### 3.1 sentry-investigate Auto-Detect Wiring

- [ ] **Test:** Verify auto-detect block calls resolve-credential.js with tb.sentry-token
  ```bash
  grep -n "resolve-credential.js.*tb.sentry-token" /Users/ivarga/Projects/ai-toolbelt/skills/sentry-investigate/SKILL.md
  ```
  **Expected:** Line 15 matches: `if ! node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.sentry-token`

- [ ] **Test:** Verify setup.js is called on credential absence
  ```bash
  grep -n "setup.js" /Users/ivarga/Projects/ai-toolbelt/skills/sentry-investigate/SKILL.md | head -3
  ```
  **Expected:** Line 17 references `${CLAUDE_SKILL_DIR}/setup.js`

### 3.2 sentry-sourcemaps Auto-Detect Wiring

- [ ] **Test:** Verify auto-detect block calls resolve-credential.js with tb.sentry-token
  ```bash
  grep -n "resolve-credential.js.*tb.sentry-token" /Users/ivarga/Projects/ai-toolbelt/skills/sentry-sourcemaps/SKILL.md
  ```
  **Expected:** Line 15 matches: `if ! node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.sentry-token`

- [ ] **Test:** Verify sentry-sourcemaps references sentry-investigate setup (shared credential)
  ```bash
  grep -n "sentry-investigate/setup.js" /Users/ivarga/Projects/ai-toolbelt/skills/sentry-sourcemaps/SKILL.md
  ```
  **Expected:** References `sentry-investigate/setup.js` for shared token setup

### 3.3 pr-upload Auto-Detect Wiring

- [ ] **Test:** Verify auto-detect block calls resolve-credential.js with tb.github-session
  ```bash
  grep -n "resolve-credential.js.*tb.github-session" /Users/ivarga/Projects/ai-toolbelt/skills/pr-upload/SKILL.md
  ```
  **Expected:** Line 15 matches: `if ! node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.github-session`

- [ ] **Test:** Verify setup.js is called on credential absence
  ```bash
  grep -n "setup.js" /Users/ivarga/Projects/ai-toolbelt/skills/pr-upload/SKILL.md | head -3
  ```
  **Expected:** Line 17 references `${CLAUDE_SKILL_DIR}/setup.js`

### 3.4 contentful Auto-Detect Wiring

- [ ] **Test:** Verify auto-detect block calls resolve-credential.js with tb.contentful-token
  ```bash
  grep -n "resolve-credential.js.*tb.contentful-token" /Users/ivarga/Projects/ai-toolbelt/skills/contentful/SKILL.md
  ```
  **Expected:** Line 28 matches: `if ! node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.contentful-token`

- [ ] **Test:** Verify setup.js is called on credential absence
  ```bash
  grep -n "setup.js" /Users/ivarga/Projects/ai-toolbelt/skills/contentful/SKILL.md | head -3
  ```
  **Expected:** Line 30 references `${CLAUDE_SKILL_DIR}/setup.js`

### 3.5 task-jira Auto-Detect Wiring

- [ ] **Test:** Verify auto-detect block uses setup.js directly (not resolve-credential.js)
  ```bash
  grep -n "setup.js" /Users/ivarga/Projects/ai-toolbelt/skills/task-jira/SKILL.md | head -3
  ```
  **Expected:** Line 15 references `${CLAUDE_SKILL_DIR}/setup.js`

- [ ] **Test:** Verify setup.js checks acli installation
  ```bash
  grep -n "which acli\|command -v acli" /Users/ivarga/Projects/ai-toolbelt/skills/task-jira/setup.js
  ```
  **Expected:** Line 6 checks `which acli`

- [ ] **Test:** Verify setup.js checks resolve-credential.js for tb.jira-token
  ```bash
  grep -n "resolve-credential.js.*tb.jira-token" /Users/ivarga/Projects/ai-toolbelt/skills/task-jira/setup.js
  ```
  **Expected:** Line 21 resolves `tb.jira-token`

### 3.6 (Manual) Full Round-Trip Conceptual Verification

- [ ] **Test:** Confirm that the auto-detect pattern triggers setup.js when credential is absent. For each skill, the auto-detect block:
  1. Runs `resolve-credential.js <service>` -- exits 1 if missing
  2. On exit 1: runs `setup.js` (sentry, pr-upload, contentful) or prints instructions (sentry-sourcemaps, task-jira)
  3. After setup: re-running resolve-credential.js exits 0
  **Expected:** Pattern verified by reading SKILL.md code blocks (confirmed in static audit above)

---

## Section 4: Doctor Checks

Tests for all 5 doctor check scripts.

### 4.1 Doctor -- Sentry Credential

- [ ] **Test:** Run Sentry doctor check
  ```bash
  bash /Users/ivarga/Projects/ai-toolbelt/scripts/checks/cred-sentry.sh /Users/ivarga/Projects/ai-toolbelt
  ```
  **Expected:** `PASS cred-sentry Sentry token configured (org: <org>)` or `(global)` variant

### 4.2 Doctor -- GitHub Credential

- [ ] **Test:** Run GitHub doctor check
  ```bash
  bash /Users/ivarga/Projects/ai-toolbelt/scripts/checks/cred-github.sh /Users/ivarga/Projects/ai-toolbelt
  ```
  **Expected:** `PASS cred-github GitHub session cookie configured (org: <org>)` or `(global)` variant

### 4.3 Doctor -- Contentful Credential

- [ ] **Test:** Run Contentful doctor check
  ```bash
  bash /Users/ivarga/Projects/ai-toolbelt/scripts/checks/cred-contentful.sh /Users/ivarga/Projects/ai-toolbelt
  ```
  **Expected:** `PASS cred-contentful Contentful token configured (org: <org>)` or `(global)` variant

### 4.4 Doctor -- acli

- [ ] **Test:** Run acli doctor check
  ```bash
  bash /Users/ivarga/Projects/ai-toolbelt/scripts/checks/cred-acli.sh /Users/ivarga/Projects/ai-toolbelt
  ```
  **Expected:** `PASS cred-acli acli installed and authenticated`

### 4.5 Doctor -- Jira Token

- [ ] **Test:** Run Jira token doctor check
  ```bash
  bash /Users/ivarga/Projects/ai-toolbelt/scripts/checks/cred-jira-token.sh /Users/ivarga/Projects/ai-toolbelt
  ```
  **Expected:** `PASS cred-jira-token Jira API token configured (org: <org>)` or `(global)` variant

### 4.6 (Manual) Doctor FAIL Path

- [ ] **Test:** From a fake org repo (no credentials for that org and no global fallback), run a doctor check
  ```bash
  # Setup fake repo
  mkdir -p /tmp/test-doctor-fail && cd /tmp/test-doctor-fail && git init && git remote add origin git@github.com:fakeorg/fakerepo.git

  # Run doctor check (will try fakeorg-scoped first, then global fallback)
  bash /Users/ivarga/Projects/ai-toolbelt/scripts/checks/cred-sentry.sh /Users/ivarga/Projects/ai-toolbelt

  # Cleanup
  rm -rf /tmp/test-doctor-fail
  ```
  **Expected:** If global credential exists: `PASS cred-sentry Sentry token configured (global fallback, no org-specific for fakeorg)`. If no global: `FAIL cred-sentry Sentry token missing.`

---

## Section 5: Integration Points

Tests confirming cross-skill credential sharing and delegation.

### 5.1 Shared Sentry Credential

- [ ] **Test:** Verify sentry-sourcemaps uses same service name as sentry-investigate
  ```bash
  grep "tb.sentry-token" /Users/ivarga/Projects/ai-toolbelt/skills/sentry-sourcemaps/SKILL.md | head -1
  grep "tb.sentry-token" /Users/ivarga/Projects/ai-toolbelt/skills/sentry-investigate/SKILL.md | head -1
  ```
  **Expected:** Both reference `tb.sentry-token` -- shared credential

### 5.2 pr-describe Delegation

- [ ] **Test:** Verify pr-describe has no own credential setup (delegates to task-jira + pr-upload)
  ```bash
  grep -c "resolve-credential\|setup.js\|keychain" /Users/ivarga/Projects/ai-toolbelt/skills/pr-describe/SKILL.md
  ```
  **Expected:** 0 -- pr-describe is a pure orchestrator with no credential references

### 5.3 attachment-documenter Credential Access

- [ ] **Test:** Verify attachment-documenter uses plugin path discovery for resolve-credential.js
  ```bash
  grep "resolve-credential" /Users/ivarga/Projects/ai-toolbelt/agents/attachment-documenter.md
  ```
  **Expected:** References `resolve-credential.js` via plugin path discovery (`find ~/.claude/plugins`)

- [ ] **Test:** Verify attachment-documenter has security fallback
  ```bash
  grep "security find-generic-password" /Users/ivarga/Projects/ai-toolbelt/agents/attachment-documenter.md
  ```
  **Expected:** Contains `security find-generic-password -s "tb.jira-token"` as fallback

### 5.4 Migration Script Completeness

- [ ] **Test:** Verify migrate-credentials.js lists all 4 services
  ```bash
  grep "SERVICES" /Users/ivarga/Projects/ai-toolbelt/scripts/migrate-credentials.js | head -1
  ```
  **Expected:** Array contains `tb.sentry-token`, `tb.github-session`, `tb.contentful-token`, `tb.jira-token`

---

## Results Summary

| Section | Tests | Passed | Failed | Skipped |
|---------|-------|--------|--------|---------|
| Static Audit | 23 | ___ | ___ | ___ |
| Section 1: Credential Resolution | 9 | ___ | ___ | ___ |
| Section 2: Setup Flows | 7 | ___ | ___ | ___ |
| Section 3: SKILL.md Auto-Detect | 13 | ___ | ___ | ___ |
| Section 4: Doctor Checks | 6 | ___ | ___ | ___ |
| Section 5: Integration Points | 5 | ___ | ___ | ___ |
| **Total** | **63** | ___ | ___ | ___ |

**Overall Result:** ___

**Tester:** ___
**Date Executed:** ___
**Notes:** ___
