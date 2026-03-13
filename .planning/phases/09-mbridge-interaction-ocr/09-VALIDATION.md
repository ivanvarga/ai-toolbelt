---
phase: 9
slug: mbridge-interaction-ocr
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest >=9.0.2 |
| **Config file** | none (uses pyproject.toml defaults) |
| **Quick run command** | `cd tools/mbridge && uv run pytest tests/ -x` |
| **Full suite command** | `cd tools/mbridge && uv run pytest tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd tools/mbridge && uv run pytest tests/ -x`
- **After every plan wave:** Run `cd tools/mbridge && uv run pytest tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 0 | MBRD-04 | unit | `cd tools/mbridge && uv run pytest tests/test_action.py -x` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 0 | MBRD-06 | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 01 | 1 | MBRD-04 | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_resolve_element -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 01 | 1 | MBRD-04 | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_swipe_coords -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 01 | 1 | MBRD-04 | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_type_escape -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 01 | 1 | MBRD-04 | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_android_text_encoding -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 01 | 1 | MBRD-04 | unit | `cd tools/mbridge && uv run pytest tests/test_action.py::test_unique_flag -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 02 | 1 | MBRD-06 | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_ocr_extraction -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 02 | 1 | MBRD-06 | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_verify_found -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 02 | 1 | MBRD-06 | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_verify_not_found -x` | ❌ W0 | ⬜ pending |
| 09-XX-XX | 02 | 1 | MBRD-06 | unit | `cd tools/mbridge && uv run pytest tests/test_verify.py::test_verify_exact -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_action.py` — stubs for MBRD-04 (tap/swipe/type command logic, element resolution, escape parsing, text encoding)
- [ ] `tests/test_verify.py` — stubs for MBRD-06 (OCR extraction, substring/exact match, output format)
- [ ] `pyproject.toml` — add pytesseract and Pillow to dependencies

*Wave 0 creates test files and installs dependencies before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual tap triggers UI response on device | MBRD-04 | Requires real device/simulator | Boot simulator, open app, run `mbridge action tap <device> 200 400`, verify visual response |
| Actual swipe scrolls content | MBRD-04 | Requires real device/simulator | Boot simulator, open scrollable view, run `mbridge action swipe <device> down`, verify scroll |
| OCR reads real device screen text | MBRD-06 | Requires Tesseract + real screenshot | Boot simulator, run `mbridge verify text <device> "Settings"`, verify correct detection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
