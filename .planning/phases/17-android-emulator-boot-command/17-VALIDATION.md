---
phase: 17
slug: android-emulator-boot-command
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2+ |
| **Config file** | `tools/mbridge/tests/conftest.py` |
| **Quick run command** | `cd tools/mbridge && uv run pytest tests/test_device.py -x` |
| **Full suite command** | `cd tools/mbridge && uv run pytest tests/ -x` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd tools/mbridge && uv run pytest tests/test_device.py -x`
- **After every plan wave:** Run `cd tools/mbridge && uv run pytest tests/ -x`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | D-01 | integration | `uv run pytest tests/test_device.py::test_device_list_available -x` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | D-16/D-17 | integration | `uv run pytest tests/test_device.py::test_device_boot_error_propagation -x` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 1 | D-02/D-04 | manual | Manual: requires emulator launch, 120s wait | N/A | ⬜ pending |
| 17-02-02 | 02 | 1 | D-08/D-09 | manual | Manual: requires emulator with known GPU issues | N/A | ⬜ pending |
| 17-03-01 | 03 | 1 | D-15 | manual | Manual: verify Simulator.app window appears | N/A | ⬜ pending |
| 17-04-01 | 04 | 1 | D-19/D-20 | manual | Manual: find element at screen edge, verify extra swipe | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_device.py::test_device_list_available` — stub for D-01 (--available flag)
- [ ] `tests/test_device.py::test_device_boot_error_propagation` — stub for D-16/D-17

*Existing infrastructure covers remaining requirements via manual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `device boot <avd>` launches emulator, waits for boot | D-02/D-04 | Requires real Android emulator process | Boot AVD, verify JSON result with boot time |
| GPU host→software fallback | D-08/D-09 | Requires emulator with GPU crash behavior | Boot on macOS Tahoe, verify fallback to `-gpu software` |
| iOS boot opens Simulator.app | D-15 | Requires macOS Simulator GUI | Boot iOS sim, verify Simulator.app window appears |
| swipe-to usable zone extra swipe | D-19/D-20 | Requires running app with edge-positioned elements | Find element at screen edge, verify extra swipe fires |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
