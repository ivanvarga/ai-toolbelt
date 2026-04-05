---
phase: 19
slug: gsd-workflow-patches
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + node (integration scripts) |
| **Config file** | none — patch scripts are self-contained |
| **Quick run command** | `bash -n patches/*.sh && node --check scripts/gsd-*.js` |
| **Full suite command** | `bash -n patches/*.sh && node --check scripts/gsd-*.js && bash patches/test-patches.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash -n patches/*.sh && node --check scripts/gsd-*.js`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | GPATCH-05 | integration | `bash patches/test-patches.sh` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | GPATCH-01 | integration | `bash patches/apply-new-project.sh --dry-run` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | GPATCH-02 | integration | `bash patches/apply-discuss-phase.sh --dry-run` | ❌ W0 | ⬜ pending |
| 19-02-03 | 02 | 1 | GPATCH-03 | integration | `bash patches/apply-plan-phase.sh --dry-run` | ❌ W0 | ⬜ pending |
| 19-02-04 | 02 | 1 | GPATCH-04 | integration | `bash patches/apply-complete-milestone.sh --dry-run` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 2 | GPATCH-06 | integration | `bash patches/reapply-all.sh --dry-run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `patches/test-patches.sh` — integration test harness for patch apply/verify
- [ ] `scripts/gsd-*.js` — helper scripts syntax-checked via node --check

*Existing infrastructure covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Forgetful memories surface during discuss-phase | GPATCH-02 | Requires active Forgetful MCP server with data | Run `/gsd:discuss-phase` on a project with saved memories, verify context block appears |
| Milestone save prompts user for approval | GPATCH-04 | Requires Claude MCP tool interaction | Run `/gsd:complete-milestone`, verify save candidates are presented |
| Patches survive GSD update | GPATCH-06 | Requires actual GSD update cycle | Run `/gsd:update`, then `/gsd:reapply-patches`, verify patches still applied |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
