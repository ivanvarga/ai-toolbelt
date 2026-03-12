---
phase: 4
slug: complex-skill-conversion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash check scripts + /skill-creator verification |
| **Config file** | scripts/checks/skills-valid.sh (exists) |
| **Quick run command** | `bash scripts/checks/skills-valid.sh .` |
| **Full suite command** | `/tb:doctor` (runs all check scripts) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash scripts/checks/skills-valid.sh .`
- **After every plan wave:** Run `/tb:doctor` + verify no `$HOME/.claude/` path references + `node --check` all .js helpers
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | MIGR-04 | unit | `node --check scripts/keychain.js` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | MIGR-04 | unit | `node --check scripts/sentry-api.js` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | MIGR-04 | unit | `node --check scripts/github-api.js` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | MIGR-02 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | MIGR-03 | unit | `grep -r '\$HOME/.claude' skills/pr-upload skills/sentry-investigate skills/sentry-sourcemaps && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 3 | MIGR-02 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 04-03-02 | 03 | 3 | MIGR-03 | unit | `grep -r '\$HOME/.claude' skills/task-jira skills/pr-describe skills/contentful skills/figma-component && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 3 | MIGR-02 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 04-04-02 | 04 | 3 | MIGR-03 | unit | `grep -r '\$HOME/.claude' skills/mobilecli && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verification script for `$HOME/.claude/` path references (grep-based, add to scripts/checks/)
- [ ] `node --check` validation for all .js helper scripts (syntax validation)

*Existing scripts/checks/skills-valid.sh covers frontmatter validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Each skill loads correctly in Claude Code | MIGR-02 | Requires interactive Claude Code session | Invoke `/tb:skill-name` and confirm skill loads |
| Keychain get/set/delete operations work | MIGR-04 | Requires macOS Keychain access | `node scripts/keychain.js set tb.test testval && node scripts/keychain.js get tb.test` |
| Skills with credentials check Keychain before proceeding | MIGR-04 | Requires interactive credential flow | Run skill without stored credential, verify prompt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
