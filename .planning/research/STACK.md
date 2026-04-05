# Stack Research

**Domain:** Claude Code plugin -- auto-inject Forgetful context via UserPromptSubmit hook (v1.2)
**Researched:** 2026-04-05
**Confidence:** HIGH

This covers ONLY what's needed for the v1.2 auto-inject feature. The existing stack (Node.js forgetful-client, MCP Streamable HTTP, hook infrastructure, bin/ wrappers) is validated and reused as-is.

## Key Decision: Node.js Over Bash for the Hook Script

The v1.1 STACK.md recommended bash+curl+jq for hook scripts, citing "100ms Node.js startup penalty." Live benchmarking on the target machine (2026-04-05) invalidates that recommendation for v1.2:

| Approach | Full round-trip (startup + MCP session + query_memory) | Startup alone |
|----------|-------------------------------------------------------|---------------|
| Node.js + native fetch | **405ms** | 23ms |
| bash + curl + jq | **518ms** | 2ms |

Node.js is 22% faster end-to-end because native `fetch()` handles HTTP connection setup more efficiently than spawning 3 separate curl processes. The 21ms startup difference is negligible against the ~380ms of network I/O.

**Recommendation: Use Node.js** for the UserPromptSubmit hook script because:
1. Reuses `forgetful-client.js` module directly (no code duplication)
2. Reuses `resolveForgetfulUrl()`, `createSession()`, `callTool()`, `parseMemories()` helpers already proven in 4 scripts
3. Actually faster end-to-end than bash+curl
4. Consistent error handling with existing scripts (`.catch(() => process.exit(0))` pattern)
5. JSON parsing is native -- no jq dependency for this path

## Recommended Stack

### Core Technologies (All Existing -- No New Dependencies)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.12.0 (installed) | Hook script runtime | Native fetch, zero-dependency HTTP client, 23ms startup. Already the runtime for all forgetful scripts. |
| forgetful-client.js | existing module | MCP session + tool dispatch | Proven in 4 scripts (gsd-project-context, gsd-discuss-context, gsd-plan-context, gsd-milestone-save). Exports `resolveForgetfulUrl`, `createSession`, `callTool`. |
| Claude Code hooks.json | plugin format | Hook registration | Existing infrastructure. Add UserPromptSubmit entry alongside existing SessionStart and SubagentStop. |

### Hook Input/Output Contract (Verified Against Official Docs)

**Stdin (received by hook script):**

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/dir",
  "permission_mode": "default",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "the user's prompt text"
}
```

Field name is `prompt` (not `user_prompt`). Verified at [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks).

**Stdout (context injection):**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "injected context string (max 10,000 chars)"
  }
}
```

Output via `additionalContext` is injected discretely (not shown as transcript hook output). Plain text stdout also works but is visible in transcript. Use `additionalContext` for cleaner UX.

**Exit codes:** 0 = success (stdout parsed for context), 2 = block prompt (stderr shown to user), other = non-blocking error (ignored).

**Character limit:** 10,000 characters for `additionalContext`. Output exceeding this is saved to a file and replaced with a preview + file path. Budget accordingly: ~5 memories at ~300 chars each = 1,500 chars well within limit.

### Hook Configuration

**UserPromptSubmit does NOT support matchers** -- it fires on every prompt submission. This is exactly what we want for auto-inject: every prompt gets context.

**timeout default:** 600 seconds for command hooks. Override to something sane like 5-10 seconds. If Forgetful is down, fail fast.

**async behavior:** Setting `async: true` on UserPromptSubmit runs the hook in background but the context injection happens after Claude already starts processing. For context injection, the hook MUST be synchronous (async: false or omitted) so Claude sees the memories before generating a response.

### Forgetful Query Strategy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Tool | `query_memory` via `execute_forgetful_tool` | Same dispatcher pattern used by all existing scripts |
| k | 5 | Balance between context volume and relevance. Matches gsd-project-context.js and gsd-discuss-context.js. |
| importance_threshold | None (filter client-side) | Let Forgetful return by relevance; filter in script for flexibility |
| project_ids | [resolved from git remote] | Scope to current project. Same `resolveProjectId()` pattern from existing scripts. |
| include_links | false | Links add volume but marginal value for auto-inject. Save budget for primary memories. |
| query text | User's prompt verbatim | No preprocessing. The user's natural language prompt IS the best similarity search query. |
| query_context | "auto-inject: relevant project context" | Brief, identifies the source for Forgetful analytics. |

### Output Format for Injected Context

```xml
<forgetful_context>
Relevant memories from Forgetful ({N} found):

- **{title}** (importance: {score}): {content snippet, 300 chars}...
- **{title}** (importance: {score}): {content snippet, 300 chars}...
</forgetful_context>
```

This matches the exact format used by `gsd-project-context.js` and `gsd-discuss-context.js`. Consistency means Claude already knows how to interpret these blocks from the GSD workflow patches.

### Performance Budget

| Phase | Time | Notes |
|-------|------|-------|
| Node.js startup + module load | ~23ms | Measured: `node -e "require('./forgetful-client.js')"` |
| Read stdin (parse prompt) | ~1ms | `JSON.parse` of small object |
| resolveForgetfulUrl() | ~1ms | Reads `~/.claude.json`, cached by OS filesystem |
| createSession() | ~100ms | HTTP POST to Forgetful for MCP initialize + notification |
| resolveProjectId() | ~100ms | HTTP POST for list_projects tool call |
| callTool(query_memory) | ~150ms | HTTP POST for similarity search |
| Format + write stdout | ~1ms | String concatenation + JSON.stringify |
| **Total** | **~400ms** | Acceptable for synchronous hook on every prompt |

400ms is well within the 600s default timeout. User perception: minimal delay before Claude starts responding.

### Session Creation Optimization

Each hook invocation creates a new MCP session (initialize + initialized notification = 2 HTTP round-trips before the actual tool call). This is inherent to the MCP Streamable HTTP protocol -- sessions cannot be reused across process invocations.

**Optimization options considered:**

| Option | Verdict | Why |
|--------|---------|-----|
| Cache session ID in temp file | Reject | MCP sessions may expire server-side; stale session = silent failure. Complexity not worth 100ms. |
| Long-running daemon with session pool | Reject | Massive over-engineering. Introduces process management, IPC, failure modes. |
| Batch project resolution + query in one session | **Use** | Already the pattern: create session once, make multiple calls. resolveProjectId + query_memory reuse the same session. |
| Skip initialized notification | Reject | Protocol violation. Some servers require it. |

**Recommendation:** Keep the existing pattern -- one session per invocation, batch calls within it. The 100ms session overhead is acceptable given the 400ms total budget.

## Supporting Libraries

None. Zero new dependencies needed.

| Library | Status | Notes |
|---------|--------|-------|
| forgetful-client.js | Existing | Reuse as CommonJS require() |
| jq | Not needed | Node.js handles all JSON natively |
| curl | Not needed | Node.js native fetch is faster |

## Installation

```bash
# Nothing to install. All dependencies already exist.
# The hook script uses only:
#   - Node.js built-ins (fs, path, child_process)
#   - scripts/forgetful-client.js (existing module)
```

## New Files to Create

| File | Purpose | Pattern Source |
|------|---------|---------------|
| `hooks/user-prompt-context.js` | UserPromptSubmit hook script | Follows `gsd-project-context.js` structure |
| (modify) `hooks/hooks.json` | Add UserPromptSubmit entry | Existing SessionStart + SubagentStop entries |

No new bin/ wrapper needed -- the hook is invoked directly by Claude Code via hooks.json, not by users.

## hooks.json Addition

```json
{
  "hooks": {
    "SessionStart": [ ... ],
    "SubagentStop": [ ... ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/user-prompt-context.js",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Key decisions:**
- `timeout: 10` -- 10 seconds max. Normal execution is ~400ms. 10s covers slow network. If Forgetful is truly down, the script catches errors and exits 0 with no output (graceful no-op).
- No `async: true` -- must be synchronous so context is available before Claude processes the prompt.
- No matcher -- UserPromptSubmit doesn't support matchers (fires on all prompts). This is desired behavior.

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Node.js hook script | bash + curl + jq | Node.js is 22% faster end-to-end (405ms vs 518ms measured). Reuses existing forgetful-client.js. No code duplication. |
| Synchronous hook | async: true | Context must be available BEFORE Claude processes the prompt. Async injection would arrive too late. |
| query_memory with user prompt as query | Keyword extraction / NLP preprocessing | Over-engineering. Similarity search already handles natural language well. The user's prompt IS the query. |
| additionalContext JSON output | Plain text stdout | additionalContext is injected discretely. Plain text shows as hook output in transcript, adding visual noise on every prompt. |
| 10s timeout | Default 600s | Fail fast. If Forgetful is unreachable after 10s, don't make the user wait 10 minutes. |
| Filter client-side (importance >= 7) | Pass importance_threshold to Forgetful | Client-side filtering is more flexible and allows adjusting threshold without changing the API call. |
| k=5 results | k=10 or k=3 | 5 is the sweet spot: enough context to be useful, fits well within 10,000 char limit, matches existing scripts. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| bash + curl for the hook | Slower than Node.js, duplicates forgetful-client.js logic | Node.js with require('./forgetful-client') |
| New npm packages | Zero-dependency project; adding packages requires package.json, node_modules, install step | Native Node.js APIs only |
| MCP session caching/pooling | Over-engineering for 100ms savings, introduces stale session bugs | Fresh session per invocation |
| prompt-type hook | Prompt hooks use an LLM call to generate context -- adds latency + token cost on every prompt | command-type hook with deterministic logic |
| Preprocessing/filtering the user prompt | Removing "noise words" etc. harms similarity search more than it helps | Pass prompt verbatim as query |
| include_links: true | Linked memories add volume but low marginal value for auto-context. Eats into 10k char budget. | include_links: false |
| async: true for UserPromptSubmit | Context arrives after Claude starts processing -- defeats the purpose | Synchronous (default) |

## Graceful Degradation Pattern

The hook MUST never block the user or cause errors. Pattern from existing scripts:

```javascript
main().catch(() => process.exit(0));
```

Every failure path exits cleanly with no output. Claude Code interprets this as "hook succeeded with nothing to inject" and proceeds normally. This covers:
- Forgetful not configured (`resolveForgetfulUrl()` returns null)
- Forgetful unreachable (network timeout)
- No git remote (not a git repo)
- No matching project in Forgetful
- Zero relevant memories returned
- Malformed responses from Forgetful

## Version Compatibility

| Component | Required | Current | Notes |
|-----------|----------|---------|-------|
| Node.js | 18+ (native fetch) | 24.12.0 | Native fetch available since Node 18 |
| Claude Code hooks | UserPromptSubmit support | Current | Supported since Dec 2024, bug fixes through Feb 2026 |
| forgetful-client.js | existing | existing | No changes needed to the module |
| Forgetful MCP | 3.x | 3.1.1 | MCP protocol 2025-03-26 |
| hooks.json | plugin format | existing | Add new event entry, no schema changes |

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- UserPromptSubmit stdin/stdout format, timeout defaults, character limits (HIGH confidence, verified 2026-04-05)
- [Claude Code Hook Development Skill](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) -- Best practices, timeout recommendations (HIGH confidence)
- [MCP Transports Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) -- Streamable HTTP session lifecycle (HIGH confidence)
- Live benchmarks on target machine -- Node.js vs bash+curl round-trip times (HIGH confidence, measured 2026-04-05)
- Existing codebase: `scripts/forgetful-client.js`, `scripts/gsd-project-context.js`, `scripts/gsd-discuss-context.js`, `scripts/gsd-plan-context.js` -- Proven patterns for MCP queries (HIGH confidence)
- `hooks/hooks.json` + `hooks/session-start.sh` -- Existing hook infrastructure patterns (HIGH confidence)

---
*Stack research for: tb plugin v1.2 -- auto-inject Forgetful context*
*Researched: 2026-04-05*
