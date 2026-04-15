---
phase: 24-paperclip-triage-pipeline
plan: 05
subsystem: api
tags: [webhook, cleanup, worktree, github-webhook, pr-merged, dedup, paperclip, triage]

requires:
  - phase: 24-paperclip-triage-pipeline
    provides: "24-02 dedup-store.js (list/remove API); 24-03 relay.js + shouldRelayGithub('pull_request', ...) → {relay:true, dedupKey:null} branch"
provides:
  - "scripts/tb-triage/cleanup.js — matchDedupKeyFromPr (strong prUrl + branch head.ref match) + removeWorktreeForPr (execFile-safe git worktree remove + dedup-remove-last-on-success)"
  - "relay.js pull_request event branch — dispatches to cleanup.removeWorktreeForPr instead of Paperclip fire; 200 {ok,cleaned,key,reason}"
  - "2 test files covering cleanup unit (7 subtests) + relay integration (1 subtest) — all 65 tests in full suite green"
affects:
  - "24-07 setup doc MUST include `pull_request` in GitHub webhook event subscriptions (alongside `issues`)"

tech-stack:
  added: []
  patterns:
    - "execFile (never exec/shell) for git worktree remove — array args, no shell interpolation, no payload-derived binary path"
    - "dedup-remove-LAST on success — git failure leaves dedup entry intact so human can retry manually"
    - "worktreeCwd pattern guard — refuse to act if stored cwd does not match `/.claude/worktrees/<name>` regex; prevents accidental removal of non-tb paths like /etc/passwd"
    - "Dependency injection for tests — options.gitExec + options.dedupStore enable fake-store + arg capture without touching real filesystem or shelling git"
    - "Strong match (prUrl) before weak match (head.ref + repo) — PR URL is trusted because it was stored by orchestrator after PR creation; head.ref is attacker-controlled (PR author picks branch name)"

key-files:
  created:
    - "scripts/tb-triage/cleanup.js"
    - "scripts/tests/cleanup-on-merge.test.js"
    - "scripts/tests/relay-pr-cleanup.test.js"
  modified:
    - "scripts/tb-triage/relay.js"

key-decisions:
  - "Match ordering — prUrl strong match comes FIRST because PR URL is trusted (populated by orchestrator after opening PR). head.ref branch match is fallback because branch name is attacker-settable (any PR author picks it)"
  - "Dedup-remove AFTER git worktree remove succeeds — on git failure, leave entry intact; this makes cleanup idempotent-retryable by human (re-delivering the webhook or manual re-trigger)"
  - "worktreeCwd path guard (regex `/\\/\\.claude\\/worktrees\\/[^/]+\\/?$/`) — refuses to act if the stored cwd isn't under `.claude/worktrees/`; belt-and-suspenders for threat-model mitigation #2 (mismatched cleanup)"
  - "No-worktree branch — if dedup entry has no worktreeCwd/worktreeName (e.g., cleanup fires before worktree was ever created), remove the dedup entry anyway and return cleaned:true with reason note. Prevents orphan dedup entries from accumulating"
  - "Cleanup imported at relay.js top level (not lazy inside branch) — module stability per plan <action> note"

patterns-established:
  - "Cleanup modules inject their shell-out via options.gitExec — tests never fork real processes"
  - "matchDedupKeyFromPr is a pure function — exported separately so other cleanup paths (e.g., human-triggered) can reuse the matching logic without running the full flow"

requirements-completed: [D-15]

duration: 3min
completed: 2026-04-15
---

# Phase 24 Plan 05: Worktree cleanup on PR merge Summary

**`pull_request.closed` merged webhooks now route through the relay to a new `cleanup.js` module that safely removes the associated git worktree via `execFile('git', ['-C', parentRepo, 'worktree', 'remove', '--force', worktreeName])` and deletes the dedup-store entry — closing D-15 (worktree cleanup after PR merge) via researcher's recommended path #2 (merge-webhook-based, event-driven).**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-15T13:25:34Z
- **Completed:** 2026-04-15T13:28:43Z
- **Tasks:** 2 (both TDD RED+GREEN)
- **Files created:** 3 (1 module + 2 tests)
- **Files modified:** 1 (relay.js)

## Flow Diagram — PR-merged webhook → worktree cleanup

```
GitHub PR merge event
  │
  ├─► POST /github   (X-GitHub-Event: pull_request)
  │     │
  │     ▼
  │   relay.js handleGithub
  │     │
  │     ├─ verifyGithubSignature (HMAC SHA-256, timingSafeEqual)
  │     ├─ JSON.parse(rawBody)
  │     ├─ filters.shouldRelayGithub('pull_request', ...) → {relay:true, dedupKey:null}
  │     │
  │     └─ NEW BRANCH: event === 'pull_request'
  │           │
  │           ▼
  │         cleanup.removeWorktreeForPr(payload)
  │           │
  │           ├─ dedupStore.list() → entries
  │           ├─ matchDedupKeyFromPr(payload, entries)
  │           │    │
  │           │    ├─ 1. Strong: entry.prUrl === payload.pull_request.html_url
  │           │    ├─ 2. Branch: head.ref === `worktree-${entry.worktreeName}` AND
  │           │    │             key.startsWith(`gh:${repository.full_name}#`)
  │           │    └─ else null
  │           │
  │           ├─ Guard: parentRepo derived by stripping `/.claude/worktrees/<name>/?`
  │           │         from worktreeCwd; refuse if cwd not under .claude/worktrees/
  │           │
  │           ├─ execFile('git', ['-C', parentRepo, 'worktree', 'remove',
  │           │                    '--force', worktreeName])
  │           │     (no shell, array args, binary is static 'git' — never payload)
  │           │
  │           ├─ On success: dedupStore.remove(key)
  │           └─ On failure: leave dedup entry intact; return {cleaned:false, reason, error}
  │
  ▼
HTTP 200 { ok:true, cleaned:bool, key:string|null, reason?:string }
```

## Accomplishments

- `scripts/tb-triage/cleanup.js` (61 lines) — `matchDedupKeyFromPr` (pure function; strong-match-first ordering: prUrl then branch) + `removeWorktreeForPr` (orchestrates lookup → cwd guard → execFile → dedup-remove-last)
- `scripts/tb-triage/relay.js` — inserted `event === 'pull_request'` branch after `shouldRelayGithub` and before the existing `dedupKey` check; dispatches to `cleanup.removeWorktreeForPr` instead of Paperclip fire; top-level `require('./cleanup')` added for module stability
- `scripts/tests/cleanup-on-merge.test.js` — 7 subtests: matchDedupKey prUrl-strong, matchDedupKey branch-match, matchDedupKey no-match, removeWorktreeForPr happy-path (asserts exact execFile args), no-dedup-match, git-failure-entry-intact, malformed-cwd-rejected
- `scripts/tests/relay-pr-cleanup.test.js` — integration test: posts signed pull_request webhook to real HTTP server; stubs paperclip.fireRoutine and asserts it is NOT called; verifies response body contains `cleaned` field
- Full suite: **65 tests pass, 0 fail** (57 pre-existing + 7 new cleanup unit + 1 new relay integration)

## Task Commits

1. **Task 1 RED:** `ad7c762` — test(24-05): add failing tests for cleanup-on-merge
2. **Task 1 GREEN:** `43f62c2` — feat(24-05): implement cleanup.js for worktree removal on PR merge
3. **Task 2 RED:** `7248159` — test(24-05): add failing test for relay pull_request routing to cleanup
4. **Task 2 GREEN:** `b366371` — feat(24-05): wire pull_request events to cleanup in relay.js

## Public API exported

**`scripts/tb-triage/cleanup.js`:**
- `matchDedupKeyFromPr(payload, entries) -> string | null` — pure function, no side effects
- `removeWorktreeForPr(payload, options?) -> Promise<{cleaned, key?, worktreeName?, reason?, error?}>`
  - `options.dedupStore` — defaults to `require('./dedup-store')`
  - `options.gitExec` — defaults to `promisify(execFile)('git', args)` for testability

## D-15 Closure

Requirement D-15 (worktree cleanup after PR merge) is now **CLOSED**. Researcher's recommended path #2 from 24-RESEARCH.md (merge-webhook-based, event-driven via `pull_request.closed + merged:true`) is implemented end-to-end:

- Webhook arrives → relay verifies HMAC → filter returns `{relay:true}` → cleanup runs → worktree removed → dedup entry freed
- Idempotent: second identical webhook finds no match (entry already removed) → returns `{cleaned:false, reason:'no dedup entry matches pr'}` without error
- Retry-safe: git-level failure leaves dedup entry intact, allowing webhook redelivery or manual re-trigger

## Plan 07 Setup Doc Requirement

**CRITICAL for Plan 07:** The GitHub webhook event subscription list (currently only `issues` per Plan 03 implication) MUST be extended to include `pull_request`. Without this, merged-PR webhooks never reach the relay and worktrees accumulate indefinitely.

Plan 07 setup doc must specify:

```
GitHub webhook events to subscribe:
  - issues           (triage intake — triage-user assigned OR triage:* label)
  - pull_request     (cleanup trigger — closed + merged:true)
```

## Threat Model Mitigations (all 4 implemented)

| # | Threat | Mitigation | Evidence |
|---|--------|-----------|----------|
| 1 | RCE via `head.ref` injection if shelled | `execFile('git', [array args], ...)` — no shell, binary is static string | `grep -q "execFile" scripts/tb-triage/cleanup.js` |
| 2 | Mismatched cleanup (repo X payload deletes repo Y worktree) | Dedup key prefix check `gh:${fullName}#` gates branch match; prUrl-first-match anchors to stored PR URL from trusted orchestrator source | Unit test `matchDedupKeyFromPr — no match` asserts cross-repo payload returns null |
| 3 | Cleanup recoverability on partial failure | Dedup `remove()` called AFTER `gitExec` resolves successfully. On git failure, return `{cleaned:false, reason, error}` and leave entry intact | Unit test `removeWorktreeForPr — git failure, entry intact` asserts `store.check('gh:acme/repo#42')` still returns the entry |
| 4 | Race with executing coder agent | `git worktree remove --force` documented as acceptable per 24-RESEARCH.md §Claude Code Worktree Mechanism; human approval gate upstream ensures coder already transitioned to `done` before PR merged | `grep -q "'--force'" scripts/tb-triage/cleanup.js` |

## Decisions Made

- **prUrl-first matching, head.ref as fallback.** PR URL is trusted because it was stored by the orchestrator after opening the PR. `head.ref` is attacker-controlled (PR author picks branch name), so treat it as weaker evidence and additionally verify the dedup key prefix matches `gh:${payload.repository.full_name}#` before acting.
- **Dedup-remove LAST (after git succeeds), not first.** If `git worktree remove` fails mid-way (locked, missing, filesystem error), the dedup entry persists so a human can re-deliver the webhook or manually retry. Entry-first removal would create orphan worktrees.
- **worktreeCwd pattern guard.** Explicit regex `/\/\.claude\/worktrees\/[^/]+\/?$/` on `worktreeCwd` prevents acting on malformed/poisoned dedup entries (e.g., `/etc/passwd`) — covered by unit test `malformed worktreeCwd rejected`.
- **Top-level require of cleanup module in relay.js.** Plan explicitly allowed lazy-inside-branch, but top-level is preferred for module load stability and predictable startup errors. No circular import risk (cleanup only requires dedup-store, which relay also requires).
- **Separate RED/GREEN commits per task.** TDD gate enforced literally: `test(...)` commit → verified RED (expected failure) → `feat(...)` commit → verified GREEN. Gate sequence provable from `git log --oneline`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] Added integration test for Task 2 (plan only specified unit-test regression check)**
- **Found during:** Task 2 planning
- **Issue:** Plan's `<verify><automated>` for Task 2 was `node --test scripts/tests/` with acceptance criteria reduced to grep-level assertions. This would not actually prove that the new `pull_request` branch correctly short-circuits Paperclip fire and dispatches to cleanup — a runtime misroute (e.g., missed early-return) would pass grep but break production behavior.
- **Fix:** Added `scripts/tests/relay-pr-cleanup.test.js` as the TDD RED for Task 2. Test spins up a real HTTP server via `createServer`, stubs `paperclip.fireRoutine` to detect inadvertent calls, posts a signed pull_request webhook, and asserts both (a) HTTP 200 with `cleaned` field in body AND (b) `paperclip.fireRoutine` was NOT called. This is a proper behavioral gate, not a structural grep.
- **Files created:** `scripts/tests/relay-pr-cleanup.test.js`
- **Verification:** RED phase confirmed test fails on unmodified relay.js (`paperclip.fireRoutine must NOT be called`). GREEN phase confirmed test passes after branch insertion.
- **Committed in:** `7248159` (RED) + `b366371` (GREEN)
- **Rationale:** Rule 2 — relay dispatch behavior is correctness-critical and must be verifiable via a true behavioral test, not a grep. The plan's grep-only acceptance was a testing gap for the integration layer.

### Scope-faithful notes

- Plan's Task 1 acceptance criterion says `Output contains # pass 6` — Node 24 reports `ℹ pass 7` (7 subtests declared in plan's test spec, including the root suite). Count drift only; test structure is plan-identical.

**Total deviations:** 1 auto-fixed (missing critical test coverage for relay integration)
**Impact on plan:** Strictly additive. No public API change, no behavioral change beyond what plan specifies.

## TDD Gate Compliance

Both tasks strictly follow RED → GREEN:

| Task | RED commit | RED verified | GREEN commit | GREEN verified |
|------|-----------|--------------|--------------|----------------|
| 1 (cleanup.js) | `ad7c762` | `Cannot find module '../tb-triage/cleanup'` | `43f62c2` | 7 subtests green |
| 2 (relay branch) | `7248159` | `paperclip.fireRoutine must NOT be called` assertion fails | `b366371` | integration green + 65/65 full suite |

No unexpected passes during RED (fail-fast rule satisfied). No refactor commit needed — initial implementation was minimal and clean.

## Issues Encountered

None.

## User Setup Required

None at this plan — Plan 07 setup doc will list the webhook event subscription requirement.

## Next Plan Readiness

- **Plan 06 (per-event worktree)** can assume `worktreeName` + `worktreeCwd` + `prUrl` fields in dedup-store entries will be populated at runtime by the orchestrator/oneshot agent. `cleanup.js` reads those fields but does not write them — Plan 06 is the writer.
- **Plan 07 (setup doc)** has a documented requirement to include `pull_request` in GitHub webhook event subscriptions (see "Plan 07 Setup Doc Requirement" section above).
- No blockers.

## Self-Check

**Files created (verified via `test -f`):**
- FOUND: `scripts/tb-triage/cleanup.js`
- FOUND: `scripts/tests/cleanup-on-merge.test.js`
- FOUND: `scripts/tests/relay-pr-cleanup.test.js`

**Files modified (verified via git log):**
- FOUND: `scripts/tb-triage/relay.js` (commit `b366371`, +12 lines)

**Commits in git log (verified):**
- FOUND: `ad7c762` — test(24-05) RED Task 1
- FOUND: `43f62c2` — feat(24-05) GREEN Task 1
- FOUND: `7248159` — test(24-05) RED Task 2
- FOUND: `b366371` — feat(24-05) GREEN Task 2

**Test run:** `node --test scripts/tests/*.test.js` → 65 pass, 0 fail

**Greppable acceptance criteria:**
- `execFile` in cleanup.js: 2 occurrences (import + promisify wrap)
- `'git',` args in cleanup.js: present
- `'--force'` in cleanup.js: present
- `event === 'pull_request'` in relay.js: present
- `cleanup.removeWorktreeForPr` in relay.js: present
- `require('./cleanup')` in relay.js: present
- No shell-exec pattern (`exec(` or `spawn(`) in cleanup.js outside `execFile` import

## Self-Check: PASSED

---
*Phase: 24-paperclip-triage-pipeline*
*Completed: 2026-04-15*
