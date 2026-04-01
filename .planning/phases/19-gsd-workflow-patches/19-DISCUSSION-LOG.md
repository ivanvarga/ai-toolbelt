# Phase 19: GSD Workflow Patches - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 19-gsd-workflow-patches
**Areas discussed:** Patch mechanism, Query scoping, Milestone save behavior, Update survival, Researcher injection

---

## Patch Mechanism

### Q1: How should patches modify GSD workflow behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct file edits | Modify GSD workflow .md files directly. GSD's built-in gsd-local-patches/ backs up on update. Simple, transparent. | ✓ |
| Wrapper scripts | Create tb scripts that run BEFORE each GSD workflow, querying Forgetful and injecting results as context. GSD files stay untouched. | |
| UserPromptSubmit hook | Single hook intercepts /gsd:* commands. No GSD file changes but bug #12151 limits registration and injection is prompt-level only. | |

**User's choice:** Direct file edits (Recommended)
**Notes:** None

### Q2: How should patch files be stored in tb's repo?

| Option | Description | Selected |
|--------|-------------|----------|
| patches/ directory | New top-level patches/ directory with patch files. Bootstrap applies, update re-applies. Clean separation. | ✓ |
| scripts/patches/ | Nest under scripts/. Consistent convention but less discoverable. | |
| Inline in bootstrap skill | Patch content in bootstrap SKILL.md as heredocs. Harder to maintain. | |

**User's choice:** patches/ directory (Recommended)
**Notes:** None

### Q3: What format for patch files?

| Option | Description | Selected |
|--------|-------------|----------|
| Sed/awk scripts | Shell scripts using sed/awk to insert lines at markers. Handles GSD version drift if markers stable. | ✓ |
| Git-style .patch diffs | Standard unified diff files. Exact but brittle — upstream context changes break application. | |
| Node.js patcher | Node.js script with content matching. Most robust but heavier. | |

**User's choice:** Sed/awk scripts (Recommended)
**Notes:** None

### Q4: Should patches call forgetful-client.js directly or via helper scripts?

| Option | Description | Selected |
|--------|-------------|----------|
| Helper script per workflow | Each patched workflow calls a dedicated script that uses forgetful-client.js internally. Clean separation. | ✓ |
| Inline forgetful-client calls | Patched steps call forgetful-client.js directly with arguments. Fewer files, more logic in patches. | |
| You decide | Let Claude determine best invocation pattern. | |

**User's choice:** Helper script per workflow
**Notes:** None

---

## Query Scoping

### Q1: new-project/new-milestone — what should 'prior project patterns' mean?

| Option | Description | Selected |
|--------|-------------|----------|
| Past decisions & outcomes | Query for decisions, lessons learned from previous projects/milestones. | |
| Architecture patterns | Query for tech stack choices, architecture decisions. | |
| Everything relevant | Broad query scoped by project domain, let Forgetful ranking decide. | ✓ |

**User's choice:** Everything relevant
**Notes:** None

### Q2: discuss-phase — how should similar past decisions be loaded?

| Option | Description | Selected |
|--------|-------------|----------|
| Query by phase domain | Extract phase goal/name, query for similar decisions across all projects. | ✓ |
| Query by requirement tags | Use requirement IDs to find memories with similar requirement patterns. | |
| Query by phase name + project | Scope strictly to current project's prior phases. | |

**User's choice:** "what do you think would be most useful"
**Notes:** Claude recommended query by phase domain — richest cross-project learning. User accepted.

### Q3: plan-phase — what patterns and templates to inject?

| Option | Description | Selected |
|--------|-------------|----------|
| Implementation patterns | How similar features were implemented before. | |
| Plan templates | Previous plan structures and task organizations. | |
| Both patterns + templates | Broad query for both. Higher token cost. | |
| You decide | Let Claude determine. | |

**User's choice:** "previous similar features but also relevant stack information"
**Notes:** Custom answer — query for both similar feature implementations AND tech stack context.

### Q4: Token budget for injected context?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed budget per workflow | Each workflow gets a max token budget. Prevents context bloat. | |
| No budget, trust ranking | Inject whatever Forgetful returns. Simpler. | ✓ |
| You decide | Let Claude determine budgets per workflow. | |

**User's choice:** No budget, trust ranking
**Notes:** None

---

## Milestone Save Behavior

### Q1: What should auto-save to Forgetful on milestone completion?

| Option | Description | Selected |
|--------|-------------|----------|
| Key decisions from PROJECT.md | Key Decisions table — rationale and outcomes. | |
| Lessons from SUMMARY.md | Key Outcomes, Lessons Learned sections. | ✓ |
| Phase context decisions | Implementation decisions from each phase CONTEXT.md. | |
| Architecture/stack choices | Tech stack decisions, architecture patterns. | |

**User's choice:** Lessons from SUMMARY.md only
**Notes:** None — deliberate curation choice

### Q2: Should save require user confirmation?

| Option | Description | Selected |
|--------|-------------|----------|
| Show and confirm | Display extracted memories, approve/edit/skip each. | ✓ |
| Auto-save silently | Extract and save without prompting. | |
| Summary then batch confirm | Show summary, single yes/no for all. | |

**User's choice:** Show and confirm (Recommended)
**Notes:** None

### Q3: Mark previously saved memories obsolete?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-mark obsolete | Query for existing, mark obsolete, save fresh. | ✓ |
| No, accumulate | Keep old alongside new. Let ranking handle. | |
| Defer to v1.x | Obsolescence is SCTX-02, skip for now. | |

**User's choice:** Yes, auto-mark obsolete (Recommended)
**Notes:** None

---

## Update Survival

### Q1: How should patches survive GSD updates?

| Option | Description | Selected |
|--------|-------------|----------|
| GSD's built-in reapply | Leverage gsd-local-patches/ + /gsd:reapply-patches. | ✓ |
| tb's own re-apply | tb manages patch state independently. | |
| Both mechanisms | Belt and suspenders — more robust, more complex. | |

**User's choice:** GSD's built-in reapply (Recommended)
**Notes:** None

### Q2: What if reapply fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Warn and offer manual re-patch | Doctor check detects missing patches, suggests /tb:bootstrap. | ✓ |
| Auto-attempt fresh patch | Try applying from tb patches/ as fallback. | |
| You decide | Let Claude determine. | |

**User's choice:** Warn and offer manual re-patch (Recommended)
**Notes:** None

---

## Researcher Injection

### Q1: What prior research to inject for researchers?

| Option | Description | Selected |
|--------|-------------|----------|
| Similar topic research | Query for prior research on similar topics/domains across projects. | ✓ |
| Same-project prior phases | Only inject from same project's earlier phases. | |
| Stack-specific findings | Query for memories about specific tech stack being researched. | |

**User's choice:** Similar topic research (Recommended)
**Notes:** None

### Q2: How should researcher agents receive context?

| Option | Description | Selected |
|--------|-------------|----------|
| Inject into agent prompt | Patched workflow pre-fetches and includes in agent prompt. | ✓ |
| Agent queries Forgetful directly | Give agent access to forgetful-client.js. More autonomous, more complex. | |
| You decide | Let Claude determine. | |

**User's choice:** Inject into agent prompt (Recommended)
**Notes:** None

### Q3: Which researchers get Forgetful context?

| Option | Description | Selected |
|--------|-------------|----------|
| Both project and phase | All researcher agents get context. Project gets broad, phase gets specific. | ✓ |
| Phase researchers only | Project researchers start fresh. Only phase researchers benefit. | |
| You decide | Let Claude determine per role. | |

**User's choice:** Both project and phase (Recommended)
**Notes:** None

---

## Claude's Discretion

- Exact query construction for each injection point
- Internal structure of helper scripts
- Sed/awk marker patterns for stable patch insertion
- Graceful failure behavior when Forgetful unreachable

## Deferred Ideas

None — discussion stayed within phase scope
