---
phase: 24
slug: paperclip-triage-pipeline
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
finalized: 2026-04-15
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node --test (Node 20+ built-in) |
| **Config file** | none |
| **Quick run command** | `node --test scripts/tests/<name>.test.js` |
| **Full suite command** | `node --test scripts/tests/` AND `bash scripts/tests/paperclip-symlink.test.sh` |
| **Estimated runtime** | ~10 seconds (full node suite + bash test; Wave 0 scaffold < 1s, relay suite ~3s, companies artifacts ~1s, cleanup ~1s, bash paperclip-symlink ~2s) |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/tests/*.test.js`
- **After every plan wave:** Run `node --test scripts/tests/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | D-Ref | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------|-----------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-T1 | 01 | 0 | D-05, D-06 | T1-01#1-4 | Fixtures contain no real PII | unit | node --test scripts/tests/scaffold.test.js | ✅ | ✅ green |
| 24-01-T2 | 01 | 0 | D-05, D-06, D-19 | T1-01#2-4 | HMAC uses timingSafeEqual | unit | node --test scripts/tests/scaffold.test.js | ✅ | ✅ green |
| 24-01-T3 | 01 | 0 | — | — | 4 subtests green | unit | node --test scripts/tests/scaffold.test.js | ✅ | ✅ green |
| 24-02-T1 | 02 | 1 | D-22 | T1-02#1 | Wrapper is 2-line exec; no logging | integration | diff vs scripts/resolve-credential.js output | ✅ | ✅ green |
| 24-02-T2 | 02 | 1 | D-06, D-14 | T1-02#2,4 | KEY_PATTERN rejects path traversal; store dir 0700, files 0600 | unit | node --test scripts/tests/tb-triage-dedup-store.test.js | ✅ | ✅ green |
| 24-02-T3 | 02 | 1 | D-19 | T1-02#3 | cwd validated is absolute + contains .git | unit | node --test scripts/tests/tb-triage-repo-map.test.js | ✅ | ✅ green |
| 24-03-T1 | 03 | 1 | D-04, D-06, D-10, D-25 | T1-03#1,5,6 | timingSafeEqual; KEY_PATTERN on output; pure string compare on tags | unit | node --test scripts/tests/relay-*-verify.test.js scripts/tests/relay-*-filter.test.js scripts/tests/triage-tag-override.test.js | ✅ | ✅ green |
| 24-03-T2 | 03 | 1 | D-05 | T1-03#3 | Outbound signature format verified by round-trip; 10s timeout | unit | node --test scripts/tests/relay-paperclip-fire.test.js | ✅ | ✅ green |
| 24-03-T3 | 03 | 1 | D-04, D-05, D-06 | T1-03#2,4,7,8 | Raw-body HMAC order; no secret logging; 1 MB body cap; no URL deref | static | grep checks on relay.js for MAX_BODY, timingSafeEqual, log shape | ✅ | ✅ green |
| 24-04-T1 | 04 | 2 | D-01, D-02, D-03, D-12 | T1-04#2 | No inline secret values in .paperclip.yaml | unit | node --test scripts/tests/companies-artifacts.test.js | ✅ | ✅ green |
| 24-04-T2 | 04 | 2 | D-07, D-08, D-09, D-10, D-11, D-18, D-21, D-23, D-25, D-26 | T1-04#1,3 | "untrusted" guidance present; branch names built from dedupKey | unit | node --test scripts/tests/companies-artifacts.test.js | ✅ | ✅ green |
| 24-04-T3 | 04 | 2 | D-13, D-16, D-17, D-18, D-20, D-21, D-23 | T1-04#3 | Coder AGENTS.md references pr-submit; worktree binding; changes_requested flow | unit | node --test scripts/tests/companies-artifacts.test.js | ✅ | ✅ green |
| 24-05-T1 | 05 | 2 | D-15 | T1-05#1-4 | execFile (no shell); worktreeCwd under .claude/worktrees/ validated; entry kept on failure | unit | node --test scripts/tests/cleanup-on-merge.test.js | ✅ | ✅ green |
| 24-05-T2 | 05 | 2 | D-15 | — | Relay routing dispatches pull_request to cleanup | unit | node --test scripts/tests/relay-pr-cleanup.test.js | ✅ | ✅ green |
| 24-06-T1 | 06 | 2 | D-24 | T1-06#1,2 | Double-quoted paths; `-n` guard on PAPERCLIP_ROOT; idempotent | integration | bash scripts/tests/paperclip-symlink.test.sh | ✅ | ✅ green |
| 24-06-T2 | 06 | 2 | D-13 | T1-06#3 | Worktree name regex-validated; quoted interpolations | static | `bash -n` + grep checks | ✅ | ✅ green |
| 24-07-T1 | 07 | 3 | D-05, D-11, D-16, D-18, D-22, D-24 | T1-07#1-4 | Doc names Keychain entries only (no inline values); mandates openssl rand -hex 32; smee.io dev-only caveat; rotate section | static | grep checks on docs/paperclip-triage-setup.md | ✅ | ✅ green |
| 24-07-T2 | 07 | 3 | — | — | Frontmatter flipped; map populated | static | grep `nyquist_compliant: true` | ✅ | ✅ green |

*Key: T1-{planNN}-{task}#{threat-number} references the `<threat_model>` entries in each plan. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `scripts/tests/` directory created with shared fixtures (captured smee.io webhook payloads for GitHub + Jira)
- [x] `scripts/tests/fixtures/github-issues-assigned.json` — representative `issues.assigned` webhook payload
- [x] `scripts/tests/fixtures/jira-issue-updated-assigned.json` — representative Jira `jira:issue_updated` payload
- [x] `scripts/tests/helpers/paperclip-signature.js` — HMAC helper matching Paperclip's `X-Paperclip-Signature` format (`timestamp.body` SHA-256)
- [x] `scripts/tests/helpers/dedup-store.js` — in-memory stub of the JSON sidecar at `~/.paperclip/tb-triage/`
- [x] Node 20+ built-in `node --test` (no install needed; Wave 0 confirmed)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end GitHub webhook → triage → worktree → PR flow | D-04, D-05, D-13, D-17 | Requires live GitHub repo + Paperclip server + smee.io tunnel; automatable only as expensive E2E | Setup-doc walkthrough: assign test issue → observe Paperclip task card → approve → confirm PR opens |
| Jira webhook path (same flow via Jira) | D-05 | Live Jira Cloud tenant required | Parallel walkthrough using Jira ticket |
| Paperclip human-gate UI (approve / request-changes = re-queue-with-feedback) | D-11, D-16, D-18 | UI interaction; no headless test available | Manually click approve; then test reject flow with feedback and verify re-queued task carries feedback in context |
| Worktree cleanup on PR merge | D-15 | Requires real `pull_request.closed` webhook | Merge test PR on GitHub; confirm relay receives event; confirm worktree deleted |
| Tag override routing (`triage:oneshot` / `triage:process` / `triage:skip`) | D-10, D-25 | Need live issue with label | Apply label on source issue; confirm triage agent bypasses classifier |
| `bin/resolve-credential` flow for agents (D-22) | D-22 | Depends on macOS Keychain state | Run dispatched agent; confirm credential resolved without prompt |
| SOUL.md tone review (D-23) | D-23 | Subjective taste decision | User reads triage/oneshot/orchestrator SOUL.md drafts and approves / asks for revision |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (fixtures, helpers)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter after planner completes per-task map

**Approval:** planner-approved 2026-04-15
