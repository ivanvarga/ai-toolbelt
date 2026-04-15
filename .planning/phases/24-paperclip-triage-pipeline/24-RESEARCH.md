# Phase 24: Paperclip Triage Pipeline - Research

**Researched:** 2026-04-15
**Domain:** Paperclip runtime + GitHub/Jira webhooks + Claude Code worktrees + AgentCompanies spec
**Confidence:** MEDIUM-HIGH (Paperclip docs HIGH; webhook setup HIGH; Claude Code worktree HIGH; dedup/project-mapping/secret-store integration LOW — no native primitive found)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (non-negotiable)

**Integration shape & delivery**
- **D-01** Pipeline runtime lives inside Paperclip (server + UI).
- **D-02** All authoring (agent defs, workflows, skills, docs) lives in the `ai-toolbelt` (tb) repo. User explicitly does not want Paperclip lock-in.
- **D-03** Deliverables conform to AgentCompanies spec `agentcompanies/v1-draft` (`AGENTS.md`, `SOUL.md`, likely `COMPANY.md` / `TEAM.md` / `TASK.md`). Artifacts RELY on tb skills rather than inlining behavior — skills remain the reusable unit; AgentCompanies docs wire agents to skills via `sources:` / path references. Skills deployed separately.
- **D-24** Deploy = extend `scripts/paperclip-symlink.sh` to also copy `agents/`, `companies/`, and AgentCompanies-spec artifacts to matching Paperclip dirs. Single entry via `/tb:update`. Paperclip native import flow deferred.

**Event intake**
- **D-04** Trigger: new GitHub/Jira issues assigned to the user.
- **D-05** Webhook-based. Deliverable includes research-backed setup-instruction document for both providers.
- **D-06** Dedup key canonical form: `gh:{owner}/{repo}#{number}` / `jira:{ticket-id}`.
- **D-19** Ticket → local repo mapping: research first; fall back to triage-agent-asks-once-then-caches.

**Triage & routing**
- **D-07** Triage agent uses `tb:task-github` and `tb:task-jira` for context loading.
- **D-08** Three confidence signals: Understanding, Solution, Code-trace validation.
- **D-26** Confidence format = labels `low` / `med` / `high`. Auto-dispatch threshold = ALL THREE must be `high`.
- **D-09** All-three-high → oneshot OR GSD autonomous (complexity-based); any not-high → pause in Paperclip task queue.
- **D-10 + D-25** Tag override vocabulary on source ticket: `triage:oneshot`, `triage:process`, `triage:skip`.
- **D-11** Human pause/communication uses Paperclip native primitives.
- **D-12** Agent runtime selection for oneshot vs GSD deferred to research.

**Worktree lifecycle**
- **D-13** Use Claude Code native `--worktree` / `isolation: worktree`.
- **D-14** Dedup worktrees by D-06 key at creation.
- **D-15** Clean up worktrees after resulting PR merged on GitHub.

**Human gate & ship**
- **D-16** Approval UI is Paperclip.
- **D-17** "Ship" = open a GitHub PR. Merge stays a manual human action.
- **D-18** Rejection default = re-queue with human feedback; same agent retries with feedback appended.

**Operations**
- **D-20** Failure: prefer Paperclip-native retry if compatible; fallback "one automatic retry, then escalate to queue with full error trace". Worktree preserved in both cases for debugging.
- **D-21** Telemetry: Paperclip-native live telemetry + tb-side per-task artifact (decision log + routing verdict). Per-task log shape/location = Claude's discretion; may live with worktree and die with it.
- **D-22** Secrets: dispatched agents access via `bin/resolve-credential` (tb macOS-Keychain + org-scoped resolver). No Paperclip secret store integration in Phase 24.

### Claude's Discretion
- **D-23** Triage agent SOUL.md tone (planner drafts initial; user reviews during execution).
- Branch naming convention inside worktrees.
- Paperclip task card layout details.
- How triage agent surfaces its three confidence signals + reasoning in Paperclip UI.
- Per-task observability log shape/location (D-21).

### Deferred (OUT OF SCOPE)
- Auto-merge PRs on human approval.
- Auto-close originating issue after PR merge.
- Cost tracking, budget enforcement, agent observability dashboards.
- Multi-repo fan-out / cross-repo worktrees in a single task.
- LLM-based re-triage on rejection; discard-on-rejection variant.
- Confidence-threshold tuning / alternative signals or weighting.
- Alternative intakes (Paperclip UI paste-in, CLI submit).
- Time/idle-based worktree pruning.
- Paperclip native company-import deploy flow.
- Scripted `/tb:setup-paperclip-triage` installer.
- Paperclip secret store integration.
- Long-term centralized observability/audit store.
</user_constraints>

<phase_requirements>
## Phase Requirements

REQUIREMENTS.md has no TBD-filled row for Phase 24. Treat CONTEXT.md D-01..D-26 as the de-facto requirement set. Implicit requirements derived from the decisions:

| ID | Description | Research Support |
|----|-------------|------------------|
| P24-INTAKE | Ingest GitHub + Jira "issue assigned to user X" events idempotently | `## GitHub Webhook Setup`, `## Jira Webhook Setup`, `## Paperclip Primitives — Dedup` |
| P24-TRIAGE | Triage agent loads context via tb:task-github/tb:task-jira, emits 3 labels (low/med/high) + routing verdict | `## Paperclip Agent Companies Spec`, `## Paperclip Primitives — Runtime` |
| P24-AUTOROUTE | All-high → dispatch oneshot coder OR GSD autonomous in an isolated worktree | `## Claude Code Worktree Mechanism`, `## Paperclip Primitives — Runtime` |
| P24-TAGOVERRIDE | `triage:oneshot` / `triage:process` / `triage:skip` on source ticket overrides classifier | `## GitHub Webhook Setup` (labels payload), `## Jira Webhook Setup` (labels payload) |
| P24-HUMAN-GATE | Anything below all-high pauses in Paperclip; human sees diff + approve/reject | `## Paperclip Primitives — Human Gate (executionPolicy)` |
| P24-REJECT-REQUEUE | Rejection re-queues same task with human feedback appended; same agent retries | `## Paperclip Primitives — Human Gate` (changes_requested flow) |
| P24-WORKTREE-DEDUP | No duplicate worktree per dedup key | `## Claude Code Worktree Mechanism`, `## Paperclip Primitives — Dedup` |
| P24-WORKTREE-CLEANUP | Remove worktree after PR is merged | `## Claude Code Worktree Mechanism — Cleanup strategy` |
| P24-SHIP | On approve, open GitHub PR via tb:pr-submit flow | `## Paperclip Agent Companies Spec` (skill refs) |
| P24-RETRY | One auto-retry on agent-execution error, then escalate to queue with trace | `## Paperclip Primitives — Retry` |
| P24-TELEMETRY | Paperclip live + tb-side per-task audit artifact | `## Paperclip Primitives — Telemetry` |
| P24-SECRETS | Agents resolve credentials via `bin/resolve-credential` (keychain) | `## Deploy Script Extension Plan (D-24)` |
| P24-DEPLOY | Extend `scripts/paperclip-symlink.sh` to copy agents/ + companies/ | `## Deploy Script Extension Plan (D-24)` |
| P24-DOCS | Setup-instruction document for GitHub + Jira webhook configuration | `## Setup-Instruction Deliverable Shape` |
| P24-REPO-MAP | Map ticket → local repo path; cache after one-time user prompt | `## Paperclip Primitives — Repo Mapping` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

**Root `./CLAUDE.md`:**
- Plugin name = **tb**. All skills invoked as `/tb:skill-name`; all skill directory names + SKILL.md `name:` frontmatter MUST use the `tb:` prefix.
- Skills follow family-action pattern with hyphens (`task-github`, `pr-submit`). Standalone skills w/o family prefix allowed (`catchup`, `mbridge`, `contentful`).
- Directory structure: `skills/`, `agents/`, `hooks/`, `tools/`, `scripts/`. Phase 24 ADDS a top-level `companies/` directory (AgentCompanies artifacts).
- Path variables: `${CLAUDE_PLUGIN_ROOT}` in hooks/MCP/scripts only (NOT inside SKILL.md markdown); `${CLAUDE_SKILL_DIR}` inside SKILL.md bash blocks.
- Dev workflow: `claude --plugin-dir ./` loads from source; `/reload-plugins` for hot reload.

**Global `~/.claude/CLAUDE.md`:**
- Communication: extremely concise, sacrifice grammar for brevity.
- Knowledge staleness: verify APIs/libraries via context7/web — do not rely on memory.
- Security: never read/print env vars or secret values; reference names only.
- Verification (MANDATORY): after any code change → check git hooks once, run lint:fix, run full lint + typecheck. Work verified only when both pass.
- LSP over Grep/Read for code navigation (workspaceSymbol, findReferences, goToDefinition, hover).
- Code style: no comments except external refs; no reinvention; favour readable over clever.
- Commit messages: 1 line only, no attribution, no multi-line descriptions.

**Planner MUST honor:** `tb:` skill prefix on all new skills/agents; new `companies/` dir follows spec; no comments in written code; commit messages stay 1-line; verification gate (lint+typecheck) after any code change.

## Summary

Paperclip has **more native primitives than the CONTEXT assumes** — this reshapes the plan significantly. Specifically:

1. **Human gate is already there.** Paperclip's `executionPolicy` on issues is the exact "pause-for-human + approve / request-changes" primitive called for in D-11/D-16/D-18. The `changes_requested` flow maps 1:1 to D-18 "re-queue with feedback — same agent retries with feedback appended." No tb-side queue needed.
2. **Webhook intake is already there.** Paperclip **routines** support `"kind": "webhook"` triggers with HMAC-SHA256 signing (`POST /api/routine-triggers/public/{publicId}/fire`). BUT — Paperclip signs with `X-Paperclip-Signature` (over `"${timestamp}.${body}"`), which is **incompatible with GitHub's `X-Hub-Signature-256` and Jira's `X-Hub-Signature`**. A thin tb-side relay script is required to translate provider signatures → Paperclip signature.
3. **Worktrees are already there.** Paperclip has an experimental "execution workspace" with `isolated_issue_checkout` → `git_worktree` (runtime-only, UI gated off). For Phase 24 we **bypass Paperclip's worktree layer** and use Claude Code's own `--worktree <name>` CLI flag, which is the mechanism called out in D-13. The subagent `isolation: worktree` frontmatter option has a **known silent-fail bug** (GH #39886, #33045) — do not rely on it.
4. **Agent runtime = `claude_local` adapter.** Paperclip's `claude_local` built-in adapter runs the local `claude` CLI with session persistence, skills injection, and prompt templates. For Phase 24 oneshot and GSD-autonomous agents, `claude_local` is the idiomatic choice. `process` adapter is a fallback for non-Claude runners.
5. **Retry is already there.** Paperclip's "comment required backstop" retries wake ONCE on missing-comment before `retry_exhausted`. This aligns with D-20 "one automatic retry, then escalate" IF we wire the error-detection signal as a comment-missing signal. Cleaner path: D-20 fallback = tb-side retry counter in the triage prompt.
6. **Dedup, repo-mapping, and secret-store integration have NO native primitive.** Paperclip issues don't have an external-source-id field; project workspaces don't map a GitHub-repo-URL to a local cwd in a primitive we can query directly (you'd have to scan project.workspaces.repoUrl in the project list). Plan must layer tb-side state.
7. **AgentCompanies deploy target layout is defined in the spec** — the planner can use `COMPANY.md` at company root, `agents/<slug>/AGENTS.md`, `skills/<slug>/SKILL.md`, optional `teams/`, `projects/`, `tasks/`. Paperclip imports these via `paperclipai company import` CLI, but **D-24 explicitly defers that** — we deploy by raw-copy into an existing Paperclip checkout via extended `paperclip-symlink.sh`.

**Primary recommendation:** Paperclip-native everywhere possible (routines for webhooks, executionPolicy for human gate, claude_local adapter for runtime). tb-side responsibility narrows to: (a) a webhook-relay script translating GitHub/Jira → Paperclip routine fire, (b) the AgentCompanies document bundle referencing tb skills, (c) the D-24 extended deploy script, and (d) a ticket→repo map + dedup table kept in a tb JSON sidecar (no native primitive). **The plan is smaller than the raw decision count suggests.**

## Paperclip Agent Companies Spec

Source: `/Users/ivarga/Projects/paperclip/docs/companies/companies-spec.md`; `/Users/ivarga/Projects/paperclip/AGENTS.md`; `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/importing-and-exporting.md`

**Spec version:** `agentcompanies/v1-draft` (vendor-neutral; Paperclip extensions via `.paperclip.yaml` sidecar and `metadata.paperclip`).

**Package kinds (one primary markdown file per package root):**
| File | Role | Required for Phase 24? |
|------|------|------------------------|
| `COMPANY.md` | Company entrypoint (name, description, slug, schema, optional `includes`, optional `requirements.secrets`) | **YES** — one `companies/triage-shop/COMPANY.md` |
| `TEAM.md` | Reusable org subtree (optional) | **NO** (single-company, single-team pipeline — skip) |
| `AGENTS.md` | Agent identity + instructions + skill refs (by shortname) | **YES** — one per agent role (triage, oneshot-coder, gsd-orchestrator) |
| `PROJECT.md` | Starter project definition | **OPTIONAL** (recommend one per mapped git repo, but Phase 24 uses D-19 fallback mapping) |
| `TASK.md` | Starter/recurring task | **NO** (tasks are created dynamically by the webhook relay, not seeded) |
| `SKILL.md` | Agent Skills spec skill | **NO new ones** — reference existing tb skills by shortname |
| `SOUL.md` | Principles / tone / uncertainty handling (D-23) | **YES** — one per agent; at minimum for triage |
| `HEARTBEAT.md` | Per-agent heartbeat procedure override | **OPTIONAL** — use if default heartbeat protocol needs tweaking |
| `TOOLS.md` | Tool/config surface | **NO** (no custom tools beyond Claude Code + tb skills) |
| `.paperclip.yaml` | Vendor-specific sidecar (adapter type, env input declarations, routine triggers, approval policies) | **YES** — adapter config + routine webhook trigger declared here |

**Canonical directory layout (spec §4 / §21 minimal example) — plan the deploy target as:**
```
companies/triage-shop/
├── COMPANY.md                              # name, description, slug=triage-shop, schema, includes
├── .paperclip.yaml                         # adapter config, env inputs (see below)
├── agents/
│   ├── triage/
│   │   ├── AGENTS.md                       # role, reportsTo, skills: [task-github, task-jira]
│   │   ├── SOUL.md                         # principles, tone, uncertainty handling (D-23)
│   │   └── HEARTBEAT.md                    # optional override
│   ├── oneshot-coder/
│   │   ├── AGENTS.md                       # skills: [task-github, task-jira, pr-submit, pr-describe]
│   │   └── SOUL.md
│   └── gsd-orchestrator/
│       ├── AGENTS.md                       # skills: [task-github, task-jira, pr-submit, pr-describe]
│       └── SOUL.md
└── projects/                               # OPTIONAL; see D-19 open question
```

**Frontmatter conventions (spec §5 / §8):**
- `schema: agentcompanies/v1` at package root only.
- `kind: agent` / `team` / `project` etc. (optional when path+filename makes kind obvious).
- `slug: <kebab>` — portable identity.
- `name:`, `description:`, `version:`, `license:`.
- `sources: []` for provenance (external GitHub refs pinned by commit+sha256).
- `metadata: {}` tool-specific extensions — Paperclip uses `metadata.paperclip`.

**Skill resolution order (spec §8 Skill Resolution):**
1. local `skills/<shortname>/SKILL.md` (inside the company package)
2. referenced/included skill package with matching slug
3. tool-managed company skill library with matching shortname

**For D-02 (portability) + D-03 (skills as reusable unit) applied here:**
- `AGENTS.md` uses `skills: [task-github, task-jira, pr-submit, pr-describe]` — bare shortnames.
- tb skills are NOT vendored into `companies/triage-shop/skills/`. They live under `/skills/<name>/SKILL.md` at tb repo root and are deployed into Paperclip's `skills/` dir by the existing `paperclip-symlink.sh` → Paperclip's skill injection (adapter-level) makes them discoverable to the agent.
- Optional for stricter portability: add `sources:` entries in each `AGENTS.md` pointing at the tb repo skill URLs pinned by commit. Not required for Phase 24 (local deploy).

**`.paperclip.yaml` sidecar shape (spec §15, confirmed from Paperclip spec + `docs/adapters/claude-local.md`):**
```yaml
schema: paperclip/v1
agents:
  triage:
    adapter:
      type: claude_local
      config:
        model: claude-opus-4-6
        maxTurnsPerRun: 150
        dangerouslySkipPermissions: true
    inputs:
      env:
        ANTHROPIC_API_KEY:
          kind: secret
          requirement: optional
        GH_TOKEN:
          kind: secret
          requirement: optional
  oneshot-coder:
    adapter:
      type: claude_local
      config:
        model: claude-opus-4-6
        maxTurnsPerRun: 300
  gsd-orchestrator:
    adapter:
      type: claude_local
      config:
        model: claude-opus-4-6
        maxTurnsPerRun: 600
routines:
  intake-github:
    triggers:
      - kind: webhook
        signingMode: hmac_sha256
  intake-jira:
    triggers:
      - kind: webhook
        signingMode: hmac_sha256
```

**Deploy target on the Paperclip side (per D-24):** `PAPERCLIP_ROOT/companies/triage-shop/` (Paperclip's repo has a `companies/`-adjacent convention per tb plugin CLAUDE.md context; `docs/companies/` exists but is docs, not the data dir — confirm during implementation by `ls $PAPERCLIP_ROOT`). **If no `companies/` dir exists at Paperclip root, create it — the spec treats any folder containing a `COMPANY.md` as a company package.**

**Confidence:** HIGH (spec read end-to-end, importing-and-exporting.md cross-confirms the layout).

## Paperclip Primitives (human-gate, dedup, repo-mapping, runtime, retry, telemetry)

### Human Gate (executionPolicy) — **NATIVE, use directly**

Source: `/Users/ivarga/Projects/paperclip/docs/guides/execution-policy.md`

**Primitive:** `executionPolicy` field on an issue with `stages: [{ type: "review" | "approval", participants: [...] }]`.

**Mapping Phase 24 → Paperclip:**
- Triage verdict pauses → create issue with assigneeAgentId = coder-agent, `executionPolicy.stages = [{ type: "approval", participants: [{ type: "user", userId: <human-board-user-id> }] }]`.
- Coder agent transitions issue to `done` → runtime intercepts → status becomes `in_review`, reassigned to human → Paperclip UI shows diff via activity log + comments.
- Human **approves** → `PATCH /api/issues/{id}` `{ "status": "done", "comment": "..." }` → run completes.
- Human **rejects (requests changes)** → `PATCH /api/issues/{id}` `{ "status": "in_progress", "comment": "feedback..." }` → runtime reassigns to original executor; `executionState.status = "changes_requested"`. **This is D-18 verbatim: same agent, same stage, feedback in comment.**
- Approval IS required to advance. Approval decisions are audited (`issue_execution_decisions` table).

**Comment-required backstop** (automatic, cannot be disabled): every agent run that doesn't post a comment gets ONE re-wake (`issueCommentStatus: retry_queued`); if still no comment, `retry_exhausted`. This partially covers D-20 auto-retry.

**"Diff preview" on the approval card (D-16):** Paperclip doesn't natively render git diffs in the UI. Options:
- Agent posts `git diff` output as a comment on the issue body before transitioning to `done`. Paperclip comments support markdown; code fences render.
- Agent posts a link to the draft PR URL (agent opens a draft PR first per D-17, posts the URL, THEN transitions to done).

**Recommended:** agent posts both — markdown diff summary as comment + draft PR URL as a comment. That is pure markdown, works in existing Paperclip UI, no new UI work.

**Confidence:** HIGH.

### Dedup — **NO NATIVE PRIMITIVE; tb-side layer required**

Source: searched `/Users/ivarga/Projects/paperclip/docs/api/`, `/Users/ivarga/Projects/paperclip/doc/`.

**Finding:** Paperclip issues have no `externalSourceKey` / `externalUrl` / upsert-by-idempotency-key endpoint. The routine manual-run endpoint accepts `idempotencyKey`, but that dedups routine FIRES, not issues/tasks.

**Fallback (recommend):** tb-side JSON sidecar at `~/.paperclip/tb-triage/dedup.json` mapping `{source}#{id}` → Paperclip issue UUID. The webhook-relay script is the check+insert point:
```
webhook arrives
  → parse {owner}/{repo}#{number} or {ticket-id}
  → build dedup key
  → check dedup.json
  → if exists: noop (log, return 200 to provider)
  → else: fire Paperclip routine; on success, record {key → issue_id}
```
Same file holds worktree dedup (D-14): `{key → claude_worktree_name}`.

**Location rationale:** `~/.paperclip/` lives next to Paperclip's own context/config, survives tb plugin updates, can be migrated into Paperclip natively when that primitive lands.

**Confidence:** HIGH (primitive absence verified by docs grep).

### Repo Mapping (D-19) — **partially native; tb-side glue required**

Source: `/Users/ivarga/Projects/paperclip/docs/api/goals-and-projects.md`

**Finding:** Paperclip has `projects.workspaces` — a list with fields `{ name, cwd, repoUrl, repoRef, isPrimary }`. So **`repoUrl → cwd` is queryable** via `GET /api/companies/{companyId}/projects` and filtering `workspaces[].repoUrl`. This partially solves D-19.

**Gaps:**
- GitHub issue payload gives `repository.html_url` / `repository.full_name` (owner/repo), not the raw git `repoUrl`. Need a normalizer (`https://github.com/{owner}/{repo}` → match `repoUrl` ignoring `.git` suffix / case).
- Jira tickets have NO repo info in the payload. The Jira case must use the D-19 fallback (ask-once, cache).

**Recommended mapping strategy:**
1. On webhook receipt, attempt to auto-resolve via Paperclip `projects.workspaces[].repoUrl` matching.
2. On no-match, triage agent posts a comment `"which local repo does this map to?"` and awaits human reply (human replies in Paperclip comment thread).
3. tb-side cache: `~/.paperclip/tb-triage/repo-map.json`: `{ "jira:LFCR": "/Users/ivarga/Projects/lfcr-app", "gh:acme/repo": "/Users/ivarga/..." }` — keyed by project-prefix (Jira) or owner/repo (GitHub).
4. On auto-resolve hit, also write to cache (faster subsequent lookups, avoids hitting Paperclip API every webhook).

**Confidence:** HIGH for the native-primitive check; MEDIUM for the Jira branch (Jira payload field inventory confirmed but not tested).

### Agent Runtime (D-12, D-20) — **claude_local adapter, idiomatic**

Source: `/Users/ivarga/Projects/paperclip/docs/agents-runtime.md`, `/Users/ivarga/Projects/paperclip/docs/adapters/claude-local.md`, `/Users/ivarga/Projects/paperclip/docs/adapters/overview.md`

**Built-in adapters available:** `claude_local`, `codex_local`, `opencode_local`, `hermes_local`, `cursor`, `pi_local`, `openclaw_gateway`, `process`, `http`. External plugin adapters: `droid_local` (Factory).

**Recommendation per agent:**
- **Triage agent:** `claude_local` — needs session persistence across heartbeats for multi-issue catch-up; session-aware; cheap per run.
- **Oneshot coder:** `claude_local` with `maxTurnsPerRun: 300`, `dangerouslySkipPermissions: true` (headless), `cwd` = worktree path. Resume session if it's a re-queue-with-feedback (D-18) run.
- **GSD orchestrator:** `claude_local` with higher `maxTurnsPerRun: 600` (autonomous mode iterates through discuss-skip → plan → execute → verify). `cwd` = worktree path.

Each agent has its own Paperclip agent record (`POST /api/companies/{companyId}/agents`), with an adapter config that embeds the worktree cwd. The `PAPERCLIP_*` env vars (`PAPERCLIP_AGENT_ID`, `PAPERCLIP_API_KEY`, `PAPERCLIP_RUN_ID`, `PAPERCLIP_TASK_ID`) are injected automatically by the adapter.

**Heartbeat model:** agents wake via (a) timer, (b) assignment, (c) comment mention, (d) manual invoke, (e) approval resolution. Phase 24 uses **assignment** as the primary wake: webhook relay creates an issue assigned to the target agent → agent wakes.

**OpenClaw gateway** is an option for containerised isolation but adds substantial infra (Docker, 15s startup, config dance). **Not recommended** for Phase 24 — `claude_local` + `--worktree` gives filesystem isolation without the container setup burden.

**Retry (D-20):**
- Paperclip's native retry = comment-required backstop = 1 retry on missing comment.
- That fires on a NARROW condition (agent completed but didn't comment). It does NOT fire on adapter error / timeout / exit-code-nonzero.
- For D-20 general error retry, the tb-side path: agent's prompt template includes a retry counter (extracted from issue comment history: if the issue has comment `[triage-retry: 0]`, this is the first attempt; on adapter error, Paperclip records the run as `failed` but does NOT auto-re-wake. Pause the issue with `retry=1` comment; on next manual wake or a tb-side cron, the agent checks if `retry < 1` and tries again, else escalates by posting the error and setting the issue to `blocked` with @-mention to a human).
- **Conflict with D-20 "Paperclip-compatible"**: Paperclip's native retry is conceptually different from "retry on error." User explicitly said "if Paperclip's native behavior conflicts, use Paperclip's pattern." **Recommendation:** Follow Paperclip — do NOT add a tb-side error-retry loop. On adapter error, surface the error as an issue comment (Paperclip's `error` run state already does this) and rely on the human to manually re-invoke. This simplifies Phase 24; re-add automated retry later if needed.

**Confidence:** HIGH for runtime choice; MEDIUM for the retry recommendation (user's D-20 wording supports deferring to Paperclip's pattern).

### Telemetry (D-21) — **Paperclip-native + tb sidecar**

Source: `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/activity-log.md`, `/Users/ivarga/Projects/paperclip/docs/agents-runtime.md`

**Paperclip-native surfaces (already present):**
- Activity log: every mutation (`GET /api/companies/{id}/activity`) — agent creation, issue status changes, assignments, comments, approval decisions.
- Run records per heartbeat: status (`queued|running|succeeded|failed|timed_out|cancelled`), stderr/stdout excerpts, full logs on disk, token usage, costs.
- Live updates pushed to UI.
- `/api/companies/{id}/dashboard` aggregates task counts by status.

**tb-side per-task sidecar (Claude's discretion per D-21):**
- Location: `<worktree>/.tb-triage/decision.json` — dies with worktree at D-15 cleanup (user-approved).
- Shape (MVP):
  ```json
  {
    "schema": 1,
    "dedupKey": "gh:acme/repo#42",
    "paperclipIssueId": "...",
    "confidence": { "understanding": "high", "solution": "high", "codeTrace": "high" },
    "routing": { "verdict": "oneshot", "override": null, "rationale": "..." },
    "attempts": [{ "at": "2026-04-15T...", "outcome": "succeeded", "runId": "..." }],
    "prUrl": "https://github.com/..."
  }
  ```
- Written by the triage agent as part of its heartbeat (tb skill emits it).

**Confidence:** HIGH.

## Claude Code Worktree Mechanism

Sources:
- <https://code.claude.com/docs/en/common-workflows> (authoritative, read in full)
- <https://github.com/anthropics/claude-code/issues/39886> (silent-fail bug on `isolation: worktree`)

### CLI flag (use this)

**Exact syntax:** `claude --worktree <name>` or `claude -w <name>`. If `<name>` omitted, Claude auto-generates (e.g., `bright-running-fox`).

**Behavior:**
- Creates worktree at `<repo-root>/.claude/worktrees/<name>/`.
- Branches from `origin/HEAD` (set once at clone-time, stored in local `.git/`).
- Branch name: `worktree-<name>`.
- To re-sync `origin/HEAD` with the remote default: `git remote set-head origin -a` (local-only, no remote change).
- To base off a specific branch: `git remote set-head origin <branch-name>` OR register a `WorktreeCreate` hook that replaces the default logic.

**Copies gitignored files:** Add a `.worktreeinclude` file (gitignore-syntax) to repo root listing files to auto-copy into new worktrees (e.g., `.env`, `.env.local`). Only matches that are ALSO gitignored actually copy.

**Headless invocation (for Paperclip's `claude_local` adapter):**
- `claude --worktree <name> --permission-mode plan -p "<prompt>"` runs non-interactively.
- For Phase 24 dispatched agents: `claude --worktree <dedupKey-safe-name> --print "<prompt>" --output-format stream-json --dangerously-skip-permissions`
- The Paperclip `claude_local` adapter already invokes `claude --print - --output-format stream-json --verbose`. To add `--worktree`, use `claude_local` adapter config's `extra CLI args` field (§3.3 of agents-runtime.md).
- Alternative: set `claude_local.cwd` to the pre-created worktree path; spawn worktree BEFORE invoking Paperclip. Simpler but loses Claude's auto-cleanup.

### Subagent isolation (avoid this path)

**`isolation: worktree` in subagent frontmatter is BROKEN.** GitHub issues #39886, #33045, #38949, #37549 — silent fail; agent runs in main repo; `worktreePath` returns `"done"` (literal string, not a path); `worktreeBranch` undefined. **Do not plan around this.**

### Cleanup (D-15)

**Automatic cleanup semantics:**
- **No changes in worktree at session exit:** worktree + branch auto-removed.
- **Changes or commits exist:** user prompted to keep or remove. In headless, this means **the worktree persists** — important for Phase 24 since we WANT the worktree to persist through human review.
- **Subagent worktrees** orphaned by crashes are auto-swept at CLI startup if older than `cleanupPeriodDays` AND clean.
- Worktrees from `--worktree` are **NEVER swept** automatically.

**For D-15 (clean up after PR merge):** Claude Code does NOT detect GitHub PR merge. tb-side cleanup is required. Options:
1. **Poll-based (recommended):** A tb cron (scripts/check-merged-worktrees.js) runs periodically. Walks `~/.paperclip/tb-triage/dedup.json` entries with non-null `prUrl`. For each, `gh pr view <url> --json state,merged,closedAt`. If `merged == true`, run `git worktree remove <path>` and `git branch -D worktree-<name>`, then delete the dedup.json entry. Cron cadence: every 15 min via macOS `launchd` or a Paperclip routine with a `schedule` trigger.
2. **Merge-webhook-based:** Extend the webhook relay to also accept `pull_request.closed` events from GitHub (payload includes `merged: true/false`). This is cleaner (event-driven, sub-second) but requires the user to add the `pull_request` event to the webhook subscription.
3. **Manual:** human runs `/tb:paperclip-triage-cleanup` skill after every PR merge.

**Recommendation:** #2 (merge-webhook-based) — it's event-driven, re-uses the existing webhook infrastructure, and doesn't require a separate cron. Add `pull_request` to the events the webhook-relay subscribes to; branch on `event == "pull_request" && action == "closed" && merged == true`.

**Confidence:** HIGH (CLI flag behavior verified in official docs; subagent bug verified in GitHub issues).

## GitHub Webhook Setup

Sources:
- <https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- <https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks>
- <https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- <https://docs.github.com/en/rest/repos/webhooks>
- <https://smee.io/>, <https://github.com/probot/smee.io>

### Event scoping

**Event type:** `issues` (singular per GitHub's enum).
**Actions within `issues` event:** `opened`, `edited`, `deleted`, `assigned`, `unassigned`, `labeled`, `unlabeled`, `closed`, `reopened`, etc.

**GitHub webhook subscription CANNOT filter by action** — the webhook fires on ALL actions of a subscribed event. **Consumer filters on `payload.action`** (server-side; cheap JSON dispatch).

**For Phase 24:**
- Subscribe to `issues` (and `pull_request` for the merge-cleanup path — D-15).
- Relay script filters:
  - `action == "assigned"` AND `payload.assignee.login == $CONFIGURED_USER` → triage (D-04).
  - `action == "labeled"` AND `payload.label.name ∈ {"triage:oneshot","triage:process","triage:skip"}` → tag override path (D-25).
  - `event == "pull_request"` AND `action == "closed"` AND `payload.pull_request.merged == true` → worktree cleanup (D-15).

**Scope:** Start with **repo-level webhook** (simpler, per-repo secrets). Upgrade to **org-level** if many repos feed the same user. Repo-level is the right default for personal workflow.

### Payload shape (`issues` event, `action: "assigned"`)

Relevant fields the relay/triage agent consumes:
```json
{
  "action": "assigned",
  "issue": {
    "number": 42,
    "title": "...",
    "body": "markdown...",
    "labels": [{ "name": "bug" }, { "name": "triage:oneshot" }],
    "user": { "login": "reporter" },
    "assignee": { "login": "ivan" },
    "assignees": [{ "login": "ivan" }],
    "html_url": "https://github.com/acme/repo/issues/42",
    "created_at": "...",
    "updated_at": "..."
  },
  "repository": {
    "full_name": "acme/repo",
    "html_url": "https://github.com/acme/repo",
    "default_branch": "main"
  },
  "assignee": { "login": "ivan" },
  "sender": { "login": "whoever-triggered" }
}
```

### Signature verification

- Header: `X-Hub-Signature-256` (format: `sha256=<hex>`).
- Algorithm: HMAC-SHA256 of the **raw request body** using the webhook secret.
- Comparison: `crypto.timingSafeEqual` (constant-time).
- Official recommendation: use `@octokit/webhooks` package — handles verification + typed events.
- **X-Hub-Signature** (SHA-1) still delivered for legacy compat; do NOT use.

Reference Node implementation (official):
```js
import { Webhooks } from "@octokit/webhooks";
const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET });
const ok = await webhooks.verify(rawBody, req.headers["x-hub-signature-256"]);
```

### Local-dev tunneling

**Recommended: smee.io** (GitHub's own recommendation, SSE-based, no credentials, no rate limits, free). ngrok and localtunnel work but are heavier and ngrok has URL stability issues across sessions.

- `npm install -g smee-client` → `smee --url https://smee.io/<channel> --target http://localhost:3100/tb-triage-github` forwards public webhook to local port.
- The webhook Payload URL in GitHub settings → the smee.io URL.
- **Explicit caveat:** smee.io is dev-only; not for production.

### UI click-path (verified 2026)

Repository webhooks — GitHub web UI:
1. Repo → **Settings**
2. Left sidebar → **Webhooks**
3. **Add webhook**
4. Fill in:
   - **Payload URL:** `https://smee.io/<channel>` (dev) or your relay URL (prod).
   - **Content type:** `application/json` (REQUIRED — relay assumes JSON body for HMAC check).
   - **Secret:** a high-entropy random string (`openssl rand -hex 32`). Save this — it goes into the relay env.
   - **SSL verification:** Enable SSL verification (default).
5. **Which events would you like to trigger this webhook?**
   - Choose **Let me select individual events**.
   - Check **Issues** and **Pull requests** (PR needed for merge cleanup D-15).
6. **Active** = checked.
7. **Add webhook**. GitHub fires a `ping` event — verify 200 in smee.io console.

### API click-path (alternative, scriptable)

```bash
gh api repos/$OWNER/$REPO/hooks -X POST \
  -f name=web \
  -f 'config[url]=https://smee.io/abc123' \
  -f 'config[content_type]=json' \
  -f "config[secret]=$GITHUB_WEBHOOK_SECRET" \
  -f 'events[]=issues' \
  -f 'events[]=pull_request' \
  -F active=true
```

**Confidence:** HIGH (docs verified end-to-end; `gh api` command verified against REST API docs).

## Jira Webhook Setup

Sources:
- <https://developer.atlassian.com/cloud/jira/platform/webhooks/>
- <https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-webhooks/>
- <https://community.developer.atlassian.com/t/how-to-secret-while-creating-webhook/96921>

### Cloud vs Server/Data Center

**Cloud (current, most likely):** Two paths — (a) Administration UI "System → WebHooks" (only in some Cloud instances), (b) REST API `POST /rest/api/3/webhook` (**Connect/OAuth2 apps only**). For a personal install without a Connect app, path (a) via the admin UI is the pragmatic route. The **"Automation for Jira" rule with outbound webhook action** is a third path (no app needed).
**Server/DC:** Administration → System → WebHooks is a first-class UI with full JQL filter support. Stable, but user is likely on Cloud.

### Event scoping

**Issue assignment events fire as `jira:issue_updated`** with a `changelog` showing which fields changed. There is no dedicated "assigned" event — the relay must inspect the changelog:
```js
const isAssignmentToUser = payload.webhookEvent === "jira:issue_updated"
  && payload.changelog?.items?.some(i => i.field === "assignee" && i.to === targetAccountId);
```

**JQL filter (narrows events server-side BEFORE the changelog check):**
- Supported JQL clauses on webhook filters: `=`, `!=`, `IN`, `NOT IN`.
- `assignee = currentUser()` fires on any update while assignee equals current user. **Combined with the changelog check, this is the right primitive** — pre-filters to "issues currently assigned to me," the relay then checks the changelog for an actual assignment change to avoid re-triaging every update.
- Alternative (narrower): `assignee = currentUser() AND status = "To Do"` to only fire on backlog items.

### Auth and signing

- **Creation auth:** Cloud UI path uses Jira session; REST API path needs Connect/OAuth2 (app install).
- **Delivery signing:** Optional `secret` field at creation. Jira signs `X-Hub-Signature` header (note: SHA-256 on Cloud — header name same as GitHub's legacy but algorithm matches GitHub's SHA-256 variant on Cloud; verify at setup time with a ping test). Community thread (2024-2025) confirms Cloud uses HMAC-SHA256.
- **No built-in `currentUser()` resolution without OAuth context** — pragmatic approach: use a static `accountId` (your own) in the JQL, captured at setup time via `GET /rest/api/3/myself`.

### Payload shape (`jira:issue_updated`)

```json
{
  "webhookEvent": "jira:issue_updated",
  "timestamp": 1715000000000,
  "user": { "accountId": "...", "displayName": "..." },
  "issue": {
    "id": "10042",
    "key": "LFCR-360",
    "fields": {
      "summary": "...",
      "description": { "content": [...] },  // ADF (Atlassian Document Format) — not raw markdown
      "assignee": { "accountId": "...", "displayName": "..." },
      "labels": ["triage:oneshot", "backend"],
      "priority": { "name": "High" },
      "issuetype": { "name": "Story" },
      "project": { "key": "LFCR", "name": "LFCR App" },
      "status": { "name": "To Do" }
    }
  },
  "changelog": {
    "items": [
      { "field": "assignee", "fromString": "Someone Else", "toString": "Ivan", "from": "old-accountId", "to": "my-accountId" }
    ]
  }
}
```

### UI click-path (verified 2026, Cloud admin UI)

1. Site admin → **Settings (cog icon)** → **System** → **WebHooks** (under "Advanced"). **Note:** on modern Cloud instances this sometimes appears only in legacy admin views; Cloud is deprecating this UI in favor of Automation-for-Jira outbound webhooks.
2. **Create a WebHook**
3. Fill:
   - **Name:** `tb-triage`
   - **URL:** `https://smee.io/<channel>` (dev) or production relay URL
   - **JQL:** `assignee = <your-accountId-UUID>`  (use `currentUser()` only if webhook is created in your user context)
   - **Secret:** random hex (`openssl rand -hex 32`)
   - **Events:** check `Issue: updated` (primary) and optionally `Issue: created` (for freshly-assigned-on-create cases)
4. **Create**.

### Fallback (if the legacy WebHooks UI is unavailable in modern Cloud)

Use **Automation for Jira** (Project settings → Automation → Create rule):
1. Trigger: **Issue assigned**
2. Condition: Assigned to = current user / specific user.
3. Action: **Send web request**
   - URL: smee or relay URL
   - Method: POST
   - Headers: `X-Hub-Signature: sha256=<computed>` (requires smart-value HMAC — Atlassian supports via `{{signature}}` only with custom fields; OR skip signing on localhost and trust HTTPS only).
   - Body: JSON template mirroring the webhook payload shape.

**Note (D-05 deliverable must cover both):** The setup doc explains both paths; admin UI first, Automation-for-Jira fallback if UI unavailable.

### Labels payload → D-25 tag detection

`payload.issue.fields.labels` is a flat string array. Relay filters on `labels.includes("triage:oneshot")` etc. Labels can be set on the source ticket via Jira UI or API; same behavior as GitHub (human-facing manual override).

**Confidence:** HIGH for event types + payload shape; MEDIUM for the UI path (Cloud's admin UI is in flux; fallback path documented).

## Setup-Instruction Deliverable Shape

**Recommendation: single file at `docs/paperclip-triage-setup.md` with two top-level sections (GitHub, Jira).**

Rationale:
- One doc = one place to read end-to-end.
- Users setting up one side often need the other shortly after.
- Splitting into two files multiplies the "where are the shared prerequisite steps" problem (keychain setup, smee.io account creation, dedup.json location) — those live in a shared preamble section.

**Recommended outline:**
```markdown
# Paperclip Triage Pipeline Setup

## Prerequisites
- Paperclip running locally at http://localhost:3100
- tb plugin installed and `/tb:doctor` passes
- macOS Keychain credential store (bin/resolve-credential verified)
- smee.io account (free)

## Shared: Keychain Secrets
Run these to seed keychain once:
  node scripts/setup-credential.js github_webhook_secret
  node scripts/setup-credential.js jira_webhook_secret
  node scripts/setup-credential.js paperclip_webhook_signing_key
  node scripts/setup-credential.js github_triage_user_login    # your github handle
  node scripts/setup-credential.js jira_triage_user_accountid  # your Jira accountId

## Shared: Start the webhook relay
... (pm2/launchd/bun command) ...

## Shared: Install Triage Company into Paperclip
... (run /tb:update which fires extended paperclip-symlink.sh) ...

## GitHub setup
  ### Option A: UI (recommended)
  ...
  ### Option B: gh api (scriptable)
  ...
  ### Verify
  ...
  ### Troubleshooting

## Jira setup
  ### Atlassian Cloud UI
  ...
  ### Automation-for-Jira fallback
  ...
  ### Verify
  ...
  ### Troubleshooting

## Teardown / rotate secret
  ...
```

**Secrets inventory (flows into `bin/resolve-credential`):**
| Service key | Purpose | Consumer |
|-------------|---------|----------|
| `github_webhook_secret` | Verify X-Hub-Signature-256 on inbound GitHub webhooks | Webhook relay |
| `jira_webhook_secret` | Verify X-Hub-Signature on inbound Jira webhooks | Webhook relay |
| `paperclip_webhook_signing_key` | Secret used by Paperclip routine webhook trigger; relay signs its outbound fire with this | Webhook relay |
| `github_triage_user_login` | Filter `payload.assignee.login == $user` | Webhook relay |
| `jira_triage_user_accountid` | Filter `changelog.to == $accountId` | Webhook relay |
| `paperclip_api_base` | e.g. `http://localhost:3100` | Webhook relay, deploy script |
| `paperclip_api_key` | Bearer token for Paperclip API (board-level) | Webhook relay, deploy script |
| `paperclip_company_id` | Target company for triage issues | Webhook relay |
| `paperclip_triage_agent_id` | Agent that receives initial assignment on inbound webhook | Webhook relay |

All resolved via `node scripts/resolve-credential.js <key>` (which the existing CLAUDE-md `bin/resolve-credential` alias should wrap — see Open Questions).

**Confidence:** HIGH (shape is editorial; secrets list is complete given the architecture above).

## Deploy Script Extension Plan (D-24)

Source: `/Users/ivarga/Projects/ai-toolbelt/scripts/paperclip-symlink.sh` (current implementation, 33 lines)

### Current behavior
```bash
# finds PAPERCLIP_ROOT by `find "$HOME" -maxdepth 4 -name adapter-utils -path "*/paperclip/packages/*"`
# then: for skill in $PLUGIN_SKILLS/$PLUGIN_VERSION/skills/*/ ; do
#         rm -rf $PAPERCLIP_ROOT/skills/$name
#         cp -R $skill $PAPERCLIP_ROOT/skills/$name
#       done
```
Invoked from `skills/update/SKILL.md` step 13. Copy-based (not symlinks despite filename).

### Required extensions

1. **Deploy agents/** — existing `agents/` dir in tb (currently has `attachment-documenter.md`) becomes a candidate for copy. **But:** `agents/` in tb is Claude Code subagent format, which is a DIFFERENT format than AgentCompanies `agents/` directories. Keep them separate — do NOT conflate. For Phase 24 the AgentCompanies `agents/<slug>/AGENTS.md` tree lives under the new `companies/triage-shop/agents/`, not tb's root `agents/`.

2. **Deploy companies/** — NEW top-level tb directory. Script adds a loop:
   ```bash
   SOURCE="$PLUGIN_SKILLS/$PLUGIN_VERSION/companies"
   if [ -d "$SOURCE" ]; then
     mkdir -p "$PAPERCLIP_ROOT/companies"
     for company in "$SOURCE"/*/; do
       name=$(basename "$company")
       rm -rf "$PAPERCLIP_ROOT/companies/$name"
       cp -R "$company" "$PAPERCLIP_ROOT/companies/$name"
     done
   fi
   ```

3. **Idempotency:** current script `rm -rf` + `cp -R`. Same pattern for companies. Safe because Paperclip imports companies lazily (spec §14 graph build on demand); file writes are idempotent.

4. **Post-deploy registration (open question):** Paperclip's `companies/` directory has NO automatic re-scan on change. The user may need to either (a) restart Paperclip, or (b) run `paperclipai company import /path/to/company --target existing` to refresh. **Recommendation:** defer to user manual action in Phase 24 (documented in the setup doc). Auto-restart is out of scope.

5. **Version handling:** existing script uses `sort -V | tail -1` on plugin cache dirs. Keep the same for the new `companies/` path.

### Proposed final script shape (pseudo-diff):
```bash
# ... existing PAPERCLIP_ROOT / PLUGIN_VERSION / SKILL_SOURCE resolution ...

# 1. Copy skills (existing)
for skill in "$SKILL_SOURCE"/*/; do ... done

# 2. Copy companies (NEW)
COMPANIES_SOURCE="$PLUGIN_SKILLS/$PLUGIN_VERSION/companies"
if [ -d "$COMPANIES_SOURCE" ]; then
  mkdir -p "$PAPERCLIP_ROOT/companies"
  for company in "$COMPANIES_SOURCE"/*/; do
    name=$(basename "$company")
    rm -rf "$PAPERCLIP_ROOT/companies/$name"
    cp -R "$company" "$PAPERCLIP_ROOT/companies/$name"
  done
  echo "Paperclip: copied tb companies into $PAPERCLIP_ROOT/companies"
fi
```

### Script reads_first (for planner)
Tasks modifying this script MUST read:
- `/Users/ivarga/Projects/ai-toolbelt/scripts/paperclip-symlink.sh`
- `/Users/ivarga/Projects/ai-toolbelt/skills/update/SKILL.md` (invocation point, §13)
- `/Users/ivarga/Projects/paperclip/docs/companies/companies-spec.md` (target layout)

### Runtime State Inventory (D-24 extension)

| Category | Items | Action |
|----------|-------|--------|
| Stored data | `~/.paperclip/tb-triage/dedup.json`, `~/.paperclip/tb-triage/repo-map.json` | New files; planner creates schema + initialize-empty on first webhook |
| Live service config | Paperclip routine webhook triggers (created via API on first deploy) | Idempotent recreate via API on deploy |
| OS-registered state | webhook relay process (pm2 or launchd) | Documented in setup doc; not auto-registered in Phase 24 |
| Secrets / env vars | 9 keychain entries (see Setup-Instruction Deliverable) | Documented; resolved at runtime |
| Build artifacts | None — tb skills are markdown; no compiled artifacts | N/A |

**Confidence:** HIGH.

## Validation Architecture

**Validation enabled** (`.planning/config.json` workflow.nyquist_validation = true).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in tb repo — `/Users/ivarga/Projects/ai-toolbelt/` has no `package.json` test script, no `vitest.config.*`, no `tests/` dir as first-class |
| Config file | **None — Wave 0 gap** |
| Quick run command | **TBD — Wave 0 must establish** |
| Full suite command | **TBD — Wave 0 must establish** |

**Wave 0 recommendation:** adopt **Node's built-in test runner** (`node --test`) since tb scripts are all plain Node (no TS compile, no build step). No new dependency. Runs fast (<1s startup), good diff output, supports fixtures.

- Install: none (built into Node 20+).
- Add `scripts/tests/` dir.
- Each test file: `scripts/tests/<subject>.test.js`.
- Quick run: `node --test scripts/tests/<file>`.
- Full suite: `node --test scripts/tests/`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P24-INTAKE | Webhook relay verifies GitHub HMAC, rejects bad signature | unit | `node --test scripts/tests/relay-github-verify.test.js` | ❌ Wave 0 |
| P24-INTAKE | Webhook relay verifies Jira HMAC, rejects bad signature | unit | `node --test scripts/tests/relay-jira-verify.test.js` | ❌ Wave 0 |
| P24-INTAKE | Relay filters `issues.assigned` for configured user only | unit | `node --test scripts/tests/relay-github-filter.test.js` | ❌ Wave 0 |
| P24-INTAKE | Relay filters Jira changelog assignee→configured user only | unit | `node --test scripts/tests/relay-jira-filter.test.js` | ❌ Wave 0 |
| P24-INTAKE | Relay emits Paperclip routine fire with correct body + signature | unit (mock paperclip) | `node --test scripts/tests/relay-paperclip-fire.test.js` | ❌ Wave 0 |
| P24-TAGOVERRIDE | `triage:oneshot` label bypasses confidence path | unit | `node --test scripts/tests/triage-tag-override.test.js` | ❌ Wave 0 |
| P24-TAGOVERRIDE | `triage:skip` label filters out of pipeline entirely | unit | `node --test scripts/tests/triage-tag-skip.test.js` | ❌ Wave 0 |
| P24-WORKTREE-DEDUP | Dedup store rejects duplicate `{source}#{id}` | unit | `node --test scripts/tests/dedup-store.test.js` | ❌ Wave 0 |
| P24-WORKTREE-CLEANUP | PR-merged event triggers worktree removal | integration (mock gh) | `node --test scripts/tests/cleanup-on-merge.test.js` | ❌ Wave 0 |
| P24-REPO-MAP | Auto-resolve from Paperclip projects.workspaces succeeds | unit (mock paperclip) | `node --test scripts/tests/repo-map-autoresolve.test.js` | ❌ Wave 0 |
| P24-REPO-MAP | Cache hit bypasses Paperclip API call | unit | `node --test scripts/tests/repo-map-cache.test.js` | ❌ Wave 0 |
| P24-DEPLOY | Extended paperclip-symlink.sh copies companies/ into Paperclip | integration | `bash scripts/tests/paperclip-symlink.test.sh` | ❌ Wave 0 |
| P24-TRIAGE | Triage agent emits 3 confidence labels | **manual-only** | — | N/A |
| P24-AUTOROUTE | All-high → oneshot dispatch | **manual smoke** (real Paperclip + real claude) | `pnpm paperclipai agent invoke triage-agent ...` | N/A |
| P24-HUMAN-GATE | approval flow marks done / changes_requested | **manual smoke** (Paperclip UI) | — | N/A |
| P24-REJECT-REQUEUE | Rejection re-queues with feedback comment | **manual smoke** | — | N/A |
| P24-SHIP | End-to-end PR opens | **manual smoke** | `bash scripts/tests/e2e-smoke.sh` (opens against a fixture repo) | ❌ Wave 0 (optional) |

### Sampling Rate
- **Per task commit:** `node --test scripts/tests/<only-affected>.test.js` (< 5s).
- **Per wave merge:** `node --test scripts/tests/` (full suite; should stay < 30s).
- **Phase gate:** Full suite green + manual smoke of one GitHub issue end-to-end (webhook → triage → oneshot dispatch → approve → PR open).

### Fixture Strategy

Store canned GitHub + Jira payload JSON in `scripts/tests/fixtures/`:
- `github-issues-assigned.json` — a real `issues.assigned` payload with assignee, title, body, labels.
- `github-issues-labeled-triage-oneshot.json` — a real `issues.labeled` for the tag-override path.
- `github-pr-closed-merged.json` — a real `pull_request.closed` with `merged: true`.
- `jira-issue-updated-assigned.json` — a real `jira:issue_updated` with changelog `items[].field = "assignee"`.
- `jira-issue-labeled.json` — issue with `fields.labels = ["triage:process"]`.

Obtain fixtures: smee.io console captures real deliveries when you set up the webhook against a test repo/project — save the `.json` before redacting PII.

### Wave 0 Gaps
- [ ] `scripts/tests/` directory (doesn't exist)
- [ ] `scripts/tests/fixtures/` with the 5 canned payloads (capture via smee.io in a scratch repo)
- [ ] `scripts/tests/helpers.js` — shared mocks: mock Paperclip HTTP server, mock `gh api` response fixture, temp-dir helper for dedup.json
- [ ] `scripts/tests/paperclip-symlink.test.sh` — shell-level integration test
- [ ] Framework install: none (node --test ships with Node 20+ which is already installed per tb doctor checks)

### End-to-end Smoke (not part of automated gates)

Phase 24 E2E has real dependencies (GitHub, Paperclip, Claude CLI, actual git repo). **Do not automate in CI.** Document a manual smoke procedure in `docs/paperclip-triage-setup.md`:
1. Create issue in test repo, assign to self.
2. Verify webhook delivery in smee.io console.
3. Verify Paperclip issue appears with triage agent assigned.
4. Wait for triage heartbeat → verify 3 confidence labels posted as comment.
5. Verify routing verdict (oneshot in the test).
6. Verify worktree created at `<repo>/.claude/worktrees/gh-<owner>-<repo>-<number>/`.
7. Wait for oneshot heartbeat completion → verify approval issue in Paperclip UI.
8. Approve in Paperclip UI → verify PR opens on GitHub.
9. Merge PR → verify worktree auto-removed (webhook path if implemented; manual `/tb:cleanup` otherwise).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Paperclip repo at `~/Projects/paperclip/` | D-24 deploy + runtime | ✓ | (local) | — |
| Paperclip server running | D-01 runtime | ✓ (assumed per user workflow) | — | Start via `pnpm dev` in Paperclip repo |
| Claude Code CLI (`claude`) | D-13 worktree, D-12 runtime | ✓ | — (version pinned via `.claude-plugin/plugin.json` tb doctor) | — |
| `gh` CLI | webhook setup (scripted path), merge polling | ✓ (tb skills already use it) | — | — |
| `git` | worktree creation | ✓ | — | — |
| `node` (>= 20) | relay script, tests | ✓ | — | — |
| `acli` (Atlassian CLI) | Jira webhook management (OAuth-enabled paths only) | ? (`tb:task-jira` uses it; may not be logged in for this user scope) | — | Use Jira REST API or admin UI manually |
| `smee-client` (npm) | Local webhook tunneling | ✗ | — | Install via `npm install -g smee-client`; documented |
| macOS Keychain | D-22 secrets | ✓ (tb already uses it) | — | — |
| pm2 or launchd | Webhook relay persistence | pm2 ✗ / launchd ✓ (macOS built-in) | launchd always available | Document launchd plist in setup doc |
| `@octokit/webhooks` (npm) | GitHub signature verify reference impl | ✗ | — | Implement inline with `crypto.createHmac` + `timingSafeEqual` — 15 LOC |

**Missing dependencies with fallback:**
- smee-client → one-line install; documented in setup doc.
- @octokit/webhooks → inline 15-LOC crypto implementation preferred (matches tb's "no-dependency" philosophy for scripts/).

**Missing dependencies with no fallback:** None.

## Open Questions for Planner

1. **`bin/resolve-credential` wrapper does not exist as a shell entry.** The CONTEXT cites it as existing, but the filesystem has only `scripts/resolve-credential.js`. The `bin/` dir has wrappers for 9 other scripts (forgetful-client, gsd-*, etc.) but not resolve-credential. **Planner should either (a) add `bin/resolve-credential` as a thin wrapper — one-liner matching the other `bin/*` scripts, or (b) document that consumers invoke `node "$PLUGIN_ROOT/scripts/resolve-credential.js"` directly.** Option (a) aligns with existing tb convention and makes D-22 literally true.

2. **Paperclip company import vs. raw file copy (D-24 vs. deferred native import).** D-24 locks the deploy mechanism to `paperclip-symlink.sh` extension (raw copy). BUT: Paperclip has no auto-reindex of `companies/` on filesystem change. After deploy, the user must either restart Paperclip OR run `paperclipai company import <path>`. **Is it acceptable for Phase 24 to require a manual "restart Paperclip OR run import" step after `/tb:update`?** If yes, document and proceed. If no, planner should design around it (e.g., deploy script invokes `paperclipai company import --target existing --yes` as a follow-up — which partially revives the "deferred" native import path).

3. **Jira Cloud admin UI availability.** Modern Jira Cloud instances may not expose the legacy "System → WebHooks" admin panel. **Research flagged this as MEDIUM confidence.** The fallback (Automation-for-Jira outbound webhook) works but has limited HMAC signing support — user may need to run relay over HTTPS-only and skip signature verification on the Jira side. **Planner should defer the decision to the user during setup (the setup doc presents both paths; user picks whichever the UI offers).**

4. **Paperclip routine signing is incompatible with GitHub/Jira signing.** Confirmed via the Paperclip issue tracker search. The webhook relay therefore **must** be a two-step bridge (verify inbound → re-sign outbound). This is fine architecturally, but worth flagging as a non-obvious detail the planner will need to design around. **No way to avoid the relay.**

5. **Per-agent SOUL.md tone (D-23 — Claude's discretion).** Research cannot recommend tone without user taste input. Planner should include a task where the initial drafts of triage/oneshot/gsd SOUL.md files are generated, then a review checkpoint with the user.

6. **Paperclip company + agent IDs bootstrap.** Phase 24 requires real Paperclip entities: one company, one project per mapped repo, three agents (triage, oneshot-coder, gsd-orchestrator), routines with webhook triggers. **Who creates these? The answer affects how "deploy" works:**
   - Option A: user manually creates company + agents in Paperclip UI before first deploy. Deploy copies `companies/triage-shop/` next to them as reference (no enforcement).
   - Option B: deploy script uses `paperclipai company import --target new --company-id <from-context>` to create everything from the markdown.
   - Option C: a one-time `/tb:setup-paperclip-triage` skill (deferred per CONTEXT) does the bootstrap.
   Recommend Option A for Phase 24 minimalism; document the bootstrap as a one-time section in the setup doc.

7. **How do the three dispatched agents share the single worktree?** The triage agent creates the worktree; the coder agent runs IN the worktree; the coder also opens the PR. These are three different heartbeats against possibly three different agent records. **Paperclip's `claude_local` session is cwd-aware — changing cwd starts a fresh session.** If all three use the same `cwd` (= the worktree), their sessions are isolated by Paperclip agent ID but share the filesystem. **This is the correct behavior.** No additional design needed — just flag that the coder agent's `cwd` in `.paperclip.yaml` needs to be a VARIABLE (e.g., `{{worktreeCwd}}` templated at run time), not a hardcoded path. **If Paperclip's promptTemplate variables do not support cwd dynamically, planner must work around this** (e.g., use a wrapper script as the adapter command that reads the worktree path from an env var injected at wake).

## Sources

### Primary (HIGH confidence)

**Paperclip (local filesystem):**
- `/Users/ivarga/Projects/paperclip/AGENTS.md` — root agent package conventions
- `/Users/ivarga/Projects/paperclip/docs/companies/companies-spec.md` — full AgentCompanies spec v1-draft
- `/Users/ivarga/Projects/paperclip/docs/agents-runtime.md` — heartbeat model, adapter types, session persistence
- `/Users/ivarga/Projects/paperclip/docs/adapters/overview.md` — adapter catalog
- `/Users/ivarga/Projects/paperclip/docs/adapters/claude-local.md` — Claude Code CLI adapter config
- `/Users/ivarga/Projects/paperclip/docs/adapters/http.md` — HTTP webhook adapter
- `/Users/ivarga/Projects/paperclip/docs/adapters/process.md` — generic process adapter
- `/Users/ivarga/Projects/paperclip/docs/adapters/creating-an-adapter.md` — execute/test/parse internals
- `/Users/ivarga/Projects/paperclip/docs/adapters/external-adapters.md` — plugin adapter system
- `/Users/ivarga/Projects/paperclip/docs/guides/execution-policy.md` — **human gate primitive (D-11, D-16, D-18)**
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/execution-workspaces-and-runtime-services.md` — execution workspace concept
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/approvals.md` — approvals lifecycle
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/importing-and-exporting.md` — company package layout + paperclipai CLI
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/activity-log.md` — **telemetry (D-21)**
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/task-workflow.md` — checkout + work-and-update patterns
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/heartbeat-protocol.md` — heartbeat steps + env vars
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/handling-approvals.md` — approval-side API
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/writing-a-skill.md` — SKILL.md format
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/comments-and-communication.md` — comments + @-mentions
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/cost-reporting.md` — cost events
- `/Users/ivarga/Projects/paperclip/docs/api/overview.md` — auth, errors, conventions
- `/Users/ivarga/Projects/paperclip/docs/api/issues.md` — issue CRUD, checkout, documents
- `/Users/ivarga/Projects/paperclip/docs/api/routines.md` — **webhook trigger primitive (D-05 Paperclip side)**
- `/Users/ivarga/Projects/paperclip/docs/api/approvals.md` — approval API
- `/Users/ivarga/Projects/paperclip/docs/api/agents.md` — agent CRUD + heartbeat invocation
- `/Users/ivarga/Projects/paperclip/docs/api/goals-and-projects.md` — **project workspace primitive (D-19)**
- `/Users/ivarga/Projects/paperclip/docs/api/secrets.md` — Paperclip secret store (out of Phase 24 scope)
- `/Users/ivarga/Projects/paperclip/docs/cli/overview.md` — paperclipai CLI
- `/Users/ivarga/Projects/paperclip/docs/cli/control-plane-commands.md` — company import / export / issue CRUD CLI
- `/Users/ivarga/Projects/paperclip/docs/start/core-concepts.md` — conceptual overview
- `/Users/ivarga/Projects/paperclip/docs/start/architecture.md` — stack overview
- `/Users/ivarga/Projects/paperclip/doc/experimental/issue-worktree-support.md` — experimental worktree runtime
- `/Users/ivarga/Projects/paperclip/doc/plans/2026-03-10-workspace-strategy-and-git-worktrees.md` — execution workspace design doc

**tb repo (local filesystem):**
- `/Users/ivarga/Projects/ai-toolbelt/scripts/paperclip-symlink.sh` — existing deploy script
- `/Users/ivarga/Projects/ai-toolbelt/skills/update/SKILL.md` — deploy invocation point
- `/Users/ivarga/Projects/ai-toolbelt/skills/task-github/SKILL.md` — GitHub issue reader
- `/Users/ivarga/Projects/ai-toolbelt/skills/task-jira/SKILL.md` — Jira ticket reader
- `/Users/ivarga/Projects/ai-toolbelt/skills/pr-submit/SKILL.md` — PR open flow
- `/Users/ivarga/Projects/ai-toolbelt/skills/pr-describe/SKILL.md` — PR body generation
- `/Users/ivarga/Projects/ai-toolbelt/scripts/resolve-credential.js` — keychain resolver
- `/Users/ivarga/Projects/ai-toolbelt/CLAUDE.md` — tb plugin conventions
- `/Users/ivarga/Projects/ai-toolbelt/.planning/config.json` — nyquist_validation = true

**External docs (HIGH):**
- <https://code.claude.com/docs/en/common-workflows> — `claude --worktree` flag, subagent frontmatter, cleanup
- <https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries> — X-Hub-Signature-256 HMAC-SHA256 verification
- <https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks> — webhook creation UI path
- <https://docs.github.com/en/webhooks/webhook-events-and-payloads> — event + action enum
- <https://docs.github.com/en/rest/repos/webhooks> — REST API endpoint
- <https://developer.atlassian.com/cloud/jira/platform/webhooks/> — Jira Cloud webhook setup + JQL filter syntax
- <https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-webhooks/> — Jira webhook REST API

### Secondary (MEDIUM confidence — WebSearch verified against official sources)

- <https://smee.io/> and <https://github.com/probot/smee.io> — smee.io dev tunnel (GitHub's own recommendation)
- <https://www.magicbell.com/blog/github-webhooks-guide> — cross-verification of GitHub payload shape
- <https://inventivehq.com/blog/jira-webhooks-guide> — cross-verification of Jira changelog-based assignment detection

### Tertiary (LOW confidence — flagged)

- <https://github.com/anthropics/claude-code/issues/39886> — subagent `isolation: worktree` silent-fail bug (single-source; but aligns with sibling issues #33045, #38949, #37549 — MEDIUM overall)
- <https://github.com/paperclipai/paperclip/issues/1892> — Paperclip X-Paperclip-Signature incompatibility with GitHub/Jira signatures (single-source but technical content matches `docs/api/routines.md`)

## Metadata

**Confidence breakdown:**
- Paperclip Agent Companies spec: **HIGH** — read spec end-to-end, cross-verified with importing-and-exporting.md
- Paperclip primitives (human-gate, runtime, telemetry): **HIGH** — docs are explicit
- Paperclip primitives (dedup, repo-mapping): **HIGH on primitive-absence; MEDIUM on fallback recommendation** (fallback design is opinionated)
- Claude Code worktree: **HIGH** — official docs explicit; subagent bug is documented and confirmed by multiple GitHub issues
- GitHub webhooks: **HIGH** — official docs + multiple cross-references
- Jira webhooks: **MEDIUM** — Cloud admin UI is documented but Cloud UI changes fast (2026 instances may vary); fallback (Automation-for-Jira) documented
- Setup-instruction shape: **HIGH** — editorial recommendation grounded in secrets inventory
- D-24 deploy extension: **HIGH** — script is 33 lines, extension is mechanical
- Validation architecture: **MEDIUM** — framework choice (node --test) is opinionated; test list is comprehensive

**Research date:** 2026-04-15
**Valid until:** Fast-moving (Claude Code worktree behavior, Paperclip experimental features, Jira Cloud admin UI) — revalidate in 30 days. GitHub webhook docs are stable — revalidate in 90 days.
