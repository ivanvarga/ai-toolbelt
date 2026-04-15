---
phase: 24-paperclip-triage-pipeline
plan: 04
subsystem: agent-companies
tags: [agentcompanies, paperclip, claude_local, triage, gsd, worktree]

requires:
  - phase: 24-paperclip-triage-pipeline
    provides: Plan 24-01 domain model + D-26 label vocabulary + dedupKey shape
provides:
  - AgentCompanies v1-draft company package at companies/triage-shop/
  - COMPANY.md + .paperclip.yaml sidecar (3 claude_local agents + 2 webhook routines)
  - triage / oneshot-coder / gsd-orchestrator AGENTS.md + SOUL.md pairs
  - scripts/tests/companies-artifacts.test.js structural gate
affects: [24-05-webhook-relay, 24-06-deploy, 24-07-operator-setup]

tech-stack:
  added:
    - AgentCompanies v1-draft schema
    - Paperclip claude_local adapter config
    - node:test structural assertion suite
  patterns:
    - "Skills referenced by shortname (tb:task-github, tb:pr-submit) — no skill vendoring (D-03)"
    - "Untrusted content boundary: issue body / comments / diff text flagged in every AGENTS.md"
    - "Telemetry via <worktree>/.tb-triage/decision.json (D-21)"
    - "executionPolicy wiring for human gate on done transition (D-11, D-16)"

key-files:
  created:
    - companies/triage-shop/COMPANY.md
    - companies/triage-shop/.paperclip.yaml
    - companies/triage-shop/agents/triage/AGENTS.md
    - companies/triage-shop/agents/triage/SOUL.md
    - companies/triage-shop/agents/oneshot-coder/AGENTS.md
    - companies/triage-shop/agents/oneshot-coder/SOUL.md
    - companies/triage-shop/agents/gsd-orchestrator/AGENTS.md
    - companies/triage-shop/agents/gsd-orchestrator/SOUL.md
    - scripts/tests/companies-artifacts.test.js
  modified: []

key-decisions:
  - "Open Question #7 resolved: claude_local adapter templates only support {{agentId}}, {{companyId}}, {{runId}}, {{agent.name}}, {{company.name}}. {{issue.metadata.*}} is NOT supported on config.cwd. Plan 06 Task 2 wrapper-script fallback is REQUIRED."
  - "Env inputs use requirement: optional (adapter-inherit parent env) per threat #2 mitigation — no inline value: fields; operator pre-resolves via bin/resolve-credential before starting Paperclip server."
  - "All 3 AGENTS.md include explicit 'untrusted content' boundary statement — prompt injection mitigation (threat #1) at instruction layer."

patterns-established:
  - "AgentCompanies frontmatter contract: schema + kind + slug + name + reportsTo + skills[] in every AGENTS.md"
  - "SOUL.md layout: Principles / Tone / Uncertainty handling / Trusted content / Untrusted content / What you do not do"
  - "Skill shortname reference (tb:task-github) over skill body inclusion — Paperclip resolves via spec §8"

requirements-completed: [D-01, D-02, D-03, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-16, D-17, D-18, D-20, D-21, D-23, D-25, D-26]

duration: 5min
completed: 2026-04-15
---

# Phase 24 Plan 04: AgentCompanies Artifact Bundle Summary

**8 AgentCompanies v1-draft markdown + YAML files define the triage-shop company: 3 claude_local agents (triage / oneshot-coder / gsd-orchestrator), 2 webhook routines (intake-github / intake-jira), skill-shortname references only, structural test gate.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T12:45:31Z
- **Completed:** 2026-04-15T12:50:55Z
- **Tasks:** 3
- **Files modified:** 9 created (0 modified)

## Accomplishments

- Company root (COMPANY.md + .paperclip.yaml) with AgentCompanies v1-draft frontmatter and 3 claude_local adapter configs
- Triage agent instructions encode D-08 three confidence signals, D-09 routing table, D-10/D-25 tag override vocabulary, D-26 label vocabulary with all-three-high auto-dispatch threshold
- Oneshot and GSD orchestrator instructions encode D-13 worktree binding, D-16 diff-comment evidence pattern, D-17 PR-opening contract, D-18 changes_requested re-queue, D-20 failure handling, D-21 telemetry
- Three SOUL.md drafts (D-23) establishing principles / tone / uncertainty handling — user reviews per checkpoint reminder
- 10-subtest node:test structural suite asserts every must_have truth with greppable conditions

## Task Commits

1. **Task 1: Create COMPANY.md + .paperclip.yaml sidecar** — `cc7434f` (feat)
2. **Task 2: Create triage agent AGENTS.md + SOUL.md** — `73d433a` (feat)
3. **Task 3: Create oneshot + orchestrator + structural test** — `49ffe6e` (feat)

**Plan metadata:** to be committed as part of SUMMARY commit (docs)

## Files Created/Modified

### Created
- `companies/triage-shop/COMPANY.md` — AgentCompanies v1-draft company entrypoint (slug: triage-shop, goals, secret requirements)
- `companies/triage-shop/.paperclip.yaml` — 3 claude_local agent configs + 2 webhook routines (hmac_sha256) + env inputs
- `companies/triage-shop/agents/triage/AGENTS.md` — triage classifier: tag override, 3 confidence signals, routing, telemetry
- `companies/triage-shop/agents/triage/SOUL.md` — triage principles, tone, uncertainty handling
- `companies/triage-shop/agents/oneshot-coder/AGENTS.md` — single-heartbeat coder: worktree binding, PR contract, changes_requested flow
- `companies/triage-shop/agents/oneshot-coder/SOUL.md` — oneshot scope discipline + minimal-diff principle
- `companies/triage-shop/agents/gsd-orchestrator/AGENTS.md` — GSD autonomous workflow dispatch (no discuss phase per D-09)
- `companies/triage-shop/agents/gsd-orchestrator/SOUL.md` — orchestrator verify-mandatory principle, worktree discipline
- `scripts/tests/companies-artifacts.test.js` — 10-subtest node:test structural gate

### Modified
None.

## Skill shortnames referenced (cross-check for Plan 06 deploy)

All skills are referenced by shortname per D-03 — no skill body is vendored under `companies/`. Plan 06 deploy must ensure these skills are present in Paperclip's skill library:

- `tb:task-github` — triage, oneshot-coder, gsd-orchestrator
- `tb:task-jira` — triage, oneshot-coder, gsd-orchestrator
- `tb:pr-submit` — oneshot-coder, gsd-orchestrator
- `tb:pr-describe` — oneshot-coder, gsd-orchestrator

Resolution path (spec §8): Paperclip resolves `tb:task-github` → tb repo's `skills/task-github/SKILL.md` after the Wave 2 deploy symlinks the package into `PAPERCLIP_ROOT/companies/`. All four skills exist in the current tb repo at `skills/{task-github,task-jira,pr-submit,pr-describe}/`.

## Decisions Made

### Open Question #7 status: RESOLVED — fallback REQUIRED

Paperclip's `claude_local` adapter (per `/Users/ivarga/Projects/paperclip/docs/adapters/claude-local.md`) documents `{{variable}}` substitution but the supported variables are ONLY:

- `{{agentId}}`, `{{companyId}}`, `{{runId}}`, `{{agent.name}}`, `{{company.name}}`

`{{issue.metadata.worktreeCwd}}` is NOT in the documented set. The `.paperclip.yaml` was authored with the templated form per the plan's baseline, but this **will not resolve at runtime as written**. Plan 06 Task 2's conditional wrapper-script fallback is therefore mandatory:

- Wrapper shell script receives worktree path via env var from Paperclip (adapter passes env cleanly)
- Wrapper execs `claude --worktree <name>` with the correct cwd
- `.paperclip.yaml` adapter config points at wrapper instead of `claude` directly

The Open Question block in Plan 06 should be updated from "if unsupported" to "required — confirmed unsupported".

### Env input strategy (threat #2 mitigation)

Env inputs (`ANTHROPIC_API_KEY`, `GH_TOKEN`) declared with `kind: secret, requirement: optional` — adapter inherits parent process env. Operator pre-resolves via `bin/resolve-credential` before starting Paperclip server (locked in Plan 07 Task 1 setup doc Step 4). This avoids inline `value:` fields (threat #2 mitigation).

### Prompt-injection mitigation (threat #1)

All 3 AGENTS.md include an explicit "untrusted content warning" section stating that issue body, comments, and diff text are attacker-controlled data. SOUL.md files reinforce with a "Trusted content / Untrusted content" split. This is an instruction-layer mitigation — no code enforcement, per plan design.

### User review checkpoint (D-23)

SOUL.md drafts are initial generation per plan research recommendation. User is expected to review tone and iterate in place. The three SOULs share structure (Principles / Tone / Uncertainty handling / Trusted content / What you do not do) but vary in specific content per agent role.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan-level verification used `node --test scripts/tests/`**

- **Found during:** Task 3 verification
- **Issue:** `node --test scripts/tests/` fails with MODULE_NOT_FOUND on Node 24.12.0 — Node treats the bare directory arg as a module path, not a test directory spec.
- **Fix:** Verified with `node --test "scripts/tests/*.test.js"` which enumerates the single test file. The documented test suite passes with all 11 tests (1 top + 10 subtests).
- **Files modified:** None — command-invocation issue, not content.
- **Verification:** `node --test "scripts/tests/*.test.js"` exits 0 with `# pass 11` / `# fail 0`.
- **Committed in:** No new commit (infra observation only).

**Note:** Acceptance criterion wording `node --test scripts/tests/` is carried through unchanged in the plan text. Plan 05/06 and future tests should use the glob form or a package.json `test` script. Flagged for Plan 07 setup doc consideration.

---

**Total deviations:** 1 auto-fixed (1 command-invocation / non-content issue)
**Impact on plan:** None on deliverables; test suite passes; content and contract are exactly as specified.

## Issues Encountered

None.

## Threat Flags

None — threat surface in this plan (markdown + YAML authoring) is fully covered by the plan's `<threat_model>` section (threats #1-4). All mitigations documented:

- Threat #1 (prompt injection): "untrusted content" phrase present in all 3 AGENTS.md files (grep-verified in tests).
- Threat #2 (secrets leak): no inline `value:` fields in `.paperclip.yaml` (grep-verified in tests).
- Threat #3 (branch injection): coder AGENTS.md Step 2 pins branch name to `worktree-${issue.metadata.worktreeName}` (derived from dedupKey-validated input).
- Threat #4 (skill collision): all skills use `tb:` prefix; no action needed in this plan.

## User Setup Required

None — no external service configuration introduced by this plan. Operator setup is consolidated in Plan 07's `docs/paperclip-triage-setup.md` (future plan).

## Known Stubs

None. All files contain complete content; no placeholder values, TODOs, or "coming soon" markers. The `.paperclip.yaml` template variable `{{issue.metadata.worktreeCwd}}` is not a stub — it reflects the plan's baseline design with the wrapper-script fallback scheduled for Plan 06 (Open Question #7 resolution documented above).

## Next Phase Readiness

- **Wave 1 complete for this plan.** Paired with Plan 24-03 (domain & adapters) in the same wave; both are structural foundations.
- **Unblocks Plan 24-05 (webhook relay):** Webhook relay will POST to Paperclip routines `intake-github` and `intake-jira` — these are now declared in `.paperclip.yaml`.
- **Unblocks Plan 24-06 (deploy):** Deploy script can now symlink `companies/triage-shop/` into Paperclip. Plan 06 Task 2 MUST add the wrapper-script fallback for `claude_local` cwd templating (per Open Question #7 resolution).
- **Unblocks Plan 24-07 (operator setup):** Setup doc references these agent packages + lists env inputs (`ANTHROPIC_API_KEY`, `GH_TOKEN`) that operator must pre-export.

## Self-Check: PASSED

**Created files verified on disk:**
- `companies/triage-shop/COMPANY.md` — FOUND
- `companies/triage-shop/.paperclip.yaml` — FOUND
- `companies/triage-shop/agents/triage/AGENTS.md` — FOUND
- `companies/triage-shop/agents/triage/SOUL.md` — FOUND
- `companies/triage-shop/agents/oneshot-coder/AGENTS.md` — FOUND
- `companies/triage-shop/agents/oneshot-coder/SOUL.md` — FOUND
- `companies/triage-shop/agents/gsd-orchestrator/AGENTS.md` — FOUND
- `companies/triage-shop/agents/gsd-orchestrator/SOUL.md` — FOUND
- `scripts/tests/companies-artifacts.test.js` — FOUND

**Commits verified in git log:**
- `cc7434f` — FOUND (Task 1)
- `73d433a` — FOUND (Task 2)
- `49ffe6e` — FOUND (Task 3)

**Plan-level verification:**
- `grep -r 'schema: agentcompanies/v1' companies/triage-shop/` → 4 matches (COMPANY + 3 agents) ✓
- `node --test "scripts/tests/*.test.js"` → 11 passing (1 top + 10 subtests) ✓
- Each agent subdir contains AGENTS.md + SOUL.md ✓
- .paperclip.yaml has 3 `type: claude_local` + 2 webhook routines + hmac_sha256 signing ✓

---
*Phase: 24-paperclip-triage-pipeline*
*Completed: 2026-04-15*
