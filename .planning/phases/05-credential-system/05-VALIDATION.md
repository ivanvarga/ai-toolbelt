---
phase: 5
slug: credential-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash scripts (doctor check pattern) |
| **Config file** | none — check scripts are self-contained |
| **Quick run command** | `bash scripts/checks/cred-sentry.sh .` |
| **Full suite command** | `for f in scripts/checks/cred-*.sh; do bash "$f" .; done` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run relevant `bash scripts/checks/cred-*.sh .`
- **After every plan wave:** Run `for f in scripts/checks/cred-*.sh; do bash "$f" .; done`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CRED-05 | unit | `node -e "require('./scripts/setup-credential')"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | CRED-04 | smoke | `bash scripts/checks/cred-github.sh .` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | CRED-02 | smoke | `bash scripts/checks/cred-sentry.sh .` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | CRED-03 | smoke | `bash scripts/checks/cred-contentful.sh .` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | CRED-01 | smoke | `bash scripts/checks/cred-acli.sh .` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | CRED-04 | smoke | `bash scripts/checks/cred-github.sh .` | W0 dep | ⬜ pending |
| 05-02-02 | 02 | 2 | CRED-02 | smoke | `bash scripts/checks/cred-sentry.sh .` | W0 dep | ⬜ pending |
| 05-02-03 | 02 | 2 | CRED-03 | smoke | `bash scripts/checks/cred-contentful.sh .` | W0 dep | ⬜ pending |
| 05-02-04 | 02 | 2 | CRED-01 | smoke | `bash scripts/checks/cred-acli.sh .` | W0 dep | ⬜ pending |
| 05-03-01 | 03 | 3 | CRED-05 | manual-only | Verify SKILL.md auto-detect pattern | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/checks/cred-github.sh` — checks tb.github-session in Keychain
- [ ] `scripts/checks/cred-sentry.sh` — checks tb.sentry-token in Keychain
- [ ] `scripts/checks/cred-contentful.sh` — checks tb.contentful-token in Keychain
- [ ] `scripts/checks/cred-acli.sh` — checks acli installed + authenticated

*Existing infrastructure (keychain.js, doctor check pattern) covers framework needs. Wave 0 creates only the check scripts.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SKILL.md auto-detect pattern | CRED-05 | SKILL.md content is read by Claude, not executable in isolation | Verify each credential-needing SKILL.md has Prerequisites section with keychain check + setup fallback |
| Setup-all runs all setups in sequence | CRED-05 | Interactive prompting requires TTY | Run `node scripts/setup-all.js` and verify it prompts for each missing credential |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
