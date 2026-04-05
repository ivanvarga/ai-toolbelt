# Architecture Research

**Domain:** Claude Code plugin -- auto-inject Forgetful context via UserPromptSubmit hook (v1.2)
**Researched:** 2026-04-05
**Confidence:** HIGH

Focuses on how the auto-inject feature integrates into the existing tb plugin. The existing v1.0/v1.1 architecture (skills/, hooks/, scripts/, tools/, bin/) is unchanged except where noted.

## System Overview

```
EXISTING (unchanged)                         NEW / MODIFIED
============================                 ============================

hooks/
  hooks.json  [SessionStart, SubagentStop]     hooks.json  [+ UserPromptSubmit entry]
  session-start.sh                             user-prompt-context.js  [NEW]

scripts/
  forgetful-client.js  [existing module]       (no changes -- reused as-is)
  gsd-discuss-context.js                       (unchanged -- runs via GSD patches)
  gsd-plan-context.js                          (unchanged -- runs via GSD patches)
  gsd-project-context.js                       (unchanged -- runs via GSD patches)
  gsd-milestone-save.js                        (unchanged)
  checks/
    forgetful-mcp.sh                           (unchanged)
    [other checks]

bin/
  curate-discoveries                           (unchanged)
  forgetful-client                             (unchanged)
  [other wrappers]

skills/
  load-context/SKILL.md                        (unchanged -- manual query alternative)
  [18 other skills]                            (unchanged)
```

Total new files: 1 (hook script). Total modified files: 1 (hooks.json).

## Component Responsibilities

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `hooks/user-prompt-context.js` | NEW | UserPromptSubmit hook: read stdin JSON, skip GSD/tb:load-context prompts, query Forgetful, emit additionalContext |
| `hooks/hooks.json` | MODIFY | Add UserPromptSubmit entry pointing to new hook script |
| `scripts/forgetful-client.js` | REUSE | MCP session creation, tool dispatch, URL resolution, SSE parsing |
| `scripts/gsd-*-context.js` | UNCHANGED | GSD-specific context injection via workflow patches (separate execution path) |
| `bin/curate-discoveries` | UNCHANGED | SubagentStop hook for research auto-curation (separate execution path) |
| `skills/load-context/SKILL.md` | UNCHANGED | Interactive manual memory browsing (complementary feature) |

## Recommended Project Structure

No new directories. One new file placed in `hooks/` next to existing hook scripts.

```
hooks/
  hooks.json                # MODIFIED: add UserPromptSubmit entry
  session-start.sh          # EXISTING: SessionStart skill list injection
  user-prompt-context.js    # NEW: UserPromptSubmit auto-inject hook
```

### Structure Rationale

- **hooks/ not scripts/:** The file is a hook script invoked by Claude Code's hook system, not a standalone utility. It belongs alongside `session-start.sh` and the hooks.json that references it.
- **Named `user-prompt-context.js` not `gsd-context.js`:** V1.1 research planned `gsd-context.js` for GSD-scoped injection. V1.2 runs on every prompt (not just GSD). The name reflects its actual scope.
- **No bin/ wrapper needed:** The hook is invoked by Claude Code via hooks.json, not by users or other scripts. A PATH-accessible wrapper adds no value.

## Architectural Patterns

### Pattern 1: Plugin hooks.json Registration

**What:** Register the UserPromptSubmit entry in the plugin's `hooks/hooks.json` alongside existing SessionStart and SubagentStop entries.

**Rationale:** The v1.1 research (April 1) documented bug #12151 requiring settings.json registration. Since then, Claude Code v2.1.82 (March 25) fixed several plugin hook issues including "plugin hooks being silently dropped" and "plugin Stop/SessionEnd hooks not firing after /plugin operation." The existing SessionStart and SubagentStop hooks in hooks.json already work correctly including output capture. The hook should be attempted in hooks.json first -- if output is captured (verifiable by asking Claude what context it received), the bug is resolved for this case.

**Trade-offs:**
- PRO: Self-contained in the plugin. No settings.json modification. Survives plugin updates automatically. Simpler bootstrap.
- PRO: Uses `${CLAUDE_PLUGIN_ROOT}` path variable -- no absolute path management.
- CON: Risk that bug #12151 still affects UserPromptSubmit specifically (even if other hook types now work).
- FALLBACK: If plugin hooks.json doesn't capture output, move registration to `~/.claude/settings.json` using the v1.1 bootstrap approach.

**Verification protocol:** After first installation, run the hook and ask Claude "what additional context was injected from hooks?" If Claude reports Forgetful memories, plugin registration works. If not, fall back to settings.json.

**Configuration:**
```json
{
  "hooks": {
    "SessionStart": [ ... existing ... ],
    "SubagentStop": [ ... existing ... ],
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

### Pattern 2: Forgetful Client Module Reuse

**What:** The new hook imports `forgetful-client.js` via relative require, reusing the same MCP session creation, tool dispatch, and URL resolution that power four existing scripts.

**How it works:**
```javascript
const { resolveForgetfulUrl, createSession, callTool } = require('../scripts/forgetful-client');
```

**Proven in:** `gsd-discuss-context.js`, `gsd-plan-context.js`, `gsd-project-context.js`, `gsd-milestone-save.js`. All four follow identical patterns: resolve URL, create session, resolve project ID, call tool, parse memories.

**Trade-offs:**
- PRO: Zero code duplication. Battle-tested HTTP/SSE handling. Consistent error behavior.
- PRO: Any future improvements to the client (connection pooling, retry logic) benefit all consumers.
- CON: Tight coupling -- changes to forgetful-client.js signature could break the hook. Mitigated by the fact that all 4 existing consumers share the same interface and would break together.

### Pattern 3: Selective Skip for GSD and Load-Context Prompts

**What:** The hook checks the prompt prefix and exits immediately (no Forgetful query) when the prompt starts with `/gsd:` or `/tb:load-context`.

**Rationale:** GSD workflow patches already inject purpose-built context at each GSD decision point via dedicated scripts (gsd-plan-context.js injects implementation patterns + technology context; gsd-discuss-context.js injects prior decisions; gsd-project-context.js injects architecture patterns). These scripts run parallel queries with targeted `query_context` strings. The auto-inject hook would add redundant, less-targeted memories for these same prompts.

**Trade-offs:**
- PRO: Avoids duplicate memory injection. Saves context tokens.
- PRO: Specialized scripts provide better-quality context (targeted queries vs. generic prompt-as-query).
- CON: Adds conditional logic to the hook. If GSD patches are removed, these prompts lose auto-context.
- CON: Regex matching is imperfect (user could type `gsd:` without leading `/`).

**Implementation:**
```javascript
const prompt = data.prompt || '';
if (/^\/?gsd:|^\/?tb:load-context/i.test(prompt)) {
  process.exit(0);
}
```

### Pattern 4: Graceful No-Op on Every Failure Path

**What:** Every failure mode (no Forgetful URL, unreachable server, no git remote, no project, no results, malformed response) exits with code 0 and no output. Claude proceeds without injected context.

**Proven pattern:** All four existing gsd-*-context.js scripts use `main().catch(() => process.exit(0))`. The SubagentStop hook `curate-discoveries` uses the same pattern. This is a project convention.

**Why not exit 2:** Exit code 2 blocks and rejects the user's prompt. The hook should never prevent the user from working. Silent degradation is always preferable.

## Data Flow

### Primary Flow: User Prompt to Context Injection

```
User types any prompt (e.g., "Add pagination to the API endpoint")
    |
    v
Claude Code fires UserPromptSubmit (synchronous, blocks prompt processing)
    |
    v
hooks/user-prompt-context.js receives stdin JSON:
  {
    "session_id": "abc123",
    "prompt": "Add pagination to the API endpoint",
    "cwd": "/Users/ivarga/Projects/some-project",
    "hook_event_name": "UserPromptSubmit"
  }
    |
    v
Check prompt prefix:
  /gsd:* or /tb:load-context? --> exit 0 immediately (~1ms)
    |
    NO --> continue
    |
    v
resolveForgetfulUrl() -- read ~/.claude.json
    |
    null? --> exit 0 (Forgetful not configured)
    |
    URL found --> continue
    |
    v
Resolve repo identity: git remote get-url origin from cwd
    |
    fails? --> exit 0 (not a git repo, or no remote)
    |
    v
createSession(url) -- MCP initialize + initialized notification
    |
    fails? --> exit 0 (Forgetful unreachable)
    |
    v
callTool: list_projects({repo_name: "owner/repo"})
    |
    no project found? --> exit 0 (no Forgetful project for this repo)
    |
    v
callTool: query_memory({
    query: "Add pagination to the API endpoint",
    query_context: "auto-inject: relevant project context",
    k: 5,
    project_ids: [projectId],
    include_links: false
})
    |
    v
Parse response, filter importance >= 7, format output
    |
    0 memories after filter? --> exit 0 (nothing relevant)
    |
    v
Output to stdout:
  {
    "hookSpecificOutput": {
      "hookEventName": "UserPromptSubmit",
      "additionalContext": "<forgetful_context>\nRelevant memories (3 found):\n- **Title** (importance: 9): snippet...\n</forgetful_context>"
    }
  }
    |
    exit 0
    |
    v
Claude Code injects additionalContext into conversation (discrete, not shown in transcript)
    |
    v
Claude processes prompt with Forgetful memories available as context
```

### Skip Flow: GSD Commands (No Auto-Inject)

```
User types: /gsd:plan-phase "Add authentication"
    |
    v
UserPromptSubmit fires hook
    |
    v
Regex: /^\/?gsd:/ matches --> exit 0 immediately
    |
    v
SEPARATELY (via GSD workflow patches):
  GSD plan-phase invokes gsd-plan-context.js
    |
    v
  gsd-plan-context.js runs two parallel queries:
    - "Add authentication implementation patterns" (k=5, project-scoped)
    - "Add authentication technology and stack" (k=3, project-scoped)
    |
    v
  Deduplicated, formatted, injected into GSD workflow as <forgetful_plan_context>
```

### Parallel Execution Context

```
hooks/hooks.json registered hooks:

  SessionStart:        session-start.sh        (runs once at session start)
  SubagentStop:        curate-discoveries      (runs after gsd-phase-researcher)
  UserPromptSubmit:    user-prompt-context.js   (runs on every prompt)

These never conflict:
  - SessionStart fires only on startup/resume/clear/compact
  - SubagentStop fires only when a subagent completes
  - UserPromptSubmit fires on every prompt submission

Multiple hooks on the same event run in parallel,
but there is only one hook per event in this plugin.
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Forgetful MCP (HTTP) | JSON-RPC over Streamable HTTP | 3-step handshake per invocation. URL from `~/.claude.json`. ~400ms total round-trip measured. |
| Git (local) | `git remote get-url origin` via `execSync` | Used for repo identity. Already proven in 4 existing scripts. |

### Internal Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| Hook script -> forgetful-client.js | CommonJS require() | Import | Shared module, same as gsd-*-context.js scripts |
| Hook script -> Claude Code | stdout JSON | Output | hookSpecificOutput.additionalContext injected into conversation |
| Claude Code -> Hook script | stdin JSON | Input | prompt, cwd, session_id, hook_event_name |
| hooks.json -> Hook script | command field | Registration | `node ${CLAUDE_PLUGIN_ROOT}/hooks/user-prompt-context.js` |

### What Does NOT Change

| Component | Why Unchanged |
|-----------|---------------|
| `scripts/forgetful-client.js` | Reused as-is. No API changes needed. |
| `scripts/gsd-*-context.js` | Continue running via GSD workflow patches. Auto-inject skips these prompts. |
| `bin/curate-discoveries` | SubagentStop hook. Different event, different purpose. |
| `skills/load-context/SKILL.md` | Interactive manual query. Complementary to auto-inject. |
| `scripts/checks/*.sh` | Doctor checks already cover Forgetful connectivity. |
| `hooks/session-start.sh` | SessionStart skill list injection. Unrelated. |

## Anti-Patterns

### Anti-Pattern 1: Query on Every Prompt Without Skip Logic

**What people do:** Run full Forgetful similarity search on every single prompt including `/gsd:*` commands.
**Why it's wrong:** GSD workflow patches already inject targeted context via specialized scripts (plan-context, discuss-context, project-context). Auto-inject adds redundant, generic memories. Wastes context tokens and accelerates compaction.
**Do this instead:** Skip when prompt starts with `/gsd:` or `/tb:load-context`. Let specialized scripts handle those flows.

### Anti-Pattern 2: Plain Text stdout Instead of additionalContext JSON

**What people do:** Echo plain text to stdout for context injection.
**Why it's wrong:** Plain text stdout is shown as "hook output" in the transcript -- visible to the user on every prompt. Creates visual noise. The `additionalContext` field is injected discretely (not shown in transcript).
**Do this instead:** Use `hookSpecificOutput.additionalContext` JSON output.

### Anti-Pattern 3: Unbounded Memory Injection

**What people do:** Pass all Forgetful query results into context (up to 8K tokens).
**Why it's wrong:** Floods context window. Tangentially related memories confuse Claude. Accelerates compaction. 10,000 char `additionalContext` limit means large results get file-saved with preview, adding noise.
**Do this instead:** k=5, client-side importance >= 7 filter, 300-char snippets. Total output under 2,000 chars.

### Anti-Pattern 4: Creating a New Forgetful Client

**What people do:** Write a fresh HTTP client for the hook instead of reusing forgetful-client.js.
**Why it's wrong:** Duplicates MCP session handshake, SSE parsing, URL resolution. Creates maintenance burden when Forgetful protocol evolves.
**Do this instead:** `require('../scripts/forgetful-client')`. Same module, same interface, proven in 4 scripts.

### Anti-Pattern 5: Async UserPromptSubmit for Zero Latency

**What people do:** Set `async: true` on the hook to avoid blocking the user.
**Why it's wrong:** Async hook output is not available for the current prompt. Context arrives after Claude has already started processing. Defeats the purpose of auto-inject.
**Do this instead:** Synchronous (default). 400ms latency is imperceptible. Tight timeout (10s) prevents blocking when Forgetful is down.

## Key Architectural Decisions

### Q1: Plugin hooks.json or settings.json for Registration?

**Answer:** Try hooks.json first. Fall back to settings.json if output isn't captured.

**Evidence for hooks.json:**
- v2.1.82 (March 25, 2026) fixed "plugin hooks being silently dropped" and "plugin Stop/SessionEnd hooks not firing"
- The existing SessionStart hook in hooks.json works correctly, including output capture (skills list is injected)
- The SubagentStop hook in hooks.json works correctly (curate-discoveries runs and outputs results)
- Bug #12151 was filed against v2.0.50. Current version is 2.1.92 -- 42 minor versions later with extensive hook fixes

**Evidence against hooks.json:**
- Bug #12151 was never explicitly closed as "fixed" in the changelog
- Issue #14410 (local plugin hooks) was closed as "not planned"
- The specific combination of UserPromptSubmit + plugin hooks.json + output capture hasn't been verified on v2.1.92

**Decision:** Register in hooks.json. Verify output capture during implementation. If broken, fall back to settings.json registration via bootstrap skill (the v1.1 approach). This avoids the complexity of settings.json path management unless actually needed.

### Q2: What Triggers the Hook?

**Answer:** Every user prompt submission except `/gsd:*` and `/tb:load-context`.

UserPromptSubmit does not support matchers -- it fires on all prompts. The skip logic is implemented in the script itself via regex check on the prompt field.

### Q3: What Query Parameters for Forgetful?

**Answer:** Use the user's prompt verbatim as the query. No preprocessing.

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| query | user's prompt text | Natural language is the best similarity search query. No keyword extraction needed. |
| query_context | "auto-inject: relevant project context" | Identifies the query source for Forgetful analytics. |
| k | 5 | Matches gsd-project-context.js and gsd-discuss-context.js. Enough signal without overwhelming. |
| project_ids | [resolved from git remote] | Scope to current project. Prevents cross-project contamination. |
| include_links | false | Links add volume with marginal value for auto-inject. |
| importance_threshold | omit (filter client-side) | More flexible. Filter `>= 7` in script after retrieval. |

### Q4: What Output Format?

**Answer:** Structured JSON with `hookSpecificOutput.additionalContext`.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "<forgetful_context>\nRelevant memories from Forgetful (N found):\n\n- **Title** (importance: 9): content snippet...\n- **Title** (importance: 8): content snippet...\n</forgetful_context>"
  }
}
```

The XML tag `<forgetful_context>` follows the established convention from GSD scripts (`<forgetful_project_context>`, `<forgetful_plan_context>`, `<forgetful_prior_decisions>`). Claude already knows how to interpret these blocks.

**Fallback:** If hookSpecificOutput JSON doesn't inject correctly (issue #17550 showed first-message errors), fall back to plain text stdout. Plain text works reliably but is visible in the transcript.

### Q5: What About the hookSpecificOutput First-Message Bug (#17550)?

**Answer:** Issue #17550 reported that `hookSpecificOutput` JSON causes errors on the first prompt of a new session. The issue was closed Feb 2026 and the workaround was plain text. However, v2.1.89-91 included multiple hook output fixes. Test with JSON first; if first-message errors appear, fall back to plain text.

### Q6: How Does This Relate to the Existing GSD Context Scripts?

**Answer:** They are complementary, not competing.

| Aspect | Auto-inject (new) | GSD context scripts (existing) |
|--------|-------------------|-------------------------------|
| Trigger | Every non-GSD prompt | GSD workflow patches on specific GSD commands |
| Query strategy | Single query: user prompt as-is | Multiple targeted queries (implementation patterns, technology, decisions) |
| Execution | Claude Code hook system (stdin/stdout) | GSD patch scripts called by GSD workflow system |
| Scope | Any user prompt about any topic | Specific GSD workflow stages |
| Coexistence | Skips when prompt starts with `/gsd:` | Unaware of auto-inject hook |

The skip logic in the auto-inject hook is the sole coordination mechanism. GSD scripts don't need modification.

### Q7: Latency Budget?

**Answer:** Target ~400ms per prompt (measured). Acceptable for synchronous hook.

| Phase | Time | Notes |
|-------|------|-------|
| Node.js startup + require | ~23ms | Measured on target machine |
| Read stdin + JSON parse | ~1ms | Small JSON object |
| resolveForgetfulUrl | ~1ms | Filesystem read, OS-cached |
| Skip check (regex) | <1ms | Fast path for GSD prompts |
| createSession | ~100ms | MCP initialize + notification |
| git remote get-url | ~5ms | Local git operation |
| list_projects | ~100ms | MCP tool call |
| query_memory | ~150ms | MCP similarity search |
| Filter + format + stdout | ~1ms | String operations |
| **Total (full path)** | **~400ms** | Well within 10s timeout |
| **Total (skip path)** | **~25ms** | GSD and load-context prompts |

## Suggested Build Order

This feature is a single phase (Phase 22). Within that phase, the recommended plan breakdown:

### Plan 1: Hook Script + hooks.json Registration

**New:** `hooks/user-prompt-context.js`
**Modified:** `hooks/hooks.json`

Build the hook script following the established pattern from `gsd-project-context.js`:
1. Read stdin JSON
2. Extract prompt, check skip conditions
3. Resolve Forgetful URL
4. Create MCP session
5. Resolve project ID from git remote
6. Query memories
7. Filter importance >= 7
8. Format as additionalContext JSON
9. Output to stdout, exit 0

Update `hooks/hooks.json` with UserPromptSubmit entry.

**Verify:** Reload plugins, submit a prompt, ask Claude what context it received. If no context visible, the plugin hooks.json output capture bug is still present.

**Depends on:** Nothing new. Reuses existing `scripts/forgetful-client.js` and patterns from `scripts/gsd-*-context.js`.

### Plan 2 (Conditional): Settings.json Fallback

**Only if Plan 1 verification fails** (plugin hook output not captured).

Extend `skills/bootstrap/SKILL.md` to register the UserPromptSubmit hook in `~/.claude/settings.json` with an absolute path. Extend `skills/update/SKILL.md` to re-register after plugin updates (cache path changes).

**This plan may be unnecessary.** The v1.1 workaround is documented and ready to implement, but should only be built if the plugin hooks.json approach fails verification.

### Build Order Rationale

- Plan 1 is the entire feature -- one new file, one modified file. Minimal surface area.
- Plan 2 is conditional insurance. Don't build it unless the plugin hooks.json bug prevents Plan 1 from working.
- No doctor check changes needed -- existing `forgetful-mcp.sh` already verifies Forgetful connectivity, which is the only prerequisite for the hook to function.

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- UserPromptSubmit stdin format (field: `prompt`), output format (hookSpecificOutput.additionalContext for discrete injection, plain text for visible injection), exit codes, timeout defaults (HIGH confidence, verified 2026-04-05)
- [Claude Code Hook Development Skill](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) -- Plugin hooks.json format, timeout recommendations, matcher behavior (HIGH confidence)
- [Bug #12151](https://github.com/anthropics/claude-code/issues/12151) -- Plugin hook output not captured, originally filed against v2.0.50, unresolved as of last comment Dec 2025. Current version 2.1.92 with 42 minor versions of hook fixes since. (MEDIUM confidence -- bug may be fixed but not confirmed)
- [Bug #17550](https://github.com/anthropics/claude-code/issues/17550) -- hookSpecificOutput first-message error, CLOSED Feb 2026. Workaround: plain text. (MEDIUM confidence -- may be fixed in current version)
- [Claude Code Changelog v2.1.82](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) -- Fixed "plugin hooks being silently dropped," "plugin Stop/SessionEnd hooks not firing after /plugin operation," "uninstalled plugin hooks continuing to fire" (HIGH confidence)
- Existing codebase: `scripts/forgetful-client.js` -- MCP HTTP client module (HIGH confidence -- inspected source)
- Existing codebase: `scripts/gsd-project-context.js`, `gsd-plan-context.js`, `gsd-discuss-context.js` -- Proven patterns for project resolution, memory querying, output formatting (HIGH confidence -- inspected source)
- Existing codebase: `hooks/hooks.json` -- Working SessionStart + SubagentStop plugin hook configuration (HIGH confidence -- in production)
- Existing codebase: `bin/curate-discoveries` -- Working SubagentStop hook with Forgetful client usage (HIGH confidence -- in production)
- Live benchmarks: Node.js startup 23ms, full round-trip 400ms (HIGH confidence -- measured on target machine, reported in STACK.md)

---
*Architecture research for: tb plugin v1.2 -- auto-inject Forgetful context on every prompt*
*Researched: 2026-04-05*
