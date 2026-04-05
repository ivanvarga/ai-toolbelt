---
status: human_needed
phase: 21-memory-skills
verified: 2026-04-03
---

# Phase 21: Memory Skills - Verification

## Phase Goal
Users can manually load and save Forgetful memories for ad-hoc context and artifact preservation.

## Requirements Verification

### SKILL-01: User can invoke /tb:load-context <query> to manually retrieve relevant Forgetful memories before any work

**Status: PASS (structural)**

Evidence:
- `skills/load-context/SKILL.md` exists with correct frontmatter (`name: load-context`)
- Skill resolves project scope via `git remote get-url origin` + `list_projects`
- Accepts `$ARGUMENTS` as free-text query with optional `--project`, `--phase`, `--tags` flags
- Calls `query_memory` with `k: 15`, `importance_threshold: 7`, `project_ids`, `include_links: true`
- Filters results to importance >= 7, caps at 8 results
- Displays formatted results with importance score, tags, and content snippet
- Offers conversational refinement: Refine query, Expand a memory, Load into context
- Load into context uses `<loaded_memory>` XML tag for structured context injection
- Graceful degradation suggests `/tb:doctor` when Forgetful is unreachable

### SKILL-02: User can invoke /tb:save-findings to extract GSD phase/milestone artifacts into Forgetful with dedup and obsolescence marking

**Status: PASS (structural)**

Evidence:
- `skills/save-findings/SKILL.md` exists with correct frontmatter (`name: save-findings`)
- Skill resolves project scope via `git remote get-url origin` + `list_projects`
- Reads STATE.md for current phase, ROADMAP.md for milestone version
- Reads CONTEXT.md as primary extraction target, offers user selection of additional artifacts
- Curation agent evaluates with 4 extraction categories (decision, pattern, lesson-learned, tech-choice)
- Quality gate on 3 axes: relevance longevity, atomic completeness, retrieval distinctiveness
- Skip categories: current state, version numbers, file paths, reversed decisions
- Dedup via `query_memory` before create, with SKIP/UPDATE/CREATE+OBSOLETE logic
- Opportunistic cleanup flags outdated/contradicted/vague memories during dedup scan
- Batch review table with Action/Title/Importance/Reasoning columns
- User can approve, remove by number, or edit items
- Executes `create_memory`, `update_memory`, `mark_memory_obsolete` with correct parameters
- `mark_memory_obsolete` includes `reason` and `superseded_by` fields
- Summary shows Created/Updated/Obsoleted/Skipped counts
- Graceful degradation suggests `/tb:doctor` when Forgetful is unreachable

### Success Criteria Check

| # | Criterion | Status |
|---|-----------|--------|
| 1 | User invokes /tb:load-context with a query and receives relevant Forgetful memories | PASS (structural) |
| 2 | User invokes /tb:save-findings and GSD phase/milestone artifacts are extracted into Forgetful with dedup | PASS (structural) |
| 3 | Previously saved memories are marked obsolete when superseded by newer findings | PASS (structural) |

## Must-Have Verification

### Truths
- [x] User invokes /tb:load-context with a query and receives importance-filtered Forgetful memories
- [x] User can refine query, expand a memory, or load selected memories into conversation context
- [x] User invokes /tb:save-findings and a curation agent evaluates current phase artifacts for memory-worthiness
- [x] User reviews a batch plan of create/update/obsolete/skip actions before any Forgetful writes happen
- [x] Previously saved memories are marked obsolete when superseded by newer findings

### Artifacts
- [x] `skills/load-context/SKILL.md` exists, contains `name: load-context`
- [x] `skills/save-findings/SKILL.md` exists, contains `name: save-findings`

### Key Links
- [x] load-context contains `query_memory` MCP tool call instructions
- [x] load-context contains `git remote get-url origin` for project scoping
- [x] save-findings contains `create_memory` MCP tool call instructions
- [x] save-findings reads STATE.md for current phase detection

## Human Verification Items

These skills are SKILL.md instruction files -- they require manual invocation in a Claude Code session with Forgetful running to verify end-to-end behavior:

1. **Invoke `/tb:load-context authentication`** -- verify memories are returned with importance filtering and refinement options
   Expected: Formatted results with importance >= 7, three refinement actions offered

2. **Test load-context refinement loop** -- refine query, expand a memory, load into context
   Expected: Each action works as described in the skill

3. **Invoke `/tb:save-findings`** -- verify curation agent evaluates current phase artifacts
   Expected: Batch plan table displayed with CREATE/UPDATE/OBSOLETE/SKIP actions

4. **Approve save-findings batch** -- verify memories are created in Forgetful
   Expected: Confirmation with Created/Updated/Obsoleted/Skipped counts

5. **Re-invoke `/tb:save-findings`** -- verify dedup detects already-saved memories
   Expected: Previously saved memories show as SKIP (already saved)

## Score

5/5 must-have truths verified structurally
2/2 artifacts verified on disk
4/4 key links verified

**Automated verification: PASS**
**Human verification: NEEDED (5 items)**

---
*Phase: 21-memory-skills*
*Verified: 2026-04-03*
