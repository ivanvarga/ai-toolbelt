---
phase: 2
slug: plugin-install-operations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + manual verification (no automated test framework in project) |
| **Config file** | none — shell scripts validated by execution |
| **Quick run command** | `claude plugin validate .` |
| **Full suite command** | manual: load plugin via `--plugin-dir ./`, invoke skills, check hook output |
| **Estimated runtime** | ~10 seconds (quick), ~60 seconds (full manual) |

---

## Sampling Rate

- **After every task commit:** Run `claude plugin validate .`
- **After every plan wave:** Load via `--plugin-dir ./` and verify skills + hook
- **Before `/gsd:verify-work`:** Full manual verification of all 4 requirements
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PLUG-05 | smoke | `bash hooks/session-start.sh` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PLUG-05 | manual | Start session, ask Claude "what tb skills are available?" | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | PLUG-03 | manual | `/tb:update` in Claude Code session | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | PLUG-04 | smoke | `bash scripts/checks/*.sh /path/to/plugin` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | PLUG-02 | manual | `claude plugin marketplace add . && claude plugin install tb@tb-marketplace` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `hooks/hooks.json` — SessionStart hook registration
- [ ] `hooks/session-start.sh` — hook script (must be executable)
- [ ] `skills/update/SKILL.md` — update skill definition
- [ ] `skills/doctor/SKILL.md` — doctor skill definition
- [ ] `scripts/checks/` — at least 3 check scripts for core validations
- [ ] `README.md` — install instructions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin installable from marketplace | PLUG-02 | Requires Claude Code CLI + fresh install flow | Run `claude plugin marketplace add ivarga/ai-toolbelt` then `claude plugin install tb@tb-marketplace` on clean machine |
| SessionStart injects skill inventory | PLUG-05 | Requires active Claude Code session to verify context injection | Start new session, ask Claude "what tb skills are available?" — Claude should list all /tb:* skills |
| Update pulls latest and shows changelog | PLUG-03 | Requires real git remote with changes | Make upstream change, run `/tb:update`, verify changelog shows diff |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
