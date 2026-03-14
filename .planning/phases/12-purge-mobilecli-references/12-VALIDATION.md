---
phase: 12
slug: purge-mobilecli-references
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (mbridge Python tests) |
| **Config file** | tools/mbridge/pyproject.toml |
| **Quick run command** | `grep -rn mobilecli skills/ CLAUDE.md && exit 1 \|\| echo PASS` |
| **Full suite command** | `cd tools/mbridge && uv run pytest && grep -rn mobilecli skills/ CLAUDE.md && exit 1 \|\| echo PASS` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep -rn mobilecli skills/ CLAUDE.md && exit 1 || echo PASS`
- **After every plan wave:** Run `cd tools/mbridge && uv run pytest && grep -rn mobilecli skills/ CLAUDE.md && exit 1 || echo PASS`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | MBRD-07 | grep | `grep -rn mobilecli skills/pr-describe/ && exit 1 \|\| echo PASS` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | MBRD-07 | grep | `grep -rn mobilecli skills/pr-upload/ && exit 1 \|\| echo PASS` | ✅ | ⬜ pending |
| 12-01-03 | 01 | 1 | MBRD-07 | grep | `grep -rn mobilecli skills/pr-qa/ && exit 1 \|\| echo PASS` | ✅ | ⬜ pending |
| 12-01-04 | 01 | 1 | MBRD-07 | grep | `grep -rn mobilecli CLAUDE.md && exit 1 \|\| echo PASS` | ✅ | ⬜ pending |
| 12-01-05 | 01 | 1 | MBRD-07 | unit | `cd tools/mbridge && uv run pytest tests/ -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
