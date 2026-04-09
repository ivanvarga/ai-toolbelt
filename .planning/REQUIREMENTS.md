# Requirements: ai-toolbelt

**Defined:** 2026-04-05
**Core Value:** One repo, one install command -- every custom skill, credential setup, and dev tool available on any machine, always up to date.

## v1.2 Requirements

Requirements for auto-inject Forgetful context milestone. Each maps to roadmap phases.

### Context Injection

- [ ] **CTXI-01**: User prompt automatically triggers Forgetful similarity search with project scoping via git remote
- [ ] **CTXI-02**: Relevant memories injected as structured additionalContext JSON with XML-tagged compact snippets (300 char, title + importance)
- [ ] **CTXI-03**: Hook exits silently (exit 0, no output) on any failure -- Forgetful unreachable, no project found, no results
- [x] **CTXI-04**: Hook completes within 3 seconds; times out gracefully if slower
- [ ] **CTXI-05**: Results filtered by importance threshold (>=7) and low-K retrieval (k=5)
- [ ] **CTXI-06**: Hook skips auto-inject when prompt starts with /gsd: or /tb:load-context to avoid duplication with targeted context scripts
- [ ] **CTXI-07**: Project ID cached per session to avoid repeated list_projects API calls

### Hook Registration

- [x] **HOOK-01**: UserPromptSubmit hook registered in hooks.json (synchronous, ~10s timeout)
- [x] **HOOK-02**: Doctor check verifies UserPromptSubmit hook is registered and script exists
- [x] **HOOK-03**: If plugin hooks.json output is silently discarded (bug #12151), fall back to settings.json registration with documented workaround

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Optimization

- **OPT-01**: Prompt-aware query_context passed to Forgetful for better cross-encoder reranking
- **OPT-02**: Multi-query retrieval (parallel queries like gsd-plan-context.js) for broader coverage
- **OPT-03**: Token budget awareness -- reduce/skip injection when context is nearly full

## Out of Scope

| Feature | Reason |
|---------|--------|
| Async hook execution | Async UserPromptSubmit cannot inject additionalContext on current prompt -- defeats the purpose |
| Dynamic similarity threshold tuning | Over-engineering for personal tool; fixed threshold + manual adjustment sufficient |
| User-configurable toggle | Natural off behavior (no Forgetful = no injection); remove hook from hooks.json to disable |
| Client-side re-ranking | Forgetful already does server-side cross-encoder reranking; duplicating adds latency |
| Full memory content injection | RAG research clear: snippets > full documents for LLM quality; /tb:load-context exists for deep exploration |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTXI-01 | Phase 22 | Pending |
| CTXI-02 | Phase 22 | Pending |
| CTXI-03 | Phase 22 | Pending |
| CTXI-04 | Phase 22 | Complete |
| CTXI-05 | Phase 22 | Pending |
| CTXI-06 | Phase 22 | Pending |
| CTXI-07 | Phase 22 | Pending |
| HOOK-01 | Phase 22 | Complete |
| HOOK-02 | Phase 22 | Complete |
| HOOK-03 | Phase 22 | Complete |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
