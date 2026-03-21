---
phase: 16
slug: mbridge-testing-and-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (existing) + subprocess-based integration tests |
| **Config file** | tools/mbridge/tests/ (existing test directory) |
| **Quick run command** | `cd tools/mbridge && python -m pytest tests/ -x -q` |
| **Full suite command** | `cd tools/mbridge && python -m pytest tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd tools/mbridge && python -m pytest tests/ -x -q`
- **After every plan wave:** Run `cd tools/mbridge && python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | TBD | integration | `cd tools/mbridge && python -m pytest tests/ -x -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tools/mbridge/tests/` — integration test stubs replacing old unit tests
- [ ] Existing pytest infrastructure covers framework needs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real device interaction | TBD | Requires physical iOS/Android device | Connect device, run mbridge commands, verify output |
| Scroll container visibility | TBD | Platform-specific UI behavior | Test with scrollable views on both platforms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
