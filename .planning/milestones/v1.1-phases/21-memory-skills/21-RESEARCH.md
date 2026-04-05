# Phase 21: Memory Skills - Research

**Researched:** 2026-04-03
**Domain:** Claude Code plugin skills -- Forgetful memory query/save via SKILL.md-driven interactions
**Confidence:** HIGH

## Summary

Phase 21 delivers two new skills: `/tb:load-context` for conversational Forgetful memory retrieval, and `/tb:save-findings` for agent-curated extraction of GSD phase artifacts into Forgetful. Both are SKILL.md-only skills that leverage Claude's native MCP tool access (no helper scripts needed for the skills themselves -- Claude can call `execute_forgetful_tool` directly within a skill conversation). The helper scripts from Phase 18-19 (`forgetful-client.js`, `gsd-milestone-save.js`, `gsd-discuss-context.js`) serve as pattern references but are NOT runtime dependencies for these skills -- skills run inside Claude's conversation where MCP tools are directly available.

The primary complexity is in save-findings, which requires a curation agent that evaluates artifacts, compares against existing memories, and proposes a batch action plan (create/update/obsolete/skip). The research directive (D-07) to investigate RAG memory quality principles yields clear guidance: memory systems degrade when they accumulate low-relevance data indiscriminately. Quality comes from aggressive curation, atomic decomposition, and conflict detection at write time. The curation agent must be opinionated -- better to save 3 high-value memories than 10 mediocre ones.

**Primary recommendation:** Both skills are SKILL.md files with structured instructions for Claude. No new helper scripts are needed. Follow the forgetful-plugin's `memory-save` and `memory-search` command patterns but add GSD-awareness (project scoping from git remote, phase scoping from STATE.md, artifact-aware extraction patterns).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Free-text query as default input, with optional flags (`--project`, `--phase`, `--tags`) for power-user scoping.
- **D-02:** Results displayed as formatted list -- each memory as a titled block with importance score and content snippet (consistent with gsd-discuss-context.js output pattern).
- **D-03:** Importance-based filtering, not fixed count. Fetch 15 from Forgetful, display only memories with importance >= 7, capped at 8 results. Low-importance results are silently filtered out.
- **D-04:** Conversational refinement mode. After initial results display, offer three actions: Refine query, Expand a memory, Load into context.
- **D-05:** Default scope is current phase (from STATE.md). No explicit phase number argument.
- **D-06:** Primary extraction target is phase CONTEXT.md decisions. Additionally, skill scans available artifacts and lets user pick which to save (custom selection).
- **D-07:** Research directive -- phase researcher MUST investigate what makes RAG memory systems genuinely useful vs gimmicky.
- **D-08:** A curation agent (not mechanical extraction) evaluates phase artifacts for Forgetful-worthiness.
- **D-09:** Agent presents a batch plan (create new / update existing / mark obsolete / skip) with reasoning for each candidate. User approves the batch or removes individual items before execution. One review cycle, not per-item.
- **D-10:** Auto-tag by source -- tags derived from artifact type + phase (e.g., 'decision', 'phase-21', 'v1.1'). Consistent with milestone-save pattern.
- **D-11:** Agent-driven dedup -- curation agent compares new candidates against existing Forgetful memories for the project. Proposes create/update/obsolete/skip per candidate.
- **D-12:** Opportunistic quality cleanup -- while scanning existing memories during dedup, if the agent discovers outdated or misleading content, it includes those in the review batch as 'mark obsolete' candidates.

### Claude's Discretion
- Helper script internal structure (function signatures, error handling)
- Exact Forgetful query construction for load-context (query strings, context parameters)
- Curation agent scoring heuristics for determining memory worthiness
- How refinement loop is presented in load-context (AskUserQuestion vs free-text prompts)
- Whether save-findings uses a subagent (Agent tool) or inline logic for curation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKILL-01 | User can invoke /tb:load-context <query> to manually retrieve relevant Forgetful memories before any work | SKILL.md pattern with `execute_forgetful_tool("query_memory", ...)`, importance filtering (D-03), conversational refinement loop (D-04), project scoping via git remote |
| SKILL-02 | User can invoke /tb:save-findings to extract GSD phase/milestone artifacts into Forgetful with dedup and obsolescence marking | SKILL.md with curation agent instructions, artifact extraction patterns from gsd-milestone-save.js, query-before-create dedup (D-11), batch review workflow (D-09), memory quality principles |

</phase_requirements>

## Standard Stack

### Core

No new libraries or dependencies. Both skills are pure SKILL.md files that instruct Claude to use existing MCP tools.

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| SKILL.md format | Claude Code plugin v1 | Skill definition with frontmatter | Established pattern in 19 existing skills |
| `execute_forgetful_tool` MCP tool | Forgetful 3.1.1 | Memory CRUD operations | Already available via forgetful-plugin; skills run inside Claude conversation with full MCP access |
| `query_memory` via dispatcher | Forgetful 3.1.1 | Semantic search with importance filtering, project scoping | Verified in TOOL_REFERENCE.md -- supports `k`, `importance_threshold`, `project_ids`, `include_links` |
| `create_memory` via dispatcher | Forgetful 3.1.1 | Atomic memory creation with auto-linking | 200-char title, 2000-char content, importance 1-10, tags/keywords |
| `mark_memory_obsolete` via dispatcher | Forgetful 3.1.1 | Soft delete with audit trail | Supports `superseded_by` for chain-of-replacement tracking |

### Supporting

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| `gsd-milestone-save.js` | existing | Pattern reference for section extraction + obsolescence marking | Template for save-findings extraction logic (section heading patterns, memory candidate structure) |
| `gsd-discuss-context.js` | existing | Pattern reference for query + formatted memory output | Template for load-context display format |
| `forgetful-client.js` | existing | Shared MCP HTTP client | NOT used at runtime by skills (Claude has native MCP access). Only referenced as pattern source. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SKILL.md inline instructions | Dedicated helper scripts (like gsd-milestone-save.js) | Skills run inside Claude's conversation -- Claude can call MCP tools directly. Helper scripts are needed for hooks (which run outside Claude), not for skills. Adding scripts would duplicate logic Claude can do natively. |
| Inline curation logic | Agent tool subagent | Agent tool spawns a separate Claude instance. For save-findings, inline logic keeps the user in one conversation flow and avoids context transfer overhead. Agent tool is viable but adds complexity without clear benefit since the user needs to review the batch anyway. |

## Architecture Patterns

### Recommended Project Structure

```
skills/
  load-context/
    SKILL.md          # NEW: conversational memory query skill
  save-findings/
    SKILL.md          # NEW: agent-curated artifact extraction skill
```

No new files in `scripts/`, `hooks/`, or other directories. Both skills are self-contained SKILL.md files.

### Pattern 1: SKILL.md with MCP Tool Instructions

**What:** A SKILL.md that provides structured step-by-step instructions for Claude to execute, including bash commands for project discovery and MCP tool calls for Forgetful operations.

**When to use:** When the skill runs inside a Claude conversation where MCP tools are available.

**Example (load-context frontmatter):**
```yaml
---
name: load-context
description: Query and browse Forgetful memories for project context
---
```

**Key insight:** Skills differ from helper scripts. Helper scripts (`gsd-*-context.js`) run as subprocesses outside Claude (from hooks or GSD patches). Skills run inside Claude's conversation -- Claude interprets the SKILL.md instructions and executes them using its available tools (bash, MCP, file read/write). This means skills can call `execute_forgetful_tool` directly via Claude's MCP connection.

### Pattern 2: Project Discovery via Git Remote

**What:** Extract the repo identifier from `git remote get-url origin` and use `list_projects` to find the Forgetful project ID.

**When to use:** At the start of both skills to scope operations to the current project.

**Example:**
```bash
git remote get-url origin
# Extracts: ivarga/ai-toolbelt
```
Then call:
```
execute_forgetful_tool("list_projects", {"repo_name": "ivarga/ai-toolbelt"})
```

**Source:** Verified pattern in all 4 existing gsd-*.js helper scripts.

### Pattern 3: Batch Review for Memory Operations

**What:** Collect all proposed memory operations (create, update, obsolete, skip) into a single review table, present to user once, then execute approved actions.

**When to use:** save-findings skill -- after curation agent evaluates all candidates.

**Example display format:**
```
## Curation Plan (5 candidates)

| # | Action | Title | Importance | Reasoning |
|---|--------|-------|------------|-----------|
| 1 | CREATE | [Phase 21] Conversational memory refinement | 8 | Novel UX pattern, no existing memory |
| 2 | UPDATE #42 | [Phase 18] Forgetful client module | 7 | Content expanded with new API usage |
| 3 | OBSOLETE #38 | Old auth hook approach | - | Superseded by #1 |
| 4 | SKIP | Minor config tweak | - | Too transient, not worth persisting |
| 5 | OBSOLETE #55 | Stale research note | - | Outdated, discovered during scan |

Remove items by number, or approve all: [approve/remove 3,4/edit]
```

**Source:** Derived from D-09 (batch review) and forgetful-plugin's `/memory-save` curation workflow pattern.

### Pattern 4: Importance-Based Filtering for Query Results

**What:** Fetch more results than displayed (k=15), then filter to importance >= 7 and cap at 8 visible results.

**When to use:** load-context initial query results display.

**Why:** Forgetful returns results ranked by semantic similarity, not importance. A semantically close but low-importance memory (score 5-6) would clutter results. Filtering post-retrieval ensures the user sees only high-value memories.

**Source:** D-03 locked decision.

### Anti-Patterns to Avoid

- **Mechanical extraction without curation (D-08):** Do not blindly extract every section heading from CONTEXT.md. The curation agent must assess each candidate for relevance, longevity, and atomic value.
- **Per-item review loop:** Do not ask user to approve each memory individually. Present the full batch once per D-09.
- **Saving transient state:** STATE.md current position, plan progress, session timestamps -- these change every session and pollute memory. Skip them.
- **Saving full file contents as single memories:** Forgetful's content limit is 2000 chars. Extract atomic concepts, not paragraphs. For content exceeding this, use `create_document` and link memories to it.
- **Skipping query-before-create:** Always check for existing similar memories before creating. Duplicates degrade retrieval quality by splitting relevance across near-identical entries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Semantic memory search | Custom vector search | `execute_forgetful_tool("query_memory", ...)` | Forgetful has built-in two-stage retrieval (dense + cross-encoder reranking) |
| Memory deduplication | Hash-based or exact-match dedup | Semantic query with `k=5` + Claude's judgment | Near-duplicates have different words but same meaning -- only semantic comparison catches them |
| Obsolescence tracking | Custom flags or file-based tracking | `mark_memory_obsolete` with `superseded_by` | Built-in audit trail, soft delete, hidden from future queries |
| Auto-linking related memories | Manual link management | Forgetful auto-links at similarity >= 0.7 during creation | Reduces manual curation; check `similar_memories` in create response |
| Project scoping | Custom project-to-repo mapping | `list_projects({"repo_name": "owner/repo"})` | Forgetful already stores repo_name on projects |

**Key insight:** The Forgetful API provides everything needed. The skill's value-add is GSD-awareness (knowing which artifacts to extract, how to scope queries, how to curate) -- not reimplementing memory operations.

## Memory Quality Principles (D-07 Research)

Research across multiple sources converges on clear principles for what makes RAG/memory systems genuinely useful vs gimmicky.

### What Retains Value Over Time

| Category | Example | Importance | Why Durable |
|----------|---------|------------|-------------|
| Architectural decisions with rationale | "Chose MCP HTTP over stdio for hooks because hooks are one-shot processes" | 8-9 | Rationale explains constraints that rarely change; prevents re-litigating |
| Patterns established through iteration | "SKILL.md + bash commands + PLUGIN_ROOT resolution pattern" | 7-8 | Encode hard-won knowledge about what works in the specific codebase |
| Lessons learned from failures | "Sed's `r` command can't insert before match line -- use awk" | 8 | Prevent repeating mistakes; specific and actionable |
| Technology choices with constraints | "Node.js for MCP client because SSE parsing is fragile in bash" | 7-8 | Decision context persists even as implementations evolve |

### What Becomes Misleading Quickly

| Category | Example | Why Harmful |
|----------|---------|-------------|
| Current state / progress | "Phase 20 is 50% complete" | Stale within hours; false signal in future queries |
| Specific version numbers as facts | "Forgetful is at 3.1.1" | Version changes; memory becomes wrong silently |
| File paths in implementation details | "Edit line 47 of gsd-context.js" | Refactoring invalidates; creates phantom references |
| Intermediate decisions later reversed | "We considered using bash for the client" | Considered-and-rejected decisions confuse future queries looking for actual decisions |

### How Low-Quality Data Degrades Retrieval

1. **Semantic pollution:** Near-duplicate memories split relevance scores. Instead of one strong match scoring 0.92, two half-relevant duplicates might score 0.78 and 0.75, pushing the true answer down.
2. **Context window waste:** Every injected memory consumes tokens. Low-value memories crowd out high-value ones when context budgets are enforced.
3. **False confidence anchoring:** Outdated memories retrieved by semantic similarity can anchor Claude's reasoning incorrectly. If a memory says "use approach X" but approach X was later abandoned, Claude may recommend it.
4. **Conflict without resolution:** Similar-but-contradictory memories (cosine similarity 0.6-0.9) create retrievable ambiguity. Conflict detection at write time (via query-before-create) is critical.

### Curation Agent Heuristics

The curation agent should evaluate each candidate on three axes:

1. **Relevance longevity:** Will this still be useful in 3 months? Decisions with rationale: YES. Current sprint status: NO.
2. **Atomic completeness:** Does the candidate stand alone? A decision without its rationale is incomplete. A pattern without its trigger condition is incomplete.
3. **Retrieval distinctiveness:** Will this create a unique semantic footprint, or will it blend with existing memories? If blending, update the existing memory instead.

**Quality gate:** If a candidate fails any axis, the agent should propose SKIP with reasoning. Better to have a smaller, high-quality memory store than a comprehensive but noisy one.

### Source Attribution for Memory Quality Research

- [Steve Kinney - Agent Memory Systems](https://stevekinney.com/writing/agent-memory-systems) -- "Injecting ten marginally relevant memories is worse than three highly relevant ones"; conflict detection at write time is underrated
- [Letta - RAG vs Agent Memory](https://www.letta.com/blog/rag-vs-agent-memory) -- RAG's single-step retrieval limitation; proactive organization over reactive searching
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) -- Zettelkasten for AI agents; autonomous decomposition into atomic facts with semantic linking
- [Forgetful curating-memories skill](forgetful-plugin v1.1.0) -- Query before create, curation workflow, signs of poor curation

## Common Pitfalls

### Pitfall 1: Treating SKILL.md Like a Script

**What goes wrong:** Writing SKILL.md as if it will be executed line-by-line like a bash script. Forgetting that Claude interprets instructions contextually.
**Why it happens:** The existing helper scripts (gsd-*.js) are imperative code. Skills are declarative instructions.
**How to avoid:** Write SKILL.md as "here's what to do and why" guidance, not "execute these exact commands in order." Claude adapts to context (e.g., if no git remote exists, it should handle gracefully without explicit error handling code).
**Warning signs:** SKILL.md that looks like pseudocode with branching logic.

### Pitfall 2: Over-Extracting from Phase Artifacts

**What goes wrong:** The curation agent extracts every decision, every pattern, every insight -- creating 15+ memories per phase. Memory store becomes noisy.
**Why it happens:** Natural instinct to "save everything important." But importance is relative -- within a phase, everything seems important.
**How to avoid:** The curation agent should apply a strict "3-month test": will a future Claude session benefit from this memory 3 months from now? Most phase-specific implementation details fail this test.
**Warning signs:** More than 5-7 memories proposed per phase save. Memories about file structure or specific code locations.

### Pitfall 3: Not Scoping Queries to Current Project

**What goes wrong:** load-context returns memories from all projects, mixing unrelated context.
**Why it happens:** Omitting `project_ids` parameter in `query_memory` call.
**How to avoid:** Always resolve project ID via git remote + `list_projects` before querying. If no project found, inform user and query without scoping (with a warning).
**Warning signs:** Results mixing memories from different repositories.

### Pitfall 4: Ignoring the importance_threshold Parameter

**What goes wrong:** Fetching 15 results with k=15, then filtering in Claude's logic. Works but is less efficient.
**Why it happens:** Not knowing Forgetful supports server-side `importance_threshold`.
**How to avoid:** Use `importance_threshold: 7` in the query_memory call in addition to client-side filtering. This reduces network payload and processing.
**Note:** D-03 specifies importance >= 7 filtering. Use the API parameter for this.

### Pitfall 5: Missing Graceful Degradation

**What goes wrong:** Skill fails entirely when Forgetful is unreachable.
**Why it happens:** No error handling guidance in SKILL.md.
**How to avoid:** SKILL.md should instruct Claude to attempt the Forgetful operation and, if it fails, inform the user that Forgetful is unreachable and suggest running `/tb:doctor` to diagnose.
**Warning signs:** Skill that silently produces no output when Forgetful is down.

### Pitfall 6: Batch Review With No Escape Hatch

**What goes wrong:** User presented with 8 candidates and forced to approve or reject all.
**Why it happens:** Overly rigid batch review implementation.
**How to avoid:** D-09 says "removes individual items before execution." The batch review must allow selective removal by item number. Also allow editing individual items (e.g., changing importance or content).

## Code Examples

### load-context: SKILL.md Structure Pattern

```markdown
---
name: load-context
description: Query and browse Forgetful memories for project context
---

# Load Context

Retrieve relevant Forgetful memories for the current project.

## Steps

### 1. Resolve project scope

[bash: git remote get-url origin]
[MCP: list_projects with repo_name]

### 2. Parse query from user input

$ARGUMENTS is the user's query. If empty, ask what topic to search for.
Optional flags: --project, --phase, --tags

### 3. Execute semantic query

[MCP: query_memory with k=15, importance_threshold=7, project_ids, include_links=true]

### 4. Display filtered results

Filter to importance >= 7, cap at 8 results.
Format: titled blocks with importance score and content snippet.

### 5. Offer refinement actions

- Refine query
- Expand a memory (show full content + linked memories)
- Load into context (inject selected memories for ongoing use)
```

### save-findings: Curation Agent Flow

```markdown
## Curation Process

### 1. Read current phase artifacts

Read STATE.md to determine current phase.
Read phase CONTEXT.md (primary extraction target per D-06).
Scan for additional artifacts: RESEARCH.md, PLAN.md files, SUMMARY.md.
Let user pick which additional artifacts to include.

### 2. Extract candidate memories

For each artifact section, evaluate:
- Is this a decision with rationale? -> candidate (importance 8-9, tag 'decision')
- Is this a pattern established? -> candidate (importance 7-8, tag 'pattern')
- Is this a lesson learned? -> candidate (importance 8, tag 'lesson-learned')
- Is this transient state? -> SKIP

### 3. Query existing memories for dedup

For each candidate:
  query_memory({query: candidate.title, k: 5, project_ids: [projectId]})
  Compare results:
  - Semantically identical -> SKIP (already saved)
  - Similar but outdated -> UPDATE existing
  - New information supersedes old -> CREATE + OBSOLETE old
  - Genuinely new -> CREATE

### 4. Opportunistic cleanup (D-12)

While scanning existing memories in step 3, flag any that appear:
- Outdated (reference old decisions reversed in current phase)
- Contradicted by current artifacts
- Low quality (vague, not atomic)
Include these as OBSOLETE candidates in the batch.

### 5. Present batch plan

[Table format with action, title, importance, reasoning]
User can: approve all, remove items by number, edit items.

### 6. Execute approved actions

For each approved action, call the appropriate Forgetful tool.
Report results with memory IDs.
```

### Memory Creation Template (from Forgetful TOOL_REFERENCE.md)

```
execute_forgetful_tool("create_memory", {
  "title": "[Phase 21] Conversational memory refinement UX pattern",
  "content": "load-context skill implements a 3-step refinement loop: initial query -> filtered display (importance >= 7) -> user chooses to refine/expand/load. This prevents one-shot memory dumps that flood context. Key insight: fewer high-quality memories beat many mediocre ones.",
  "context": "UX decision for tb plugin memory skills, Phase 21",
  "keywords": ["memory", "retrieval", "ux", "refinement", "forgetful"],
  "tags": ["pattern", "phase-21", "v1.1"],
  "importance": 8,
  "project_ids": [PROJECT_ID]
})
```

### Memory Obsolescence Pattern

```
execute_forgetful_tool("mark_memory_obsolete", {
  "memory_id": OLD_ID,
  "reason": "Superseded by Phase 21 decision on memory retrieval UX",
  "superseded_by": NEW_ID
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dump all RAG results into context | Importance-filtered, capped results with refinement | 2025 research consensus | Prevents context pollution; quality over quantity |
| Auto-save everything | Agent-curated extraction with quality gate | Forgetful design principle | Prevents memory store degradation |
| Single-shot memory retrieval | Conversational refinement (query -> filter -> expand -> load) | D-04 decision | Users can explore before committing to context injection |
| Hash-based dedup | Semantic query-before-create + agent judgment | Forgetful + Zettelkasten pattern | Catches near-duplicates that differ in wording |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual validation (no automated test framework in this project) |
| Config file | none -- no package.json or test config |
| Quick run command | Manual: invoke skill in Claude Code session |
| Full suite command | Manual: run both skills end-to-end |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | User invokes /tb:load-context with query, receives filtered memories with refinement options | manual | Invoke `/tb:load-context authentication` in a Claude Code session with Forgetful running | N/A (SKILL.md) |
| SKILL-02 | User invokes /tb:save-findings, curation agent extracts artifacts with dedup/obsolescence | manual | Invoke `/tb:save-findings` in a project with .planning/ artifacts | N/A (SKILL.md) |

### Sampling Rate

- **Per task commit:** Manual smoke test -- invoke skill, verify output format
- **Per wave merge:** Full end-to-end: load-context query + refinement, save-findings full curation cycle
- **Phase gate:** Both skills functional with Forgetful running; verify dedup works on re-invocation

### Wave 0 Gaps

None -- skills are SKILL.md files tested by manual invocation. No test framework needed.

## Open Questions

1. **Subagent vs inline for curation (Claude's Discretion)**
   - What we know: Agent tool spawns a separate Claude instance. Inline keeps user in one flow.
   - What's unclear: Whether the curation evaluation is complex enough to benefit from a dedicated agent context.
   - Recommendation: Start with inline logic. The SKILL.md instructions can be detailed enough to guide Claude's curation without a subagent. If the SKILL.md becomes unwieldy (>200 lines of curation instructions), consider extracting to an agent definition in `agents/`.

2. **How refinement loop presents in load-context**
   - What we know: D-04 specifies three actions (refine, expand, load into context).
   - What's unclear: Whether to use `AskUserQuestion` tool or just ask in natural text.
   - Recommendation: Use natural text prompts. SKILL.md should instruct Claude to present options and ask the user. AskUserQuestion is not needed -- Claude's natural conversation flow handles this.

3. **STATE.md phase detection reliability**
   - What we know: STATE.md has `Phase: 21` in the "Current Position" section.
   - What's unclear: Whether STATE.md format is stable enough to parse reliably.
   - Recommendation: Have Claude read STATE.md and interpret it (not regex-parse). Claude can understand the markdown structure without brittle parsing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Forgetful MCP | Both skills | Conditional (remote server) | 3.1.1 | Skills inform user and suggest /tb:doctor |
| forgetful-plugin | MCP tool access | Yes | 1.1.0 | Skills cannot function without it |
| git | Project scoping | Yes | system | Cannot scope to project; query globally |
| .planning/ directory | save-findings | Conditional (only in GSD projects) | N/A | Skill reports no artifacts found |

**Missing dependencies with no fallback:**
- Forgetful MCP server must be reachable for both skills to function. If unreachable, skills should report the issue clearly.

**Missing dependencies with fallback:**
- .planning/ directory may not exist in non-GSD projects. save-findings should detect this and inform the user.

## Project Constraints (from CLAUDE.md)

- Skills use `CLAUDE_SKILL_DIR` for path resolution, `PLUGIN_ROOT` resolved as `${CLAUDE_SKILL_DIR}/../..`
- Skill naming: `load-context` and `save-findings` follow the family-action hyphen pattern
- Directory name must match the `name` field in SKILL.md frontmatter
- No colons in skill names
- Node.js scripts in `scripts/` use CommonJS -- but no new scripts needed for this phase
- `disable-model-invocation` should NOT be set on these skills (they should be invocable by model for workflow integration)
- No comments in code (CLAUDE.md rule) -- applies if any helper scripts are created
- Fail silently when Forgetful unreachable -- never block workflows (established pattern from Phase 19)

## Sources

### Primary (HIGH confidence)
- forgetful-plugin v1.1.0 `skills/using-forgetful-memory/SKILL.md` -- Memory creation principles, importance scoring, query patterns, tool quick reference
- forgetful-plugin v1.1.0 `skills/using-forgetful-memory/TOOL_REFERENCE.md` -- Complete parameter reference for all Forgetful tools (query_memory, create_memory, update_memory, mark_memory_obsolete, link_memories, etc.)
- forgetful-plugin v1.1.0 `skills/curating-memories/SKILL.md` -- Curation workflow, when to update/obsolete/link, signs of poor curation
- forgetful-plugin v1.1.0 `commands/memory-save.md` -- Save workflow with query-before-create, curation plan presentation
- forgetful-plugin v1.1.0 `commands/memory-search.md` -- Search workflow with result formatting
- Existing codebase: `scripts/gsd-milestone-save.js` -- Section extraction patterns, memory candidate structure, obsolescence marking pattern
- Existing codebase: `scripts/gsd-discuss-context.js` -- Query execution and formatted output pattern
- `.planning/research/ARCHITECTURE.md` -- Component responsibilities, anti-patterns, save-findings flow
- `.planning/research/FEATURES.md` -- Anti-features (auto-save everything), feature dependencies
- `.planning/research/STACK.md` -- MCP protocol flow, Forgetful tool dispatcher pattern

### Secondary (MEDIUM confidence)
- [Steve Kinney - Agent Memory Systems](https://stevekinney.com/writing/agent-memory-systems) -- Quality over quantity principle, conflict detection at write time
- [Letta - RAG vs Agent Memory](https://www.letta.com/blog/rag-vs-agent-memory) -- Proactive organization over reactive searching
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) -- Zettelkasten decomposition for AI agents

### Tertiary (LOW confidence)
- Web search aggregation on RAG memory quality -- consensus patterns across multiple articles, no single authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools verified against installed forgetful-plugin TOOL_REFERENCE.md
- Architecture: HIGH -- SKILL.md pattern verified against 19 existing skills; MCP tool access from skills verified against forgetful-plugin commands
- Pitfalls: HIGH -- derived from established anti-patterns in ARCHITECTURE.md and FEATURES.md research, plus memory quality research
- Memory quality principles: MEDIUM -- aggregated from multiple web sources, consistent findings but no single authoritative reference

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- Forgetful API and SKILL.md format are not expected to change)

---
*Phase: 21-memory-skills*
*Research completed: 2026-04-03*
