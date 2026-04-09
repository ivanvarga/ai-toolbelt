# Phase 22: Auto-inject Forgetful Context - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

UserPromptSubmit hook that queries Forgetful on every user prompt and injects relevant project memories as `additionalContext`. Makes project memory ambient rather than opt-in. Skips GSD and load-context prompts to avoid duplication with targeted context scripts.

</domain>

<decisions>
## Implementation Decisions

### Trivial prompt filtering
- **D-01:** Skip Forgetful queries for short/trivial prompts to avoid wasting ~400ms on throwaway input
- **D-02:** Detection uses length threshold (under ~20 chars) AND a pattern list of common continuation phrases (yes, no, ok, continue, do it, go ahead, sounds good, etc.)

### Hook registration strategy
- **D-03:** Register UserPromptSubmit hook in plugin `hooks/hooks.json` first (self-contained, survives plugin updates automatically)
- **D-04:** Verify output capture after install by asking Claude what context it received
- **D-05:** If bug #12151 causes output to be silently discarded, bootstrap skill auto-registers the hook in `~/.claude/settings.json` as fallback (seamless, no manual intervention)

### Failure visibility
- **D-06:** First Forgetful failure in a session delivers a one-time notice ("Forgetful unreachable — auto-context disabled for this session"). Subsequent failures are completely silent.
- **D-07:** Notification mechanism is Claude's discretion (additionalContext message vs stderr)

### Project ID caching
- **D-08:** Session-scoped project ID cache included in v1.2. Cache resolved project ID to temp file keyed by repo name. Saves ~100ms per prompt after first resolution.
- **D-09:** Cache invalidation strategy is Claude's discretion (TTL-based or session-scoped)

### Claude's Discretion
- Notification mechanism for one-time Forgetful failure notice (D-07)
- Cache invalidation strategy for project ID cache (D-09)
- Exact trivial prompt pattern list composition
- Output formatting details within established XML tag convention

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Research already established the conventions: `<forgetful_context>` XML tags, 300-char snippets, title + importance format matching existing gsd-context scripts.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Hook infrastructure
- `.planning/research/ARCHITECTURE.md` — Component layout, data flow diagrams, hook registration patterns, anti-patterns
- `.planning/research/STACK.md` — Node.js rationale, stdin/stdout contract, hooks.json config, performance budget
- `.planning/research/PITFALLS.md` — Bug #12151 (output capture), #34713 (false error labels), latency tax, failure modes, "looks done but isn't" checklist

### Feature design
- `.planning/research/FEATURES.md` — MVP definition, feature dependencies, ecosystem comparison, anti-features to avoid
- `.planning/REQUIREMENTS.md` — CTXI-01 through CTXI-07, HOOK-01 through HOOK-03

### Existing code (reuse patterns)
- `scripts/forgetful-client.js` — MCP HTTP client module (resolveForgetfulUrl, createSession, callTool, healthCheck)
- `scripts/gsd-project-context.js` — Reference implementation for project resolution, memory querying, output formatting
- `hooks/hooks.json` — Existing SessionStart + SubagentStop hook registration patterns
- `hooks/session-start.sh` — Reference for hookSpecificOutput.additionalContext JSON output format
- `scripts/checks/forgetful-mcp.sh` — Existing Forgetful connectivity doctor check

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/forgetful-client.js`: MCP HTTP client with `resolveForgetfulUrl()`, `createSession()`, `callTool()`, `healthCheck()` — direct require() reuse
- `scripts/gsd-project-context.js`: `extractRepoName()`, `parseMemories()`, `resolveProjectId()` — copy these patterns
- `hooks/session-start.sh`: `hookSpecificOutput.additionalContext` JSON output pattern — follow for hook output

### Established Patterns
- `main().catch(() => process.exit(0))` — graceful failure convention across all forgetful scripts
- `execute_forgetful_tool` wrapper for all Forgetful tool calls (not direct tool invocation)
- 300-char content snippets with title + importance score — consistent across gsd-context scripts
- `<forgetful_*_context>` XML tag convention for injected context blocks

### Integration Points
- `hooks/hooks.json` — new UserPromptSubmit entry alongside existing SessionStart and SubagentStop
- `~/.claude/settings.json` — fallback registration point if plugin hooks.json output capture fails
- `skills/bootstrap/SKILL.md` — needs extension for settings.json fallback auto-registration
- `scripts/checks/` — needs new check for UserPromptSubmit hook registration

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-auto-inject-forgetful-context-on-every-prompt*
*Context gathered: 2026-04-09*
