---
phase: 24-paperclip-triage-pipeline
plan: 06
subsystem: deploy
tags: [deploy, paperclip, symlink, worktree, shell, integration-test]

requires:
  - phase: 24-paperclip-triage-pipeline
    provides: Plan 24-04 companies/triage-shop/ artifact tree (COMPANY.md + .paperclip.yaml + 3 agents)
provides:
  - Deploy path — copies tb plugin's companies/ into Paperclip's companies/ alongside skills/
  - Worktree wrapper fallback for Open Question #7 (claude_local adapter cwd templating unsupported)
  - Integration test against ephemeral fake Paperclip root (bash-native, no node)
affects: [24-07-operator-setup]

tech-stack:
  added:
    - bash integration test pattern (fake $HOME + fake plugin cache + fake Paperclip root)
    - realpath + readonly variable hardening in deploy script (threat #2 mitigation)
    - env-var-driven wrapper pattern with regex validation (threat #3 mitigation)
  patterns:
    - "Deploy script guards: -n check, -d check, readonly, realpath case-glob refuses paths outside $HOME"
    - "Wrapper validates env input with ^[a-z0-9-]+$ regex before exec'ing claude --worktree"
    - "Integration test fixture created under $HOME (avoids macOS /var/folders vs /private/var realpath mismatch)"

key-files:
  created:
    - scripts/tb-triage-worktree-wrapper.sh
    - scripts/tests/paperclip-symlink.test.sh
  modified:
    - scripts/paperclip-symlink.sh

key-decisions:
  - "Test fixture placed under $HOME (not /tmp) because macOS mktemp -d resolves to /private/var/folders/... via realpath, which fails the W4 case-glob check that refuses PAPERCLIP_ROOT outside $HOME"
  - "Wrapper NOT referenced from .paperclip.yaml in this plan — Plan 04 authored with templated {{issue.metadata.worktreeName}} form; Plan 07 setup doc documents BOTH paths, user picks at integration time if templating proves broken"

requirements-completed: [D-13, D-14, D-24]

duration: 3min
completed: 2026-04-15
---

# Phase 24 Plan 06: Deploy Extension + Worktree Wrapper Summary

**scripts/paperclip-symlink.sh copies both skills/ and companies/ into Paperclip, hardened with readonly/realpath/$HOME-refusal guards; tb-triage-worktree-wrapper.sh wraps `claude --worktree` for the Open Question #7 fallback path; bash integration test verifies copy flow against ephemeral fake Paperclip root.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-15T13:25:38Z
- **Tasks:** 2
- **Files modified:** 2 created (2) + 1 modified

## Accomplishments

- Deploy script extended with companies loop matching existing skills loop pattern (idempotent `rm -rf; cp -R` mirror)
- Threat-model mitigation #2 implemented: `readonly PAPERCLIP_ROOT` + `realpath` case-glob refusing paths outside `$HOME` + explicit `-z` guard on resolved path
- Worktree wrapper script implements threat-model mitigation #3: mandatory env input via `${VAR:?}`, regex validation `^[a-z0-9-]+$`, double-quoted interpolation, distinct exit codes (2 = invalid name, 3 = bad cwd)
- Integration test covers skill copy + company copy + idempotency re-run, all against ephemeral fake Paperclip root

## Task Commits

1. **Task 1: Extend paperclip-symlink.sh + integration test** — `5d2dd39` (feat)
2. **Task 2: Worktree wrapper fallback** — `1e1911e` (feat)

## Files Created/Modified

### Created
- `scripts/tb-triage-worktree-wrapper.sh` — 18-line fallback wrapper. Receives `TB_TRIAGE_WORKTREE_NAME` + optional `TB_TRIAGE_WORKTREE_CWD` from env; validates name against `^[a-z0-9-]+$`; cd's into worktree cwd if set; `exec claude --worktree "$name" "$@"`.
- `scripts/tests/paperclip-symlink.test.sh` — bash integration test; builds fake `$HOME` with fake Paperclip root and fake plugin cache; runs deploy script with `HOME=$FAKE_HOME`; asserts skills + companies landed; re-runs to confirm idempotency.

### Modified
- `scripts/paperclip-symlink.sh` — added: `-z "$PAPERCLIP_ROOT"` + `-d "$PAPERCLIP_ROOT"` explicit guards; `readonly PAPERCLIP_ROOT`; `realpath` case-glob refusing paths outside `$HOME`; `COMPANIES_SOURCE` loop mirroring the skills loop, gated on `[ -d "$COMPANIES_SOURCE" ]`.

## Deploy Flow

```
/tb:update (skills/update/SKILL.md step 13)
  → bash scripts/paperclip-symlink.sh
    → find Paperclip root under $HOME (packages/adapter-utils locator)
    → readonly + realpath guard refuses roots outside $HOME
    → for skill in $PLUGIN_SKILLS/skills/*: rm -rf target; cp -R
    → for company in $PLUGIN_SKILLS/companies/*: rm -rf target; cp -R
    → echo "copied tb skills..." + "copied tb companies..."
  → Paperclip reads companies/triage-shop/ on next reload/restart
```

`/tb:update` is the operator's entry-point. Manual Paperclip restart (or `paperclipai company import`) is a documentation-layer concern for Plan 07.

## Wrapper Activation Condition

The wrapper is intentionally NOT referenced in `companies/triage-shop/.paperclip.yaml` in this plan. Plan 04 already authored the adapter config with:

```yaml
cwd: "{{issue.metadata.worktreeCwd}}"
extraArgs: ["--worktree", "{{issue.metadata.worktreeName}}"]
```

Plan 04 Summary's key-decisions section confirmed via `/Users/ivarga/Projects/paperclip/docs/adapters/claude-local.md` that claude_local templates ONLY support `{{agentId}}`, `{{companyId}}`, `{{runId}}`, `{{agent.name}}`, `{{company.name}}` — **`{{issue.metadata.*}}` is unsupported**. This wrapper is the fallback.

**When to activate (Plan 07 documents):**
- If Paperclip surfaces a clean error about unsupported template variables → switch `.paperclip.yaml` oneshot-coder + gsd-orchestrator agents from templated `cwd`/`extraArgs` to a static adapter command pointing at `scripts/tb-triage-worktree-wrapper.sh`, and have the webhook relay inject `TB_TRIAGE_WORKTREE_NAME`/`TB_TRIAGE_WORKTREE_CWD` via Paperclip's issue-metadata env pass-through mechanism.
- Wrapper reads those env vars and `exec claude --worktree "$name" "$@"`.

This keeps Plan 04's declared shape unchanged while providing a drop-in escape hatch the operator can flip at Plan 07 setup time.

## Post-Deploy Manual Step (documentation concern)

Per Research Open Question #2 — Paperclip may or may not hot-reload companies/ changes. Operator may need to either:
- Restart Paperclip server after `/tb:update`, OR
- Run `paperclipai company import` (if Paperclip CLI supports it — confirm at setup time)

This is a Plan 07 setup doc concern, not automation.

## Decisions Made

### Test fixture location on macOS

`mktemp -d` on macOS creates paths under `/var/folders/...`, and `realpath` resolves these to `/private/var/folders/...`. The deploy script's W4 guard (`case "$(realpath "$PAPERCLIP_ROOT")" in "$HOME"/*`) refuses to operate on paths outside `$HOME`. When the test ran with `HOME=$FAKE_HOME=/var/folders/.../fakehome`, the resolved PAPERCLIP_ROOT (`/private/var/folders/.../fakehome/Projects/paperclip`) was NOT a subpath of `/var/folders/.../fakehome` due to the `/private` prefix.

**Resolution:** Create the test tempdir under the real `$HOME` (`$HOME/.tb-paperclip-symlink-test.XXXXXX`). Under `$HOME`, `mktemp -d` returns paths that do NOT get mangled by `realpath`, so FAKE_HOME + FAKE_PAPERCLIP stay subpaths of `$HOME`. The test cleans up via `trap cleanup EXIT`.

This is a correctness property of the W4 guard on macOS — a real operator will not hit it because real Paperclip installs live under `~/Projects/paperclip` (inside `$HOME`). The test pattern now demonstrates the guard actually refuses the `/private/var/...` case in testing if we'd kept the stock `mktemp -d`.

### Wrapper regex

`^[a-z0-9-]+$` is narrower than Claude Code's actual worktree naming rules (which may also allow uppercase), but is a safe conservative subset matching Claude Code's auto-generated names (`bright-running-fox` style). The wrapper prints a clear error and exits 2 on mismatch — operator can widen the regex if a specific triage label style requires it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture placement — macOS realpath vs mktemp mismatch**

- **Found during:** Task 1 first test run
- **Issue:** `mktemp -d` default returns `/var/folders/...`; `realpath` resolves to `/private/var/folders/...`; W4 guard refuses because resolved path is not under `$HOME` (test's `HOME=$FAKE_HOME=/var/folders/...`).
- **Fix:** Changed test fixture to `mktemp -d "$HOME/.tb-paperclip-symlink-test.XXXXXX"` so the resolved path stays under real `$HOME`, which matches the fake `HOME=$FAKE_HOME` pattern inside the subshell.
- **Files modified:** `scripts/tests/paperclip-symlink.test.sh`
- **Verification:** `bash scripts/tests/paperclip-symlink.test.sh` exits 0 + prints `PASS:`.
- **Committed in:** `5d2dd39` (Task 1 commit — test was iterated pre-commit, single commit covers both).

---

**Total deviations:** 1 auto-fixed (Rule 1 — test-infrastructure bug)
**Impact on plan:** None on deliverables; deploy script content and wrapper content exactly as specified. Only the test fixture shape was adjusted for macOS realpath behavior.

## Issues Encountered

- **Worktree base drift:** At agent startup, `git merge-base HEAD e2da76ef...` returned `6183411` instead of the expected base commit. The expected commit exists in history; current HEAD is a newer `main` commit. Hard-reset was denied by the permission policy; proceeding on the newer base was safe because the newer commit only adds unrelated plugin-cache copy behavior and does not conflict with Plan 06 files. All commits land cleanly on the newer main.

## Threat Flags

None beyond the plan's own `<threat_model>`. All 3 threats documented there are now mitigated:
- Threat #1 (script injection via unsanitized paths): preserved — all paths quoted; no payload-derived input.
- Threat #2 (overwrite outside Paperclip dir): mitigated — `-z` + `-d` + `readonly` + `realpath` case-glob refusing paths outside `$HOME`.
- Threat #3 (wrapper exec with attacker-controlled env): mitigated — `${VAR:?}` mandatory, `^[a-z0-9-]+$` regex, double-quoted exec.

## User Setup Required

None introduced by this plan. Plan 07 setup doc will document:
- Whether to activate the `tb-triage-worktree-wrapper.sh` fallback (depends on Paperclip runtime behavior)
- Post-deploy Paperclip restart / import command

## Known Stubs

None. The wrapper is intentionally a fallback not wired in `.paperclip.yaml` — that is Plan 07's integration-time decision, not a stub. The deploy script's companies loop is fully functional; no placeholder variables.

## Next Phase Readiness

- **Wave 2 complete for this plan.** Paired with Plan 24-05 (webhook relay) in the same wave.
- **Unblocks Plan 24-07 (operator setup):** Setup doc can now reference the extended deploy flow and the wrapper fallback, with clear instructions for when to flip between templated and wrapper paths in `.paperclip.yaml`.

## Self-Check: PASSED

**Created files verified on disk:**
- `scripts/tb-triage-worktree-wrapper.sh` — FOUND (executable, 18 lines)
- `scripts/tests/paperclip-symlink.test.sh` — FOUND (executable, 43 lines)

**Modified files verified:**
- `scripts/paperclip-symlink.sh` — FOUND (executable, 48 lines; was 33 lines; diff shows additions only)

**Commits verified in git log:**
- `5d2dd39` — FOUND (Task 1: feat(24-06): extend paperclip-symlink.sh to copy companies + test)
- `1e1911e` — FOUND (Task 2: feat(24-06): add tb-triage-worktree-wrapper.sh fallback for adapter cwd templating)

**Plan-level verification:**
- `bash scripts/tests/paperclip-symlink.test.sh` → exits 0 + prints `PASS:` (integration test passes)
- `node --test "scripts/tests/*.test.js"` → 55/55 pass (no regression in existing node tests)
- `bash -n scripts/paperclip-symlink.sh` → exits 0 (syntax valid)
- `bash -n scripts/tb-triage-worktree-wrapper.sh` → exits 0 (syntax valid)
- Wrapper invalid name exit code 2 verified; unset name exit code 1 verified.
- `$PAPERCLIP_ROOT/companies` references in script are all inside the new loop (lines 39, 42, 43, 45) — no strays.

---
*Phase: 24-paperclip-triage-pipeline*
*Completed: 2026-04-15*
