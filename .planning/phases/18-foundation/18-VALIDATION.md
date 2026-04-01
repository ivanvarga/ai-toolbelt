---
phase: 18
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None -- no test framework; validation via direct script execution (smoke tests) |
| **Config file** | none |
| **Quick run command** | `bash scripts/checks/<check>.sh .` |
| **Full suite command** | `bash scripts/checks/gsd-installed.sh . && bash scripts/checks/forgetful-mcp.sh . && bash scripts/checks/forgetful-plugin.sh . && node scripts/forgetful-client.js health` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run the relevant check script directly (< 1 second each)
- **After every plan wave:** Run all 3 checks + forgetful-client health check
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | FNDTN-01 | smoke | `bash scripts/checks/gsd-installed.sh .` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | FNDTN-02 | smoke | `bash scripts/checks/forgetful-mcp.sh .` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 1 | FNDTN-03 | smoke | `bash scripts/checks/forgetful-plugin.sh .` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 2 | FNDTN-04 | smoke | `node scripts/forgetful-client.js health` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/checks/gsd-installed.sh` — GSD installation check script
- [ ] `scripts/checks/forgetful-mcp.sh` — Forgetful HTTP endpoint reachability check
- [ ] `scripts/checks/forgetful-plugin.sh` — forgetful-plugin installation check
- [ ] `scripts/forgetful-client.js` with `health` subcommand — MCP session + tool call verification

*Existing infrastructure does not cover phase requirements — all scripts are new deliverables.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Doctor skill shows Integration category | FNDTN-01,02,03 | Requires Claude Code skill invocation | Run `/tb:doctor` and verify Integration category appears with 3 checks |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
