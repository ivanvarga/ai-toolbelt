---
status: partial
phase: 24-paperclip-triage-pipeline
source: [24-VERIFICATION.md]
started: 2026-04-15T16:00:00Z
updated: 2026-04-15T16:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end smoke
expected: PR is draft-ready in GitHub after human approval in Paperclip UI; worktree persists until PR is merged
result: [pending]

Assign a GitHub issue to the configured user, confirm Paperclip triage routine fires, triage agent classifies, routes to oneshot or GSD agent, agent produces a worktree + draft PR, Paperclip human gate appears, approve, PR opens on GitHub. Requires live Paperclip server, GitHub webhook tunnel (smee.io), and configured Keychain entries.

### 2. PR-merge cleanup end-to-end
expected: Worktree directory gone from disk; dedup.json entry removed; relay logs cleaned:true
result: [pending]

Merge the draft PR from smoke above, confirm relay receives `pull_request.closed` webhook, worktree is removed from disk, dedup entry is cleared. Requires a real git worktree with worktreeName+worktreeCwd+prUrl written into dedup store by a running agent. Also exercises WR-03 (cleanup path needs dedup store update by the agent — that update path has no automated test).

### 3. SOUL.md tone review
expected: User approves or iterates on tone; this is a subjective judgment call
result: [pending]

Read `triage/SOUL.md`, `oneshot-coder/SOUL.md`, `gsd-orchestrator/SOUL.md` and confirm tone matches intended agent personality (D-23, explicitly Claude's discretion section).

### 4. Worktree adapter wiring
expected: Either templating works and nothing needs changing, OR wrapper is wired in and tested
result: [pending]

Confirm whether `{{issue.metadata.worktreeCwd}}` in `.paperclip.yaml` actually fails at Paperclip runtime. If so, edit `.paperclip.yaml` to point oneshot-coder and gsd-orchestrator at `scripts/tb-triage-worktree-wrapper.sh`. Plan 04 Summary documents that `{{issue.metadata.*}}` is unsupported in claude_local adapter config.cwd — but the `.paperclip.yaml` still contains the unsupported template.

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

- truth: "Relay routes triage:skip > triage:oneshot > triage:process priority correctly"
  status: resolved
  resolved_in: "20a28ed fix(24): WR-01 enforce tag priority skip > oneshot > process regardless of label order"
