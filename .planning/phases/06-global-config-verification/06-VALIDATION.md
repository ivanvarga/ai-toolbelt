---
phase: 6
slug: global-config-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | /skill-creator (external Claude Code skill) + bash assertions |
| **Config file** | .planning/config.json (`skill_creator_verification: true`) |
| **Quick run command** | Invoke /skill-creator on individual SKILL.md |
| **Full suite command** | Sequential /skill-creator on all 18 skills + /tb:doctor |
| **Estimated runtime** | ~120 seconds per skill verification |

---

## Sampling Rate

- **After every task commit:** Run affected doctor check or /skill-creator verification
- **After every plan wave:** Run /tb:doctor for full check suite
- **Before `/gsd:verify-work`:** All 18 skills pass /skill-creator, /tb:doctor shows all PASS
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | CONF-01 | manual | `test -f config/CLAUDE.md` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | CONF-01 | manual | Run /tb:update, verify `~/.claude/CLAUDE.md` matches | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | CONF-01 | manual | Run /tb:doctor, check global-config result | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | MIGR-05 | manual | /skill-creator per skill | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `config/CLAUDE.md` — source file (copy from ~/.claude/CLAUDE.md)
- [ ] `scripts/checks/global-config.sh` — doctor check for config sync

*These are created by plan tasks, not pre-existing infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Update skill copies config/CLAUDE.md to ~/.claude/ | CONF-01 | Requires running /tb:update in a live Claude Code session | Run /tb:update, then `cmp -s config/CLAUDE.md ~/.claude/CLAUDE.md` |
| All 18 skills pass /skill-creator | MIGR-05 | /skill-creator is an interactive external skill | Run /skill-creator on each skill, observe pass/fail |
| Doctor detects config desync | CONF-01 | Requires modifying ~/.claude/CLAUDE.md then running /tb:doctor | Modify target file, run /tb:doctor, verify FAIL + fix instructions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
