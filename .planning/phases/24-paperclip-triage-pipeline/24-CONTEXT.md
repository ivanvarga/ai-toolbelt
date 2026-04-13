# Phase 24: Paperclip Triage Pipeline - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a Paperclip-integrated triage pipeline. Trigger: new GitHub/Jira issues assigned to the user. Flow: ingest → load context via `tb:task-github`/`tb:task-jira` → triage agent scores understanding, solution, and codebase-trace confidence → route (oneshot agent, GSD autonomous, or pause for human) → agent runs in a git worktree → human approves/rejects in Paperclip UI → on approve, open a GitHub PR (merge stays a separate human action).

Authoring lives in the tb repo (agent definitions, workflow configs, skills, deploy glue). The runtime sits in Paperclip (server + UI). The phase includes research-backed setup instructions for GitHub/Jira webhook configuration.

</domain>

<decisions>
## Implementation Decisions

### Integration shape & delivery
- **D-01:** Pipeline runtime lives inside Paperclip (server + UI) — tasks, state, and the human approval surface are Paperclip-native.
- **D-02:** All authoring (agent definitions, workflows, skills, supporting docs) lives in the `ai-toolbelt` (tb) repo. Researcher must identify an **idiomatic way to deploy tb-authored agent/company artifacts into Paperclip** — user explicitly does not want Paperclip lock-in ("I don't necessarily know my workflow will live in Paperclip forever").
- **D-03:** Deliverables conform to Paperclip's Agent Companies spec (`agentcompanies/v1-draft`) — expect to produce `AGENTS.md`, `SOUL.md`, and likely `COMPANY.md`/`TEAM.md`/`TASK.md` templates plus their scripts/references.

### Event intake
- **D-04:** Triage triggers on **new GitHub/Jira issues assigned to the user** (assignee-gated). Label-gating and "all new issues" rejected.
- **D-05:** Webhook-based integration. Phase deliverable includes a **research-backed setup-instruction document** walking the user through GitHub webhook + Jira webhook configuration end-to-end.
- **D-06:** Deduplication is required. Researcher **must first check whether Paperclip already provides task/issue dedup** before designing new logic — re-use if it exists.

### Triage & routing logic
- **D-07:** Triage agent uses `tb:task-github` and `tb:task-jira` to load issue context (metadata, body, comments, attachments).
- **D-08:** Triage agent emits three confidence signals for every issue:
  - **(a) Understanding** — do we understand what the issue actually asks for?
  - **(b) Solution** — do we have a concrete solution in mind?
  - **(c) Code-trace validation** — does tracing through the codebase confirm the proposed solution?
- **D-09:** Routing rules:
  - All three high → estimate complexity → **oneshot coder agent** (if one-shottable) with packaged context, OR **GSD orchestrator in autonomous mode** (no discuss phase) for multi-step work.
  - Any signal low → **pause task in Paperclip task queue** for human review.
- **D-10:** **User tag overrides classifier routing.** Tags like `one_shot` / `process_loop` (exact names are Claude's discretion — pick something appropriate and document) applied to the GitHub issue or Jira ticket force the corresponding route regardless of the triage agent's verdict.
- **D-11:** Human communication for paused tasks is Paperclip-idiomatic. Researcher must **investigate Paperclip's native human-in-loop / approval / chat primitives** and use them directly — user wants to not fight Paperclip's conventions.
- **D-12:** Agent runtime for oneshot vs GSD autonomous is **deferred to research** — recommend the idiomatic Paperclip agent-spawning pattern (Claude Code CLI with `/gsd-autonomous`, OpenClaw, agent.md-driven runtime choice, or other).

### Worktree lifecycle
- **D-13:** Leverage **Claude Code's native `--worktree` / `isolation: worktree` capability** — researcher confirms exact mechanism and how Paperclip agents can invoke it.
- **D-14:** No duplicate worktrees for the same issue/task — dedup check at worktree creation.
- **D-15:** Worktrees are cleaned up **after the resulting PR is merged on GitHub** — requires PR-status polling (or merge webhook) to detect.

### Human gate & ship
- **D-16:** Human approval surface is the **Paperclip UI** — task card shows agent output + diff preview + approve/reject.
- **D-17:** "Ship" = **open a GitHub PR only** (or flip a draft PR to ready). Merge stays a separate human action on GitHub.
- **D-18:** Rejection behavior at the Paperclip gate is **Claude's discretion** — default should be "re-queue with human feedback appended to context." Re-triage-on-rejection and discard variants are acceptable; planner may also defer multi-variant support to a later phase.

### Claude's Discretion
- Exact tag vocabulary for user overrides (e.g. `one_shot`, `process_loop`, `triage:oneshot`, `triage:gsd` — pick something coherent with Paperclip conventions)
- Confidence score format + cutoff threshold (numeric 0–1 vs low/med/high labels)
- Branch naming convention inside worktrees
- Default rejection behavior at the Paperclip gate
- Paperclip task card layout details
- How the triage agent surfaces its three confidence signals and reasoning in Paperclip UI
- Choice of deploy mechanism for tb → Paperclip artifacts (extending `paperclip-symlink.sh`, a new import command, Paperclip's own package-import flow, etc.) — research-informed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Paperclip Agent Companies spec & runtime docs
- `/Users/ivarga/Projects/paperclip/AGENTS.md` — root agent package for Paperclip itself (reference example of an AGENTS.md)
- `/Users/ivarga/Projects/paperclip/docs/companies/companies-spec.md` — Agent Companies `agentcompanies/v1-draft` spec (COMPANY.md, TEAM.md, AGENTS.md, PROJECT.md, TASK.md, SKILL.md, SOUL.md, HEARTBEAT.md, TOOLS.md conventions)
- `/Users/ivarga/Projects/paperclip/docs/agents-runtime.md` — runtime behavior
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/` — agent author guide(s); research all files in this dir
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/execution-policy.md` — execution policy / approvals / human-in-loop (critical for D-11, D-16)
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/importing-and-exporting.md` — import/export (critical for D-02 deploy mechanism)
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/openclaw-docker-setup.md` — OpenClaw runtime setup (relevant for D-12)

### tb plugin conventions & integration points
- `scripts/paperclip-symlink.sh` — current tb→Paperclip skill deployment (copy-based, invoked from `/tb:update`)
- `skills/update/SKILL.md` §"Re-symlink Paperclip skills" (lines ~142–158) — where the deploy step fires today
- `skills/task-github/SKILL.md` — GitHub issue reader used by the triage agent
- `skills/task-jira/SKILL.md` — Jira ticket reader used by the triage agent
- `CLAUDE.md` — tb plugin conventions (skill naming family-action, `tb:` prefix, `${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_ROOT}` path variables)
- `.claude-plugin/plugin.json` — plugin metadata

### GSD autonomous & worktree patterns
- `~/.claude/get-shit-done/workflows/` — GSD workflow definitions; "autonomous mode" (skip discuss) is the path referenced by D-09
- `superpowers:using-git-worktrees` (superpowers skill) — existing isolation pattern
- Git log entry `3a183d4 chore: merge executor worktree` — example of the existing worktree→merge flow

### External research targets (open questions for the researcher)
- Claude Code `--worktree` / `isolation: worktree` docs (for D-13)
- GitHub webhook setup: scoping (user issues only), payload filtering, signature verification, tunneling (smee/ngrok) for local dev
- Jira webhook setup: Atlassian Cloud vs Server, auth, payload shape
- Paperclip's native task queue / human-gate / approval primitives (for D-11, D-16)
- Paperclip's task dedup story, if any (for D-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tb:task-github`, `tb:task-jira`** — already fetch issue metadata, comments, and attachments. Triage agent invokes these directly; no new ingestion code needed for the context-loading step.
- **`scripts/paperclip-symlink.sh`** — current deploy pattern. Worth extending for company/agent artifacts; researcher decides whether to replace with something more idiomatic (Paperclip's own import flow?).
- **`bin/forgetful-client`, `scripts/forgetful-client.js`** — Forgetful HTTP client; useful if triage wants to recall prior similar issues for dedup signal or precedent.
- **`tb:pr-describe`, `tb:pr-submit`** — agents can invoke these to open the PR at the ship step (D-17).
- **`tools/mbridge`** — mobile automation; available if an agent needs to verify a mobile UI change.
- **Agent Companies spec artifacts in Paperclip repo** — `AGENTS.md`, etc. Templates and live examples to study.

### Established Patterns
- **Plugin skill authoring:** `SKILL.md` + frontmatter + supporting files; reference files via `${CLAUDE_SKILL_DIR}`. All triage/coder/orchestrator agent definitions will follow this.
- **tb → Paperclip deployment:** copy-based (not symlinks, despite the filename); invoked post `/tb:update`. Researcher may extend or supplant this.
- **Git worktrees:** already used by `superpowers:using-git-worktrees` and `worktree-agent-*` branches in recent commits. The new pipeline reuses this pattern with cleanup tied to PR merge.

### Integration Points
- **Paperclip repo** at `/Users/ivarga/Projects/paperclip` — pnpm workspace (`packages/`, `server/`, `ui/`, `adapters/`, `skills/`, `companies/`-adjacent conventions).
- **GitHub + Jira** — new intake surfaces; require webhook registration and signed-payload handling.
- **Claude Code CLI + GSD installation** — invocation target for dispatched agents (subject to D-12 runtime research).

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants **idiomatic Paperclip**: "I wanna do it idiomatic way, not fight it." Applies to human-in-loop, deploy mechanism, runtime, and dedup.
- User wants **portability**: agent definitions/workflows authored in tb so the pipeline is not locked to Paperclip forever.
- **Research-backed setup instructions** for GitHub/Jira webhook configuration are an explicit deliverable — not just code.
- **Dedup** is a repeated user concern — applies to both incoming events (D-06) and created worktrees (D-14).
- User described the triage algorithm in their own words (D-08/D-09); preserve their framing: "how confident we are we understand the issue, how confident we are we know the solution, confirm solution with tracing code and our solution."
- User tags on the source task (e.g. `one_shot`, `process_loop`) **override** classifier output — they are a manual escape hatch, not a hint.

</specifics>

<deferred>
## Deferred Ideas

- Auto-merge PRs on human approval (D-17 keeps merge manual for now)
- Auto-close originating GitHub/Jira issue after PR merge (full loop closure)
- Cost tracking, budget enforcement, and observability dashboards for agents
- Multi-repo fan-out / cross-repo worktrees in a single task
- LLM-based re-triage on rejection (may or may not land in this phase via D-18's discretion)
- Confidence-threshold tuning UI, prompt-aware context passing, multi-query retrieval to triage
- Alternative intakes: Paperclip UI paste-in, CLI submit (webhooks are the v1 path)
- Time-based / idle worktree pruning (merge-based cleanup is the v1 path)
- Making the setup-instruction doc into a `/tb:setup-paperclip-triage` scripted installer

</deferred>

---

*Phase: 24-paperclip-triage-pipeline*
*Context gathered: 2026-04-13*
