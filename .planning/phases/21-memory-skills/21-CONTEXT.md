# Phase 21: Memory Skills - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver two ad-hoc Forgetful interaction skills: `/tb:load-context` for querying and displaying memories with conversational refinement, and `/tb:save-findings` for agent-curated extraction of GSD phase artifacts into Forgetful with quality-gated dedup and obsolescence.

</domain>

<decisions>
## Implementation Decisions

### load-context Query Interface
- **D-01:** Free-text query as default input, with optional flags (`--project`, `--phase`, `--tags`) for power-user scoping.
- **D-02:** Results displayed as formatted list — each memory as a titled block with importance score and content snippet (consistent with gsd-discuss-context.js output pattern).
- **D-03:** Importance-based filtering, not fixed count. Fetch 15 from Forgetful, display only memories with importance >= 7, capped at 8 results. Low-importance results are silently filtered out.

### load-context Invocation Flow
- **D-04:** Conversational refinement mode. After initial results display, offer three actions:
  - **Refine query** — adjust search terms and re-run
  - **Expand a memory** — view full content, linked memories, and metadata for a selected result
  - **Load into context** — user picks which memories to inject for Claude to use in the rest of the conversation

### save-findings Extraction Scope
- **D-05:** Default scope is current phase (from STATE.md). No explicit phase number argument.
- **D-06:** Primary extraction target is phase CONTEXT.md decisions. Additionally, skill scans available artifacts and lets user pick which to save (custom selection).
- **D-07:** Research directive — phase researcher MUST investigate what makes RAG memory systems genuinely useful vs gimmicky. Focus on data quality principles: what kinds of information retain value over time, what becomes misleading/outdated quickly, and how to prevent low-quality data from degrading retrieval quality.

### save-findings Curation Agent
- **D-08:** A curation agent (not mechanical extraction) evaluates phase artifacts for Forgetful-worthiness. The agent assesses each candidate for relevance, longevity, and atomic value before proposing saves.
- **D-09:** Agent presents a batch plan (create new / update existing / mark obsolete / skip) with reasoning for each candidate. User approves the batch or removes individual items before execution. One review cycle, not per-item.
- **D-10:** Auto-tag by source — tags derived from artifact type + phase (e.g., 'decision', 'phase-21', 'v1.1'). Consistent with milestone-save pattern.

### Dedup & Obsolescence
- **D-11:** Agent-driven dedup — curation agent compares new candidates against existing Forgetful memories for the project. Proposes create/update/obsolete/skip per candidate.
- **D-12:** Opportunistic quality cleanup — while scanning existing memories during dedup, if the agent discovers outdated or misleading content, it includes those in the review batch as 'mark obsolete' candidates.

### Claude's Discretion
- Helper script internal structure (function signatures, error handling)
- Exact Forgetful query construction for load-context (query strings, context parameters)
- Curation agent scoring heuristics for determining memory worthiness
- How refinement loop is presented in load-context (AskUserQuestion vs free-text prompts)
- Whether save-findings uses a subagent (Agent tool) or inline logic for curation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Skills — SKILL-01 and SKILL-02 acceptance criteria

### Forgetful Integration Stack
- `.planning/research/STACK.md` — MCP Streamable HTTP protocol flow, Forgetful tool dispatcher pattern
- `.planning/research/ARCHITECTURE.md` — Component responsibilities, file layout
- `.planning/research/FEATURES.md` — Anti-features (especially "auto-save everything" anti-pattern), dependency graph

### Existing Helper Scripts (patterns to follow)
- `scripts/forgetful-client.js` — Shared MCP HTTP client: resolveForgetfulUrl, createSession, callTool
- `scripts/gsd-milestone-save.js` — Reference for extracting GSD artifacts, project ID resolution, obsolescence marking, section extraction patterns
- `scripts/gsd-discuss-context.js` — Reference for querying Forgetful and formatting memory output

### Prior Phase Context
- `.planning/phases/18-foundation/18-CONTEXT.md` — Forgetful endpoint discovery (D-02), client module API (D-03)
- `.planning/phases/19-gsd-workflow-patches/19-CONTEXT.md` — Query scoping patterns (D-03 through D-06), milestone save behavior (D-07 through D-09), silent failure on unreachable Forgetful

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/forgetful-client.js` — Full MCP session lifecycle (init, tool call, response parsing). Both new skills import this.
- `scripts/gsd-milestone-save.js` — Section extraction from markdown, project ID resolution, existing memory lookup, obsolescence marking. Direct template for save-findings helper.
- `scripts/gsd-discuss-context.js` — Query execution and formatted output. Direct template for load-context helper.

### Established Patterns
- Node.js scripts in `scripts/` use CommonJS (`require`/`module.exports`)
- Forgetful tool calls go through `execute_forgetful_tool(tool_name, arguments)` dispatcher
- Skills use `SKILL.md` + frontmatter (`name`, `description`, `disable-model-invocation`)
- Plugin root resolved via `PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."`
- Fail silently when Forgetful unreachable — never block workflows

### Integration Points
- `skills/load-context/SKILL.md` — New skill to create
- `skills/save-findings/SKILL.md` — New skill to create
- `scripts/` — Potential new helper scripts for query/save logic (Claude's discretion on whether needed)
- `scripts/forgetful-client.js` — Imported by new helpers

</code_context>

<specifics>
## Specific Ideas

- Data quality is the top priority for save-findings — the user explicitly wants Forgetful to be genuinely useful, not a dump of everything. The curation agent must be opinionated about what's worth saving.
- Research phase should investigate RAG memory quality principles: what information retains value, what becomes misleading, and how to prevent low-quality data from degrading retrieval.
- load-context should feel conversational — browse, refine, expand, then selectively inject. Not a one-shot dump.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-memory-skills*
*Context gathered: 2026-04-03*
