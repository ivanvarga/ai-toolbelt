---
phase: 11
slug: mbridge-deploy-setup-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest >=9.0.2 |
| **Config file** | tools/mbridge/pyproject.toml (dev deps) |
| **Quick run command** | `cd tools/mbridge && uv run pytest tests/ -x` |
| **Full suite command** | `cd tools/mbridge && uv run pytest tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd tools/mbridge && uv run pytest tests/ -x`
- **After every plan wave:** Run `cd tools/mbridge && uv run pytest tests/` + smoke tests
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | MBRD-03/04/05/06 | smoke | `mbridge --version` | N/A | ⬜ pending |
| 11-01-02 | 01 | 1 | setup.js | smoke | `node tools/mbridge/setup.js` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | doctor | smoke | `bash scripts/checks/tool-mbridge.sh . \| wc -l` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 11 requirements are deployment/integration concerns validated via smoke tests, not unit tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `mbridge ui dump` succeeds on connected device | MBRD-03 | Requires physical/simulated device | Connect device, run `mbridge ui dump <DEVICE_ID>` |
| `mbridge action tap` works on device | MBRD-04 | Requires physical/simulated device | Connect device, run `mbridge action tap <DEVICE_ID> --text "OK"` |
| `mbridge ui find` works on device | MBRD-05 | Requires physical/simulated device | Connect device, run `mbridge ui find <DEVICE_ID> --text "OK"` |
| `mbridge verify text` works on device | MBRD-06 | Requires physical/simulated device | Connect device, run `mbridge verify text <DEVICE_ID> "OK"` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
