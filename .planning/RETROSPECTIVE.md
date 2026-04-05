# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — GSD & Forgetful Integration

**Shipped:** 2026-04-05
**Phases:** 5 | **Plans:** 9 | **Tasks:** 17

### What Was Built
- Forgetful MCP Streamable HTTP client with session lifecycle and SSE parsing
- 6 GSD workflow patches injecting Forgetful context at all decision points
- Bootstrap + update skills for one-command environment setup
- load-context and save-findings skills for ad-hoc Forgetful interaction
- bin/ directory with 9 PATH executables for bare command invocation
- Auto-curation pipeline: SubagentStop hook + curate-discoveries script

### What Worked
- Sed/awk patch approach proved robust — non-invasive, survives GSD updates, auto-reapplied
- Deterministic curation over LLM saved significant complexity — researcher already applies judgment
- bin/ wrappers with dirname-relative paths are portable and explicit
- Phase 21.1 insertion pattern (decimal numbering) allowed adding scope without disrupting flow
- Parallel Wave 1 execution with worktree isolation worked cleanly

### What Was Inefficient
- Parallel executor worktree branches caused merge conflicts on STATE.md and ROADMAP.md — needed manual resolution
- Phase 21.1 ROADMAP.md had duplicate entries (upper summary + lower detail section) that drifted
- BIN-01/BIN-02 requirements weren't auto-checked in REQUIREMENTS.md after execution — manual fix needed
- Some plan 21.1-03 PLAN.md details were slightly misaligned with actual implementation (key_links vs action text)

### Patterns Established
- SubagentStop hooks as async post-processing triggers (not just for errors)
- bin/ wrapper pattern: shebang + exec + dirname-relative resolution
- Awk for before-anchor insertion in workflow patches (sed only inserts after)
- PLUGIN_ROOT resolved at patch-apply time and embedded as literal path

### Key Lessons
1. Parallel executors that both update shared tracking files (STATE.md, ROADMAP.md) will always conflict — consider sequential updates or a merge strategy
2. Deterministic scripts beat LLM agents for mechanical tasks (dedup, save, format) — save LLM budget for judgment calls
3. Decimal phases work well for inserting urgent/adjacent work, but roadmap bookkeeping needs extra attention

### Cost Observations
- Model mix: ~70% opus (research, planning, execution), ~30% sonnet (verification, checking)
- v1.1 completed in 5 days (2026-04-01 → 2026-04-05)
- Notable: Phase 21.1 research + plan + execute in single session

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 17 | 36 | Established plugin structure, skill format, mbridge |
| v1.1 | 5 | 9 | Added Forgetful integration, GSD patches, auto-curation |

### Top Lessons (Verified Across Milestones)

1. Awk over sed for before-anchor insertions (confirmed in v1.0 Phase 19 and v1.1 Phase 21.1)
2. Integration tests over unit tests for CLI tools (confirmed across mbridge and patch verification)
