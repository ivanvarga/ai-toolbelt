---
phase: 24-paperclip-triage-pipeline
fixed_at: 2026-04-15T00:00:00Z
review_path: .planning/phases/24-paperclip-triage-pipeline/24-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-04-15T00:00:00Z
**Source review:** .planning/phases/24-paperclip-triage-pipeline/24-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (critical_warning — all 6 warnings)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: Tag-override priority bug — `skip` loses to earlier labels

**Files modified:** `scripts/tb-triage/relay-filters.js`, `scripts/tests/triage-tag-override.test.js`
**Commit:** 20a28ed
**Applied fix:** Replaced array-order iteration in `extractTriageTag` with a
`TAG_PRIORITY` lookup (`skip > oneshot > process`). Set of label names is
collected first, then priority array is walked in contract order. Added three
new test cases proving priority holds regardless of input array order:
`[oneshot, skip]`, `[process, oneshot]`, and 3-label combos in multiple orders.
All 68 tests pass (was 65; +3 new).

### WR-02: Dedup store has TOCTOU between check and insert on concurrent webhooks

**Files modified:** `scripts/tb-triage/dedup-store.js`, `scripts/tb-triage/relay.js`, `scripts/tests/helpers/dedup-store.js`, `scripts/tests/tb-triage-dedup-store.test.js`
**Commit:** 96557d2
**Applied fix:** Added `upsert(key, value)` and `update(key, partial)` primitives
to `dedup-store.js`. Preserved existing `insert` idempotent semantics (test relies
on it). GitHub and Jira handlers now synchronously `insert` an `{inflight:true}`
marker BEFORE firing the Paperclip routine; on success, `upsert` overwrites with
the runId payload; on failure, `remove` clears the marker so a retry can proceed.
Aligned test helper (`scripts/tests/helpers/dedup-store.js`) to prod `insert`
(was always-overwrite) and added matching `upsert`/`update`. Added 3 tests
covering `upsert` overwrite, `update` merge, and `update` throwing on missing key.
All 71 tests pass.

### WR-03: Relay dedup entry missing fields cleanup needs

**Files modified:** `companies/triage-shop/agents/triage/AGENTS.md`, `scripts/tests/cleanup-on-merge.test.js`
**Commit:** c750ceb
**Applied fix:** The `update()` primitive was already added in WR-02. Amended
Step 5 of the triage AGENTS.md to document the explicit handoff: after patching
`issue.metadata.{worktreeName,worktreeCwd}`, the triage agent must also call
`dedup-store.update(dedupKey, {worktreeName, worktreeCwd, prUrl})` so the
PR-merge cleanup path has the fields it needs. Added a dedicated end-to-end
test that inserts the 3-field relay shape, runs `update()` with the worktree
fields, then verifies `removeWorktreeForPr` returns `cleaned:true` and
invokes `git worktree remove` with the correct args. All 72 tests pass.

### WR-04: repo-map.js CLI drops space-separated flags

**Files modified:** `scripts/tb-triage/repo-map.js`, `scripts/tests/tb-triage-repo-map.test.js`
**Commit:** 50edf3b
**Applied fix:** Extracted arg parser into exported `parseCliFlags()` and rewrote
it to accept both `--key=value` and `--key value` forms. Bare `--flag` becomes
`true`. Updated usage string. Added 4 new test cases: equals form, space form,
mixed form, bare flag. AGENTS.md invocation (`--source <gh|jira>`) now works.
All 76 tests pass.

### WR-05: relay.js HTTP handler swallows all unhandled errors

**Files modified:** `scripts/tb-triage/relay.js`
**Commit:** 05ecba9
**Applied fix:** Replaced the `.catch(() => {})` top-level suppressor with a
handler that logs the error as `{status:500, fatal:true}`, attempts `reply(res,
500, ...)` when headers aren't sent yet, and falls back to `res.destroy()`
otherwise. Socket no longer dangles; errors surface in structured logs.
All 76 tests pass.

### WR-06: launchd plist hardcodes /usr/local/bin/node

**Files modified:** `docs/paperclip-triage-setup.md`
**Commit:** f3b1695
**Applied fix:** Replaced hardcoded `/usr/local/bin/node` with an Apple
Silicon-first template (`/opt/homebrew/bin/node`) prefixed by a "First, resolve
your node path" block showing the output of `which node` across Apple Silicon,
Intel, nvm, and asdf setups. Added verification step using `launchctl print
gui/$UID/com.ai-toolbelt.tb-triage`. Explicit call-out that launchd does not
use shell PATH. All 76 tests pass.

---

_Fixed: 2026-04-15T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
