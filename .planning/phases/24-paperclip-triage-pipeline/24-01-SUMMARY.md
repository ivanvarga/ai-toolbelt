---
phase: 24-paperclip-triage-pipeline
plan: 01
subsystem: testing
tags: [node-test-runner, hmac, fixtures, webhooks, github, jira, paperclip]

requires: []
provides:
  - "scripts/tests/ directory with node --test runnable suite"
  - "5 canned webhook payload fixtures (GitHub issues.assigned, issues.labeled, pull_request.closed merged; Jira jira:issue_updated assigned, labeled)"
  - "hmac helper with signGithub/verifyGithub/signJira/verifyJira/signPaperclip/verifyPaperclip using timingSafeEqual"
  - "dedup-store helper with KEY_PATTERN validation rejecting traversal"
  - "paperclip-mock HTTP server for routine fire + projects.workspaces + issues endpoints"
  - "scaffold.test.js sanity suite covering fixtures, hmac round-trips, dedup-store CRUD"
affects: [24-02, 24-03, 24-04, 24-05, 24-06, 24-07]

tech-stack:
  added:
    - "node:test (built-in, no install)"
    - "node:assert/strict"
    - "node:crypto (createHmac, timingSafeEqual)"
    - "node:http (in-process mock server)"
  patterns:
    - "CommonJS module.exports (matches tb convention in scripts/keychain.js, scripts/resolve-credential.js)"
    - "Temp-dir-backed JSON store mirroring ~/.paperclip/tb-triage/dedup.json shape"
    - "Paperclip signature format: t=<unix_seconds>,v1=<hex_sha256> signing ${t}.${body}"
    - "Dedup key grammar: gh:owner/repo#N or jira:KEY-N (enforced via KEY_PATTERN regex)"

key-files:
  created:
    - scripts/tests/fixtures/github-issues-assigned.json
    - scripts/tests/fixtures/github-issues-labeled-triage-oneshot.json
    - scripts/tests/fixtures/github-pr-closed-merged.json
    - scripts/tests/fixtures/jira-issue-updated-assigned.json
    - scripts/tests/fixtures/jira-issue-labeled.json
    - scripts/tests/helpers/hmac.js
    - scripts/tests/helpers/paperclip-signature.js
    - scripts/tests/helpers/dedup-store.js
    - scripts/tests/helpers/paperclip-mock.js
    - scripts/tests/scaffold.test.js
  modified: []

key-decisions:
  - "All PII replaced with placeholders (acme/repo, ivan, my-accountid-placeholder, other-accountid-placeholder, LFCR-360/361)"
  - "Shared hmac.js pattern — signGithub === signJira (both use raw HMAC-SHA256 hex over body); downstream production verifier can require the same module to prevent drift"
  - "dedup-store KEY_PATTERN restricts keys to gh:owner/repo#N or jira:KEY-N — rejects path traversal and keeps store shape predictable"
  - "paperclip-mock.start returns a Promise<handle> — handle.stop is awaitable and idempotent (server.close callback)"
  - "Node 24 discovered: node --test <directory> does not auto-discover test files; use node --test <globs> or cd into the directory first (documented in Deviations)"

patterns-established:
  - "Fixture naming: {source}-{event}[-{qualifier}].json in scripts/tests/fixtures/"
  - "Helper naming: single-word module name in scripts/tests/helpers/ (hmac, dedup-store, paperclip-mock, paperclip-signature)"
  - "Sanity test naming: scaffold.test.js at scripts/tests/ root; future per-feature tests live alongside"
  - "Timing-safe comparison for all HMAC verification (timingSafeEqual with length pre-check)"

requirements-completed: [D-05, D-06, D-19]

duration: ~8min
completed: 2026-04-15
---

# Phase 24 Plan 01: Wave 0 Test Scaffolding Summary

**Node --test scaffolding (5 webhook fixtures, HMAC + dedup-store + Paperclip mock helpers, sanity test) all green in <40ms; unlocks automated <verify> blocks for Plans 02-07.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 3
- **Files created:** 10
- **Files modified:** 0
- **Test runtime:** ~34ms (well under 5s plan budget)

## Accomplishments
- 5 canned webhook payloads committed (GitHub issues.assigned #42, GitHub issues.labeled #43 w/ triage:oneshot, GitHub pull_request.closed #99 merged w/ worktree-gh-* branch, Jira jira:issue_updated assignee change LFCR-360, Jira jira:issue_updated labels change LFCR-361)
- HMAC helper with GitHub/Jira/Paperclip sign+verify and timing-safe equality; Paperclip verify enforces 5-min timestamp window
- Dedup-store helper with KEY_PATTERN regex rejecting path-traversal / malformed keys (mitigates threat 3 in plan)
- Paperclip HTTP mock serving routine fire, companies/:id/projects, companies/:id/issues endpoints with state capture for assertions
- scaffold.test.js passes 4/4 subtests via `node --test scripts/tests/scaffold.test.js`

## Task Commits

1. **Task 1: 5 webhook payload fixtures** — `addb763` (test)
2. **Task 2: hmac / dedup-store / paperclip-mock / paperclip-signature helpers** — `06549d3` (feat)
3. **Task 3: scaffold sanity test** — `6169aaa` (test)

_Note: This plan uses task-level TDD phrasing (tdd="true") but Wave 0 is scaffolding — there is no pre-existing implementation to test. The sanity test was added as the last task so each dependency (fixtures, helpers) could be written in the order expected by downstream plans. No RED-GREEN-REFACTOR cycle applied per task; the plan's verify command (`node --test scripts/tests/scaffold.test.js`) only became satisfiable after Task 3._

## Files Created

**Fixtures (scripts/tests/fixtures/):**
- `github-issues-assigned.json` — issue 42, assignee ivan, labels [bug]
- `github-issues-labeled-triage-oneshot.json` — issue 43, added label triage:oneshot
- `github-pr-closed-merged.json` — PR 99 merged, head.ref worktree-gh-acme-repo-42
- `jira-issue-updated-assigned.json` — LFCR-360, changelog field=assignee, to=my-accountid-placeholder
- `jira-issue-labeled.json` — LFCR-361, labels [triage:process, backend]

**Helpers (scripts/tests/helpers/):**
- `hmac.js` — signGithub/verifyGithub, signJira/verifyJira (alias), signPaperclip/verifyPaperclip
- `paperclip-signature.js` — re-export of Paperclip sign/verify for naming parity with 24-VALIDATION.md
- `dedup-store.js` — createStore/check/insert/remove/list + KEY_PATTERN export
- `paperclip-mock.js` — http.createServer mock with lastFire/lastIssue/setWorkspaces handle API

**Tests:**
- `scripts/tests/scaffold.test.js` — 4 subtests: fixture JSON parse, GitHub HMAC round-trip + tamper, Paperclip HMAC round-trip, dedup-store insert/check/remove

## Running the Suite

```bash
# Single-file invocation (canonical per this plan's acceptance criteria)
node --test scripts/tests/scaffold.test.js

# Glob form (recommended for downstream plans to run every *.test.js under scripts/tests/)
node --test "scripts/tests/**/*.test.js"

# Or cd into dir — node --test auto-discovers *.test.js from cwd
(cd scripts/tests && node --test)
```

Output (truncated):

```
✔ scaffold
  ✔ 5 fixtures parse as JSON
  ✔ hmac round-trip GitHub
  ✔ hmac round-trip Paperclip
  ✔ dedup-store insert/check/remove
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

## Decisions Made

- **No external test framework installed.** Built-in `node:test` (Node 20+) covers all acceptance criteria — aligns with root CLAUDE.md "reuse what exists" and keeps the plugin dependency-free.
- **Single shared `hmac.js` module** (not one per source). Future production verifiers (Plans 02/05) can `require` this same module so tests and prod never drift on signature format (threat 2 mitigation).
- **Paperclip mock exposes `lastIssue()` in addition to plan's `lastFire()`** — anticipated need for Plan 04 which creates Paperclip Issues via POST /api/companies/:id/issues. Harmless addition; plan's acceptance criteria still pass.
- **`paperclip-signature.js` as thin re-export** — 24-VALIDATION.md names both `hmac.js` and `paperclip-signature.js` as distinct Wave 0 artifacts. Alias satisfies both without duplicating logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `node --test <directory>` not supported in Node 24**

- **Found during:** Task 3 (scaffold test verification)
- **Issue:** Plan's `<verification>` block asserts `node --test scripts/tests/` exits 0. On Node 24.12.0, passing a bare directory argument to `node --test` triggers `MODULE_NOT_FOUND` (runner treats the directory as a module entrypoint rather than a discovery root). This would block every downstream plan whose `<automated>` verify block points at `node --test scripts/tests/...`.
- **Fix:** Documented canonical invocations in SUMMARY "Running the Suite" section. Three forms work in Node 24:
  - `node --test scripts/tests/scaffold.test.js` (explicit file — matches Task 3 acceptance criteria)
  - `node --test "scripts/tests/**/*.test.js"` (glob — recommended for Plans 02-07)
  - `cd scripts/tests && node --test` (directory auto-discovery from cwd)
- **Files modified:** None (scaffold test files are correct as written; only the verification *command* needs the adjustment)
- **Verification:** All three forms produce `pass 5, fail 0` exit 0.
- **Committed in:** N/A (documentation-only; this SUMMARY captures the guidance)
- **Downstream impact:** Plans 02-07 should use `node --test <explicit-file>` or the glob form in their `<automated>` verify blocks. Plan-checker for those plans should flag any `node --test <dir>` usage.

**2. [Rule 2 — Missing Critical] Length pre-check before `timingSafeEqual`**

- **Found during:** Task 2 (hmac helper implementation)
- **Issue:** `crypto.timingSafeEqual` throws `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH` when buffer lengths differ. Plan's `verifyGithub` wraps in try/catch (returns false on throw) — correct but masks the intent. More robust: explicit length check returning false early before `timingSafeEqual` (same behaviour, clearer intent, avoids exception for the common wrong-length case).
- **Fix:** Added `if (a.length !== b.length) return false;` before `timingSafeEqual` in both `verifyGithub` and `verifyPaperclip`. Retained `try/catch` as belt-and-suspenders.
- **Files modified:** `scripts/tests/helpers/hmac.js`
- **Verification:** Tamper test (wrong body produces same-length sig) still returns false; length-mismatch case returns false without throwing.
- **Committed in:** `06549d3` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 blocking documentation issue, 1 robustness hardening)
**Impact on plan:** Deviation 1 affects downstream plan verify commands but does not alter the artifacts produced. Deviation 2 is a minor hardening of the helper.

## Issues Encountered

- See Deviation 1 above — discovered mid-verification that `node --test <dir>` semantics changed between docs assumption and Node 24 runtime behavior.

## Known Stubs

None. All helpers are fully implemented; `paperclip-mock` exposes all three endpoint handlers needed for Plans 02-04. `lastIssue()` is wired (anticipated by Plan 04) but plan explicitly permits it via the "No comments" / "exports additional functions acceptable" pattern.

## Threat Surface Scan

No new surface introduced. All files are test-only (scripts/tests/ path), no network listeners in production, no credential access. Plan's `<threat_model>` threats all mitigated:
- **Threat 1 (PII leakage):** All fixtures use placeholders (acme/repo, ivan, my-accountid-placeholder).
- **Threat 2 (HMAC drift):** Shared `hmac.js` module — production verifiers in Plans 02/05 must `require` it.
- **Threat 3 (Dedup traversal):** `KEY_PATTERN` regex rejects `../etc/passwd` and all keys outside the `gh:owner/repo#N` / `jira:KEY-N` grammar.
- **Threat 4 (Timing-attack false-safe):** All verify functions use `timingSafeEqual` with length pre-check.

## Next Plan Readiness

- **Plan 02 (Relay HTTP server):** can now require `scripts/tests/helpers/hmac.js` from production code for signature verification, load `scripts/tests/fixtures/github-issues-assigned.json` and `jira-issue-updated-assigned.json` in integration tests.
- **Plan 03 (Routing / tag detection):** can load the two `triage-*` variants to assert label override logic.
- **Plan 04 (Paperclip routine fire):** can spin up `paperclip-mock.start()` and assert on `lastFire().body` / `signature` + `lastIssue().body`.
- **Plan 05 (Dedup + PR-closed cleanup):** can use `dedup-store` helper directly in tests; production dedup module can `require` the same `KEY_PATTERN`.
- **24-VALIDATION.md Wave 0 `nyquist_compliant` flag:** can flip to `true` once Plan 07 populates the per-task map (all scaffolding artifacts it references now exist on disk).

## Self-Check: PASSED

- **Files (10):** all present
  - FOUND: scripts/tests/fixtures/github-issues-assigned.json
  - FOUND: scripts/tests/fixtures/github-issues-labeled-triage-oneshot.json
  - FOUND: scripts/tests/fixtures/github-pr-closed-merged.json
  - FOUND: scripts/tests/fixtures/jira-issue-updated-assigned.json
  - FOUND: scripts/tests/fixtures/jira-issue-labeled.json
  - FOUND: scripts/tests/helpers/hmac.js
  - FOUND: scripts/tests/helpers/paperclip-signature.js
  - FOUND: scripts/tests/helpers/dedup-store.js
  - FOUND: scripts/tests/helpers/paperclip-mock.js
  - FOUND: scripts/tests/scaffold.test.js
- **Commits (3):** all present
  - FOUND: addb763 (Task 1 — fixtures)
  - FOUND: 06549d3 (Task 2 — helpers)
  - FOUND: 6169aaa (Task 3 — scaffold test)
- **Test runtime:** 34ms (under 5s plan budget)
- **Test result:** `pass 5, fail 0` exit 0

---
*Phase: 24-paperclip-triage-pipeline*
*Completed: 2026-04-15*
