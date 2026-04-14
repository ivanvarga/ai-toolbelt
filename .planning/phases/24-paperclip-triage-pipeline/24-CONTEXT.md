# Phase 24: Paperclip Triage Pipeline - Context

**Gathered:** 2026-04-13
**Revised:** 2026-04-14
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
- **D-02:** All authoring (agent definitions, workflows, skills, supporting docs) lives in the `ai-toolbelt` (tb) repo. User explicitly does not want Paperclip lock-in ("I don't necessarily know my workflow will live in Paperclip forever") — portability is a first-class requirement.
- **D-03:** Deliverables conform to Paperclip's Agent Companies spec (`agentcompanies/v1-draft`) — expect to produce `AGENTS.md`, `SOUL.md`, and likely `COMPANY.md`/`TEAM.md`/`TASK.md` templates. **These artifacts RELY ON tb skills rather than inlining behavior** — skills remain the reusable unit; AgentCompanies docs wire agents to skills (via `sources:` / path references). Skills continue to be deployed separately.
- **D-24 (locked):** Deploy mechanism = **extend `scripts/paperclip-symlink.sh`** to also copy `agents/`, `companies/`, and AgentCompanies-spec artifacts to their matching Paperclip dirs. Keeps the existing /tb:update post-step as the single entry point. (Paperclip's native import flow is a Deferred idea for later evaluation.)

### Event intake
- **D-04:** Triage triggers on **new GitHub/Jira issues assigned to the user** (assignee-gated). Label-gating and "all new issues" rejected.
- **D-05:** Webhook-based integration. Phase deliverable includes a **research-backed setup-instruction document** walking the user through GitHub webhook + Jira webhook configuration end-to-end.
- **D-06:** Deduplication uses a **dedup key** — canonical `{source}#{id}` form (GitHub: `gh:{owner}/{repo}#{number}`; Jira: `jira:{ticket-id}`). Researcher investigates how to integrate this dedup key with Paperclip's existing task/issue primitives (re-use Paperclip's dedup if available; layer our own on top if not).
- **D-19 (new):** **Ticket → local repo mapping.** How the pipeline resolves "this GitHub/Jira issue corresponds to which local git repo" is **deferred to research** — first check whether Paperclip has a project-to-repo mapping primitive. Fallback: triage agent asks the user once at first dispatch per project and caches the answer for future tickets.

### Triage & routing logic
- **D-07:** Triage agent uses `tb:task-github` and `tb:task-jira` to load issue context (metadata, body, comments, attachments).
- **D-08:** Triage agent emits three confidence signals for every issue:
  - **(a) Understanding** — do we understand what the issue actually asks for?
  - **(b) Solution** — do we have a concrete solution in mind?
  - **(c) Code-trace validation** — does tracing through the codebase confirm the proposed solution?
- **D-26 (locked):** Confidence score format = **labels: `low` / `med` / `high`** (not numeric). Auto-dispatch threshold = **all three signals must be `high`**. Anything else → pause in Paperclip task queue.
- **D-09:** Routing rules (with D-26 applied):
  - All three `high` → estimate complexity → **oneshot coder agent** (if one-shottable) with packaged context, OR **GSD orchestrator in autonomous mode** (no discuss phase) for multi-step work.
  - Any signal `med` or `low` → **pause task in Paperclip task queue** for human review.
- **D-10:** User tag overrides classifier routing. **D-25 (locked):** Tag vocabulary on source tickets/issues = `triage:oneshot` (force oneshot route) / `triage:process` (force GSD autonomous) / `triage:skip` (exclude from triage entirely). Applied on the GitHub issue or Jira ticket.
- **D-11:** Human communication for paused tasks is Paperclip-idiomatic. Researcher must **investigate Paperclip's native human-in-loop / approval / chat primitives** and use them directly — user wants to not fight Paperclip's conventions.
- **D-12:** Agent runtime for oneshot vs GSD autonomous is **deferred to research** — recommend the idiomatic Paperclip agent-spawning pattern (Claude Code CLI with `/gsd-autonomous`, OpenClaw, agent.md-driven runtime choice, or other).

### Worktree lifecycle
- **D-13:** Leverage **Claude Code's native `--worktree` / `isolation: worktree` capability** — researcher confirms exact mechanism and how Paperclip agents can invoke it.
- **D-14:** No duplicate worktrees for the same issue/task (via the D-06 dedup key) — dedup check at worktree creation.
- **D-15:** Worktrees are cleaned up **after the resulting PR is merged on GitHub** — requires PR-status polling (or merge webhook) to detect.

### Human gate & ship
- **D-16:** Human approval surface is the **Paperclip UI** — task card shows agent output + diff preview + approve/reject.
- **D-17:** "Ship" = **open a GitHub PR only** (or flip a draft PR to ready). Merge stays a separate human action on GitHub.
- **D-18 (locked):** Default rejection behavior at the Paperclip gate = **re-queue with human feedback** — human writes a feedback note; task re-enters the queue with feedback appended to context. Same routing verdict; same agent retries. (Re-triage-on-rejection and discard variants are Deferred ideas.)

### Operations
- **D-20 (new):** **Failure / retry.** Research Paperclip's native retry/escalation primitive first. If it's compatible, prefer **one automatic retry** on agent-execution error before escalating to the Paperclip queue with the full error trace. Worktree is preserved for debugging on both retry and escalation. If Paperclip's native behavior conflicts, use Paperclip's pattern (user does not want to fight the runtime).
- **D-21 (new):** **Observability / telemetry.** Combination approach — Paperclip-native live telemetry (agent logs, state transitions, metrics) **plus** a tb-side per-task artifact (e.g. a triage decision log + routing verdict written to disk) so audit/replay works even if the pipeline moves off Paperclip later. Per-task log shape + location is Claude's discretion (it is acceptable for per-task logs to live alongside the worktree and be pruned with it at D-15 cleanup).
- **D-22 (new):** **Secrets.** Dispatched agents access credentials via **`bin/resolve-credential`** (existing tb macOS-Keychain + org-scoped resolver). No Paperclip secret store integration in Phase 24. Same mechanism existing tb skills already use.

### Claude's Discretion
- **Triage agent SOUL.md tone** (D-23) — planner drafts an initial SOUL.md (principles/tone/uncertainty handling) and user reviews during execution. Too early to pin tone upfront.
- Branch naming convention inside worktrees
- Paperclip task card layout details
- How the triage agent surfaces its three confidence signals and reasoning in Paperclip UI
- Per-task observability log shape/location (D-21)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Paperclip Agent Companies spec & runtime docs
- `/Users/ivarga/Projects/paperclip/AGENTS.md` — root agent package for Paperclip itself (reference example of an AGENTS.md)
- `/Users/ivarga/Projects/paperclip/docs/companies/companies-spec.md` — Agent Companies `agentcompanies/v1-draft` spec (COMPANY.md, TEAM.md, AGENTS.md, PROJECT.md, TASK.md, SKILL.md, SOUL.md, HEARTBEAT.md, TOOLS.md conventions)
- `/Users/ivarga/Projects/paperclip/docs/agents-runtime.md` — runtime behavior (critical for D-12 and D-20)
- `/Users/ivarga/Projects/paperclip/docs/guides/agent-developer/` — agent author guide(s); research all files in this dir
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/execution-policy.md` — execution policy / approvals / human-in-loop / retries (critical for D-11, D-16, D-20)
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/importing-and-exporting.md` — import/export (relevant for D-24 deploy-mechanism validation and long-term alternative)
- `/Users/ivarga/Projects/paperclip/docs/guides/board-operator/openclaw-docker-setup.md` — OpenClaw runtime setup (relevant for D-12)

### tb plugin conventions & integration points
- `scripts/paperclip-symlink.sh` — current tb→Paperclip skill deployment (copy-based, invoked from `/tb:update`). **D-24 extends this script.**
- `skills/update/SKILL.md` §"Re-symlink Paperclip skills" (lines ~142–158) — where the deploy step fires today
- `skills/task-github/SKILL.md` — GitHub issue reader used by the triage agent
- `skills/task-jira/SKILL.md` — Jira ticket reader used by the triage agent
- `bin/resolve-credential`, `scripts/resolve-credential.js`, `scripts/keychain.js`, `scripts/resolve-org.js` — credential resolution used by D-22
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
- Paperclip's project → local repo mapping primitive, if any (for D-19)
- Paperclip's retry/escalation primitive (for D-20)
- Paperclip's telemetry/observability surfaces (for D-21)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tb:task-github`, `tb:task-jira`** — already fetch issue metadata, comments, and attachments. Triage agent invokes these directly; no new ingestion code needed for the context-loading step.
- **`scripts/paperclip-symlink.sh`** — current deploy pattern. **D-24 extends this** to include agents/, companies/, and AgentCompanies-spec artifacts.
- **`bin/resolve-credential` + `scripts/keychain.js`, `scripts/resolve-org.js`** — macOS-Keychain org-scoped credential resolver. **D-22 pipes agents through this.**
- **`bin/forgetful-client`, `scripts/forgetful-client.js`** — Forgetful HTTP client; useful if triage wants to recall prior similar issues for dedup signal or precedent.
- **`tb:pr-describe`, `tb:pr-submit`** — agents can invoke these to open the PR at the ship step (D-17).
- **`tools/mbridge`** — mobile automation; available if an agent needs to verify a mobile UI change.
- **Agent Companies spec artifacts in Paperclip repo** — `AGENTS.md`, etc. Templates and live examples to study.

### Established Patterns
- **Plugin skill authoring:** `SKILL.md` + frontmatter + supporting files; reference files via `${CLAUDE_SKILL_DIR}`. All triage/coder/orchestrator agent definitions will follow this — and AgentCompanies docs (D-03) reference these skills rather than inlining their behavior.
- **tb → Paperclip deployment:** copy-based (not symlinks, despite the filename); invoked post `/tb:update`. **D-24 extends this single entry point rather than introducing a new deploy surface.**
- **Git worktrees:** already used by `superpowers:using-git-worktrees` and `worktree-agent-*` branches in recent commits. The new pipeline reuses this pattern with cleanup tied to PR merge.

### Integration Points
- **Paperclip repo** at `/Users/ivarga/Projects/paperclip` — pnpm workspace (`packages/`, `server/`, `ui/`, `adapters/`, `skills/`, `companies/`-adjacent conventions).
- **GitHub + Jira** — new intake surfaces; require webhook registration and signed-payload handling.
- **Claude Code CLI + GSD installation** — invocation target for dispatched agents (subject to D-12 runtime research).

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants **idiomatic Paperclip**: "I wanna do it idiomatic way, not fight it." Applies to human-in-loop, runtime, dedup, retry, telemetry, and ticket→repo mapping.
- User wants **portability**: agent definitions/workflows authored in tb so the pipeline is not locked to Paperclip forever. This is the reason for D-02 (tb authoring), D-03 (skills as reusable unit), D-21 (tb-side per-task log alongside Paperclip-native).
- **Research-backed setup instructions** for GitHub/Jira webhook configuration are an explicit deliverable — not just code.
- **Dedup** is a repeated user concern — applies to incoming events (D-06 canonical dedup key) and created worktrees (D-14).
- User described the triage algorithm in their own words (D-08/D-09); preserve their framing: "how confident we are we understand the issue, how confident we are we know the solution, confirm solution with tracing code and our solution."
- User tags on the source task (D-25: `triage:oneshot` / `triage:process` / `triage:skip`) **override** classifier output — they are a manual escape hatch, not a hint.
- **Locked items** (D-18, D-24, D-25, D-26) narrow planner's search space; planner should treat these as non-negotiable.

</specifics>

<deferred>
## Deferred Ideas

- Auto-merge PRs on human approval (D-17 keeps merge manual for now)
- Auto-close originating GitHub/Jira issue after PR merge (full loop closure)
- Cost tracking, budget enforcement, and observability dashboards for agents
- Multi-repo fan-out / cross-repo worktrees in a single task
- **LLM-based re-triage on rejection** (D-18 locks default to re-queue-with-feedback; re-triage moves here)
- **Discard-on-rejection variant** (D-18 locks default; discard moves here)
- Confidence-threshold tuning (D-26 locks labels + all-high threshold; tuning moves here)
- Alternative confidence signals / weighting (D-26 locks equal weight; weighting moves here)
- Alternative intakes: Paperclip UI paste-in, CLI submit (webhooks are the v1 path)
- Time-based / idle worktree pruning (merge-based cleanup is the v1 path)
- **Paperclip native import flow** as tb→Paperclip deploy mechanism (D-24 locks symlink-extension; native import revisited later)
- Making the setup-instruction doc into a `/tb:setup-paperclip-triage` scripted installer
- Paperclip secret store integration (D-22 uses tb keychain; Paperclip secret store moves here)
- Long-term centralized observability/audit store (D-21 accepts per-task log can die with worktree)

</deferred>

---

*Phase: 24-paperclip-triage-pipeline*
*Context gathered: 2026-04-13; revised: 2026-04-14*
