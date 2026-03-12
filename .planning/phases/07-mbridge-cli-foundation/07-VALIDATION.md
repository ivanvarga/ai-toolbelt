---
phase: 7
slug: mbridge-cli-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual integration tests (user decision: no unit tests) |
| **Config file** | none — manual checklist |
| **Quick run command** | `mbridge --help && mbridge device list` |
| **Full suite command** | Manual: run all commands against available environments |
| **Estimated runtime** | ~10 seconds (quick), ~60 seconds (full manual) |

---

## Sampling Rate

- **After every task commit:** Run `mbridge --help && mbridge device list`
- **After every plan wave:** Run full command set against available environments
- **Before `/gsd:verify-work`:** All commands verified on at least iOS simulator + Android device/emulator
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | MBRD-01 | manual | `cd tools/mbridge && uv tool install . --force && mbridge --help` | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | MBRD-01 | manual | `mbridge --help && mbridge device --help && mbridge app --help` | N/A | ⬜ pending |
| 07-02-01 | 02 | 1 | MBRD-02 | manual | `mbridge device list --platform ios` | N/A | ⬜ pending |
| 07-02-02 | 02 | 1 | MBRD-02 | manual | `mbridge device list --platform android` | N/A | ⬜ pending |
| 07-02-03 | 02 | 1 | MBRD-02 | manual | `mbridge device list` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

User explicitly chose integration-only testing with manual verification. No test framework to set up.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CLI installs via uv tool install | MBRD-01 | Requires global tool installation | `cd tools/mbridge && uv tool install . --force && mbridge --help` |
| Click command structure with help | MBRD-01 | Verify help text is generated | `mbridge --help`, `mbridge device --help`, `mbridge app --help` |
| iOS simulator discovery | MBRD-02 | Requires running iOS simulator | `mbridge device list --platform ios` — verify JSON output with correct fields |
| Android device discovery | MBRD-02 | Requires connected Android device/emulator | `mbridge device list --platform android` — verify JSON output with correct fields |
| Combined device list | MBRD-02 | Requires both platforms available | `mbridge device list` — verify both platforms in output |
| Device info with screen dimensions | MBRD-02 | Requires booted device | `mbridge device info <device_id>` — verify screen width/height/scale fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
