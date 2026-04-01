# Requirements: ai-toolbelt

**Defined:** 2026-03-28
**Core Value:** One repo, one install command -- every custom skill, credential setup, and dev tool available on any machine, always up to date.

## v1.1 Requirements

Requirements for GSD & Forgetful Integration milestone. Each maps to roadmap phases.

### Foundation

- [x] **FNDTN-01**: User can run /tb:doctor and see whether GSD is installed and its version
- [x] **FNDTN-02**: User can run /tb:doctor and see whether Forgetful HTTP endpoint is reachable
- [x] **FNDTN-03**: User can run /tb:doctor and see whether forgetful-plugin is installed
- [ ] **FNDTN-04**: Forgetful HTTP client module exists in scripts/ for health checks and bootstrap verification

### Bootstrap

- [ ] **BOOT-01**: User can run /tb:bootstrap to install GSD if missing
- [ ] **BOOT-02**: User can run /tb:bootstrap to install forgetful-plugin if missing
- [ ] **BOOT-03**: User can run /tb:bootstrap to apply GSD patches for Forgetful integration
- [ ] **BOOT-04**: Bootstrap is idempotent -- safe to run multiple times without side effects

### GSD Patches

- [ ] **GPATCH-01**: GSD new-project and new-milestone workflows query Forgetful for prior project patterns during context gathering
- [ ] **GPATCH-02**: GSD discuss-phase workflow loads similar decisions from Forgetful before presenting gray areas
- [ ] **GPATCH-03**: GSD plan-phase workflow injects relevant patterns/templates from Forgetful into planner context
- [ ] **GPATCH-04**: GSD complete-milestone workflow auto-saves key decisions and findings to Forgetful
- [ ] **GPATCH-05**: Patches survive GSD updates via /gsd:reapply-patches or tb's own re-apply mechanism
- [ ] **GPATCH-06**: GSD research-phase and project-level researcher agents receive relevant Forgetful memories as prior research before starting investigation

### Skills

- [ ] **SKILL-01**: User can invoke /tb:load-context <query> to manually retrieve relevant Forgetful memories before any work
- [ ] **SKILL-02**: User can invoke /tb:save-findings to extract GSD phase/milestone artifacts into Forgetful with dedup and obsolescence marking

### Update

- [ ] **UPDT-01**: /tb:update also updates GSD to latest version
- [ ] **UPDT-02**: /tb:update also updates forgetful-plugin
- [ ] **UPDT-03**: /tb:update re-applies GSD patches after GSD update

## Future Requirements

Deferred to v1.x after validation.

### Smart Context

- **SCTX-01**: Hook reads STATE.md to scope Forgetful queries by current phase/milestone
- **SCTX-02**: Automatic obsolescence marking on phase/milestone transition
- **SCTX-03**: Pre-compaction save (PreCompact hook) to preserve context before auto-compaction

### Advanced Memory

- **AMEM-01**: Token-budget tuning per GSD command type
- **AMEM-02**: Cross-project memory linking
- **AMEM-03**: Batch SUMMARY extraction across all phases

## Out of Scope

| Feature | Reason |
|---------|--------|
| UserPromptSubmit hook for context injection | GSD patches are more surgical and precise than prompt-level hook |
| MCP protocol client | Simple HTTP client sufficient; MCP adds complexity without value |
| Forgetful server installation/management | Server is user-managed infrastructure, not a plugin concern |
| Modifying Forgetful plugin skills | forgetful-plugin is a third-party plugin, managed separately |
| Smart context scoping (v1.1) | Defer until basic integration is validated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDTN-01 | Phase 18 | Complete |
| FNDTN-02 | Phase 18 | Complete |
| FNDTN-03 | Phase 18 | Complete |
| FNDTN-04 | Phase 18 | Pending |
| BOOT-01 | Phase 20 | Pending |
| BOOT-02 | Phase 20 | Pending |
| BOOT-03 | Phase 20 | Pending |
| BOOT-04 | Phase 20 | Pending |
| GPATCH-01 | Phase 19 | Pending |
| GPATCH-02 | Phase 19 | Pending |
| GPATCH-03 | Phase 19 | Pending |
| GPATCH-04 | Phase 19 | Pending |
| GPATCH-05 | Phase 19 | Pending |
| GPATCH-06 | Phase 19 | Pending |
| SKILL-01 | Phase 21 | Pending |
| SKILL-02 | Phase 21 | Pending |
| UPDT-01 | Phase 20 | Pending |
| UPDT-02 | Phase 20 | Pending |
| UPDT-03 | Phase 20 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation (traceability added)*
