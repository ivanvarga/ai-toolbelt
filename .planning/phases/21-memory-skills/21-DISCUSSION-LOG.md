# Phase 21: Memory Skills - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 21-memory-skills
**Areas discussed:** load-context query interface, save-findings extraction scope, Dedup & obsolescence UX, Skill invocation flow

---

## load-context Query Interface

### Query Input Method

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text only | Plain string query, Forgetful's cross-encoder handles relevance | |
| Free-text + optional flags | Default free-text, support --project, --phase, --tags for power users | ✓ |
| Structured prompts | Skill asks what to search for interactively | |

**User's choice:** Free-text + optional flags
**Notes:** None

### Result Display

| Option | Description | Selected |
|--------|-------------|----------|
| Formatted list | Each memory as titled block with importance score and snippet | ✓ |
| Raw dump | Full memory content injected as-is | |
| Summarized by Claude | Claude synthesizes a summary from memories | |

**User's choice:** Formatted list
**Notes:** None

### Result Count

| Option | Description | Selected |
|--------|-------------|----------|
| 5 results | Matches existing GSD query helpers | |
| 10 results | More comprehensive but risks noise | |
| 3 results | Tight and focused | |

**User's choice:** Custom — importance-based filtering with cap
**Notes:** User wants filtering by importance score, not fixed count. "Can we have it based on how important it is and not how many, with some cap."

### Importance Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Importance >= 6, cap 10 | Broader filter, more results | |
| Importance >= 7, cap 8 | Stricter filter, fewer but more curated | ✓ |
| You decide | Claude picks sensible defaults | |

**User's choice:** Importance >= 7, cap 8
**Notes:** None

---

## save-findings Extraction Scope

### Artifact Types

| Option | Description | Selected |
|--------|-------------|----------|
| Phase CONTEXT.md decisions | Extract implementation decisions from phase context | ✓ |
| Phase VERIFICATION.md outcomes | Extract verification results | |
| Milestone SUMMARY.md | On-demand SUMMARY extraction | |
| Custom selection | Scan artifacts, let user pick | ✓ |

**User's choice:** Phase CONTEXT.md decisions + Custom selection
**Notes:** None

### Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Current phase | Default from STATE.md | ✓ |
| User-specified phase | Explicit phase number argument | |
| Both with default | Default current, accept optional override | |

**User's choice:** Current phase
**Notes:** None

### Tagging

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-tag by source | Tags from artifact type + phase | |
| User confirms tags | Show proposed tags, let user edit | |
| You decide | Claude picks tagging scheme | |

**User's choice:** Custom — agent-driven curation
**Notes:** User doesn't want mechanical dumping. "Tagging and filtering should go through simple agent that also decides what is relevant. I don't wanna dump everything into Forgetful. Research online what is useful, I don't wanna fill RAG with misleading and outdated info. Also we need to think of quality of data going in."

### Curation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Show candidates, confirm batch | Agent extracts, scores, presents filtered list with reasoning | |
| Fully autonomous | Agent decides and saves without asking | |
| Interactive per-item | Per-item approve/skip/edit | |

**User's choice:** Custom — research-first approach
**Notes:** "Research user ergonomic vs usefulness, I want Forgetful to actually be useful and not just gimmick." Captured as research directive (D-07) for phase researcher.

---

## Dedup & Obsolescence UX

### Handling Existing Memories

| Option | Description | Selected |
|--------|-------------|----------|
| Agent decides | Compare against existing, propose create/update/obsolete/skip with user review | ✓ |
| Always replace | Mark all existing phase memories obsolete, save fresh | |
| Append only | Never mark obsolete, just add new | |

**User's choice:** Agent decides
**Notes:** None

### Opportunistic Quality Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, flag for review | Surface outdated/misleading existing memories as obsolete candidates | ✓ |
| No, scope to new only | Only deal with new artifacts | |
| You decide | Claude's discretion | |

**User's choice:** Yes, flag for review
**Notes:** None

---

## Skill Invocation Flow

### load-context Flow

| Option | Description | Selected |
|--------|-------------|----------|
| One-shot display | Run query, show results, done | |
| Conversational refinement | Show results, offer refine/expand/inject actions | ✓ |
| Silent injection | Load memories without displaying | |

**User's choice:** Conversational refinement
**Notes:** None

### save-findings Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Agent-driven with review | Agent curates batch, user approves, execute | ✓ |
| Fully conversational | Iterative discussion per finding | |
| One-shot autonomous | Agent curates and saves without review | |

**User's choice:** Agent-driven with review
**Notes:** None

### load-context Refinement Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Refine query | Adjust search terms and re-run | ✓ |
| Expand a memory | View full content, linked memories, metadata | ✓ |
| Load into context | Pick memories to inject for Claude's use | ✓ |
| You decide | Claude picks refinement options | |

**User's choice:** All three actions (Refine query, Expand a memory, Load into context)
**Notes:** None

---

## Claude's Discretion

- Helper script internal structure
- Exact Forgetful query construction
- Curation agent scoring heuristics
- Refinement loop presentation style
- Whether save-findings uses subagent or inline logic

## Deferred Ideas

None — discussion stayed within phase scope
