# Feature Research

**Domain:** Claude Code plugin ecosystem -- bootstrap, context injection, memory sync, dependency management
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH (patterns verified against official docs and multiple plugin implementations)

## Feature Landscape

### Table Stakes (Users Expect These)

Features required for v1.1 to deliver value. Missing any = integration is incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bootstrap skill (`/tb:bootstrap`) | Every integration plugin (claude-mem, forgetful-plugin, claude-bootstrap) provides a single setup entrypoint. Users will not manually configure three separate systems. | MEDIUM | Must install: GSD (git clone to `~/.claude/get-shit-done/`), Forgetful MCP (register `uvx forgetful-ai` in `~/.claude.json`), forgetful-plugin (marketplace install). Must be idempotent -- re-running skips already-installed components. Existing pattern: `setup-all.js` runs per-service setups sequentially. |
| Doctor checks for GSD/Forgetful health | tb already has modular `scripts/checks/*.sh` doctor pattern with 11 checks. Users expect new dependencies to have health checks. Incomplete doctor = silent failures. | LOW | Two new check scripts following established pattern: `dep-gsd.sh` (verify `~/.claude/get-shit-done/` exists + VERSION file readable), `dep-forgetful.sh` (verify MCP server configured in `~/.claude.json` + `uvx forgetful-ai --version` responds). Output format: `PASS|FAIL|WARN <check-name> <message>`, always exit 0. |
| Update integration | `/tb:update` already handles git pull + version compare + changelog display. Users expect all managed dependencies to update together. | LOW | Extend existing update SKILL.md with: `git -C ~/.claude/get-shit-done pull --rebase origin main` for GSD, `claude plugin update forgetful-plugin@forgetful-plugin` for forgetful-plugin. Additive change to existing skill, not a new skill. |
| GSD context hook (UserPromptSubmit) | claude-mem and memory-store-plugin both inject context automatically. When running `/gsd:execute-phase` or similar, relevant memories about that project/phase should auto-inject. This is the core integration value. | HIGH | **Critical design constraints from official docs:** UserPromptSubmit has NO matcher support -- fires on ALL prompts. Script must: read stdin JSON for `prompt` field, regex-match `/gsd:` prefix, early-exit for non-GSD prompts. Query Forgetful via MCP tools, output `additionalContext` in hookSpecificOutput JSON. Must fail gracefully (exit 0, no context) if Forgetful is unreachable. Performance target: <2s for GSD prompts, <50ms for non-GSD (early exit). |
| Load-context skill (`/tb:load-context`) | forgetful-plugin has `/memory-search` but requires knowing the 38-tool API. tb should provide opinionated context loading: accept a topic/query, retrieve project-scoped memories, present as actionable context. | MEDIUM | Wraps Forgetful's `execute_tool` meta-tool with `search_memories`. Should: accept topic/query argument, auto-detect project from git remote/cwd, query with project scope, display results with importance scores. Mostly a SKILL.md that instructs Claude to use Forgetful MCP tools with specific patterns. |
| Save-findings skill (`/tb:save-findings`) | forgetful-plugin has `/memory-save` for generic memories. tb needs a skill that understands GSD artifacts (SUMMARY.md, research files, key decisions) and creates properly structured Forgetful memories. | MEDIUM-HIGH | Must: parse GSD SUMMARY.md sections (Key Outcomes, Decisions Made, Lessons Learned), create atomic memories per Zettelkasten principles (300-400 words, one concept per memory), auto-tag with project/phase metadata, deduplicate via semantic search before saving, confirm with user before persisting. |

### Differentiators (Competitive Advantage)

Features that make tb's GSD+Forgetful integration better than manual forgetful-plugin usage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Automatic project scoping in Forgetful queries | forgetful-plugin queries are generic. tb knows the current GSD project, milestone, and phase from `.planning/STATE.md`. Queries auto-scope: "memories about ai-toolbelt v1.1 phase 3" instead of generic keyword search. | MEDIUM | Parse STATE.md frontmatter for project name, milestone, current phase. Use as Forgetful `query_context` parameter for better cross-encoder reranking. Forgetful's two-stage retrieval (dense + cross-encoder) benefits significantly from contextual scoping. |
| Automatic obsolescence marking on phase/milestone completion | Forgetful has no built-in lifecycle management (acknowledged by creator as future work). When GSD completes a phase, outdated memories should be marked obsolete. | MEDIUM | Hook into GSD `/gsd:transition` and `/gsd:complete-milestone` patterns. Query Forgetful for phase-specific memories, present candidates for obsolescence, use `execute_tool` with update/archive operations. |
| Memory visibility in injection | When context is injected via hook, include "(N memories loaded for project X)" so user knows what Claude received. | LOW | Formatting in hook output. claude-mem does this with its progressive disclosure pattern. Transparency prevents confusion about what Claude "remembers". |
| Defensive GSD version tracking | Doctor check compares GSD VERSION against last-known-compatible version. Warns on major version changes that might break integration. | LOW | Read `~/.claude/get-shit-done/VERSION` (currently 1.30.0), compare against known-good range stored in tb config. |
| SessionStart pre-warm | Async SessionStart hook sends a low-cost Forgetful query to warm the embedding model, reducing latency on first GSD command. | LOW | Forgetful uses FastEmbed BAAI/bge-small-en-v1.5 locally. First query after cold start incurs model load time (3-5s). Async warm prevents that from hitting the user's first real query. |
| Pre-compaction memory save | PreCompact hook auto-saves current working context to Forgetful before compaction wipes it. | MEDIUM | PreCompact hook fires before context compaction. Script captures key working state, saves to Forgetful. Complements SessionStart compact matcher for re-injection. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-save every GSD artifact to Forgetful | "Never lose anything" instinct | Creates memory pollution. Forgetful's cross-encoder reranking degrades with noise. GSD produces working files (draft plans, intermediate states) NOT worth persisting. claude-mem's approach of auto-capturing everything requires AI compression to manage volume -- unnecessary overhead for curated workflow artifacts. | Curated save-findings skill extracts only completed SUMMARY.md outcomes, validated decisions, and lessons learned. User confirms before saving. |
| Hook on every prompt (not just `/gsd:*`) | "Always have context" | UserPromptSubmit fires on ALL prompts with no matcher support. Querying Forgetful on every prompt adds 1-3s latency, wastes Forgetful API calls, and injects potentially irrelevant memories. Most prompts ("fix this bug", "add a test") don't need historical project memory. memory-store-plugin's approach of tracking everything creates huge queue files. | Only trigger Forgetful query on `/gsd:*` commands. Provide `/tb:load-context` for manual retrieval. |
| Bidirectional real-time sync between GSD files and Forgetful | "Single source of truth" | GSD files are ephemeral working documents (plans change, phases get re-ordered, files deleted at milestone boundaries). Forgetful is for durable knowledge. Syncing creates conflicts and stale data. | One-way flow: GSD artifacts -> curated extraction -> Forgetful memories. Forgetful memories -> context injection. Never write from Forgetful back to GSD files. |
| Full repository encoding via tb wrapper | "Index everything" | forgetful-plugin already provides `/encode-repo`. Wrapping it adds no value and creates confusion about which tool to use. Code is navigable via Claude's built-in tools. | Let forgetful-plugin handle encode-repo directly. tb focuses on GSD workflow integration, not general codebase indexing. |
| Forgetful MCP server lifecycle management | "Just make it work" | Starting/stopping Forgetful from tb adds process management complexity. User's Forgetful setup varies (local uvx, Docker, remote HTTP). Claude Code's MCP system manages server lifecycle automatically once configured in `~/.claude.json`. | Bootstrap registers Forgetful in MCP config. Doctor checks verify reachability. Claude Code handles the rest. |
| Custom MCP client library for shell scripts | "Clean abstractions" | Building a reusable MCP client for shell is over-engineering. The protocol flow is straightforward via Forgetful's 3 meta-tools (`discover_tools`, `how_to_use`, `execute_tool`). | Inline MCP calls in each script. Extract shared functions to a sourced shell library only if duplication exceeds 3 call sites. |

## Feature Dependencies

```
[Bootstrap skill]
    |--installs--> [GSD at ~/.claude/get-shit-done/]
    |--registers-> [Forgetful MCP in ~/.claude.json]
    |--installs--> [forgetful-plugin via marketplace]
    |--registers-> [UserPromptSubmit hook in settings.json]
    |
    v
[Doctor checks: dep-gsd, dep-forgetful]
    |--validates-> [Bootstrap outputs]
    |
    v
[Update integration]              [GSD context hook]              [Load-context skill]         [Save-findings skill]
    |                                  |                               |                            |
    +--extends /tb:update              +--requires Forgetful MCP      +--requires Forgetful MCP    +--requires Forgetful MCP
    +--requires GSD installed          +--requires GSD .planning/     +--independent of hook       +--requires GSD .planning/
    +--requires forgetful-plugin       +--reads STATE.md for scope    |                            +--reads SUMMARY.md files
                                       |                                                           |
                                       v                                                           v
                              [Smart context scoping]                                    [Obsolescence marking]
                                       |                                                           |
                                       +--enhances hook with                                       +--enhances save-findings
                                         STATE.md parsing                                            on phase transition

[Save-findings] --feeds--> [Load-context & GSD context hook]
    (saved memories become retrievable context in future sessions)

[GSD context hook] --conflicts-with--> [Hook on every prompt]
    (mutually exclusive designs; scoped wins)
```

### Dependency Notes

- **Bootstrap MUST come first:** Every other feature depends on GSD and Forgetful being installed and configured. This is the hard prerequisite.
- **Doctor validates bootstrap:** Should be extended immediately after bootstrap. Catches configuration drift over time.
- **Update extends existing skill:** Additive change to existing `/tb:update` SKILL.md, not a new skill. Low risk.
- **Context hook must fail gracefully:** If Forgetful MCP is down, hook exits 0 with no output. Never blocks prompts. Per official docs, non-zero exit (except 2) is logged but doesn't block.
- **Save-findings feeds future queries:** The memory ecosystem only becomes valuable after artifacts are saved. Should be usable early even before hook is polished.
- **Load-context and GSD hook are independent:** Manual vs automatic, both query Forgetful. Can be built in parallel.

## MVP Definition

### Launch With (v1.1)

- [ ] **Bootstrap skill** -- Install/configure GSD, Forgetful MCP, forgetful-plugin. Idempotent. Gates everything else.
- [ ] **Doctor checks** -- `dep-gsd.sh` and `dep-forgetful.sh` following `scripts/checks/*.sh` pattern. Binary pass/fail.
- [ ] **Update integration** -- Extend `/tb:update` to pull GSD and update forgetful-plugin. Minimal change.
- [ ] **GSD context hook** -- UserPromptSubmit detecting `/gsd:*`, querying Forgetful with project scope, injecting via `additionalContext`. Core value proposition.
- [ ] **Load-context skill** -- Manual `/tb:load-context <query>` for ad-hoc Forgetful memory retrieval.
- [ ] **Save-findings skill** -- Extract atomic memories from GSD SUMMARY.md files with dedup, tagging, and user confirmation.

### Add After Validation (v1.x)

- [ ] **Smart context scoping** -- Use STATE.md to auto-scope Forgetful queries by project/milestone/phase. Add after confirming generic queries return too much noise.
- [ ] **Automatic obsolescence marking** -- Mark memories obsolete on phase transition. Add after enough memories exist to have candidates.
- [ ] **Pre-compaction save** -- PreCompact hook to preserve working context. Add after experiencing context loss in real GSD sessions.
- [ ] **SessionStart pre-warm** -- Async Forgetful warm to reduce cold-start latency. Add after measuring actual impact.

### Future Consideration (v2+)

- [ ] **Token-budget tuning** -- Tune Forgetful token budgets per GSD command type. Defer until usage patterns emerge.
- [ ] **Cross-project memory linking** -- Query memories from other projects when starting similar work. Defer until multiple projects have findings saved.
- [ ] **Batch SUMMARY extraction** -- Process all phase SUMMARYs in one command. Defer until per-phase save-findings proves the pattern.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bootstrap skill | HIGH | MEDIUM | P1 |
| Doctor checks (dep-gsd, dep-forgetful) | MEDIUM | LOW | P1 |
| Update integration | MEDIUM | LOW | P1 |
| GSD context hook (UserPromptSubmit) | HIGH | HIGH | P1 |
| Load-context skill | MEDIUM | MEDIUM | P1 |
| Save-findings skill | HIGH | MEDIUM-HIGH | P1 |
| Smart context scoping | MEDIUM | MEDIUM | P2 |
| Automatic obsolescence marking | MEDIUM | MEDIUM | P2 |
| Pre-compaction save | LOW | MEDIUM | P3 |
| SessionStart pre-warm | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v1.1 launch -- validates the integration concept
- P2: Should have after core proves out -- improves memory quality
- P3: Nice to have -- refinements based on real usage

## Ecosystem Comparison

How similar plugins handle these features, informing our design decisions.

| Feature | forgetful-plugin | claude-mem | memory-store-plugin | tb v1.1 approach |
|---------|-----------------|------------|---------------------|------------------|
| **Setup** | `/forgetful-setup` writes MCP config to `~/.claude.json`. Zero-config SQLite default. | Auto-install via SessionStart pre-hook (bun, uv, chroma). Heavy deps. | OAuth 2.1 via marketplace install. Cloud-hosted. | `/tb:bootstrap` -- installs GSD + Forgetful + forgetful-plugin + registers hooks. Heaviest setup but one command. |
| **Context injection** | Manual via `/memory-search` | Automatic via UserPromptSubmit + SessionStart (progressive disclosure -- compact summaries first, details on demand) | Automatic via SessionStart + PreToolUse (queue-based producer-consumer) | Automatic via UserPromptSubmit scoped to `/gsd:*` only + manual `/tb:load-context`. Best of both: automatic where it matters, manual elsewhere. |
| **Memory save** | `/memory-save` with curation workflow + atomic memory principles | Automatic capture of ALL tool observations, compressed via Claude agent-sdk | Automatic via queue (`.memory-queue.jsonl`), every PostToolUse fires | Manual `/tb:save-findings` from curated GSD SUMMARY artifacts. Quality over quantity. |
| **Memory lifecycle** | Manual via curating-memories skill. Creator acknowledges automated lifecycle as future work. | Compression + AI summarization. No explicit obsolescence. | Session-based checkpoints every 10 file changes. No obsolescence. | Phase-aware: save on completion, mark obsolete on transition. Only plugin with structured lifecycle management. |
| **Dependency mgmt** | `uvx forgetful-ai` (zero-config) | Auto-installs bun, uv, chroma via pre-hooks (complex) | OAuth 2.1 managed by marketplace | Doctor checks (`scripts/checks/*.sh`) + bootstrap handles all deps. Proven pattern from v1.0. |
| **Health checks** | None built-in | Pre-hook dependency checking (pass/fail) | None built-in | Modular `scripts/checks/*.sh` with PASS/FAIL/WARN + fix hints. Most mature pattern. |

## Sources

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- Official hooks documentation (HIGH confidence). UserPromptSubmit has no matcher support, fires on ALL prompts. additionalContext injection via hookSpecificOutput JSON. Exit 0 for proceed, exit 2 for block.
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest, hooks.json, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` for persistent deps. SessionStart hook pattern for dependency management (HIGH confidence).
- [Forgetful MCP Introduction](https://dev.to/scott_raisbeck_24ea5fbc1e/introducing-forgetful-shared-knowledge-and-memory-across-agents-40o6) -- Architecture, Zettelkasten principles, 38 tools via 3 meta-tools, token budget management, cross-encoder reranking, auto-linking at 0.7 similarity threshold (MEDIUM confidence -- single source, verified against repo).
- [forgetful-plugin on GitHub](https://github.com/ScottRBK/forgetful-plugin) -- Commands (`/forgetful-setup`, `/memory-search`, `/memory-save`, `/memory-list`, `/memory-explore`, `/encode-repo`), skills, setup flow (MEDIUM confidence).
- [claude-mem on GitHub](https://github.com/thedotmack/claude-mem) -- 5 lifecycle hooks (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd), progressive disclosure pattern, SQLite + Chroma + FTS5, compression via agent-sdk (MEDIUM confidence).
- [memory-store-plugin on GitHub](https://github.com/julep-ai/memory-store-plugin) -- Queue-based producer-consumer capture, SessionStart/PreToolUse/SessionEnd hooks, auto-checkpoints, cloud-hosted MCP (MEDIUM confidence).
- [claude-bootstrap on GitHub](https://github.com/alinaqi/claude-bootstrap) -- Environment setup pattern, tool detection, Stop hooks for TDD, 57 skills, PreCompact hook for context preservation (MEDIUM confidence).
- [UserPromptSubmit Issue #27365](https://github.com/anthropics/claude-code/issues/27365) -- Confirms no `updatedPrompt` support; can only inject additionalContext (HIGH confidence -- official GitHub issue).
- [UserPromptSubmit Issue #17804](https://github.com/anthropics/claude-code/issues/17804) -- False positive prompt injection detection risk when hooks inject large context blocks (MEDIUM confidence -- reported issue, may be resolved).

---
*Feature research for: tb plugin v1.1 -- GSD & Forgetful Integration*
*Researched: 2026-03-28*
