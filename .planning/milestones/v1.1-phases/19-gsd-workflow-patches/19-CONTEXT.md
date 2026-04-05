# Phase 19: GSD Workflow Patches - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver patch files that inject Forgetful memory queries into 6 GSD workflows (new-project, new-milestone, discuss-phase, plan-phase, complete-milestone, research-phase) plus a mechanism for patches to survive GSD updates. Patches use the `forgetful-client.js` module from Phase 18 via dedicated helper scripts.

</domain>

<decisions>
## Implementation Decisions

### Patch Mechanism
- **D-01:** Direct file edits to GSD workflow `.md` files. Sed/awk-based patch scripts stored in a new top-level `patches/` directory in the tb repo.
- **D-02:** Each patched workflow calls a dedicated helper script (e.g., `scripts/gsd-discuss-context.js`) that uses `forgetful-client.js` internally. Workflow patches are minimal insertions; logic lives in scripts.

### Query Scoping
- **D-03:** new-project/new-milestone (GPATCH-01): Broad query scoped by project domain. Let Forgetful's cross-encoder ranking decide relevance. No pre-filtering by category.
- **D-04:** discuss-phase (GPATCH-02): Query by phase domain — extract phase goal/name, query for similar decisions across all projects. Claude's discretion on exact query construction.
- **D-05:** plan-phase (GPATCH-03): Query for previous similar feature implementations AND relevant stack/technology information. Planner gets both "how we built this before" and "what tech constraints apply."
- **D-06:** No token budget for injected context. Trust Forgetful's cross-encoder ranking for relevance filtering.

### Milestone Save Behavior
- **D-07:** On milestone completion (GPATCH-04), extract Lessons Learned and Key Outcomes from SUMMARY.md only. Not full PROJECT.md decisions or individual phase contexts.
- **D-08:** Show extracted memories and require user confirmation before saving to Forgetful. Display each, allow approve/edit/skip per memory.
- **D-09:** Auto-mark previously saved memories about the same project/milestone as obsolete before saving new ones. Query Forgetful for existing, mark obsolete, then save fresh.

### Update Survival
- **D-10:** Leverage GSD's built-in `gsd-local-patches/` + `/gsd:reapply-patches` mechanism. tb patches are designed to be re-appliable through this existing infrastructure.
- **D-11:** If reapply fails (workflow structure changed), warn user via doctor check and suggest running `/tb:bootstrap` to re-apply from tb's `patches/` directory. No silent auto-recovery.

### Researcher Injection
- **D-12:** research-phase (GPATCH-06): Query Forgetful for prior research on similar topics/domains across all projects. E.g., researching "auth patterns" injects memories about past auth research.
- **D-13:** Context injected into researcher agent prompts by the patched workflow (pre-fetched). Agents do NOT query Forgetful directly.
- **D-14:** Both project-level researchers (gsd-project-researcher, 4x parallel in new-project) and phase-level researchers (gsd-phase-researcher) receive Forgetful context.

### Claude's Discretion
- Exact query construction for each workflow injection point (query strings, context parameters)
- Internal structure of helper scripts (function signatures, error handling)
- Sed/awk marker patterns for stable patch insertion points
- Graceful failure behavior when Forgetful is unreachable (should fail silently, never block workflows)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` section "GSD Patches" — GPATCH-01 through GPATCH-06 acceptance criteria

### Architecture & Stack
- `.planning/research/ARCHITECTURE.md` — Component responsibilities, file layout, hook registration note (bug #12151)
- `.planning/research/STACK.md` — MCP Streamable HTTP protocol flow, required headers, Forgetful tool dispatcher pattern (`execute_forgetful_tool`)
- `.planning/research/FEATURES.md` — Feature descriptions, anti-features (especially "auto-save everything" anti-pattern), dependency graph

### Existing Code
- `scripts/forgetful-client.js` — Shared Forgetful MCP HTTP client (Phase 18). All helper scripts import this.

### GSD Workflow Files (targets for patching)
- `~/.claude/get-shit-done/workflows/new-project.md` — new-project workflow
- `~/.claude/get-shit-done/workflows/new-milestone.md` — new-milestone workflow
- `~/.claude/get-shit-done/workflows/discuss-phase.md` — discuss-phase workflow
- `~/.claude/get-shit-done/workflows/plan-phase.md` — plan-phase workflow
- `~/.claude/get-shit-done/workflows/complete-milestone.md` — complete-milestone workflow
- `~/.claude/get-shit-done/workflows/research-phase.md` — research-phase workflow

### GSD Update Mechanism
- `~/.claude/get-shit-done/workflows/update.md` — Documents `gsd-local-patches/` backup and `/gsd:reapply-patches` flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/forgetful-client.js` — Full MCP session lifecycle (init, tool call, response parsing). All new helper scripts import this.
- `scripts/keychain.js`, `scripts/sentry-api.js` — Node.js module patterns in scripts/ (export style, error handling conventions)

### Established Patterns
- Node.js scripts in `scripts/` use CommonJS (`require`/`module.exports`)
- Bash doctor checks follow `PASS|FAIL|WARN <name> <message>` output format
- Forgetful tool calls go through `execute_forgetful_tool(tool_name, arguments)` dispatcher — never call tools directly

### Integration Points
- `patches/` — New top-level directory for sed/awk patch scripts
- `scripts/gsd-*-context.js` — New helper scripts called by patched workflows
- `~/.claude/get-shit-done/workflows/*.md` — Target files for patch application
- GSD's `gsd-local-patches/` mechanism — Patches must be compatible with backup/restore flow

</code_context>

<specifics>
## Specific Ideas

- Plan-phase injection should include both "how we built something like this before" AND relevant stack/technology information — not just one or the other
- Milestone save extracts ONLY from SUMMARY.md (Key Outcomes, Lessons Learned) — deliberate choice to keep saves curated per research anti-feature guidance

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-gsd-workflow-patches*
*Context gathered: 2026-04-01*
