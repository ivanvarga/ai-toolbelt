# Requirements: ai-toolbelt

**Defined:** 2026-03-28
**Core Value:** One repo, one install command -- every custom skill, credential setup, and dev tool available on any machine, always up to date.

## v1.1 Requirements

Requirements for GSD & Forgetful Integration milestone. Each maps to roadmap phases.

### Foundation

- [x] **FNDTN-01**: User can run /tb:doctor and see whether GSD is installed and its version
- [x] **FNDTN-02**: User can run /tb:doctor and see whether Forgetful HTTP endpoint is reachable
- [x] **FNDTN-03**: User can run /tb:doctor and see whether forgetful-plugin is installed
- [x] **FNDTN-04**: Forgetful HTTP client module exists in scripts/ for health checks and bootstrap verification

### Bootstrap

- [x] **BOOT-01**: User can run /tb:bootstrap to install GSD if missing
- [x] **BOOT-02**: User can run /tb:bootstrap to install forgetful-plugin if missing
- [x] **BOOT-03**: User can run /tb:bootstrap to apply GSD patches for Forgetful integration
- [x] **BOOT-04**: Bootstrap is idempotent -- safe to run multiple times without side effects

### GSD Patches

- [x] **GPATCH-01**: GSD new-project and new-milestone workflows query Forgetful for prior project patterns during context gathering
- [x] **GPATCH-02**: GSD discuss-phase workflow loads similar decisions from Forgetful before presenting gray areas
- [x] **GPATCH-03**: GSD plan-phase workflow injects relevant patterns/templates from Forgetful into planner context
- [x] **GPATCH-04**: GSD complete-milestone workflow auto-saves key decisions and findings to Forgetful
- [x] **GPATCH-05**: Patches survive GSD updates via /gsd:reapply-patches or tb's own re-apply mechanism
- [x] **GPATCH-06**: GSD research-phase and project-level researcher agents receive relevant Forgetful memories as prior research before starting investigation

### Skills

- [x] **SKILL-01**: User can invoke /tb:load-context <query> to manually retrieve relevant Forgetful memories before any work
- [x] **SKILL-02**: User can invoke /tb:save-findings to extract GSD phase/milestone artifacts into Forgetful with dedup and obsolescence marking

### Update

- [x] **UPDT-01**: /tb:update also updates GSD to latest version
- [x] **UPDT-02**: /tb:update also updates forgetful-plugin
- [x] **UPDT-03**: /tb:update re-applies GSD patches after GSD update

### Plugin bin/ & Auto-Curation (Phase 21.1)

- [ ] **BIN-01**: bin/ directory exists with executable wrapper scripts for all key scripts/ files
- [ ] **BIN-02**: bin/ wrappers are invokable as bare commands when plugin is loaded (PATH-based)
- [ ] **BIN-03**: SKILL.md files use bare forgetful-client command instead of verbose CLAUDE_PLUGIN_ROOT/scripts/ paths
- [ ] **DISC-01**: Research-phase patch injects General Discoveries section instructions into GSD researcher prompt
- [ ] **DISC-02**: SubagentStop hook fires curate-discoveries script when gsd-phase-researcher completes
- [ ] **DISC-03**: Curation script parses General Discoveries entries and saves qualifying ones to Forgetful with dedup
- [ ] **DISC-04**: Curation runs autonomously (async, no user intervention) after every research run
- [ ] **DISC-05**: verify-patches.sh validates the new research-general-discoveries patch

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
| FNDTN-04 | Phase 18 | Complete |
| BOOT-01 | Phase 20 | Complete |
| BOOT-02 | Phase 20 | Complete |
| BOOT-03 | Phase 20 | Complete |
| BOOT-04 | Phase 20 | Complete |
| GPATCH-01 | Phase 19 | Complete |
| GPATCH-02 | Phase 19 | Complete |
| GPATCH-03 | Phase 19 | Complete |
| GPATCH-04 | Phase 19 | Complete |
| GPATCH-05 | Phase 19 | Complete |
| GPATCH-06 | Phase 19 | Complete |
| SKILL-01 | Phase 21 | Complete |
| SKILL-02 | Phase 21 | Complete |
| UPDT-01 | Phase 20 | Complete |
| UPDT-02 | Phase 20 | Complete |
| UPDT-03 | Phase 20 | Complete |
| BIN-01 | Phase 21.1 | Planned |
| BIN-02 | Phase 21.1 | Planned |
| BIN-03 | Phase 21.1 | Planned |
| DISC-01 | Phase 21.1 | Planned |
| DISC-02 | Phase 21.1 | Planned |
| DISC-03 | Phase 21.1 | Planned |
| DISC-04 | Phase 21.1 | Planned |
| DISC-05 | Phase 21.1 | Planned |

**Coverage:**
- v1.1 requirements: 27 total (19 complete + 8 planned)
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-04-05 after Phase 21.1 planning*
