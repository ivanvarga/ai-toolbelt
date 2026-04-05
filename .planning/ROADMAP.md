# Roadmap: ai-toolbelt

## Milestones

- ✅ **v1.0 MVP** — Phases 1-17 (shipped 2026-03-28)
- ✅ **v1.1 GSD & Forgetful Integration** — Phases 18-21.1 (shipped 2026-04-05)

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

<details>
<summary>✅ v1.1 GSD & Forgetful Integration (Phases 18-21.1) — SHIPPED 2026-04-05</summary>

- [x] Phase 18: Foundation (2/2 plans) — completed 2026-04-01
- [x] Phase 19: GSD Workflow Patches (2/2 plans) — completed 2026-04-01
- [x] Phase 20: Bootstrap & Update (1/1 plans) — completed 2026-04-02
- [x] Phase 21: Memory Skills (1/1 plans) — completed 2026-04-02
- [x] Phase 21.1: Plugin bin directory & auto-save research discoveries (3/3 plans) — completed 2026-04-05

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

## Upcoming (Unassigned to Milestone)

### Phase 22: Auto-inject Forgetful context on every prompt

**Goal:** UserPromptSubmit hook that always queries Forgetful with deterministic similarity search, includes top-N most important memories above relevance threshold, gracefully no-ops if Forgetful unreachable. No prompt filtering heuristics — keep it simple.
**Depends on:** Phase 18 (Forgetful client)
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 22 to break down)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> ... -> 17 -> 18 -> 19 -> 20 -> 21 -> 21.1

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-17 | v1.0 | 36/36 | Complete | 2026-03-28 |
| 18. Foundation | v1.1 | 2/2 | Complete | 2026-04-01 |
| 19. GSD Workflow Patches | v1.1 | 2/2 | Complete | 2026-04-01 |
| 20. Bootstrap & Update | v1.1 | 1/1 | Complete | 2026-04-02 |
| 21. Memory Skills | v1.1 | 1/1 | Complete | 2026-04-02 |
| 21.1. Plugin Bin Directory | v1.1 | 3/3 | Complete | 2026-04-05 |

---
*Last updated: 2026-04-05 after v1.1 milestone completion*
