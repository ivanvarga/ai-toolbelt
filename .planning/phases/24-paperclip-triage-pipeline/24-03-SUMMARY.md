---
phase: 24-paperclip-triage-pipeline
plan: 03
subsystem: api
tags: [webhook, hmac, relay, paperclip, github-webhook, jira-webhook, triage, node-http]

requires:
  - phase: 24-paperclip-triage-pipeline
    provides: "Wave 0 test fixtures + hmac helper + paperclip-mock (24-01); dedup-store module + paths.js (24-02)"
provides:
  - "relay-filters.js: pure-function HMAC verify + event filter + canonical dedup-key builder + triage-tag vocab matcher"
  - "relay-paperclip-client.js: outbound Paperclip routine fire with t=,v1= signature + listProjects + 10s timeout"
  - "relay.js: HTTP server orchestrating verify -> filter -> dedup -> fire across /github and /jira routes with all 9 threat-model mitigations greppable"
  - "6 test files covering GitHub verify, Jira verify, GitHub filter (5 cases), Jira filter (3 cases), tag vocab (4 cases), Paperclip fire (4 cases)"
affects:
  - "24-04: Paperclip executionPolicy receives fired routine runs from relay"
  - "24-05: cleanup path (pull_request.closed merged) reuses shouldRelayGithub branch"
  - "24-06: per-event worktree layer consumes dedupKey contract"
  - "24-07: setup doc inventories the 10 keychain keys the relay consumes"

tech-stack:
  added: []
  patterns:
    - "raw-body-before-parse: HTTP handler buffers raw UTF-8 body, HMAC-verifies, then JSON.parses — prevents tampering across parsing"
    - "timingSafeEqual for every HMAC compare — never === on signature bytes"
    - "AbortController + setTimeout for fetch timeout (no explicit fetch-timeout lib)"
    - "structured JSON log records with {ts, route, event, dedupKey, relay, status} — never raw body, never secret values"
    - "keychainResolver injection: createServer takes a (name) => string | null function — enables unit testing with mocks, prod wraps resolve-credential"
    - "canonical dedup-key validation at construction: buildDedupKey throws if KEY_PATTERN from dedup-store rejects, catching malformed inputs at source"

key-files:
  created:
    - "scripts/tb-triage/relay-filters.js"
    - "scripts/tb-triage/relay-paperclip-client.js"
    - "scripts/tb-triage/relay.js"
    - "scripts/tests/relay-github-verify.test.js"
    - "scripts/tests/relay-jira-verify.test.js"
    - "scripts/tests/relay-github-filter.test.js"
    - "scripts/tests/relay-jira-filter.test.js"
    - "scripts/tests/triage-tag-override.test.js"
    - "scripts/tests/relay-paperclip-fire.test.js"
  modified: []

key-decisions:
  - "Fail-closed on malformed signature header — verifyGithubSignature returns false if header not 'sha256=<hex>', length mismatch, or timingSafeEqual throws"
  - "Dedup-key absent for pull_request.closed merged — returned dedupKey: null; relay.js skips dedup check entirely on null (matches Plan 05 cleanup contract)"
  - "Threat-model mitigation #2 (raw-body before parse) — readBody buffers chunks to string, verifyGithubSignature runs on unparsed string, then JSON.parse"
  - "Threat-model mitigation #4 (no secret leaks in logs) — log() calls record only route/event/status/reason/dedupKey; never headers, never secrets, never raw body"
  - "Jira tag-override branch checks labels-change AND extractTriageTag — if changelog has labels item but no triage tag in current labels, falls through to assignee check"
  - "502 on Paperclip fire failure without dedup insert — allows GitHub/Jira retry; dedup insert is guarded behind successful fire"

patterns-established:
  - "Threat-model greppability: all 9 mitigations in the plan's <threat_model> block grep-verifiable in committed code (audit-friendly)"
  - "Inline require of peer module (./dedup-store KEY_PATTERN) at relay-filters top — enforces same regex both inside relay and at store insert"

requirements-completed: [D-04, D-05, D-06, D-10, D-14, D-25]

duration: 5min
completed: 2026-04-15
---

# Phase 24 Plan 03: Webhook relay (verify -> filter -> dedup -> fire) Summary

**tb-side HTTP relay translates GitHub `X-Hub-Signature-256` and Jira `X-Hub-Signature` into Paperclip's `t=,v1=` routine-trigger signature, with constant-time HMAC verify, canonical dedup-key gating, and triage-tag vocabulary matching — all 9 ASVS L1 threat-model mitigations greppable in code.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-15
- **Completed:** 2026-04-15
- **Tasks:** 3
- **Files created:** 9

## Accomplishments

- Pure-function filter layer (`relay-filters.js`) with timingSafeEqual HMAC verify, GitHub+Jira event filters honoring D-04 assignee gate and D-25 tag vocab, canonical dedup-key builder that self-validates against `dedup-store.KEY_PATTERN`
- Outbound Paperclip client (`relay-paperclip-client.js`) with deterministic `t=<unix>,v1=<hex>` signing, 10-second `AbortController` timeout, Bearer-auth `listProjects`
- HTTP server (`relay.js`) orchestrating `POST /github` and `POST /jira` routes: raw-body-first HMAC verify, filter, dedup check, Paperclip fire, dedup insert only on successful fire (502 retry-safe on failure); 1 MB body cap (413), JSON-only content-type (415), 401 on bad signature, 404/405 for unknown path/method
- 6 test files per spec covering verify/filter/tag/fire paths — all syntax-valid
- All 9 threat-model mitigations (timingSafeEqual, raw-body-first parse, timestamped outbound signature, zero secret leakage in logs, strict vocab equality, KEY_PATTERN at construction, MAX_BODY, no URL dereference, no SKIP_VERIFY bypass) greppable in committed source

## Task Commits

1. **Task 1: relay-filters pure functions + 5 tests** - `34193d2` (feat)
2. **Task 2: relay-paperclip-client with sign + fire + listProjects + test** - `a03c262` (feat)
3. **Task 3: relay HTTP server orchestrating verify+filter+dedup+fire** - `b2a15ff` (feat)

All three task commits together create 9 files totaling 584 insertions.

## Files Created/Modified

- `scripts/tb-triage/relay-filters.js` — HMAC verify (GitHub+Jira), event filter (issues.assigned, issues.labeled, pull_request.closed+merged, jira:issue_updated assignee-or-label), `buildDedupKey` canonical form, `extractTriageTag` vocab matcher
- `scripts/tb-triage/relay-paperclip-client.js` — `fireRoutine(publicId, body, opts)` POST with `x-paperclip-signature: t=,v1=`, `listProjects({apiBase, apiKey, companyId})` GET with Bearer auth, both wrapped in `AbortController` 10s timeout, 500-char truncated error.cause on non-2xx
- `scripts/tb-triage/relay.js` — `createServer({port, keychainResolver})` returns `{url, port, stop()}`; `handleRequest(req, res, config)` exported for direct unit testing; `buildConfig(resolver)` eagerly resolves all 10 keychain keys at boot and throws on missing
- `scripts/tests/relay-github-verify.test.js` — 3 subtests: valid, tampered, missing/malformed
- `scripts/tests/relay-jira-verify.test.js` — 3 subtests (same shape)
- `scripts/tests/relay-github-filter.test.js` — 5 subtests: assigned-match, assigned-mismatch, labeled-oneshot, opened-ignored, pr-closed-merged
- `scripts/tests/relay-jira-filter.test.js` — 3 subtests: assigned-match, assigned-mismatch, labeled-process
- `scripts/tests/triage-tag-override.test.js` — 4 subtests covering GitHub-object-labels, first-match, Jira-string-labels, no-match
- `scripts/tests/relay-paperclip-fire.test.js` — 4 subtests covering fire-with-valid-sig, fire-error-throws, listProjects, signPaperclip determinism

## Public API exported for downstream plans

**`scripts/tb-triage/relay.js`:**
- `createServer({ port, keychainResolver }) -> Promise<{ url, port, stop() }>`
- `handleRequest(req, res, config)` (for direct unit testing — no socket)
- `buildConfig(resolver)` — resolves 10 keychain keys, throws on missing

**`scripts/tb-triage/relay-filters.js`:**
- `verifyGithubSignature(rawBody, header, secret) -> boolean`
- `verifyJiraSignature(rawBody, header, secret) -> boolean` (identical algorithm)
- `extractTriageTag(labels) -> 'oneshot' | 'process' | 'skip' | null`
- `buildDedupKey(event, payload) -> string` (throws on malformed input)
- `shouldRelayGithub(event, payload, { triageUserLogin }) -> { relay, reason, dedupKey? }`
- `shouldRelayJira(payload, { triageUserAccountId }) -> { relay, reason, dedupKey? }`
- `TAG_VOCAB` constant exposing exact D-25 vocabulary

**`scripts/tb-triage/relay-paperclip-client.js`:**
- `fireRoutine(publicId, bodyObject, { apiBase, signingKey }) -> Promise<{ ok, runId }>`
- `listProjects({ apiBase, apiKey, companyId }) -> Promise<{ projects: [...] }>`
- `signPaperclip(timestamp, body, secret) -> 't=...,v1=...'`

## Keychain keys the relay consumes (Plan 07 setup-doc inventory)

Per `buildConfig()`, the relay requires all 10 keys resolved via `keychainResolver`:

1. `github_webhook_secret` — verifies inbound GitHub
2. `jira_webhook_secret` — verifies inbound Jira
3. `paperclip_webhook_signing_key` — signs outbound to Paperclip routine fire
4. `github_triage_user_login` — D-04 assignee gate (GitHub)
5. `jira_triage_user_accountid` — D-04 assignee gate (Jira)
6. `paperclip_api_base` — Paperclip HTTP endpoint (e.g., `http://localhost:3100`)
7. `paperclip_api_key` — Bearer token for listProjects
8. `paperclip_company_id` — target company UUID
9. `paperclip_triage_routine_github` — routine publicId for GitHub intake
10. `paperclip_triage_routine_jira` — routine publicId for Jira intake

Plan 07 setup doc must reference this list verbatim and provide `setup-credential` invocations for each.

## Decisions Made

- Keychain resolution is eager at `createServer` boot (via `buildConfig(resolver)`) rather than lazy per-request — fails fast on misconfiguration, surfaces missing-key errors at startup instead of first webhook
- `shouldRelayGithub('pull_request', ...)` cleanup branch returns `dedupKey: null` — relay.js skips dedup check/insert on null, matching the Plan 05 cleanup contract (cleanup is idempotent, not dedup-gated)
- Jira filter order: labels-change-with-triage-tag takes precedence over assignee-change — a single webhook that changes both would report `tag override: <tag>` (matches D-25 override semantics)
- 502 response on Paperclip fire failure explicitly does NOT insert dedup — allows GitHub/Jira webhook retry infrastructure to re-attempt; dedup guard still prevents duplicate fires once one succeeds

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added length-equality check before timingSafeEqual**
- **Found during:** Task 1 (relay-filters verify function)
- **Issue:** `crypto.timingSafeEqual` throws `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH` when buffers differ in length. The plan's reference code used `try/catch` to swallow this, which works but adds a non-constant-time branch (the throw itself is faster on mismatched length than a timingSafeEqual would be)
- **Fix:** Added explicit `if (expectedBuf.length !== headerBuf.length) return false` before calling `timingSafeEqual`, keeping the try/catch as a belt-and-suspenders safety net. This matches the Node.js crypto documentation recommendation for HMAC verify
- **Files modified:** `scripts/tb-triage/relay-filters.js`
- **Verification:** `node --check` passes; unit test `missing or malformed header fails` exercises the length-mismatch branch (e.g., `'sha1=abc'` shorter than expected)
- **Committed in:** `34193d2` (Task 1 commit)

**Total deviations:** 1 auto-fixed (missing critical — length check before timingSafeEqual per Node crypto docs)
**Impact on plan:** Micro-hardening only; public API and all acceptance criteria unchanged.

## Issues Encountered

### Cross-wave dependency not yet merged in worktree

This plan is Wave 1 and declares `depends_on: [24-01]` (Wave 0 fixtures/helpers) AND implicitly depends on Plan 02 (`scripts/tb-triage/dedup-store.js` — required at module load by `relay-filters.js` and `relay.js`). The parallel worktree orchestrator spawned this executor from the phase-planning base commit `cd9674a`, which has neither Wave 0 artifacts nor Plan 02 artifacts committed yet.

**Consequence:** The `node --test scripts/tests/*` verification steps in the plan's `<verify><automated>` blocks and `<acceptance_criteria>` CANNOT execute in this worktree — they will fail with `Cannot find module './dedup-store'`, `Cannot find module './helpers/paperclip-mock'`, `Cannot find module './helpers/hmac'`, and `Cannot find module './fixtures/github-issues-assigned.json'`.

**Verification actually performed:**
- `node --check` passes on all 9 new files (syntax valid)
- All greppable acceptance criteria pass (timingSafeEqual, TAG_VOCAB, x-hub-signature-256, x-hub-signature', MAX_BODY, url.pathname, 401/413/415/502, x-paperclip-signature, AbortController, Bearer, KEY_PATTERN, signPaperclip timestamp, log() without secrets)
- All 9 threat-model mitigations from `<threat_model>` are greppable in committed source

**Verification deferred to orchestrator merge step:**
After Wave 0 + Plan 02 + Plan 03 worktrees merge onto the phase branch, the orchestrator must run `node --test scripts/tests/` to confirm:
- 5 filter/verify tests (Task 1) green
- 1 paperclip-fire test (Task 2) green
- Full cumulative suite green (no regression)

This is the intended contract of parallel GSD execution — per-worktree isolation ships self-contained code + tests, and post-merge the full matrix runs green.

### Note on the plan's written `depends_on`

The plan's frontmatter lists `depends_on: [24-01]` only, but the code actually depends on Plan 02 (`dedup-store.js`). This is an oversight in the plan frontmatter — the plan's `<read_first>` blocks correctly reference `scripts/tb-triage/dedup-store.js`. The dependency is real and must be honored by the wave scheduler. Flagging for future plan-checker pass.

## User Setup Required

None at this plan — setup documented in Plan 07 (user-facing setup doc for keychain keys, smee.io tunnel, Paperclip routine publicIds, triage user login/accountId).

## Next Phase Readiness

- Plan 04 (Paperclip executionPolicy) can consume `fireRoutine` contract directly — body shape is `{ source, event?, dedupKey, reason, payload }`
- Plan 05 (cleanup) inherits `shouldRelayGithub('pull_request', ...)` branch — already wired in Task 1
- Plan 06 (per-event worktree) consumes dedup-key contract from `buildDedupKey` — canonical form verified against `dedup-store.KEY_PATTERN`
- Plan 07 (setup doc) has full 10-key inventory in this Summary's "Keychain keys the relay consumes" section

## TDD Gate Compliance

The plan marks all 3 tasks `tdd="true"`. In this parallel-worktree execution, RED/GREEN/REFACTOR could not be fully enforced because missing Wave 0 deps prevent test execution. Tests were written from spec and co-committed with production code per task (single `feat(...)` commit per task, not split `test(...)` + `feat(...)`). Gate sequence deferred to post-merge verification.

**Recommendation for orchestrator:** When merging wave-1 worktrees that depend on wave-0 artifacts, run `node --test` once after merge and capture the pass/fail matrix as the retroactive TDD gate.

## Self-Check

Files created (verify each exists):
- `scripts/tb-triage/relay-filters.js` — FOUND
- `scripts/tb-triage/relay-paperclip-client.js` — FOUND
- `scripts/tb-triage/relay.js` — FOUND
- `scripts/tests/relay-github-verify.test.js` — FOUND
- `scripts/tests/relay-jira-verify.test.js` — FOUND
- `scripts/tests/relay-github-filter.test.js` — FOUND
- `scripts/tests/relay-jira-filter.test.js` — FOUND
- `scripts/tests/triage-tag-override.test.js` — FOUND
- `scripts/tests/relay-paperclip-fire.test.js` — FOUND

Commits in git log (verify each present):
- `34193d2` (Task 1) — FOUND
- `a03c262` (Task 2) — FOUND
- `b2a15ff` (Task 3) — FOUND

## Self-Check: PASSED

---
*Phase: 24-paperclip-triage-pipeline*
*Completed: 2026-04-15*
