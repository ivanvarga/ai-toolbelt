---
phase: 13
slug: attachment-documenter-agent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell commands (file existence + content grep) |
| **Config file** | none |
| **Quick run command** | `ls agents/attachment-documenter.md && grep "subagent_type.*attachment-documenter" skills/task-jira/SKILL.md` |
| **Full suite command** | `ls agents/attachment-documenter.md && ls skills/attachment-documenter/SKILL.md && grep -c "attachment-documenter" skills/task-jira/SKILL.md skills/sentry-investigate/SKILL.md skills/task-github/SKILL.md skills/pr-read/SKILL.md && ! test -f ~/.claude/agents/attachment-documenter.md && ! test -d ~/.claude/skills/attachment-documenter/` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `ls agents/attachment-documenter.md && grep -c "attachment-documenter" skills/task-jira/SKILL.md skills/sentry-investigate/SKILL.md skills/task-github/SKILL.md skills/pr-read/SKILL.md`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | MIGR-02 | smoke | `ls agents/attachment-documenter.md && head -10 agents/attachment-documenter.md` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | MIGR-02 | smoke | `ls skills/attachment-documenter/SKILL.md && head -5 skills/attachment-documenter/SKILL.md` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | MIGR-02 | smoke | `grep "subagent_type.*attachment-documenter" skills/task-jira/SKILL.md skills/sentry-investigate/SKILL.md skills/task-github/SKILL.md skills/pr-read/SKILL.md` | ✅ | ⬜ pending |
| 13-01-04 | 01 | 1 | MIGR-02 | smoke | `! test -f ~/.claude/agents/attachment-documenter.md && ! test -d ~/.claude/skills/attachment-documenter/` | ✅ | ⬜ pending |
| 13-01-05 | 01 | 1 | MIGR-02 | smoke | `test -f agents/attachment-documenter.md && ! test -f agents/attachment-documenter/.gitkeep` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | INT-03 | manual-only | Load plugin with `claude --plugin-dir ./`, verify attachment-documenter appears | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `agents/attachment-documenter.md` — agent definition file (core deliverable)
- [ ] `skills/attachment-documenter/SKILL.md` — orchestrating skill (core deliverable)
- [ ] All verification is file-existence and content-grep based; no test framework install needed

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent invocable at runtime | INT-03 | Requires interactive Claude Code session | Load plugin with `claude --plugin-dir ./`, run `/agents` to verify attachment-documenter appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
