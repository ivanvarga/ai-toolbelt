# Roadmap: ai-toolbelt

## Milestones

- ✅ **v1.0 MVP** — Phases 1-17 (shipped 2026-03-28)
- 🚧 **v1.1 GSD & Forgetful Integration** — Phases 18-21 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-17) — SHIPPED 2026-03-28</summary>

- [x] Phase 1: Plugin Scaffold (1/1 plans)
- [x] Phase 2: Plugin Install + Operations (2/2 plans)
- [x] Phase 3: Simple Skill Conversion (2/2 plans)
- [x] Phase 4: Complex Skill Conversion (4/4 plans)
- [x] Phase 5: Credential System (3/3 plans)
- [x] Phase 6: Global Config + Verification (2/2 plans)
- [x] Phase 7: mbridge CLI Foundation (3/3 plans)
- [x] Phase 8: mbridge UI Parsing (2/2 plans)
- [x] Phase 9: mbridge Interaction + OCR (2/2 plans)
- [x] Phase 10: mbridge Skill Integration (1/1 plans)
- [x] Phase 11: mbridge Deploy + Setup Hardening (1/1 plans)
- [x] Phase 12: Purge mobilecli References (1/1 plans)
- [x] Phase 13: attachment-documenter Agent (1/1 plans)
- [x] Phase 14: Per-Organization Credential Scoping (4/4 plans)
- [x] Phase 15: Credential-Blocked Skill Testing (2/2 plans)
- [x] Phase 16: mbridge Testing and Hardening (3/3 plans)
- [x] Phase 17: Android Emulator Boot Command (2/2 plans)

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 GSD & Forgetful Integration (In Progress)

**Milestone Goal:** Make GSD and Forgetful first-class parts of the tb toolkit -- one-command bootstrap, automatic context injection on GSD workflows, and bidirectional memory sync.

- [x] **Phase 18: Foundation** - Forgetful HTTP client module and doctor health checks (completed 2026-04-01)
- [x] **Phase 19: GSD Workflow Patches** - Patch files that inject Forgetful memory queries into GSD workflows (completed 2026-04-01)
- [x] **Phase 20: Bootstrap & Update** - One-command environment setup and dependency update integration (completed 2026-04-02)
- [x] **Phase 21: Memory Skills** - Manual load-context and save-findings skills for ad-hoc Forgetful interaction (completed 2026-04-02)

## Phase Details

### Phase 18: Foundation
**Goal**: Forgetful connectivity is verified and a reusable HTTP client exists for all downstream phases
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: FNDTN-01, FNDTN-02, FNDTN-03, FNDTN-04
**Success Criteria** (what must be TRUE):
  1. User runs /tb:doctor and sees PASS/FAIL for GSD installation with version number
  2. User runs /tb:doctor and sees PASS/FAIL for Forgetful HTTP endpoint reachability (not just config presence)
  3. User runs /tb:doctor and sees PASS/FAIL for forgetful-plugin installation
  4. A Node.js forgetful-client module in scripts/ can create MCP sessions and call Forgetful tools over HTTP
**Plans:** 2/2 plans complete

Plans:
- [x] 18-01-PLAN.md — Forgetful MCP Streamable HTTP client module
- [x] 18-02-PLAN.md — Doctor health checks (GSD, Forgetful MCP, forgetful-plugin) + Integration category

### Phase 19: GSD Workflow Patches
**Goal**: GSD workflows automatically query Forgetful for relevant memories at key decision points
**Depends on**: Phase 18 (forgetful-client.js used by patch scripts)
**Requirements**: GPATCH-01, GPATCH-02, GPATCH-03, GPATCH-04, GPATCH-05, GPATCH-06
**Success Criteria** (what must be TRUE):
  1. When user starts a new project or milestone, GSD queries Forgetful for prior project patterns and includes them in context gathering
  2. When user enters discuss-phase, GSD loads similar past decisions from Forgetful before presenting gray areas
  3. When user runs plan-phase, GSD injects relevant patterns and templates from Forgetful into the planner
  4. When user completes a milestone, GSD auto-saves key decisions and findings to Forgetful
  5. After a GSD update, patches can be re-applied without manual intervention
**Plans:** 2/2 plans complete

Plans:
- [x] 19-01-PLAN.md — Helper scripts (4 Forgetful query/save scripts) + patch infrastructure (apply-all, verify-patches)
- [x] 19-02-PLAN.md — Sed patch scripts for all 6 GSD workflows (new-project, new-milestone, discuss-phase, plan-phase, research-phase, complete-milestone)

### Phase 20: Bootstrap & Update
**Goal**: Users can set up and maintain GSD + Forgetful integration with single commands
**Depends on**: Phase 18 (doctor checks for verification), Phase 19 (patch files to apply)
**Requirements**: BOOT-01, BOOT-02, BOOT-03, BOOT-04, UPDT-01, UPDT-02, UPDT-03
**Success Criteria** (what must be TRUE):
  1. User runs /tb:bootstrap once and GSD, forgetful-plugin, and GSD patches are all installed and verified
  2. User runs /tb:bootstrap a second time with no errors and no side effects (idempotent)
  3. User runs /tb:update and GSD is updated to latest version
  4. User runs /tb:update and forgetful-plugin is updated
  5. After /tb:update, GSD patches are automatically re-applied
**Plans:** 1/1 plans complete

Plans:
- [x] 20-01-PLAN.md — Bootstrap skill + update skill extension (GSD, forgetful-plugin, patches)

### Phase 21: Memory Skills
**Goal**: Users can manually load and save Forgetful memories for ad-hoc context and artifact preservation
**Depends on**: Phase 18 (Forgetful connectivity verified)
**Requirements**: SKILL-01, SKILL-02
**Success Criteria** (what must be TRUE):
  1. User invokes /tb:load-context with a query and receives relevant Forgetful memories in the conversation
  2. User invokes /tb:save-findings and GSD phase/milestone artifacts are extracted into Forgetful with deduplication
  3. Previously saved memories are marked obsolete when superseded by newer findings
**Plans:** 1/1 plans complete

Plans:
- [x] 21-01-PLAN.md — load-context and save-findings SKILL.md files for ad-hoc Forgetful interaction

### Phase 21.1: Plugin Bin Directory for PATH Executables
**Goal**: Enable bare command invocation of scripts/ executables via Claude Code PATH auto-discovery
**Depends on**: Nothing (standalone infrastructure improvement)
**Requirements**: BIN-01, BIN-02
**Success Criteria** (what must be TRUE):
  1. bin/ directory exists with wrapper scripts for all key scripts/ executables
  2. Wrappers delegate to scripts/ via relative path resolution (no hardcoded paths)
  3. All wrappers have execute permissions and correct shebangs
**Plans:** 3/3 plans complete

Plans:
- [x] 21.1-01-PLAN.md — bin/ wrapper scripts for 8 scripts/ executables
- [x] 21.1-02-PLAN.md
- [x] 21.1-03-PLAN.md

## Progress

**Execution Order:**
Phases execute in numeric order: 18 -> 19 -> 20 -> 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-17 | v1.0 | 36/36 | Complete | 2026-03-28 |
| 18. Foundation | v1.1 | 2/2 | Complete    | 2026-04-01 |
| 19. GSD Workflow Patches | v1.1 | 2/2 | Complete    | 2026-04-01 |
| 20. Bootstrap & Update | v1.1 | 1/1 | Complete    | 2026-04-02 |
| 21. Memory Skills | v1.1 | 1/1 | Complete    | 2026-04-02 |
| 21.1. Plugin Bin Directory | v1.1 | 3/3 | Complete    | 2026-04-05 |

---
*Last updated: 2026-04-05 after Phase 21.1 Wave 1 execution*

### Phase 21.1: Plugin bin directory & auto-save research discoveries (INSERTED)

**Goal:** (1) Create bin/ wrappers for PATH-based invocation of scripts via Claude Code v2.1.91+, (2) Patch research-phase to capture General Discoveries and auto-save to Forgetful via SubagentStop hook
**Depends on:** Phase 21
**Requirements**: BIN-01, BIN-02, BIN-03, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05
**Success Criteria** (what must be TRUE):
  1. bin/ directory contains executable wrappers for all key scripts, invokable as bare commands
  2. Research-phase workflow includes General Discoveries section instructions for the researcher
  3. SubagentStop hook triggers curation script when gsd-phase-researcher completes
  4. Curation script parses discoveries, dedup-checks Forgetful, and saves qualifying entries
  5. SKILL.md files use bare bin/ commands instead of verbose CLAUDE_PLUGIN_ROOT/scripts/ paths
  6. verify-patches.sh validates the new research-discoveries patch
**Plans:** 2/3 plans executed

Plans:
- [x] 21.1-01-PLAN.md — bin/ directory with 8 wrapper scripts for PATH executables
- [x] 21.1-02-PLAN.md — Research-phase patch for General Discoveries section + verify-patches extension
- [ ] 21.1-03-PLAN.md — Curation script, SubagentStop hook, and SKILL.md migration to bare commands

## Upcoming (Unassigned to Milestone)

### Phase 22: Auto-inject Forgetful context on every prompt

**Goal:** UserPromptSubmit hook that always queries Forgetful with deterministic similarity search, includes top-N most important memories above relevance threshold, gracefully no-ops if Forgetful unreachable. No prompt filtering heuristics — keep it simple.
**Depends on:** Phase 18 (Forgetful client)
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 22 to break down)
