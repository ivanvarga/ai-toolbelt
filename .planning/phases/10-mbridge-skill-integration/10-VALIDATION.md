---
phase: 10
slug: mbridge-skill-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell smoke tests + plugin load verification |
| **Config file** | none — shell scripts only |
| **Quick run command** | `test -f skills/mbridge/SKILL.md && grep -q "^name: mbridge" skills/mbridge/SKILL.md` |
| **Full suite command** | `claude --plugin-dir . --debug` then invoke `/tb:mbridge` |
| **Estimated runtime** | ~5 seconds (smoke), ~30 seconds (full load) |

---

## Sampling Rate

- **After every task commit:** Run quick smoke command
- **After every plan wave:** Full plugin load test
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | MBRD-07 | smoke | `test -f skills/mbridge/SKILL.md && grep -q "^name: mbridge" skills/mbridge/SKILL.md` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | MBRD-07 | smoke | `bash hooks/session-start.sh \| grep -q mbridge` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | MBRD-07 | smoke | `bash scripts/checks/tool-mbridge.sh .` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `skills/mbridge/SKILL.md` — primary skill deliverable for MBRD-07
- [ ] `scripts/checks/tool-mbridge.sh` — doctor check script (if included)

*Wave 0 creates the files that downstream tasks verify against.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-step mobile interaction via skill | MBRD-07 | Requires simulator + real app | Load plugin, invoke `/tb:mbridge`, run navigate→tap→verify sequence |
| Context/cache integration with mobilecli | MBRD-07 | Requires app-specific knowledge | Verify `.mbridge/config.json` persists device/bundle settings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
