---
phase: 23
slug: adopt-playwright-cli-and-visualize-changes-into-tb-plugin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash (scripts/checks/skills-valid.sh) |
| **Config file** | none — existing validation script |
| **Quick run command** | `bash scripts/checks/skills-valid.sh` |
| **Full suite command** | `bash scripts/checks/skills-valid.sh` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash scripts/checks/skills-valid.sh`
- **After every plan wave:** Run `bash scripts/checks/skills-valid.sh`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | TBD | — | N/A | integration | `bash scripts/checks/skills-valid.sh` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| tb:browser skill loads correctly | D-01 | Requires Claude Code runtime | Run `/tb:browser` and verify skill loads |
| tb:change-map skill loads correctly | D-02 | Requires Claude Code runtime | Run `/tb:change-map` and verify skill loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
