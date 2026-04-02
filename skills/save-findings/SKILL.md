---
name: save-findings
description: Extract and curate GSD phase artifacts into Forgetful memories
---

# Save Findings

Extract high-value knowledge from GSD phase artifacts and save it to Forgetful with quality-gated curation, dedup checking, and batch review.

## Steps

### 1. Resolve project scope

```bash
REPO_ID=$(git remote get-url origin 2>/dev/null | sed 's/.*[:/]\([^/]*\/[^/]*\)\.git$/\1/' | sed 's/.*[:/]\([^/]*\/[^/]*\)$/\1/')
echo "$REPO_ID"
```

Call `execute_forgetful_tool("list_projects", {"repo_name": "<REPO_ID>"})` to get the project ID.

If no project is found, ask the user for the project name and retry with `list_projects`. If still no match, stop -- memories cannot be saved without project context.

### 2. Determine current phase scope

Read `.planning/STATE.md` to find the current phase number and name from the "Current Position" section.

Read `.planning/ROADMAP.md` to find the phase's milestone version (e.g., "v1.1").

If the `.planning/` directory does not exist, inform the user that this skill requires a GSD-managed project and stop.

Report: "Scoping to Phase {N}: {name} (milestone {version})"

### 3. Read phase artifacts

Identify the phase directory from `.planning/phases/` matching the current phase number.

Read the primary extraction source: `{phase-dir}/*-CONTEXT.md`

Scan for additional artifacts in the phase directory:
- `*-RESEARCH.md` (research findings)
- `*-SUMMARY.md` files (plan execution summaries)
- `*-PLAN.md` files (plan definitions -- low priority, mostly structural)

Present the list and let the user choose which to include:

```
Found artifacts for Phase {N}:
- [included] {phase}-CONTEXT.md (primary -- always included)
- [ ] {phase}-RESEARCH.md
- [ ] {phase}-01-SUMMARY.md
- [ ] {phase}-02-SUMMARY.md

Select additional artifacts to include (e.g., "1,2" or "all" or "none"):
```

### 4. Curation agent evaluation

Act as a curation agent. For each included artifact, read its content and evaluate sections for Forgetful-worthiness.

**Extraction categories (with importance ranges):**

| Category | Importance | Tag |
|----------|-----------|-----|
| Architectural decisions with rationale | 8-9 | `decision` |
| Patterns established through iteration | 7-8 | `pattern` |
| Lessons learned from failures | 8 | `lesson-learned` |
| Technology choices with constraints | 7-8 | `tech-choice` |

**Quality gate -- evaluate each candidate on three axes:**

1. **Relevance longevity:** Will this still be useful in 3 months? If NO, skip.
2. **Atomic completeness:** Does the candidate stand alone without surrounding context? If NO, either enrich it to be self-contained or skip.
3. **Retrieval distinctiveness:** Will this create a unique semantic footprint vs existing memories? If NO, consider UPDATE instead of CREATE.

**Skip these categories -- they degrade retrieval quality over time:**
- Current state or progress updates (stale within hours)
- Specific version numbers as standalone facts (change silently)
- Specific file paths in implementation details (refactoring invalidates)
- Intermediate decisions that were later reversed

**Memory format for each candidate:**
- **Title:** `[Phase {N}] {concise descriptive title}` (max 200 chars)
- **Content:** Atomic, self-contained description with rationale (max 2000 chars). Must stand alone without needing to read the source artifact.
- **Tags:** Artifact type tag (e.g., `decision`, `pattern`), phase tag (e.g., `phase-21`), milestone tag (e.g., `v1.1`)
- **Keywords:** 3-5 relevant terms for retrieval
- **Importance:** 7-9 based on category (see ranges above)

**Target: 3-7 candidates per phase.** If evaluating more than 7, tighten the quality gate. Better fewer high-quality memories than many mediocre ones.

### 5. Dedup check against existing memories

For each candidate, query existing Forgetful memories to detect overlap:

```
execute_forgetful_tool("query_memory", {
  "query": "<candidate title>",
  "k": 5,
  "project_ids": ["<project ID>"]
})
```

Compare returned memories against the candidate:
- **Semantically identical content** -> action: SKIP (already saved)
- **Similar but outdated existing memory** -> action: UPDATE existing memory ID with new content
- **New information that supersedes old memory** -> action: CREATE new + OBSOLETE old memory ID
- **Genuinely new, no overlap** -> action: CREATE

### 6. Opportunistic quality cleanup

While scanning existing memories in Step 5, flag any that appear:
- Outdated (reference old decisions that were reversed in current phase artifacts)
- Contradicted by current artifacts
- Vague or not atomic (signs of poor curation from earlier saves)

Include these as additional OBSOLETE candidates in the batch with reasoning.

### 7. Present batch plan for review

Display the complete curation plan as a table:

```
## Curation Plan ({N} actions)

| # | Action | Title | Importance | Reasoning |
|---|--------|-------|------------|-----------|
| 1 | CREATE | [Phase {N}] {title} | 8 | {why this is worth saving} |
| 2 | UPDATE #{id} | [Phase {N}] {title} | 7 | {what changed vs existing} |
| 3 | OBSOLETE #{id} | {existing title} | - | {why outdated/superseded} |
| 4 | SKIP | {candidate title} | - | {why not worth saving} |

**Actions:** approve all, remove items by number (e.g., "remove 3,4"), or edit an item (e.g., "edit 2")
```

SKIP items are shown for transparency but not executed. The user can:
- **"approve"** or **"approve all"** -- execute all non-SKIP items
- **"remove 3,4"** -- remove specific items from the batch
- **"edit 2"** -- modify title, content, importance, or tags of a specific item

One review cycle only, not per-item.

### 8. Execute approved actions

For each approved action in order:

**CREATE:**
```
execute_forgetful_tool("create_memory", {
  "title": "<title>",
  "content": "<content>",
  "context": "Phase {N} save-findings extraction",
  "keywords": ["<keyword1>", "<keyword2>", ...],
  "tags": ["<type-tag>", "phase-{N}", "<milestone-version>"],
  "importance": <score>,
  "project_ids": ["<project ID>"]
})
```
Record the returned memory ID.

**UPDATE:**
```
execute_forgetful_tool("update_memory", {
  "memory_id": "<existing memory ID>",
  "title": "<updated title if changed>",
  "content": "<updated content if changed>",
  "importance": <updated score if changed>,
  "tags": ["<updated tags if changed>"]
})
```

**OBSOLETE:**
```
execute_forgetful_tool("mark_memory_obsolete", {
  "memory_id": "<memory ID>",
  "reason": "<why this memory is outdated or superseded>",
  "superseded_by": "<new memory ID if a CREATE in this batch replaces it>"
})
```

Report each action result as it completes:
```
- CREATE #{new_id}: {title}
- UPDATE #{id}: {title}
- OBSOLETE #{id}: {title}
```

### 9. Summary

```
## Save Complete

**Created:** {N} new memories
**Updated:** {M} existing memories
**Obsoleted:** {O} outdated memories
**Skipped:** {S} candidates (not worth saving)
```

## Graceful Degradation

If Forgetful is unreachable at any point, report the error clearly and suggest running `/tb:doctor` to diagnose connectivity.

If the `.planning/` directory is missing, report that this skill requires a GSD-managed project with planning artifacts.
