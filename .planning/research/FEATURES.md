# Feature Research

**Domain:** Auto-inject context systems -- UserPromptSubmit hook for transparent Forgetful memory injection on every prompt
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH (hook API verified against official docs, patterns verified across multiple plugins, Forgetful client API verified from existing codebase usage)

## Feature Landscape

### Table Stakes (Users Expect These)

Features required for auto-inject to deliver value. Missing any = feature is broken or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Similarity search on user prompt text | The whole point: user types something, relevant memories appear in Claude's context automatically. Every comparable system (memsearch ccplugin, claude-mem) does this. | LOW | Already have `forgetful-client.js` with `callTool` for `query_memory`. Pass `prompt` field from stdin JSON as query. Use existing `parseMemories` pattern from gsd-*-context.js scripts. |
| Project scoping via git remote | Unscoped queries return noise from all projects. Every existing gsd-context script already resolves project ID from git remote. User expects memories from the current repo, not global. | LOW | Direct reuse of `extractRepoName()` + `resolveProjectId()` from existing scripts. Already proven in 4 scripts. Graceful fallback: no project ID = skip injection (not unscoped query). |
| Graceful failure (silent exit 0) | Auto-inject must never block the user. If Forgetful is unreachable, embedding fails, or no results: exit silently. Claude-mem, memsearch, and our own gsd-context scripts all follow this pattern. | LOW | Wrap entire main() in `.catch(() => process.exit(0))` like existing scripts. Exit 0 with empty stdout = no additionalContext injected. |
| Sub-3-second latency | UserPromptSubmit is synchronous by default -- it blocks Claude from processing until hook completes. Every prompt pays this cost. claude-mem targets <1s for hooks. External API calls create "workflow friction" per practitioners. | MEDIUM | MCP session creation + tool call = 2 round trips. Existing `forgetful-client.js` has 5s default timeout + 10s tool timeout. Need tighter timeouts (2-3s total). Session reuse across calls within same invocation helps. |
| 10,000 char output limit compliance | Claude Code caps `additionalContext` at 10,000 characters. Exceeding this triggers file-save-and-preview behavior, adding noise. | LOW | Content snippets (300 chars each like existing scripts) x 5 memories = ~2,000 chars. Well within budget. But must enforce a hard cap regardless. |
| Output as structured additionalContext JSON | Claude Code expects `hookSpecificOutput.additionalContext` for clean context injection. Plain stdout also works but structured JSON is the established pattern from session-start.sh. | LOW | Follow same JSON output pattern as existing `session-start.sh`. Wrap in `<forgetful_auto_context>` XML tags matching existing convention (`<forgetful_project_context>`, `<forgetful_plan_context>`, etc). |

### Differentiators (Competitive Advantage)

Features that make auto-inject meaningfully better than "dump top-K results into context."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Importance threshold filtering | Forgetful memories have importance scores (1-10). Low-importance memories are noise. Existing `/tb:load-context` uses `importance_threshold: 7`. Injecting only high-importance memories = signal over noise. | LOW | Pass `importance_threshold: 7` to `query_memory` (already supported by Forgetful API, already used in load-context skill). Adjustable later based on experience. |
| Compact snippet format with memory count | User should know context was injected and roughly what it contains. claude-mem shows "[memsearch] Memory available". Our gsd-context scripts show "Relevant memories from Forgetful (N found)". Show count + compact snippets so user can judge relevance. | LOW | Follow existing gsd-context output format: title + importance + 300-char snippet per memory. Prefix with count. Matches established convention. |
| Low-K retrieval (3-5 not 15) | Load-context queries k=15 for interactive browsing. Auto-inject should be lean: k=3-5 retrieves enough signal without overwhelming Claude's context. memsearch ccplugin injects top-3. RAG best practice: cap context size to reduce hallucination from irrelevant retrieval. | LOW | Use `k: 5` matching gsd-project-context.js pattern. Combined with importance_threshold, typically yields 2-4 useful results. |
| No-results silence | When Forgetful returns zero relevant memories, inject nothing. No "0 memories found" message, no empty XML tags. Silence = no noise. | LOW | Check `memories.length === 0` then `process.exit(0)` like existing scripts. |
| Deduplication with GSD context hooks | If user runs `/gsd:plan-phase`, both the UserPromptSubmit auto-inject AND the GSD patch's `gsd-plan-context.js` will fire. These could inject duplicate memories. | MEDIUM | Two approaches: (1) don't auto-inject when prompt starts with `/gsd:` since GSD patches already inject targeted context, or (2) accept minor duplication as harmless. Option 1 is cleaner -- check prompt prefix and early-exit for `/gsd:*` and `/tb:load-context` prompts. |
| Session caching for project ID resolution | Resolving project ID requires `list_projects` API call on every prompt. This is wasted when the user stays in the same repo. | MEDIUM | Cache project ID to a temp file keyed by repo name + session. Read cache before API call. Invalidate on session start. Saves ~500ms per prompt after first resolution. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Inject on every prompt including `/gsd:*` commands | "Consistency -- always have context" | GSD workflow patches already inject purpose-built context at each decision point (project context for new-project, plan context for plan-phase, decision context for discuss-phase). Auto-inject would add redundant, less-targeted memories. Duplicate memories waste context tokens. | Skip auto-inject when prompt matches `/gsd:*` or `/tb:load-context`. Let specialized scripts handle those flows. |
| Full memory content instead of snippets | "Give Claude everything so it decides what's relevant" | RAG research is clear: dumping full documents degrades generation quality. Irrelevant context confuses LLMs and triggers hallucinations. 10,000 char limit makes full content impractical for multiple memories anyway. | 300-char snippets with title and importance. Claude can request full content via `/tb:load-context` if a snippet is relevant. Progressive disclosure. |
| Dynamic similarity threshold tuning | "Automatically adjust threshold based on query complexity" | Over-engineering for a personal tool. Threshold tuning requires evaluation datasets and precision/recall measurement. Research shows thresholds are domain-specific with no universal optimal value. | Fixed `importance_threshold: 7` matching existing load-context. Adjust manually if results are consistently too noisy or too sparse. |
| Async hook execution for zero-latency | "Don't block the user at all" | Async UserPromptSubmit hooks cannot inject additionalContext -- async output only arrives on the NEXT turn, not the current one. The whole point is to enrich the current prompt, which requires synchronous execution. | Synchronous with tight timeout (2-3s). Optimize the hot path: session caching, low-K retrieval, compact output. If Forgetful is slow, timeout and inject nothing rather than block. |
| User-configurable toggle to enable/disable | "Let me turn it off when I don't need it" | Adds configuration surface to a personal toolkit. The hook already has natural "off" behavior: no Forgetful configured = no injection, no project found = no injection, no results = no injection. | If injection becomes annoying, remove the hook from hooks.json. No runtime toggle needed for a single-user tool. |
| Re-ranking or cross-encoder scoring client-side | "Better relevance filtering before injection" | Forgetful already uses cross-encoder reranking server-side. Adding client-side re-ranking duplicates work, adds latency, and requires additional dependencies. | Trust Forgetful's server-side reranking. Use importance_threshold + low-K to control quality. |

## Feature Dependencies

```
[Existing: forgetful-client.js]
    |--provides--> [createSession, callTool, resolveForgetfulUrl]
    |
    v
[Auto-inject hook script]
    |--reuses--> [extractRepoName pattern from gsd-*-context.js]
    |--reuses--> [resolveProjectId pattern from gsd-*-context.js]
    |--reuses--> [parseMemories pattern from gsd-*-context.js]
    |--outputs--> [additionalContext JSON like session-start.sh]
    |
    +--requires--> [Forgetful MCP configured in ~/.claude.json]
    +--requires--> [hooks.json updated with UserPromptSubmit entry]
    |
    v
[bin/ wrapper script]
    |--wraps--> [Auto-inject hook script in scripts/]
    |--pattern from--> [bin/curate-discoveries, bin/forgetful-client]

[Auto-inject hook] --conflicts-with--> [GSD context hooks on /gsd:* prompts]
    (resolved by: skip auto-inject when prompt matches /gsd:* or /tb:load-context)

[Auto-inject hook] --enhances--> [/tb:load-context skill]
    (auto-inject provides ambient context; load-context provides deep, interactive exploration)
```

### Dependency Notes

- **forgetful-client.js is the foundation:** All API communication reuses existing HTTP client. No new dependencies needed.
- **gsd-context scripts provide proven patterns:** extractRepoName, resolveProjectId, parseMemories, output formatting -- all battle-tested across 4 scripts. Copy the patterns, don't abstract prematurely.
- **hooks.json needs a new UserPromptSubmit entry:** This is the only configuration change. No matcher needed (UserPromptSubmit ignores matchers).
- **bin/ wrapper follows established pattern:** Every script in scripts/ has a corresponding bin/ wrapper for PATH-based invocation.
- **Skip-on-GSD-prompt prevents duplication:** The hook should detect `/gsd:*` and `/tb:load-context` prefixes in the prompt and exit 0 immediately, deferring to specialized context scripts.

## MVP Definition

### Launch With (v1.2)

- [ ] **Auto-inject hook script** -- Node.js script in scripts/ that reads stdin for prompt, queries Forgetful with project scope + importance threshold, outputs additionalContext JSON. Exits 0 silently on any failure.
- [ ] **hooks.json UserPromptSubmit entry** -- Register the hook to fire on every prompt submission. Synchronous (not async) with ~10s timeout.
- [ ] **bin/ wrapper** -- PATH-accessible wrapper following existing bin/* pattern.
- [ ] **GSD prompt skip logic** -- Early exit when prompt starts with `/gsd:` or `/tb:load-context` to avoid duplication with existing targeted context injection.
- [ ] **Doctor check for hook registration** -- Verify UserPromptSubmit hook is registered in hooks.json. Extend existing checks.

### Add After Validation (v1.x)

- [ ] **Session-scoped project ID cache** -- Cache resolved project ID to temp file. Add after confirming latency is a real problem (may not be -- Forgetful is local).
- [ ] **Tuned importance threshold** -- Adjust from 7 based on real-world experience with auto-injected results.
- [ ] **Prompt-aware query context** -- Pass brief summary of prompt intent as `query_context` to improve Forgetful's cross-encoder reranking.

### Future Consideration (v2+)

- [ ] **Multi-query retrieval** -- Run parallel queries (like gsd-plan-context.js does with implementation + stack queries) for broader coverage. Defer until single query proves insufficient.
- [ ] **Token budget awareness** -- Check Claude Code context usage and reduce/skip injection when context is nearly full. Defer until context pressure is observed.
- [ ] **Cross-project memory injection** -- Query memories from related projects, not just current repo. Defer until multiple projects have rich memory stores.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auto-inject hook script | HIGH | LOW | P1 |
| hooks.json registration | HIGH | LOW | P1 |
| bin/ wrapper | MEDIUM | LOW | P1 |
| GSD prompt skip logic | HIGH | LOW | P1 |
| Graceful failure (silent exit 0) | HIGH | LOW | P1 |
| Importance threshold filtering | MEDIUM | LOW | P1 |
| Compact snippet format | MEDIUM | LOW | P1 |
| Doctor check for hook | LOW | LOW | P1 |
| Session-scoped project ID cache | MEDIUM | MEDIUM | P2 |
| Prompt-aware query_context | MEDIUM | LOW | P2 |
| Multi-query retrieval | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.2 launch -- the auto-inject feature itself and its safety rails
- P2: Should have after confirming auto-inject works -- performance and relevance improvements
- P3: Nice to have -- advanced retrieval strategies based on real usage patterns

## Ecosystem Comparison

How comparable auto-context injection systems work, informing our design.

| Aspect | memsearch ccplugin | claude-mem | Our approach (v1.2) |
|--------|-------------------|------------|---------------------|
| **Hook type** | UserPromptSubmit (sync) | UserPromptSubmit (sync) | UserPromptSubmit (sync) |
| **Retrieval** | Semantic search, top-3 | SQLite + FTS5, recent 50 observations | Forgetful query_memory, k=5, importance >= 7 |
| **Scope** | Project-scoped via config | Session-scoped (last 10 sessions) | Project-scoped via git remote (auto-detected) |
| **Output format** | additionalContext JSON + systemMessage hint | Progressive disclosure index (ID, Time, Title, Tokens) | additionalContext JSON with XML-tagged snippets (matches existing convention) |
| **Latency target** | Not documented | <1s for hooks | <3s total (2 API round trips) |
| **Failure mode** | Silent, logs warning | Graceful degradation, never blocks IDE | Silent exit 0, no output |
| **Noise control** | Top-3 cap | Selective capture (skips low-value tools) | importance_threshold + low-K + project scoping |
| **Duplication handling** | N/A (no competing hooks) | N/A | Skip on /gsd:* and /tb:load-context prompts |
| **Output limit** | Stays within 10K chars | Compact index format | 300-char snippets x 5 = ~2K chars max |

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- Official hooks documentation. UserPromptSubmit fires on all prompts (no matcher), receives prompt in stdin JSON, outputs additionalContext via hookSpecificOutput JSON, 10,000 char output cap, sync by default, exit 0 for allow, exit 2 for block. (HIGH confidence)
- [additionalContext duplicate injection bug #14281](https://github.com/anthropics/claude-code/issues/14281) -- Was a real bug in v2.0.x, confirmed fixed in v2.1. Not a current concern. (HIGH confidence)
- [memsearch ccplugin](https://github.com/zilliztech/memsearch/tree/main/ccplugin) -- Reference implementation: UserPromptSubmit fires semantic search, injects top-3 memories, returns systemMessage hint. (MEDIUM confidence)
- [claude-mem](https://github.com/thedotmack/claude-mem) -- Reference implementation: UserPromptSubmit captures prompts synchronously via HTTP POST, SessionStart injects last 10 session summaries. Progressive disclosure pattern. (MEDIUM confidence)
- [RAG relevance threshold best practices](https://meisinlee.medium.com/better-rag-retrieval-similarity-with-threshold-a6dbb535ef9e) -- Threshold adds quality check by filtering below minimum similarity. Reduces hallucination by capping context to signal-quality results. No universal optimal threshold -- domain-specific tuning required. (MEDIUM confidence)
- [LLM context problem 2026](https://blog.logrocket.com/llm-context-problem/) -- Context rot degrades model performance when context grows with poorly curated information. Relevance scoring (embedding similarity, recency, threshold filtering at 0.7+) is standard mitigation. (MEDIUM confidence)
- [cc-context-awareness plugin](https://github.com/sdi2200262/cc-context-awareness) -- Threshold-based context injection with configurable firing modes (once_per_tier, every_turn). Transparent pipe architecture for minimal overhead. (MEDIUM confidence)
- Existing codebase: `scripts/gsd-project-context.js`, `gsd-plan-context.js`, `gsd-discuss-context.js` -- Proven patterns for Forgetful querying, project resolution, memory parsing, and output formatting. (HIGH confidence -- our own code)
- Existing codebase: `scripts/forgetful-client.js` -- HTTP client with MCP Streamable protocol, session management, tool calling. All API communication reuses this. (HIGH confidence -- our own code)
- Existing codebase: `skills/load-context/SKILL.md` -- Uses `k: 15`, `importance_threshold: 7`, project scoping via git remote. Establishes the filtering parameters we should match. (HIGH confidence -- our own code)

---
*Feature research for: tb plugin v1.2 -- Auto-inject Forgetful context on every prompt*
*Researched: 2026-04-05*
