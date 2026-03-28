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
| 17-01-01 | 01 | 1 | BOOT-01 | integration | `uv run pytest tests/test_device.py::test_device_list_available -x` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | BOOT-02 | manual | Manual: requires emulator launch, GPU failure scenario | N/A | ⬜ pending |
| 17-01-03 | 01 | 1 | BOOT-03 | manual | Manual: requires real emulator boot, 120s wait | N/A | ⬜ pending |
| 17-01-04 | 01 | 1 | BOOT-04 | manual | Manual: verify Simulator.app window appears | N/A | ⬜ pending |
| 17-01-05 | 01 | 1 | BOOT-05 | integration | `uv run pytest tests/test_device.py::test_device_boot_error_propagation -x` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 2 | BOOT-06 | manual | Manual: find element at screen edge, verify extra swipe | N/A | ⬜ pending |
| 17-02-02 | 02 | 2 | BOOT-07 | manual | Manual: review SKILL.md for completeness | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_device.py::test_device_list_available` — stub for BOOT-01 (--available flag)
- [ ] `tests/test_device.py::test_device_boot_error_propagation` — stub for BOOT-05

*Existing infrastructure covers remaining requirements via manual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Emulator boot with GPU fallback | BOOT-02 | Requires physical emulator launch and GPU failure | 1. Run `mbridge device boot Medium_Phone_API_36.1` 2. Verify emulator window opens 3. Check result JSON has `gpu_mode` field |
| Boot-wait polling with timeout | BOOT-03 | Requires real emulator boot (120s) | 1. Boot emulator via mbridge 2. Verify boot completes within timeout 3. Test `--timeout 10` for timeout error |
| iOS boot opens Simulator.app | BOOT-04 | Requires macOS with iOS simulator | 1. Run `mbridge device boot <sim-id>` 2. Verify Simulator.app window appears |
| swipe-to extra swipe at edge | BOOT-06 | Requires running app with scrollable content | 1. Find element at screen edge via swipe-to 2. Verify extra swipe brings element into view |
| SKILL.md documentation | BOOT-07 | Human review of documentation quality | 1. Read SKILL.md 2. Verify Android emulator boot section exists with examples |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
