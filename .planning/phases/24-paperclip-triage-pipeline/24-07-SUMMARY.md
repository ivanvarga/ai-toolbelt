---
phase: 24-paperclip-triage-pipeline
plan: 07
subsystem: docs
tags: [setup-doc, webhooks, github, jira, paperclip, triage, keychain, validation, nyquist]

requires:
  - phase: 24-paperclip-triage-pipeline
    provides: "24-01..24-06 artifacts (relay, cleanup, companies, deploy) — names + paths referenced verbatim in the setup doc"
provides:
  - "docs/paperclip-triage-setup.md — D-05 research-backed setup-instruction document"
  - "24-VALIDATION.md finalized — 18-row per-task verification map, nyquist_compliant: true, wave_0_complete: true, sign-off ✅ ×6"
affects: []

tech-stack:
  added: []
  patterns:
    - "Docs-only plan — no new runtime code, no new tests"
    - "Two-pass keychain seeding documented (placeholders for IDs that only exist after Paperclip company import)"
    - "Per-secret `export VAR=$(bin/resolve-credential key)` block — operator start command (W3 acceptance)"
    - "Option A (native webhook / HMAC) vs Option B (Automation-for-Jira, DEV-ONLY) — B1 fix documents that relay has no bypass"

key-files:
  created:
    - docs/paperclip-triage-setup.md
  modified:
    - .planning/phases/24-paperclip-triage-pipeline/24-VALIDATION.md

key-decisions:
  - "Docs-only plan — two tasks, both static file edits; full node suite + bash integration test re-run as regression gate with no code changes"
  - "Option B (Automation-for-Jira) framed as DEV-ONLY with an explicit note that the relay enforces verifyJiraSignature unconditionally; operators running Option B must replay via a local signing proxy, NOT by patching relay.js"
  - "Two-pass keychain seeding (Step 1 → Step 3 → return to Step 1) called out inline — avoids the chicken-and-egg problem where paperclip_company_id / api_key / routine publicIds only exist after company import"
  - "GitHub webhook event subscription requires BOTH `issues` AND `pull_request` — explicit in Step 5 #6 and in `gh api` payload; without pull_request the D-15 cleanup path is silent and worktrees accumulate"
  - "24-VALIDATION.md statuses flipped to ✅ green for rows 24-01-T1..24-07-T2 — all phase-level gates (node --test 65/65, bash paperclip-symlink PASS) verified green on the Wave 2 merged base"

patterns-established:
  - "Setup-doc layout: Prerequisites → Keychain → Deploy → Import → Start relay → Tunnel → GitHub/Jira setup → Smoke → Overrides → Troubleshooting → Rotate"
  - "Per-secret export block is the canonical operator recipe for starting tb-triage and Paperclip in the same shell"

requirements-completed: [D-05, D-11, D-16, D-18, D-22, D-24]

duration: ~6min
completed: 2026-04-15
---

# Phase 24 Plan 07: Operator Setup Doc + Validation Finalization Summary

**`docs/paperclip-triage-setup.md` walks an operator end-to-end: keychain (10 secrets, two-pass seed), deploy via `/tb:update`, Paperclip company import + restart, relay + Paperclip start commands (per-secret `bin/resolve-credential` exports), smee.io dev tunnel, GitHub + Jira webhook setup (native + DEV-ONLY Automation fallback), end-to-end smoke, tag overrides, troubleshooting, rotate / revoke — and `24-VALIDATION.md` is finalized with an 18-row per-task map and `nyquist_compliant: true`.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-15T14:08:26Z
- **Completed:** 2026-04-15T14:14:19Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 1

## Accomplishments

- `docs/paperclip-triage-setup.md` (353 lines) — D-05 deliverable. Covers all 4 threat-model mitigations (mis-documented secret handling, weak-secret guidance, smee.io-on-prod, rotate/revoke procedure), all 10 keychain entries, both Jira paths (native + Automation), two-pass keychain seeding pattern, per-secret `bin/resolve-credential` export block, launchd plist template, end-to-end smoke (12 steps), tag overrides, troubleshooting matrix, rotate/revoke procedure.
- `24-VALIDATION.md` finalized — frontmatter flipped (`nyquist_compliant: true`, `wave_0_complete: true`, `status: ready`, `finalized: 2026-04-15`); Per-Task Verification Map populated with 18 rows (3/3/3/3/2/2/2 across Plans 01-07); all rows marked ✅ green; all 6 sign-off boxes checked; approval line flipped to `planner-approved 2026-04-15`; Test Infrastructure concrete runtime filled in (~10s full gate).
- Phase-level regression gate confirmed: `node --test scripts/tests/*.test.js` → **65/65 pass, 0 fail** (scaffold 4, dedup-store 4, repo-map 5, relay-* 10+, cleanup 7+1, companies 10, triage-tag-override 4); `bash scripts/tests/paperclip-symlink.test.sh` → `PASS`.

## Task Commits

1. **Task 1: Write docs/paperclip-triage-setup.md** — `7c6112c` (docs)
2. **Task 2: Populate 24-VALIDATION.md Per-Task Verification Map and flip nyquist_compliant** — `ab200b4` (docs)

## Files Created/Modified

### Created

- `docs/paperclip-triage-setup.md` — operator-facing setup guide, 353 lines, Prerequisites → Architecture → Step 1 Keychain → Step 2 Deploy → Step 3 Company create → Step 4 Relay start (per-secret exports) → Step 5 smee.io → GitHub (Option A UI + Option B `gh api`) → Jira (Option A native + Option B DEV-ONLY Automation) → End-to-end smoke → Tag overrides → Troubleshooting → Rotate / revoke.

### Modified

- `.planning/phases/24-paperclip-triage-pipeline/24-VALIDATION.md` — frontmatter flipped, Test Infrastructure filled, Per-Task Verification Map populated (18 rows), Wave 0 Requirements ticked (6), Validation Sign-Off ticked (6), Approval set to `planner-approved 2026-04-15`.

## Acceptance Criteria (per Task)

### Task 1 (17 grep checks — all pass)

- `test -f docs/paperclip-triage-setup.md` ✅
- Required sections present: `## Prerequisites`, `## GitHub setup`, `## Jira setup`, `## Troubleshooting`, `## Rotate` ✅
- 10 keychain entries referenced (≥10 matches required; doc has 33) ✅
- Tag vocabulary present: `triage:(oneshot|process|skip)` ✅
- Both Jira options documented: `Option A`, `Option B` ✅
- Threat mitigation surfaces: `smee.io is DEV-ONLY`, `openssl rand -hex 32`, `bin/resolve-credential`, `restart Paperclip`, `pull_request`, `DEV ONLY` ✅
- B1 hardening: `! grep SKIP_VERIFY_DEV`, `! grep patch relay.js` ✅
- I2 (two-pass seeding): `return here after Step 3` ✅
- W3 (per-secret resolve-credential exports): ≥5 matches (doc has 10) ✅
- Key link to `scripts/tb-triage/relay.js` greppable ✅

### Task 2 (7 checks — all pass)

- `nyquist_compliant: true` ✅
- `wave_0_complete: true` ✅
- Task rows ≥ 18 (exact: 18) ✅
- Per-plan floor: 01→3, 02→3, 03→3, 04→3, 05→2, 06→2, 07→2 (W1) ✅
- `planner-approved` present ✅
- All plans 01-07 appear in Plan column (I1) ✅
- `24-07-T2` row present ✅

## D-01 through D-26 — Cross-Plan Requirements Coverage

All 26 decisions from `24-CONTEXT.md` appear in at least one plan's `requirements-completed` frontmatter:

| D-Ref | Plan(s) |
|-------|---------|
| D-01, D-02, D-03 | 24-04 |
| D-04 | 24-03 |
| D-05 | 24-01, 24-03, 24-07 |
| D-06 | 24-01, 24-02, 24-03 |
| D-07, D-08, D-09 | 24-04 |
| D-10 | 24-03, 24-04 |
| D-11 | 24-04, 24-07 |
| D-12 | 24-04 |
| D-13 | 24-04, 24-06 |
| D-14 | 24-02, 24-03, 24-06 |
| D-15 | 24-05 |
| D-16 | 24-04, 24-07 |
| D-17 | 24-04 |
| D-18 | 24-04, 24-07 |
| D-19 | 24-01, 24-02 |
| D-20, D-21 | 24-04 |
| D-22 | 24-02, 24-07 |
| D-23 | 24-04 |
| D-24 | 24-06, 24-07 |
| D-25 | 24-03, 24-04 |
| D-26 | 24-04 |

**Coverage: 26/26 decisions addressed across Plans 01-07. Phase scope closed.**

## Phase-Level Verification

- `node --test scripts/tests/*.test.js` → `tests 65, pass 65, fail 0, duration_ms 144.38` ✅
- `bash scripts/tests/paperclip-symlink.test.sh` → `PASS: paperclip-symlink.test.sh` ✅
- This plan added zero new runtime code — the gate re-run is a regression check only, confirming the Wave 2 merged base is still green.

## Threat Model Mitigations (all 4 documented)

| # | Threat | Mitigation greppable in doc |
|---|--------|-------------------------------|
| 1 | Mis-documented secret handling | `node scripts/setup-credential.js <name>` interactive prompt; no inline env var assignment with secret values — only Keychain service key names referenced |
| 2 | Weak secret guidance | `openssl rand -hex 32` mandated in Step 1 and Rotate sections |
| 3 | smee.io on production | Explicit blockquote `smee.io is DEV-ONLY` in Step 5; `DEV ONLY` repeated in Jira Option B |
| 4 | Missing rotate procedure | `## Rotate / revoke` section with 4-step rotate + 3-step revoke instructions |

## Residual Manual Steps at Setup Time

These are genuinely manual (UI interactions, subjective confirmations, or values that only exist post-import) — all documented in the setup doc, none automated per D-24 locked scope:

1. **Generate 10 webhook secrets** via `openssl rand -hex 32` and paste into `setup-credential.js` prompts (manual because Keychain prompt requires TTY).
2. **Restart Paperclip OR run `paperclipai company import`** after `/tb:update` (Research Open Question #2 — no auto-rescan; operator chooses restart vs. CLI import).
3. **Click through Paperclip UI** to confirm 3 agents + 2 routines appear, copy `companyId` / `apiKey` / routine `publicId` (values exist only after import; Step 3 round-trips back to Step 1 to overwrite placeholders).
4. **Create GitHub webhook** via Settings UI (Option A) or `gh api` (Option B) — subscribing to BOTH `issues` AND `pull_request` events.
5. **Create Jira webhook** — Option A (native with HMAC) preferred; Option B (Automation-for-Jira, DEV-ONLY) documented with the caveat that the relay has no HMAC-bypass and Option B traffic will 401 without a signing proxy.
6. **SOUL.md tone review (D-23)** — subjective taste decision; user reads agent SOUL.md files and approves or iterates (not doc scope; mentioned in 24-VALIDATION.md manual-only table).
7. **End-to-end smoke** — 12-step manual procedure in the doc (assign issue → Paperclip UI → approve → PR opens → merge → cleanup).

## Decisions Made

- **Single-file doc (one `.md`, not split GitHub+Jira files).** Per 24-RESEARCH.md §Setup-Instruction Deliverable Shape — one place to read end-to-end; shared-prerequisite problem is solved by a shared preamble.
- **Two-pass seeding called out inline.** The note after Step 1 + the "return here after Step 3" sentence make the chicken-and-egg ordering explicit, rather than hoping operators infer it from the order of fields.
- **Option B framed as DEV-ONLY with explicit `relay.js` hardening note.** The setup doc states the relay enforces `verifyJiraSignature` unconditionally, that Automation-for-Jira cannot sign, and that the remediation is a local signing proxy — NOT patching the relay. This closes the B1 plan-checker concern that Option B could be read as a bypass instruction.
- **Per-secret `export` block rather than a single loop.** Task 1 requires ≥5 `export VAR=$(bin/resolve-credential key)` lines (W3 acceptance); the operator recipe shows 10 explicit exports so the operator can comment-out any subset without fighting a loop macro.
- **24-VALIDATION.md statuses flipped to ✅ green.** Phase-level gates confirmed green on the Wave 2 merged base; there is no pending work between plan commits and the sign-off, so flipping rows to green at the same time as `nyquist_compliant: true` is honest.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] Explicit `scripts/tb-triage/relay.js` reference added to Step 4 prose**

- **Found during:** Task 1 verification pass on `must_haves.key_links` patterns
- **Issue:** The plan's `must_haves.key_links` entry requires the regex `scripts/tb-triage/relay\.js` to be greppable in the doc. The initial draft referenced `require('./scripts/tb-triage/relay')` (no `.js` suffix, which is how Node's `require()` works), but the literal pattern in `must_haves` includes the `.js` suffix. Without the literal `.js` match, the plan-checker's `key_links` verification would fail.
- **Fix:** Added a short parenthetical in Step 4's opening sentence: `The relay resolves its 10 secrets at startup (source: \`scripts/tb-triage/relay.js\`).` This makes the literal pattern greppable without distorting the operator recipe.
- **Files modified:** `docs/paperclip-triage-setup.md`
- **Verification:** `grep -n "scripts/tb-triage/relay\.js" docs/paperclip-triage-setup.md` → line 118 matches.
- **Committed in:** `7c6112c` (Task 1 commit — inline edit before the first commit).

### Scope-faithful notes

- Plan's Step 5 #6 GitHub-UI bullet was expanded with an inline parenthetical `"(the pull_request event is REQUIRED — without it the relay never receives pull_request.closed merged and worktrees accumulate indefinitely; see D-15 cleanup contract)"` to address the executor-prompt reminder that 24-05's cleanup path REQUIRES `pull_request` in the event subscription list. The Option B `gh api` block was also extended with a paragraph reinforcing the requirement (after the code block). Both additions are consistent with the plan's original `grep -q "pull_request"` acceptance criterion and 24-05's closing recommendation.

---

**Total deviations:** 1 auto-fixed (Rule 2 — literal pattern match for key_links).
**Impact on plan:** None on deliverables; doc content and structure exactly as specified, with one parenthetical added + one warning paragraph expanded inline per 24-05 Summary's closing recommendation.

## Issues Encountered

- **Worktree base drift at startup.** `git merge-base HEAD ec08f3a...` returned `6183411` (plugin-release commit) instead of the expected Wave 2 merge. Hard-reset to `ec08f3a...` succeeded and HEAD matched. No content changes; proceeding on the correct base was necessary to reference the merged Wave 2 test files for regression verification.

## Threat Flags

None. This plan ships documentation only; no new network endpoints, no new auth paths, no new code. The doc itself is a security-relevant artifact (it drives operator behavior with secrets) and is covered by the plan's own `<threat_model>` block (4 mitigations, all greppable).

## User Setup Required

At doc-ship time: none. The doc is the setup guide — the operator runs through it end-to-end on their first integration pass. No pre-requisite steps the plan owner needs to perform.

## Known Stubs

None. The `{{YOUR_CHANNEL}}` and `{{YOUR_JIRA_CHANNEL}}` placeholders in the smee.io commands are intentional user-fillable values, not stubs. The `/Users/YOU/...` path in the launchd plist template is a canonical Apple-docs idiom for "substitute your path" — not a stub.

## Next Phase Readiness

- **Phase 24 execution complete.** All 7 plans shipped. Wave 3 is the phase terminator.
- **Next action (post-orchestrator merge of this plan):** operator runs through `docs/paperclip-triage-setup.md` end-to-end on a test repo, performs the 12-step end-to-end smoke, confirms a PR opens. Any gaps discovered there flow into a follow-up phase / hotfix.
- **No blockers.**

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: `docs/paperclip-triage-setup.md` (353 lines)
- FOUND: `.planning/phases/24-paperclip-triage-pipeline/24-VALIDATION.md` (99 lines; was 82)

**Commits verified in git log:**
- FOUND: `7c6112c` (Task 1 — docs(24-07): add paperclip-triage-pipeline setup doc)
- FOUND: `ab200b4` (Task 2 — docs(24-07): finalize validation map and flip nyquist_compliant)

**Phase-level verification:**
- `node --test scripts/tests/*.test.js` → 65 pass, 0 fail, 144ms
- `bash scripts/tests/paperclip-symlink.test.sh` → `PASS`

**Task 1 acceptance criteria:** 17/17 grep checks pass (see Acceptance Criteria section above for individual check list).

**Task 2 acceptance criteria:** 7/7 checks pass including the per-plan row-count floor (3,3,3,3,2,2,2) and the "every plan 01-07 appears in the Plan column" loop.

---
*Phase: 24-paperclip-triage-pipeline*
*Completed: 2026-04-15*
