---
phase: 14
slug: per-project-credential-scoping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project) |
| **Config file** | None |
| **Quick run command** | `node scripts/resolve-org.js` (smoke test) |
| **Full suite command** | `claude --plugin-dir ./ /tb:doctor` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Lint check (`npm run lint:fix` + `npm run lint`)
- **After every plan wave:** Run `claude --plugin-dir ./ /tb:doctor`
- **Before `/gsd:verify-work`:** Full doctor must be green + manual skill invocation
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | resolve-org | manual-only | `cd /tmp && git init t && cd t && git remote add origin git@github.com:test-org/repo.git && node scripts/resolve-org.js` | N/A | ⬜ pending |
| 14-01-02 | 01 | 1 | resolve-credential | manual-only | `node scripts/resolve-credential.js tb.sentry-token` | N/A | ⬜ pending |
| 14-02-01 | 02 | 1 | setup org-awareness | manual-only | Run setup.js from project directory, verify org detection | N/A | ⬜ pending |
| 14-03-01 | 03 | 2 | SKILL.md migration | manual-only | Invoke skill in Claude Code, verify credential resolves | N/A | ⬜ pending |
| 14-04-01 | 04 | 2 | doctor checks | manual-only | Run `/tb:doctor` from project directory | N/A | ⬜ pending |
| 14-05-01 | 05 | 3 | migration script | manual-only | Run `node scripts/migrate-credentials.js` interactively | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — all verification is manual per established project pattern (Phases 5 and 13 used the same approach).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Org detection from SSH remote | resolve-org | Requires actual git repo with remote | Create temp repo with SSH remote, run resolve-org.js |
| Org detection from HTTPS remote | resolve-org | Requires actual git repo with remote | Create temp repo with HTTPS remote, run resolve-org.js |
| Credential org-scoped resolution | resolve-credential | Requires Keychain entries | Store test entry, verify resolution order |
| Credential global fallback | resolve-credential | Requires Keychain entries | Remove org-scoped, verify global used |
| Setup stores to org-scoped key | setup-credential | Requires interactive TTY | Run setup from project dir, verify keychain entry |
| --global flag bypasses org | setup-credential | Requires interactive TTY | Run setup with --global, verify global key |
| Doctor reports org status | doctor checks | Requires Keychain entries | Run doctor from project dir |
| Migration discovers orgs | migration | Requires filesystem with repos | Run migration script interactively |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
