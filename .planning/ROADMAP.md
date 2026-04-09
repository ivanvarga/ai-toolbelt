# Roadmap: ai-toolbelt

## Milestones

- ✅ **v1.0 MVP** — Phases 1-17 (shipped 2026-03-28)
- ✅ **v1.1 GSD & Forgetful Integration** — Phases 18-21.1 (shipped 2026-04-05)
- 🚧 **v1.2 Auto-inject Forgetful Context** — Phase 22 (in progress)

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

### 🚧 v1.2 Auto-inject Forgetful Context (In Progress)

**Milestone Goal:** Automatically inject relevant Forgetful memories into every prompt via UserPromptSubmit hook, making project memory ambient rather than opt-in.

- [ ] **Phase 22: Auto-inject Forgetful Context** - UserPromptSubmit hook that queries Forgetful on every prompt and injects relevant memories as additionalContext

## Phase Details

### Phase 22: Auto-inject Forgetful Context
**Goal**: Every user prompt automatically receives relevant project memories from Forgetful without manual invocation
**Depends on**: Phase 18 (Forgetful client module)
**Requirements**: CTXI-01, CTXI-02, CTXI-03, CTXI-04, CTXI-05, CTXI-06, CTXI-07, HOOK-01, HOOK-02, HOOK-03
**Success Criteria** (what must be TRUE):
  1. User submits a normal prompt and Claude receives relevant Forgetful memories as context without the user doing anything
  2. User submits a /gsd: or /tb:load-context command and no duplicate Forgetful context is injected
  3. Forgetful is unreachable (server down, no project found, no results) and the user experiences zero disruption -- no errors, no delays beyond 3 seconds
  4. Doctor check reports whether the UserPromptSubmit hook is properly registered and the script file exists
  5. Hook works regardless of whether plugin hooks.json output capture is functional (bug #12151 fallback to settings.json if needed)
**Plans**: 2 plans

Plans:
- [ ] 22-01-PLAN.md — Core hook script + hooks.json registration (CTXI-01 through CTXI-07, HOOK-01)
- [ ] 22-02-PLAN.md — Doctor check + bootstrap settings.json fallback (HOOK-02, HOOK-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> ... -> 17 -> 18 -> 19 -> 20 -> 21 -> 21.1 -> 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-17 | v1.0 | 36/36 | Complete | 2026-03-28 |
| 18. Foundation | v1.1 | 2/2 | Complete | 2026-04-01 |
| 19. GSD Workflow Patches | v1.1 | 2/2 | Complete | 2026-04-01 |
| 20. Bootstrap & Update | v1.1 | 1/1 | Complete | 2026-04-02 |
| 21. Memory Skills | v1.1 | 1/1 | Complete | 2026-04-02 |
| 21.1. Plugin Bin Directory | v1.1 | 3/3 | Complete | 2026-04-05 |
| 22. Auto-inject Forgetful Context | v1.2 | 0/2 | Planning | - |

---
*Last updated: 2026-04-09 after phase 22 planning*
