# Phase 24: Paperclip Triage Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13 (initial); 2026-04-14 (revision pass)
**Phase:** 24-paperclip-triage-pipeline
**Areas discussed:** Integration shape & intake, Triage & routing logic, Worktree lifecycle, Human gate & ship semantics
**Revision pass:** Ticket→repo mapping, decision group revisions (D-01–03, D-04–06), new areas (failure/retry, observability, secrets, SOUL.md), locked items (deploy, tags, confidence format, rejection default)

---

## Integration Shape & Intake

### Q1: Where should the triage pipeline primarily live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside Paperclip (server + UI) | Paperclip-native feature; triage in Node server, state + dashboard in React UI | ✓ |
| tb-side daemon, Paperclip as UI | Triage logic in tb; Paperclip consumes via skills/HTTP | |
| Paperclip adapter/package | New package in Paperclip monorepo, isolated from server | |
| Standalone service | Dedicated repo/service, independent of both | |

**User's choice:** Inside Paperclip (server + UI)
**Notes:** The operational home is Paperclip; authoring remains in tb (see Q2).

---

### Q2: What does Phase 24 actually deliver — where does the code land?

| Option | Description | Selected |
|--------|-------------|----------|
| Code in Paperclip repo | Triage server/UI code committed directly to `~/Projects/paperclip` | |
| tb-side scaffolding + Paperclip glue | Skills, shared scripts, Paperclip stub in tb; consumed via symlink pattern | |
| Two-phase split | Phase 24 tb-side only; later phase in Paperclip project roadmap | |
| Other (free-text) | User-provided alternative | ✓ |

**User's choice:** "I want this to be on tb side, agents definitions in tb repo (research if there is an idiomatic way to deploy those agent definitions/workflows to paperclip). I don't necessarily know my workflow will live in paperclip forever, but I need agent.md, soul.md... all of paperclip configuration."
**Notes:** Explicit portability requirement; research is required to find the idiomatic deploy mechanism into Paperclip. Paperclip Agent Companies spec (AGENTS.md / SOUL.md / etc.) is the target format.

---

### Q3: How do GitHub/Jira events enter the pipeline initially?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub webhook receiver | Node HTTP server (tunneled) handles webhooks → TASK.md entries | |
| Paperclip pulls on cadence | Periodic polling of GitHub/Jira APIs | |
| Manual paste-in via Paperclip UI | User pastes URL; triage fetches | |
| Hybrid: manual first, auto later | Manual intake only in Phase 24; webhook deferred | |
| Other (free-text) | User-provided alternative | ✓ |

**User's choice:** "I need you to just research how to setup github/jira webhook integration, result of this is instruction for me"
**Notes:** Phase 24 produces a research-backed setup-instruction document for webhook configuration (GitHub + Jira). Webhook is the chosen transport; researcher owns the how.

---

### Q4: Which events should actually trigger triage (vs ignored)?

| Option | Description | Selected |
|--------|-------------|----------|
| Label-gated | Only issues tagged with a specific label | |
| Assignee-gated | Only issues assigned to a designated user/bot | |
| All new issues | Every new issue fires a triage event | |
| All new + label overrides | All new, with skip-labels as filters | |
| Other (free-text) | User-provided alternative | ✓ |

**User's choice:** "I want new issues assigned to me, but also I need to check for deduplication, maybe paperclip already has that"
**Notes:** Assignee-gated on the user. Dedup is an additional requirement — researcher must check Paperclip's existing dedup capability first.

---

## Triage & Routing Logic

### Q5: How should the triage agent decide complexity / what kind of work an issue is?

| Option | Description | Selected |
|--------|-------------|----------|
| LLM judge only | Agent reads and emits structured verdict; no rules | |
| LLM + structured heuristics | LLM classifies, post-processor applies rules | |
| Rule-based first, LLM fallback | Deterministic rules first, LLM only for ambiguous | |
| LLM with explicit user override | LLM proposes, user can override via label/UI | |
| Other (free-text) | User-provided triage algorithm | ✓ |

**User's choice:** "You already have tb: skills for github and jira context loading, and then it should determine how confident we are we understand issue, how confident we are we know the solution. Confirm solution with tracing code and our solution. If we are fairly confident in our solution, determine how complicated is, can be one shotted, if yes send relevant context to one shot agent. If not send it to GSD orchestrator that runs process without discussion. If we are not sure of any of the question human interaction is needed. We have tags that during creation of task or editing of task user can tag issue with 'one_shot'/'process_loop' (or something like that appropriate)."
**Notes:** Three confidence signals (understanding, solution, code-trace). Routing rules follow from the scores. Tags are a manual override path.

---

### Q6: When triage is low-confidence and needs human input, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Question back to human | Agent posts targeted questions; re-runs on answer | |
| Pause in Paperclip task queue | Task lands in 'needs-human-decision' lane for verdict | ✓ |
| Both — questions first, then queue | Agent asks; queue fallback on timeout | |
| Reject with reason | Label + reasoning comment; user re-tags if needed | |

**User's choice:** Pause in Paperclip task queue
**Notes:** Mechanism must be researched — "research ways of communication with humans in paperclip, I wanna do it idiomatic way, not fight it."

---

### Q7: What actually runs as the 'oneshot' vs 'GSD autonomous' coder agent?

| Option | Description | Selected |
|--------|-------------|----------|
| Both are Claude Code CLI | Oneshot = `-p`; GSD = `/gsd-autonomous` in worktree | |
| Oneshot = Claude, GSD = OpenClaw | Split by runtime strengths | |
| Paperclip chooses per agent.md | Runtime declared per agent; Paperclip spawns | |
| Research what's idiomatic | Defer to researcher | ✓ |

**User's choice:** Research what's idiomatic
**Notes:** Researcher recommends the pattern after reviewing Paperclip's agent-spawning docs and existing company examples.

---

## Worktree Lifecycle

### Q8: Where and how do task worktrees get created?

| Option | Description | Selected |
|--------|-------------|----------|
| Target repo's worktree dir | Sibling dir next to each target repo (matches superpowers pattern) | |
| Central worktree farm | Single dir holds worktrees across repos | |
| Paperclip-managed under data dir | Paperclip owns under ~/.paperclip/worktrees/ | |
| Research idiomatic Paperclip | Defer to research | |
| Other (free-text) | User-provided alternative | ✓ |

**User's choice:** "search what claude --worktree does, I wanna also make sure there are no duplicates"
**Notes:** Leverage Claude Code's native worktree capability; dedup at creation.

---

### Q9: When is a worktree cleaned up after the agent is done?

| Option | Description | Selected |
|--------|-------------|----------|
| After PR is merged | Persist through review; auto-remove on merge | ✓ |
| After human approves the result | Cleanup at gate approval | |
| Explicit tb:cleanup command | Never auto-removed | |
| After N days idle | Time-based pruning | |

**User's choice:** After PR is merged
**Notes:** Requires PR-status polling or merge webhook.

---

## Human Gate & Ship Semantics

### Q10: Where does the human approve/reject agent-produced work before it ships?

| Option | Description | Selected |
|--------|-------------|----------|
| Paperclip UI | Dashboard shows task + output + diff + approve/reject | ✓ |
| GitHub PR review | Agent opens draft PR; human reviews + merges | |
| Both — PR for code, Paperclip for summary | PR for code review, Paperclip flips draft→ready | |
| Research idiomatic Paperclip | Defer | |

**User's choice:** Paperclip UI

---

### Q11: What does 'ship' concretely mean once the human approves?

| Option | Description | Selected |
|--------|-------------|----------|
| Open PR only | Approval opens/marks-ready PR; merge stays manual | ✓ |
| Open + auto-merge | Approval opens PR and auto-merges when CI passes | |
| Configurable per task | Per-agent.md / task metadata choice | |
| PR + close issue | Opens PR and auto-closes originating issue | |

**User's choice:** Open PR only
**Notes:** Merge remains a separate human action on GitHub.

---

### Q12: If the human rejects the agent's result at the Paperclip gate, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-queue with feedback | Feedback appended to context; same agent retries | |
| Abandon worktree, close task | Discard output; worktree deleted | |
| Re-triage (route differently) | Rejection triggers re-triage with feedback | |
| Configurable / Claude's discretion | Planner decides default | ✓ |

**User's choice:** Configurable / Claude's discretion
**Notes:** Planner likely defaults to re-queue-with-feedback; re-triage can be a later-phase addition.

---

## Claude's Discretion

- Exact tag vocabulary for user overrides (e.g. `one_shot` / `process_loop`)
- Confidence score format / cutoff thresholds
- Branch naming convention in worktrees
- Default rejection behavior at the Paperclip gate
- Paperclip task card layout details
- How the triage agent surfaces its reasoning in Paperclip UI
- Specific deploy mechanism for tb → Paperclip artifacts (extend `paperclip-symlink.sh`, a new import command, Paperclip's own package-import flow, etc.)
- Agent runtime for oneshot vs GSD autonomous (pending research recommendation)

## Deferred Ideas

- Auto-merge PRs on approval
- Auto-close originating GitHub/Jira issue after PR merge
- Observability / cost tracking / budget enforcement
- Multi-repo fan-out in a single task
- LLM re-triage on rejection (may land in-phase via Q12's discretion)
- Confidence-threshold tuning UI, multi-query retrieval, prompt-aware context passing
- Alternative intakes beyond webhooks (Paperclip UI paste, CLI submit)
- Time-based / idle worktree pruning
- `/tb:setup-paperclip-triage` scripted installer (vs. hand-written setup-instruction doc)

---

# Revision Pass — 2026-04-14

Purpose: revisit existing decisions, add new gray areas, and lock selected Claude-discretion items.

## New Gray Area: Ticket → local repo mapping

### Q13: How should the system determine which local git repo (and worktree base) an incoming ticket/issue belongs to?

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub inferred + Jira config map | Infer GitHub repo from payload; explicit map for Jira | |
| Single mapping file for both | `.paperclip/repo-map.yaml` in tb for all sources | |
| Convention over config | `~/Projects/<name>` assumed; fail loudly if missing | |
| Research Paperclip / ask at dispatch | Check Paperclip primitive; fallback ask-once-cache | ✓ |

**User's choice:** Research idiomatic Paperclip / ask at dispatch
**Notes:** Captured as D-19.

---

## Decision Group Revisions

### Q14: D-01–D-03 (Integration & delivery) — what to change?

| Option | Description | Selected |
|--------|-------------|----------|
| No change | | |
| Adjust runtime location | | |
| Adjust authoring/delivery | | |
| Other (free-text) | | ✓ |

**User's choice:** "Runtime should be in paperclip, agentcompanies spec should rely on tb-skills"
**Notes:** Runtime decision (D-01) unchanged; D-03 refined — AgentCompanies artifacts reference/depend on tb skills rather than inlining behavior.

### Q15: D-04–D-06 (Event intake) — what to change?

| Option | Description | Selected |
|--------|-------------|----------|
| No change | | |
| Tighten trigger | | |
| Tighten dedup | | |
| Other (free-text) | | ✓ |

**User's choice:** "I think we can use dedup key, but I would also like to research how to integrate that with paperclip"
**Notes:** D-06 refined — dedup uses canonical `{source}#{id}` key; research integration with Paperclip's dedup primitives.

### Q16: D-07–D-12 (Triage & routing) — what to change?

| Option | Description | Selected |
|--------|-------------|----------|
| No change, skip | | ✓ |
| Tighten confidence signals | | |
| Tighten tag vocabulary | | |
| Other | | |

**User's choice:** No change, skip (tightening handled in Q21/Q22 below)

### Q17: D-13–D-18 (Worktree + ship) — what to change?

| Option | Description | Selected |
|--------|-------------|----------|
| No change, skip | | ✓ |
| Tighten cleanup | | |
| Tighten rejection behavior | | |
| Other | | |

**User's choice:** No change, skip (rejection tightening handled in Q23 below)

---

## New Gray Areas

### Q18: Failure / retry — what happens when a coder agent errors mid-run?

| Option | Description | Selected |
|--------|-------------|----------|
| Retry once, then escalate | Auto single retry; persistent failure → Paperclip queue | |
| Fail fast to human | No auto-retry; immediate escalation with error trace | |
| Research idiomatic Paperclip | Use Paperclip's native retry/escalation primitive | |
| Other (free-text) | | ✓ |

**User's choice:** "Research idiomatic paperclip, but if in sync with paperclip approach I would like one automatic retry"
**Notes:** Captured as D-20 — research Paperclip first; prefer one automatic retry if compatible; worktree preserved for debugging regardless.

### Q19: Observability — where do triage + agent logs + decision traces go?

| Option | Description | Selected |
|--------|-------------|----------|
| Paperclip-native | | |
| Paperclip + tb files | | |
| Research idiomatic Paperclip | | |
| Other (free-text) | | ✓ |

**User's choice:** "I would like combination because I don't necessarily know I will stay on paperclip. But .planning will be erased with worktree so it's ok"
**Notes:** Captured as D-21 — combination approach (Paperclip-native telemetry + tb-side per-task artifact); acceptable for per-task log to live alongside worktree and die with cleanup.

### Q20: Secrets — how do dispatched agents access credentials in worktrees?

| Option | Description | Selected |
|--------|-------------|----------|
| tb keychain via resolve-credential | | ✓ |
| Paperclip secret store | | |
| Research + prefer Paperclip if native | | |

**User's choice:** tb keychain via resolve-credential
**Notes:** Captured as D-22 — reuse existing `bin/resolve-credential`. Paperclip secret store moved to Deferred.

### Q21: SOUL.md for triage agent — tone/principles?

| Option | Description | Selected |
|--------|-------------|----------|
| Cautious escalator | Bias toward pause | |
| Confident dispatcher | Bias toward routing | |
| Balanced + explicit reasoning | Neutral; always emit three signals | |
| Claude's discretion | Planner drafts; user reviews | ✓ |

**User's choice:** Claude's discretion
**Notes:** Captured as D-23 (Claude's Discretion) — planner drafts initial SOUL.md; user reviews during execution.

---

## Locked Claude-Discretion Items

### Q22: Deploy mechanism for tb → Paperclip?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend paperclip-symlink.sh | Add agents/, companies/, AgentCompanies artifacts | ✓ |
| New tb:deploy-paperclip skill | Dedicated skill with Node deploy script | |
| Paperclip's native import command | Use import/export mechanism | |
| Defer to research | | |

**User's choice:** Extend paperclip-symlink.sh
**Notes:** Captured as D-24 (locked). Paperclip native import flow moved to Deferred for later evaluation.

### Q23: Tag vocabulary on source tickets/issues?

| Option | Description | Selected |
|--------|-------------|----------|
| triage:oneshot / triage:process / triage:skip | Namespaced prefix | ✓ |
| one_shot / process_loop | User's original framing | |
| paperclip:oneshot / paperclip:process / paperclip:skip | Branded prefix | |
| Claude's discretion / research | | |

**User's choice:** triage:oneshot / triage:process / triage:skip
**Notes:** Captured as D-25 (locked).

### Q24: Confidence score format + auto-dispatch threshold?

| Option | Description | Selected |
|--------|-------------|----------|
| Labels low/med/high; all three high → dispatch | | ✓ |
| Numeric 0–1; all three ≥0.7 → dispatch | | |
| Labels + weighted (trace can be med) | | |

**User's choice:** Labels: low/med/high; all three 'high' auto-dispatches
**Notes:** Captured as D-26 (locked). Threshold tuning and alternative weighting moved to Deferred.

### Q25: Default rejection behavior at Paperclip gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-queue with feedback | Same agent retries with feedback appended | ✓ |
| Re-triage with feedback | Triage re-runs; routing may flip | |
| Discard + notify | Close task, delete worktree, notify user | |

**User's choice:** Re-queue with feedback
**Notes:** Captured as D-18 (locked). Re-triage and discard variants moved to Deferred.

---

## Scope Decision

### Q26: Phase scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current scope | Full end-to-end pipeline in one phase | ✓ |
| Split: triage + manual dispatch first | | |
| Split: setup instructions as own phase | | |
| Other | | |

**User's choice:** Keep current scope
