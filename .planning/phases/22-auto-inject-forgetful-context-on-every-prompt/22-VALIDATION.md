---
phase: 22
slug: auto-inject-forgetful-context-on-every-prompt
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (zero-dependency project, no test framework) |
| **Config file** | none |
| **Quick run command** | `echo '{"prompt":"test prompt","cwd":"/tmp"}' \| node hooks/user-prompt-context.js` |
| **Full suite command** | `bash scripts/checks/user-prompt-hook.sh . && echo '{"prompt":"test prompt","cwd":"/tmp"}' \| node hooks/user-prompt-context.js` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick smoke test (pipe test JSON to hook script)
- **After every plan wave:** Run doctor checks + manual verification
- **Before `/gsd:verify-work`:** Full manual verification checklist must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | CTXI-01 | smoke | `echo '{"prompt":"how does auth work"}' \| node hooks/user-prompt-context.js` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | CTXI-02 | smoke | Parse stdout, verify JSON + XML tags | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | CTXI-03 | smoke | Stop Forgetful, run hook, verify exit 0 + no output | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | CTXI-04 | smoke | `time echo '...' \| node hooks/user-prompt-context.js` | ❌ W0 | ⬜ pending |
| 22-01-05 | 01 | 1 | CTXI-05 | smoke | Run hook, verify filtered results (importance >= 7) | ❌ W0 | ⬜ pending |
| 22-01-06 | 01 | 1 | CTXI-06 | smoke | `echo '{"prompt":"/gsd:plan-phase test"}' \| node hooks/user-prompt-context.js` verify no output | ❌ W0 | ⬜ pending |
| 22-01-07 | 01 | 1 | CTXI-07 | smoke | Run hook twice, verify temp file exists | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | HOOK-01 | smoke | `python3 -c "import json; d=json.load(open('hooks/hooks.json')); print('UserPromptSubmit' in d['hooks'])"` | ✅ | ⬜ pending |
| 22-02-02 | 02 | 1 | HOOK-02 | smoke | `bash scripts/checks/user-prompt-hook.sh .` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 1 | HOOK-03 | manual-only | Simulate bug #12151 scenario | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `hooks/user-prompt-context.js` — main hook script (must exist before smoke tests)
- [ ] `scripts/checks/user-prompt-hook.sh` — doctor check script

*Existing infrastructure covers framework needs (no test framework to install).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings.json fallback registration | HOOK-03 | Requires simulating bug #12151 (plugin output discarded) which cannot be reproduced programmatically | 1. Remove UserPromptSubmit from hooks.json 2. Run bootstrap 3. Verify settings.json contains registration |
| End-to-end context injection | CTXI-01, CTXI-02 | Requires live Claude Code session to verify additionalContext is received by model | 1. Submit prompt in Claude Code 2. Ask Claude "what additional context was injected?" 3. Verify Forgetful memories appear |
| Bug #34713 false error labels | All | Cannot be tested without live Claude Code runtime | 1. Submit prompts, observe transcript for phantom "hook error" labels |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
