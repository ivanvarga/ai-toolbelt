---
phase: 1
slug: plugin-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual validation (no automated test framework for plugin structure) |
| **Config file** | none |
| **Quick run command** | `claude plugin validate .` |
| **Full suite command** | `claude --plugin-dir ./ --debug 2>&1 \| head -50` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `claude plugin validate .`
- **After every plan wave:** Run `claude --plugin-dir ./ --debug 2>&1 \| grep -i "error\|loading plugin"`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PLUG-01 | smoke | `claude plugin validate .` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | PLUG-01 | smoke | `claude --plugin-dir ./ --debug 2>&1 \| grep -i "error\|loading plugin"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | PLUG-01 | smoke | `python3 -c "import json; json.load(open('.claude-plugin/marketplace.json'))"` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | PLUG-01 | smoke | `test -d skills && test -d agents && test -d hooks && test -d tools && test -d scripts && echo "PASS"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — validation uses built-in Claude Code CLI commands (`plugin validate`, `--debug` flag). No test framework needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin loads in Claude Code session | PLUG-01 | Requires interactive Claude Code session | Run `claude --plugin-dir ./` and verify `/tb:` namespace appears in skill list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
