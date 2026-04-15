---
phase: 24-paperclip-triage-pipeline
verified: 2026-04-15T16:00:00Z
status: human_needed
score: 14/14 must-haves verified (code gap resolved in code-review-fix)
overrides_applied: 0
human_verification:
  - test: "End-to-end smoke — assign a GitHub issue to configured user, confirm Paperclip triage routine fires, triage agent classifies, routes to oneshot or GSD agent, agent produces a worktree + draft PR, Paperclip human gate appears, approve, PR opens on GitHub"
    expected: "PR is draft-ready in GitHub after human approval in Paperclip UI; worktree persists until PR is merged"
    why_human: "Requires live Paperclip server, GitHub webhook tunnel (smee.io), and configured Keychain entries; cannot verify programmatically without the full runtime stack"
  - test: "PR-merge cleanup end-to-end — merge the draft PR from smoke above, confirm relay receives pull_request.closed webhook, worktree is removed from disk, dedup entry is cleared"
    expected: "Worktree directory gone from disk; dedup.json entry removed; relay logs cleaned:true"
    why_human: "Requires a real git worktree with worktreeName+worktreeCwd+prUrl written into dedup store by a running agent; no agent ran in automated tests"
  - test: "SOUL.md tone review — read triage/SOUL.md, oneshot-coder/SOUL.md, gsd-orchestrator/SOUL.md and confirm tone matches intended agent personality (D-23)"
    expected: "User approves or iterates on tone; this is a subjective judgment call"
    why_human: "Tone acceptance is explicitly a user judgment per D-23 (Claude's discretion section)"
  - test: "Worktree adapter wiring — confirm whether {{issue.metadata.worktreeCwd}} in .paperclip.yaml actually fails at Paperclip runtime, and if so, edit .paperclip.yaml to point oneshot-coder and gsd-orchestrator at scripts/tb-triage-worktree-wrapper.sh"
    expected: "Either templating works and nothing needs changing, OR wrapper is wired in and tested"
    why_human: "Plan 04 Summary documents that {{issue.metadata.*}} is unsupported in claude_local adapter config.cwd — but the .paperclip.yaml still contains the unsupported template. Operator must confirm and fix at setup time."
gaps:
  - truth: "Relay routes triage:skip > triage:oneshot > triage:process priority correctly"
    status: resolved
    resolved_in: "20a28ed fix(24): WR-01 enforce tag priority skip > oneshot > process regardless of label order"
    reason: "WR-01 fixed in code-review-fix cycle. TAG_PRIORITY added to relay-filters.js; extractTriageTag now scans in priority order. 3 new priority-ordering tests added to triage-tag-override.test.js including conflict case [oneshot, skip] → skip."
---

# Phase 24: Paperclip Triage Pipeline — Verification Report

**Phase Goal:** Build a Paperclip-integrated triage pipeline that receives GitHub/Jira events, classifies work complexity, routes to autonomous GSD or oneshot coder agents in worktrees, and gates on human verification before shipping.
**Verified:** 2026-04-15T16:00:00Z
**Status:** human_needed (0 open gaps — WR-01 resolved in code-review-fix; 4 items requiring human testing remain)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Webhook relay verifies inbound GitHub HMAC (timingSafeEqual) and rejects invalid signatures with HTTP 401 | VERIFIED | `relay-filters.js:7-13`: `verifyGithubSignature` uses `crypto.timingSafeEqual` with length pre-check; 3 test cases in `relay-github-verify.test.js` covering valid/tampered/malformed; 65/65 tests pass |
| 2 | Relay filters to configured assignee (D-04) and canonical triage tag vocabulary (D-25) | VERIFIED | `relay-filters.js`: `shouldRelayGithub` checks `payload.assignee.login === triageUserLogin`; `shouldRelayJira` checks assignee accountId; `TAG_VOCAB` constant with exact `triage:oneshot/process/skip` strings using strict equality |
| 3 | Relay routes `triage:skip` > `triage:oneshot` > `triage:process` priority | FAILED | WR-01: `extractTriageTag` returns first-match in label array order. Runtime test confirms `extractTriageTag([{name:'triage:oneshot'},{name:'triage:skip'}])` returns `'oneshot'` (wrong — should be `'skip'`). Existing test only covers `[bug, triage:skip]` (skip second, passes accidentally) |
| 4 | Relay deduplicates events via `gh:{owner}/{repo}#{number}` / `jira:{key}` key (D-06) | VERIFIED | `relay-filters.js:buildDedupKey` constructs canonical key; `relay.js:85,137` calls `dedup.check(decision.dedupKey)` before firing; `dedup-store.js:KEY_PATTERN` validates key at insert |
| 5 | Relay re-signs outbound to Paperclip with `t=<unix>,v1=<hex>` signature (D-05) | VERIFIED | `relay-paperclip-client.js:5,30`: `signPaperclip(timestamp, body, secret)` returns `t=${timestamp},v1=${mac}`; `x-paperclip-signature` header set on all routine fire requests |
| 6 | Relay handles `pull_request.closed merged` by dispatching to cleanup instead of Paperclip fire | VERIFIED | `relay.js:6,73,75`: top-level `require('./cleanup')`; `if (event === 'pull_request')` branch calls `cleanup.removeWorktreeForPr(payload)`; `relay-pr-cleanup.test.js` spin-up test asserts `fireRoutine` NOT called |
| 7 | Cleanup safely removes worktree via `execFile` (no shell, array args) and deletes dedup entry on success | VERIFIED | `cleanup.js:1,5,52`: `execFile` from `node:child_process`, `promisify(execFile)`, git args as array `['-C', parentRepo, 'worktree', 'remove', '--force', entry.worktreeName]`; 7 subtests green including happy-path, git-failure-entry-intact, malformed-cwd-rejected |
| 8 | AgentCompanies v1-draft artifact bundle exists: COMPANY.md + .paperclip.yaml + 3 agent packages | VERIFIED | All 8 files exist on disk; `COMPANY.md:2` has `schema: agentcompanies/v1`; `.paperclip.yaml` has 3 `type: claude_local` agents + 2 webhook routines with `signingMode: hmac_sha256` |
| 9 | Triage agent encodes 3 confidence signals (D-08/D-26), routing table (D-09), and tag override precedence (D-10/D-25) | VERIFIED | `agents/triage/AGENTS.md:62` Step 4 confidence signals (understanding/solution/codeTrace); routing table present; `AGENTS.md:31-32` tag override table with skip/oneshot/process rows; `decision.json` telemetry at line 103 |
| 10 | Oneshot-coder and GSD-orchestrator agents encode worktree binding (D-13), diff comment (D-16), PR contract (D-17), changes_requested re-queue (D-18) | VERIFIED | `oneshot-coder/AGENTS.md:36-38` changes_requested re-queue with executionState check; line 91 Paperclip executionPolicy `in_review`; `tb:pr-submit` + `tb:pr-describe` skill references in skills list |
| 11 | Deploy script copies both skills/ and companies/ into Paperclip root idempotently | VERIFIED | `paperclip-symlink.sh:37-44` COMPANIES_SOURCE loop; `readonly PAPERCLIP_ROOT` + `realpath` case-guard; bash integration test `paperclip-symlink.test.sh` passes PASS |
| 12 | `bin/resolve-credential` wrapper exists as executable thin wrapper over `scripts/resolve-credential.js` | VERIFIED | `bin/resolve-credential:2`: `exec node "$(dirname "$0")/../scripts/resolve-credential.js" "$@"`; file is executable (mode 0755) |
| 13 | `docs/paperclip-triage-setup.md` documents all 9 keychain entries, both Jira paths, smee.io DEV-ONLY caveat, and rotate/revoke procedure | VERIFIED | File exists (353 lines); `## GitHub setup`, `## Jira setup`, `## Troubleshooting`, `## Rotate / revoke` sections present; 10 `export VAR=$(bin/resolve-credential ...)` lines; `openssl rand -hex 32` mandated; `smee.io is DEV-ONLY` explicit; `scripts/tb-triage/relay.js` literal reference greppable |
| 14 | 65 automated tests pass and bash integration test passes | VERIFIED | `node --test scripts/tests/*.test.js` → `tests 65, pass 65, fail 0, duration_ms 92ms`; `bash scripts/tests/paperclip-symlink.test.sh` → `PASS` |

**Score:** 13/14 truths verified (1 gap: tag-priority ordering WR-01)

### Deferred Items

None. All identified gaps are addressable within Phase 24 artifacts.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/tests/fixtures/github-issues-assigned.json` | GitHub issues.assigned fixture | VERIFIED | Exists; `.action === "assigned"`, `.issue.assignee.login === "ivan"` |
| `scripts/tests/fixtures/jira-issue-updated-assigned.json` | Jira jira:issue_updated fixture | VERIFIED | Exists; `.webhookEvent === "jira:issue_updated"`, `.changelog.items[0].field === "assignee"` |
| `scripts/tests/helpers/hmac.js` | HMAC sign/verify helpers | VERIFIED | Exports signGithub/verifyGithub/signPaperclip/verifyPaperclip with timingSafeEqual |
| `scripts/tests/helpers/dedup-store.js` | Test dedup helper | VERIFIED | Exports createStore/check/insert/remove/list with KEY_PATTERN validation |
| `scripts/tests/helpers/paperclip-mock.js` | HTTP mock for Paperclip | VERIFIED | Exports start(); handles routine-fire, projects, issues endpoints |
| `bin/resolve-credential` | Executable credential wrapper | VERIFIED | 2-line wrapper, executable, exec pattern |
| `scripts/tb-triage/paths.js` | Canonical path resolver | VERIFIED | Exports triageDir/dedupFile/repoMapFile; 0o700 dir, symlink rejection |
| `scripts/tb-triage/dedup-store.js` | Production dedup store | VERIFIED | KEY_PATTERN validated, idempotent insert, 0o600 file mode |
| `scripts/tb-triage/repo-map.js` | Repo-map resolver | VERIFIED | resolve/setCache/getCache/normalizeGithubUrl; Paperclip autoresolve + cache |
| `scripts/tb-triage/relay-filters.js` | Pure filter functions | VERIFIED | verifyGithubSignature, shouldRelayGithub, buildDedupKey, extractTriageTag (bug in priority, see gap) |
| `scripts/tb-triage/relay-paperclip-client.js` | Outbound Paperclip client | VERIFIED | fireRoutine with t=,v1= signing; listProjects with Bearer auth |
| `scripts/tb-triage/relay.js` | HTTP relay server | VERIFIED | createServer/handleRequest; /github + /jira routes; pull_request cleanup branch |
| `scripts/tb-triage/cleanup.js` | Worktree cleanup | VERIFIED | matchDedupKeyFromPr + removeWorktreeForPr; execFile safety; dedup-remove-last |
| `companies/triage-shop/COMPANY.md` | Company entrypoint | VERIFIED | `schema: agentcompanies/v1`; company goals documented |
| `companies/triage-shop/.paperclip.yaml` | Paperclip sidecar | VERIFIED | 3 claude_local agents; 2 webhook routines with hmac_sha256; NOTE: `{{issue.metadata.worktreeCwd}}` template is confirmed unsupported — wrapper fallback required at setup time |
| `companies/triage-shop/agents/triage/AGENTS.md` | Triage agent | VERIFIED | 3 confidence signals (D-08/D-26); routing table (D-09); tag override (D-10/D-25); untrusted content warning |
| `companies/triage-shop/agents/triage/SOUL.md` | Triage agent SOUL | VERIFIED | File exists; user review required per D-23 (see human verification) |
| `companies/triage-shop/agents/oneshot-coder/AGENTS.md` | Oneshot coder | VERIFIED | worktree binding; tb:pr-submit/pr-describe; diff comment; changes_requested re-queue |
| `companies/triage-shop/agents/oneshot-coder/SOUL.md` | Oneshot SOUL | VERIFIED | File exists; user review required per D-23 |
| `companies/triage-shop/agents/gsd-orchestrator/AGENTS.md` | GSD orchestrator | VERIFIED | gsd autonomous dispatch; worktree; tb:pr-submit; untrusted content warning |
| `companies/triage-shop/agents/gsd-orchestrator/SOUL.md` | Orchestrator SOUL | VERIFIED | File exists; user review required per D-23 |
| `scripts/paperclip-symlink.sh` | Extended deploy script | VERIFIED | COMPANIES_SOURCE loop; readonly guard; realpath $HOME check |
| `scripts/tb-triage-worktree-wrapper.sh` | Worktree wrapper fallback | VERIFIED | claude --worktree; TB_TRIAGE_WORKTREE_NAME validation; exits 2 on invalid |
| `docs/paperclip-triage-setup.md` | Operator setup guide | VERIFIED | All sections present; 10 keychain entries; both Jira paths; DEV-ONLY smee; rotate/revoke |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/tb-triage/relay.js` | `scripts/tb-triage/dedup-store.js` | require + check/insert | WIRED | Line 5 require; lines 85,106,137,157 usage |
| `scripts/tb-triage/relay.js` | `scripts/resolve-credential.js` | getCredential for 10 keychain keys | WIRED | buildConfig resolves all 10 keys at startup |
| `scripts/tb-triage/relay-paperclip-client.js` | Paperclip HTTP endpoint | fetch with x-paperclip-signature | WIRED | Line 28-30: fetch + header set |
| `scripts/tb-triage/dedup-store.js` | `scripts/tb-triage/paths.js` | require + dedupFile() | WIRED | Line 2 require; line 7 dedupFile() call |
| `scripts/tb-triage/repo-map.js` | Paperclip GET /api/companies | fetch via paperclipClient.listProjects | WIRED | Line 59: client.listProjects(); CLI also uses it |
| `scripts/tb-triage/cleanup.js` | `scripts/tb-triage/dedup-store.js` | require + list + remove | WIRED | Line 3 require; lines 32/33 list/remove |
| `scripts/tb-triage/relay.js` | `scripts/tb-triage/cleanup.js` | pull_request.closed dispatches removeWorktreeForPr | WIRED | Line 6 require; line 73-75 branch |
| `scripts/paperclip-symlink.sh` | `companies/triage-shop/` | COMPANIES_SOURCE copy loop | WIRED | Lines 37-44: loop copies companies into PAPERCLIP_ROOT |
| `companies/triage-shop/agents/triage/AGENTS.md` | `skills/task-github, skills/task-jira` | skills: list shortname reference | WIRED | Lines 9-10: `- tb:task-github`, `- tb:task-jira` |
| `companies/triage-shop/agents/oneshot-coder/AGENTS.md` | `skills/pr-submit, skills/pr-describe` | skills: list shortname reference | WIRED | Lines 11-12: `- tb:pr-submit`, `- tb:pr-describe` |
| `companies/triage-shop/.paperclip.yaml` | `bin/resolve-credential` | env inputs with kind: secret | PARTIAL | YAML declares kind: secret/requirement: optional pattern; but no direct `source: bin/resolve-credential` reference — wiring is documented in setup doc, not machine-enforced. Operator must manually run export block before starting relay. |
| `docs/paperclip-triage-setup.md` | `scripts/tb-triage/relay.js` | relay startup instructions | WIRED | Line 118: literal `scripts/tb-triage/relay.js` reference |

### Data-Flow Trace (Level 4)

These artifacts render or process data but do not have a single DB query to trace — they are instruction-layer markdown files (agents) or data passes through at runtime via Paperclip. Not applicable for static artifact verification.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| HMAC round-trip (GitHub) | `node --test scripts/tests/scaffold.test.js` | pass 5, fail 0 | PASS |
| Dedup store idempotent insert | `node --test scripts/tests/tb-triage-dedup-store.test.js` | pass 4, fail 0 | PASS |
| Repo-map URL normalization + cache hit | `node --test scripts/tests/tb-triage-repo-map.test.js` | pass 5, fail 0 | PASS |
| Relay HMAC verify (tampered → 401) | `node --test scripts/tests/relay-github-verify.test.js` | pass 3, fail 0 | PASS |
| Cleanup happy path + failure path | `node --test scripts/tests/cleanup-on-merge.test.js` | pass 7, fail 0 | PASS |
| Relay pull_request dispatch to cleanup (not fireRoutine) | `node --test scripts/tests/relay-pr-cleanup.test.js` | pass 1, fail 0 | PASS |
| Tag conflict (oneshot + skip) → should return skip | `node -e "const f=require('./scripts/tb-triage/relay-filters.js'); console.log(f.extractTriageTag([{name:'triage:oneshot'},{name:'triage:skip'}]))"` | `oneshot` (wrong — expected `skip`) | FAIL (WR-01) |
| Deploy script integration | `bash scripts/tests/paperclip-symlink.test.sh` | PASS | PASS |
| Full suite 65 tests | `node --test scripts/tests/*.test.js` | 65 pass, 0 fail | PASS |

### Requirements Coverage

| Requirement | Plan(s) | Description | Status | Evidence |
|-------------|---------|-------------|--------|---------|
| D-01 | 24-04 | Pipeline runtime inside Paperclip | SATISFIED | .paperclip.yaml + 3 claude_local agents deployed to Paperclip |
| D-02 | 24-04 | All authoring in tb repo (portability) | SATISFIED | companies/triage-shop/ lives in tb repo |
| D-03 | 24-04 | Skills as reusable unit, no vendoring | SATISFIED | All AGENTS.md reference skills by shortname (tb:task-github etc.) |
| D-04 | 24-03 | Assignee-gated intake | SATISFIED | shouldRelayGithub/shouldRelayJira check triageUserLogin/triageUserAccountId |
| D-05 | 24-01, 24-03, 24-07 | Webhook integration + setup doc | SATISFIED | relay.js + docs/paperclip-triage-setup.md |
| D-06 | 24-01, 24-02, 24-03 | Canonical dedup key | SATISFIED | buildDedupKey + KEY_PATTERN validation throughout |
| D-07 | 24-04 | Triage uses tb:task-github/task-jira | SATISFIED | skills: list in triage/AGENTS.md |
| D-08 | 24-04 | 3 confidence signals | SATISFIED | AGENTS.md Step 4: understanding/solution/codeTrace |
| D-09 | 24-04 | Routing rules (all-high → dispatch, else pause) | SATISFIED | AGENTS.md routing table; blocked-low-confidence path |
| D-10 | 24-03, 24-04 | Tag overrides classifier | SATISFIED | extractTriageTag + AGENTS.md tag override table — NOTE: WR-01 priority bug means skip can lose to oneshot |
| D-11 | 24-04, 24-07 | Paperclip-native human gate | SATISFIED | executionPolicy in_review; setup doc section 4 human gate |
| D-12 | 24-04 | Idiomatic Paperclip agent runtime | SATISFIED | claude_local adapter |
| D-13 | 24-04, 24-06 | Claude Code --worktree isolation | SATISFIED | .paperclip.yaml extraArgs --worktree; wrapper fallback exists; NOTE: template unsupported per Plan 04 Summary |
| D-14 | 24-02, 24-03, 24-06 | No duplicate worktrees via dedup key | SATISFIED | dedup.check before worktree dispatch |
| D-15 | 24-05 | Worktree cleanup after PR merge | SATISFIED | cleanup.js + relay pull_request branch |
| D-16 | 24-04, 24-07 | Human gate in Paperclip UI | SATISFIED | AGENTS.md executionPolicy in_review; setup doc |
| D-17 | 24-04 | Ship = open GitHub PR only | SATISFIED | oneshot AGENTS.md: PR opens in DRAFT; merge stays manual |
| D-18 | 24-04, 24-07 | Rejection re-queues with feedback | SATISFIED | oneshot AGENTS.md:36-38 changes_requested wake path |
| D-19 | 24-01, 24-02 | Ticket→repo mapping | SATISFIED | repo-map.js Paperclip autoresolve + JSON cache; null→ask-human path |
| D-20 | 24-04 | Failure/retry | SATISFIED | AGENTS.md failure handling; Paperclip native retry documented |
| D-21 | 24-04 | Telemetry — per-task decision.json | SATISFIED | triage AGENTS.md:103 writes .tb-triage/decision.json |
| D-22 | 24-02, 24-07 | Secrets via bin/resolve-credential | SATISFIED | wrapper exists; setup doc export block |
| D-23 | 24-04 | SOUL.md tone (Claude's discretion) | NEEDS HUMAN | All 3 SOUL.md files exist; user review required |
| D-24 | 24-06, 24-07 | Deploy via paperclip-symlink.sh extension | SATISFIED | COMPANIES_SOURCE loop; integration test passes |
| D-25 | 24-03, 24-04 | Tag vocabulary triage:oneshot/process/skip | PARTIALLY SATISFIED | TAG_VOCAB correct; WR-01 priority bug means skip can lose |
| D-26 | 24-04 | Confidence format: low/med/high, all-high threshold | SATISFIED | AGENTS.md uses low/med/high labels; all-high-dispatch threshold |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/tb-triage/relay-filters.js` | 23-30 | `extractTriageTag` first-match instead of priority-order | Blocker (WR-01) | `triage:skip` can lose to `triage:oneshot` if skip appears later in label array — routing contract violated |
| `scripts/tb-triage/relay.js` | 192 | `.catch(() => {})` swallows all unhandled errors | Warning (WR-05) | Silent failures in webhook handler; client hangs on uncaught errors; no observability |
| `scripts/tb-triage/relay.js` | 84-111 | TOCTOU: `check` → `await fireRoutine` → `insert` without in-flight marker | Warning (WR-02) | Concurrent webhooks can both pass the dedup check and fire twice |
| `scripts/tb-triage/relay.js` | 106-110 | Dedup insert has only `{paperclipIssueId, source, createdAt}`; cleanup requires `worktreeName/worktreeCwd/prUrl` | Warning (WR-03) | Cleanup happy path unreachable unless agent patches dedup entry; no `update()` function exists in dedup-store |
| `scripts/tb-triage/repo-map.js` | 78-81 | CLI arg parser only handles `--key=value`, not `--key value` | Warning (WR-04) | AGENTS.md invokes CLI with space form `--source <gh>` which silently fails |
| `docs/paperclip-triage-setup.md` | 178 | Hardcoded `/usr/local/bin/node` in launchd plist | Warning (WR-06) | Fails silently on Apple Silicon (brew at `/opt/homebrew/bin/node`) |
| `companies/triage-shop/agents/triage/AGENTS.md` | 54 | Uses `${PLUGIN_ROOT}` instead of `${CLAUDE_PLUGIN_ROOT}` | Warning (IN-03) | Variable not resolved by Claude Code; agent invocation will fail |
| `companies/triage-shop/.paperclip.yaml` | 29, 49 | `{{issue.metadata.worktreeCwd}}` confirmed unsupported in claude_local config.cwd | Warning | Plan 04 Summary confirms this template variable is not resolved; wrapper fallback exists but not yet wired |

### Human Verification Required

#### 1. End-to-End Smoke — Webhook to PR

**Test:** Assign a GitHub issue to the configured triage user. Confirm the webhook reaches the relay, relay fires the Paperclip triage routine, triage agent runs and classifies the issue, routes to oneshot-coder or gsd-orchestrator, coder agent runs in a worktree, diff is posted, human approval gate appears in Paperclip UI, approve it, PR opens on GitHub.
**Expected:** Draft PR visible in GitHub repo after approval; Paperclip issue shows "shipped" status.
**Why human:** Requires live Paperclip server, configured Keychain secrets, GitHub webhook subscribed via smee.io or public endpoint. No mocks can substitute for the full runtime.

#### 2. PR-Merge Cleanup Verification

**Test:** Merge the PR from step 1. Confirm the relay receives the `pull_request.closed + merged:true` webhook, matches the dedup entry (requires that entry was populated with `worktreeName/worktreeCwd/prUrl` by the agent — WR-03 must be addressed first), worktree is removed from disk, dedup entry deleted.
**Expected:** Worktree directory removed; `~/.paperclip/tb-triage/dedup.json` entry gone; relay log shows `cleaned: true`.
**Why human:** WR-03 means the dedup entry only gets `worktreeName/worktreeCwd/prUrl` if the triage/coder agent explicitly updates it. This path has no automated test; needs runtime verification.

#### 3. SOUL.md Tone Review (D-23)

**Test:** Read `companies/triage-shop/agents/triage/SOUL.md`, `oneshot-coder/SOUL.md`, and `gsd-orchestrator/SOUL.md`.
**Expected:** User approves tone or iterates in place.
**Why human:** Tone acceptance is explicitly a user judgment call (D-23: Claude's Discretion).

#### 4. Worktree Adapter Wiring Confirmation

**Test:** Run through Paperclip setup doc Step 3 (company import). Confirm whether `{{issue.metadata.worktreeCwd}}` in `.paperclip.yaml` fails at adapter load time. If it fails, edit `.paperclip.yaml` to point `oneshot-coder` and `gsd-orchestrator` adapter command at `scripts/tb-triage-worktree-wrapper.sh`, and verify the wrapper receives `TB_TRIAGE_WORKTREE_NAME` from Paperclip env pass-through.
**Expected:** Either (a) template works and nothing changes, or (b) `.paperclip.yaml` is updated to use wrapper and confirmed working.
**Why human:** Requires a running Paperclip instance; cannot be verified from static file inspection.

### Gaps Summary

**1 automated gap blocking full phase goal:**

**WR-01 — Tag-priority routing bug:** `extractTriageTag` in `relay-filters.js` iterates label array and returns the first label that matches any entry in `TAG_VOCAB`. The D-10/D-25 contract requires `triage:skip` to beat `triage:oneshot` to beat `triage:process` regardless of array order. A reviewer who adds `triage:skip` to an already-labeled `triage:oneshot` issue expects the pipeline to halt — instead it dispatches to the oneshot coder. The fix (add `TAG_PRIORITY` constant, scan in priority order) is documented in 24-REVIEW.md WR-01 and is a 6-line change. The accompanying test for the conflict case must also be added.

**Known warnings not blocking phase completion (per prompt: addressable via `/gsd-code-review-fix`):**

- WR-02: TOCTOU race in dedup check/insert (concurrent webhook duplicate fire)
- WR-03: Relay dedup insert missing worktreeName/worktreeCwd/prUrl fields (cleanup happy path unreachable until agent patches entry; no `update()` in dedup-store)
- WR-04: repo-map CLI arg parser drops space-separated flags (`--source gh` fails; `--source=gh` works; AGENTS.md uses space form)
- WR-05: Swallowed `.catch(() => {})` in relay.js HTTP server (silent failures)
- WR-06: Hardcoded `/usr/local/bin/node` in setup doc launchd plist (breaks Apple Silicon)
- IN-03: `${PLUGIN_ROOT}` instead of `${CLAUDE_PLUGIN_ROOT}` in triage AGENTS.md (agent invocation will fail)

---

_Verified: 2026-04-15T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
