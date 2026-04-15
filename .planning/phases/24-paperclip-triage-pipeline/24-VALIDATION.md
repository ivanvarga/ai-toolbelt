---
phase: 24
slug: paperclip-triage-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node --test (Node 20+ built-in) |
| **Config file** | none — Wave 0 installs `scripts/tests/` directory + run scripts |
| **Quick run command** | `node --test scripts/tests/*.test.js` |
| **Full suite command** | `node --test scripts/tests/` |
| **Estimated runtime** | ~{TBD} seconds (planner fills after Wave 0) |

---

## Sampling Rate

- **After every task commit:** Run `node --test scripts/tests/*.test.js`
- **After every plan wave:** Run `node --test scripts/tests/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {TBD} | {TBD} | {TBD} | {derived from CONTEXT.md D-XX} | {TBD} | {TBD} | {unit/integration} | {TBD} | ❌ W0 | ⬜ pending |

*Planner populates this table per task during planning. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/tests/` directory created with shared fixtures (captured smee.io webhook payloads for GitHub + Jira)
- [ ] `scripts/tests/fixtures/github-issue-assigned.json` — representative `issues.assigned` webhook payload
- [ ] `scripts/tests/fixtures/jira-issue-assigned.json` — representative Jira `jira:issue_updated` payload
- [ ] `scripts/tests/fixtures/paperclip-signature.js` — HMAC helper matching Paperclip's `X-Paperclip-Signature` format (`timestamp.body` SHA-256)
- [ ] `scripts/tests/helpers/dedup-store.js` — in-memory stub of the JSON sidecar at `~/.paperclip/tb-triage/`
- [ ] Node 20+ built-in `node --test` (no install needed; Wave 0 confirms)

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (fixtures, helpers)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter after planner completes per-task map

**Approval:** pending
