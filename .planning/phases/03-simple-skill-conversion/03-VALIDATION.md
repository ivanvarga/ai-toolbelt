---
phase: 3
slug: simple-skill-conversion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash check scripts + /tb:doctor |
| **Config file** | scripts/checks/skills-valid.sh |
| **Quick run command** | `bash scripts/checks/skills-valid.sh .` |
| **Full suite command** | `bash scripts/checks/skills-valid.sh . && echo "All checks passed"` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash scripts/checks/skills-valid.sh .`
- **After every plan wave:** Run `bash scripts/checks/skills-valid.sh .`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-01-03 | 01 | 1 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-01-04 | 01 | 1 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-02-03 | 02 | 2 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |
| 03-02-04 | 02 | 2 | MIGR-01 | unit | `bash scripts/checks/skills-valid.sh .` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. `scripts/checks/skills-valid.sh` already validates SKILL.md presence and frontmatter `name:` field.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Each skill invocable via /tb:skill-name | MIGR-01 | Requires interactive Claude Code session | Invoke `/tb:skill-name` and confirm skill loads |
| Behavior equivalence with original | MIGR-01 | Requires real command execution context | Compare output/behavior with original command |
| Original items removable | MIGR-01 | Requires removing files from ~/.claude | Remove originals, verify /tb:skill-name still works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
