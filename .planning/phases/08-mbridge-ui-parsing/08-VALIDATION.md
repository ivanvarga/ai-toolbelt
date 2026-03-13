---
phase: 8
slug: mbridge-ui-parsing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (standard for Python CLI tools) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd tools/mbridge && uv run pytest tests/ -x -q` |
| **Full suite command** | `cd tools/mbridge && uv run pytest tests/ -v` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd tools/mbridge && uv run pytest tests/ -x -q`
- **After every plan wave:** Run `cd tools/mbridge && uv run pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | MBRD-03 | setup | `uv run pytest tests/ -x -q` | No — W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | MBRD-03 | unit | `uv run pytest tests/test_ios_parser.py -x` | No — W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | MBRD-03 | unit | `uv run pytest tests/test_android_parser.py -x` | No — W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | MBRD-03 | unit | `uv run pytest tests/test_normalize.py -x` | No — W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | MBRD-05 | unit | `uv run pytest tests/test_query.py::test_find_by_id -x` | No — W0 | ⬜ pending |
| 08-02-02 | 02 | 2 | MBRD-05 | unit | `uv run pytest tests/test_query.py::test_find_by_text -x` | No — W0 | ⬜ pending |
| 08-02-03 | 02 | 2 | MBRD-05 | unit | `uv run pytest tests/test_query.py::test_find_by_xpath -x` | No — W0 | ⬜ pending |
| 08-02-04 | 02 | 2 | MBRD-05 | unit | `uv run pytest tests/test_query.py::test_find_by_type -x` | No — W0 | ⬜ pending |
| 08-02-05 | 02 | 2 | MBRD-05 | unit | `uv run pytest tests/test_query.py::test_combined_filters -x` | No — W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | MBRD-03 | integration | manual (requires simulator/emulator) | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tools/mbridge/tests/__init__.py` — package init
- [ ] `tools/mbridge/tests/test_ios_parser.py` — iOS JSON parsing with fixture data
- [ ] `tools/mbridge/tests/test_android_parser.py` — Android XML parsing with fixture data
- [ ] `tools/mbridge/tests/test_query.py` — element finding (id, text, xpath, type, combined)
- [ ] `tools/mbridge/tests/test_normalize.py` — type mapping, visibility, bounds computation
- [ ] `tools/mbridge/tests/fixtures/` — sample idb JSON and uiautomator XML files
- [ ] pytest added to pyproject.toml `[project.optional-dependencies]` dev group
- [ ] Framework install: `cd tools/mbridge && uv add --dev pytest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `mbridge ui dump <device_id>` produces normalized JSON on iOS | MBRD-03 | Requires running iOS simulator with idb | Boot simulator, launch app, run `mbridge ui dump <udid>`, verify JSON output |
| `mbridge ui dump <device_id>` produces normalized JSON on Android | MBRD-03 | Requires running Android emulator with adb | Boot emulator, launch app, run `mbridge ui dump <serial>`, verify JSON output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
