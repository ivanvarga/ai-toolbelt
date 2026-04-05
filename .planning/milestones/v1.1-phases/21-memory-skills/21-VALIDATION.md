---
phase: 21
slug: memory-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual CLI verification (SKILL.md files) |
| **Config file** | none |
| **Quick run command** | `cat skills/load-context/SKILL.md && cat skills/save-findings/SKILL.md` |
| **Full suite command** | `claude --plugin-dir ./ -p "/tb:load-context test query"` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | SKILL-01 | manual | `cat skills/load-context/SKILL.md` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | SKILL-02 | manual | `cat skills/save-findings/SKILL.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `skills/load-context/SKILL.md` — skill definition for load-context
- [ ] `skills/save-findings/SKILL.md` — skill definition for save-findings

*Existing infrastructure covers MCP tool access (Forgetful server already configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| load-context query + refinement | SKILL-01 | Requires interactive conversation flow | Invoke `/tb:load-context`, enter query, verify memories displayed, test refinement |
| save-findings extraction + dedup | SKILL-02 | Requires GSD phase artifacts + Forgetful state | Run after phase completion, verify memories created, re-run to verify dedup |
| Obsolescence marking | SKILL-02 | Requires pre-existing memories to supersede | Save findings twice with overlapping content, verify older marked obsolete |

*All phase behaviors require manual verification due to interactive skill nature.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
