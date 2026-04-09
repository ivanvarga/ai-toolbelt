# Phase 22: Auto-inject Forgetful Context - Research

**Researched:** 2026-04-09
**Domain:** Claude Code plugin hooks -- UserPromptSubmit hook for ambient Forgetful memory injection
**Confidence:** HIGH

## Summary

Phase 22 adds a single Node.js hook script (`hooks/user-prompt-context.js`) that fires on every user prompt, queries Forgetful for project-scoped memories, and injects relevant results as `additionalContext`. The feature reuses `scripts/forgetful-client.js` (proven in 4 existing scripts) and follows established patterns from `gsd-project-context.js`.

The most critical implementation decision is hook registration strategy. Bug #12151 (plugin hook output silently discarded) remains OPEN as of April 2026 despite official docs claiming "output capture is identical across all sources." The existing SessionStart hook in this plugin uses `async: true` (output is not needed on current prompt), so it does not confirm or deny whether synchronous output capture works from plugin hooks.json. The CONTEXT.md decision (D-03/D-05) correctly handles this: try hooks.json first, fall back to settings.json via bootstrap if output is not captured.

**Primary recommendation:** Build the hook script following `gsd-project-context.js` patterns exactly. Register in hooks.json. Verify output capture manually after first install. If broken, extend bootstrap skill to register in settings.json.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Skip Forgetful queries for short/trivial prompts to avoid wasting ~400ms on throwaway input
- **D-02:** Detection uses length threshold (under ~20 chars) AND a pattern list of common continuation phrases (yes, no, ok, continue, do it, go ahead, sounds good, etc.)
- **D-03:** Register UserPromptSubmit hook in plugin `hooks/hooks.json` first (self-contained, survives plugin updates automatically)
- **D-04:** Verify output capture after install by asking Claude what context it received
- **D-05:** If bug #12151 causes output to be silently discarded, bootstrap skill auto-registers the hook in `~/.claude/settings.json` as fallback (seamless, no manual intervention)
- **D-06:** First Forgetful failure in a session delivers a one-time notice ("Forgetful unreachable -- auto-context disabled for this session"). Subsequent failures are completely silent.
- **D-07:** Notification mechanism is Claude's discretion (additionalContext message vs stderr)
- **D-08:** Session-scoped project ID cache included in v1.2. Cache resolved project ID to temp file keyed by repo name. Saves ~100ms per prompt after first resolution.
- **D-09:** Cache invalidation strategy is Claude's discretion (TTL-based or session-scoped)

### Claude's Discretion
- Notification mechanism for one-time Forgetful failure notice (D-07)
- Cache invalidation strategy for project ID cache (D-09)
- Exact trivial prompt pattern list composition
- Output formatting details within established XML tag convention

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTXI-01 | User prompt automatically triggers Forgetful similarity search with project scoping via git remote | Proven pattern from `gsd-project-context.js`: `extractRepoName()` + `resolveProjectId()` + `callTool('query_memory')` |
| CTXI-02 | Relevant memories injected as structured additionalContext JSON with XML-tagged compact snippets (300 char, title + importance) | Output format verified against official hooks docs. Follow `session-start.sh` JSON pattern with `<forgetful_context>` XML tag convention |
| CTXI-03 | Hook exits silently (exit 0, no output) on any failure | Established convention: `main().catch(() => process.exit(0))` used by all 4 existing forgetful scripts |
| CTXI-04 | Hook completes within 3 seconds; times out gracefully if slower | Set `timeout: 10` in hooks.json (hard cap). Use `AbortSignal.timeout()` on individual fetch calls. Measured round-trip: ~400ms |
| CTXI-05 | Results filtered by importance threshold (>=7) and low-K retrieval (k=5) | Client-side filter after query. Pass `k: 5` to `query_memory`. Filter `mem.importance >= 7` in script |
| CTXI-06 | Hook skips auto-inject when prompt starts with /gsd: or /tb:load-context | Regex check: `/^\/?gsd:|^\/?tb:load-context/i.test(prompt)` -- early exit 0 before any API calls |
| CTXI-07 | Project ID cached per session to avoid repeated list_projects API calls | Cache to temp file keyed by repo name. Read before API call. ~100ms savings per prompt |
| HOOK-01 | UserPromptSubmit hook registered in hooks.json (synchronous, ~10s timeout) | Verified: UserPromptSubmit does NOT support async. hooks.json format confirmed from existing SessionStart/SubagentStop entries |
| HOOK-02 | Doctor check verifies UserPromptSubmit hook is registered and script exists | New check script in `scripts/checks/`. Follow existing pattern: output `PASS|FAIL|WARN check-name message` |
| HOOK-03 | If plugin hooks.json output is silently discarded (bug #12151), fall back to settings.json registration | Extend `skills/bootstrap/SKILL.md` to register in `~/.claude/settings.json` with absolute path. Extend doctor to detect which registration is active |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No comments in code** except external reference links
- **No new dependencies** -- zero-dependency project, no package.json
- **Reuse existing patterns** before writing new code
- **Simple and readable** over clever
- **Verify after changes** -- run linter/type checker (but this project has neither; verification is manual)
- **Git commits:** 1 line only, no attribution
- **Security:** Never read/print actual env var values or secrets

## Standard Stack

### Core (All Existing -- No New Dependencies)

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Node.js | 24.12.0 (installed) | Hook script runtime | Native fetch, 23ms startup. Already runtime for all forgetful scripts |
| forgetful-client.js | existing module | MCP session + tool dispatch | Proven in 4 scripts. Exports `resolveForgetfulUrl`, `createSession`, `callTool` |
| Claude Code hooks.json | plugin format | Hook registration | Add UserPromptSubmit alongside existing SessionStart/SubagentStop |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| child_process (Node built-in) | N/A | `execSync('git remote get-url origin')` | Project identity resolution |
| fs (Node built-in) | N/A | Read/write project ID cache temp file | Session caching (D-08) |
| os (Node built-in) | N/A | `os.tmpdir()` for cache file location | Project ID cache path |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js hook | bash + curl + jq | Node.js is 22% faster end-to-end (405ms vs 518ms measured). Reuses forgetful-client.js. No code duplication |
| Synchronous hook | async: true | UserPromptSubmit does NOT support async (verified in official docs April 2026). Even if it did, async output arrives after Claude starts processing |
| Client-side importance filter | Server-side importance_threshold | Client-side is more flexible. Can adjust threshold without changing API call |

**Installation:**
```bash
# Nothing to install. All dependencies already exist.
# Hook script uses only Node.js built-ins + scripts/forgetful-client.js
```

## Architecture Patterns

### Recommended Project Structure

```
hooks/
  hooks.json                # MODIFIED: add UserPromptSubmit entry
  session-start.sh          # EXISTING: SessionStart skill list injection
  user-prompt-context.js    # NEW: UserPromptSubmit auto-inject hook
scripts/
  forgetful-client.js       # EXISTING: reused as-is via require()
  gsd-project-context.js    # EXISTING: reference implementation
  checks/
    user-prompt-hook.sh     # NEW: doctor check for hook registration
```

### Pattern 1: Hook Script Structure (from gsd-project-context.js)

**What:** Node.js script that reads stdin, queries Forgetful, outputs additionalContext JSON.
**When to use:** The only pattern for this hook.
**Example:**
```javascript
// Source: scripts/gsd-project-context.js (proven pattern)
const { resolveForgetfulUrl, createSession, callTool } = require('../scripts/forgetful-client');

async function main() {
  const input = JSON.parse(await readStdin());
  const prompt = input.prompt || '';

  // Skip conditions (CTXI-06, D-01/D-02)
  if (/^\/?gsd:|^\/?tb:load-context/i.test(prompt)) process.exit(0);
  if (isTrivialPrompt(prompt)) process.exit(0);

  const url = resolveForgetfulUrl();
  if (!url) process.exit(0);

  const sessionId = await createSession(url);
  const projectId = await resolveProjectId(url, sessionId); // with caching (D-08)
  if (!projectId) process.exit(0);

  const result = await callTool(url, sessionId, 'execute_forgetful_tool', {
    tool_name: 'query_memory',
    arguments: { query: prompt, query_context: 'auto-inject: relevant project context', k: 5, project_ids: [projectId], include_links: false }
  });

  const memories = parseMemories(result).filter(m => m.importance >= 7);
  if (memories.length === 0) process.exit(0);

  const context = formatContext(memories);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context
    }
  }));
}
main().catch(() => process.exit(0));
```

### Pattern 2: hooks.json Registration

**What:** Add UserPromptSubmit entry to existing hooks.json.
**When to use:** Primary registration method (D-03).
**Example:**
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

### Pattern 3: Project ID Session Cache (D-08)

**What:** Cache resolved project ID to temp file. Read before API call on subsequent prompts.
**When to use:** Every invocation after the first.
**Example:**
```javascript
// Source: D-08 decision + existing resolveProjectId pattern
const cacheFile = path.join(os.tmpdir(), `tb-project-${repoName.replace(/\//g, '-')}.json`);

function getCachedProjectId(repoName) {
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (cached.repoName === repoName && Date.now() - cached.ts < 3600000) return cached.projectId;
  } catch {}
  return null;
}

function setCachedProjectId(repoName, projectId) {
  fs.writeFileSync(cacheFile, JSON.stringify({ repoName, projectId, ts: Date.now() }));
}
```

### Pattern 4: Graceful Failure Convention

**What:** Wrap entire main() in `.catch(() => process.exit(0))`.
**When to use:** Always. Every failure path exits cleanly with no output.
**Example:**
```javascript
// Source: All existing forgetful scripts
main().catch(() => process.exit(0));
```

### Pattern 5: One-Time Failure Notice (D-06)

**What:** On first Forgetful failure in a session, output a notice via additionalContext. Set a flag file so subsequent failures are silent.
**When to use:** Only when Forgetful is unreachable (network error, timeout).
**Recommendation for D-07 (Claude's discretion):** Use additionalContext for the notice. It is injected discretely into Claude's context without cluttering the user's transcript. stderr would be visible as a hook error which conflicts with bug #34713 (false error labels).

### Anti-Patterns to Avoid

- **Querying on every prompt without skip logic:** GSD patches already inject targeted context. Auto-inject on `/gsd:*` prompts wastes tokens with redundant, less-targeted memories.
- **Plain text stdout instead of additionalContext JSON:** Plain text shows as hook output in transcript on every prompt. additionalContext is discrete.
- **Unbounded memory injection:** k=5 + importance >= 7 + 300-char snippets keeps output under 2,000 chars. Never dump full memory content.
- **Creating a new HTTP client:** Reuse `forgetful-client.js`. Do not duplicate MCP session handshake, SSE parsing, or URL resolution.
- **exit 1 or exit 2 for "no results":** exit 0 with empty output means "nothing to inject." exit 1 = non-blocking error shown in verbose mode. exit 2 = blocks the user's prompt entirely.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP session management | Custom HTTP client for Forgetful | `require('../scripts/forgetful-client')` | SSE parsing, session handshake, URL resolution all proven. 4 consumers share the same interface |
| Repo identity resolution | Custom git parsing | `extractRepoName()` pattern from gsd-project-context.js | Regex handles SSH, HTTPS, .git suffix. Battle-tested |
| Memory result parsing | Custom JSON traversal | `parseMemories()` pattern from gsd-project-context.js | Handles both `structuredContent` and `content[0].text` response formats |
| JSON escaping for output | Manual string escaping | `JSON.stringify()` | Node.js handles all escaping correctly for hookSpecificOutput JSON |
| Hook output format | Custom format | hookSpecificOutput.additionalContext JSON | Follows session-start.sh pattern. Official Claude Code format |

## Common Pitfalls

### Pitfall 1: Plugin Hook Output Silently Discarded (Bug #12151)

**What goes wrong:** Hook runs, Forgetful returns data, but Claude never sees the output. Zero error messages.
**Why it happens:** Bug #12151 remains OPEN (last activity Dec 2025). Plugin-scoped hooks execute but output capture fails. Issue #20659 (duplicate) was closed "not planned" in March 2026. Official docs claim parity but evidence contradicts this.
**How to avoid:** Register in hooks.json first (D-03). Verify by asking Claude "what additional context was injected?" If nothing, fall back to settings.json via bootstrap (D-05).
**Warning signs:** Claude has no awareness of Forgetful memories despite hook running successfully. Check with `--debug` to see hook execution vs context injection.

### Pitfall 2: hookEventName Required in JSON Output

**What goes wrong:** JSON output is parsed but additionalContext is not injected. No error.
**Why it happens:** The `hookEventName` field inside `hookSpecificOutput` is silently required. Omitting it causes output to be ignored. Confirmed by multiple bug reporters.
**How to avoid:** Always include `"hookEventName": "UserPromptSubmit"` in the hookSpecificOutput object.
**Warning signs:** Hook runs, JSON output looks correct, but Claude has no injected context.

### Pitfall 3: False "Hook Error" Labels (Bug #34713)

**What goes wrong:** Claude Code displays "hook error" in transcript for every hook execution even when hooks exit 0 with valid JSON. On an every-prompt hook, this means every user message shows a phantom error label.
**Why it happens:** Bug #34713 is OPEN as of March 2026. Display issue affects all hook types. The model may interpret accumulated error signals and prematurely end turns.
**How to avoid:** Test on current Claude Code version (2.1.97) before committing to the approach. If false labels appear, consider `suppressOutput: true` in JSON output.
**Warning signs:** "hook error" appearing in transcript after every prompt. Claude becoming cautious or cutting turns short.

### Pitfall 4: Forgetful Unreachable Blocks Every Prompt

**What goes wrong:** If Forgetful is down and hook lacks fast-fail, every prompt stalls. `forgetful-client.js` has `DEFAULT_TIMEOUT = 5000` per HTTP call, and 3 calls = 15 seconds worst case.
**Why it happens:** Developers test with Forgetful running and forget the failure path.
**How to avoid:** Use the one-time failure notice + session flag pattern (D-06). After first failure, set a flag file and skip all Forgetful calls for the rest of the session. Total timeout via hooks.json: 10 seconds max.
**Warning signs:** Lag after pressing Enter when Forgetful is stopped.

### Pitfall 5: First-Message hookSpecificOutput Error (Bug #17550)

**What goes wrong:** hookSpecificOutput JSON causes errors on the first prompt of a new session.
**Why it happens:** Bug #17550 was reported Jan 2026, closed Feb 2026. Workaround: plain text. However, v2.1.89-91 included multiple hook output fixes.
**How to avoid:** Test JSON output on first message of a new session. If errors appear, consider falling back to plain text stdout for the first message only.
**Warning signs:** Error on first prompt only; subsequent prompts work fine.

### Pitfall 6: Stdin Reading in Node.js

**What goes wrong:** Using `process.stdin.read()` or `readline` and getting null/incomplete data.
**Why it happens:** Hook stdin is piped as a single JSON blob. Node.js stdin needs to be fully consumed before parsing.
**How to avoid:** Read all stdin chunks and parse after `end` event:
```javascript
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
```
**Warning signs:** `SyntaxError: Unexpected end of JSON input` in debug logs.

## Code Examples

### Complete Hook Script Structure
```javascript
// Source: Pattern derived from gsd-project-context.js + session-start.sh
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveForgetfulUrl, createSession, callTool } = require('../scripts/forgetful-client');

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

function extractRepoName() {
  return execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' })
    .trim()
    .replace(/.*[:/]([^/]+\/[^/]+?)(?:\.git)?$/, '$1');
}

function parseMemories(result) {
  return result?.result?.structuredContent?.primary_memories
    || JSON.parse(result?.result?.content?.[0]?.text || '{}').primary_memories
    || [];
}

// ... main() with skip logic, caching, querying, formatting ...

main().catch(() => process.exit(0));
```

### additionalContext Output Format
```javascript
// Source: hooks/session-start.sh pattern + gsd-project-context.js format
const context = [
  '<forgetful_context>',
  `Relevant memories from Forgetful (${memories.length} found):`,
  '',
  ...memories.map(m => {
    const snippet = (m.content || '').substring(0, 300);
    return `- **${m.title}** (importance: ${m.importance}): ${snippet}...`;
  }),
  '</forgetful_context>'
].join('\n');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: context
  }
}));
```

### Doctor Check Script Pattern
```bash
# Source: scripts/checks/forgetful-mcp.sh + hooks-valid.sh patterns
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"
HOOKS_JSON="${PLUGIN_ROOT}/hooks/hooks.json"

# Check if UserPromptSubmit is registered in hooks.json
if python3 -c "import json; d=json.load(open('${HOOKS_JSON}')); assert 'UserPromptSubmit' in d.get('hooks',d)" 2>/dev/null; then
  # Check script exists
  # ... resolve command path, check file exists ...
  echo "PASS user-prompt-hook UserPromptSubmit hook registered and script exists"
else
  echo "FAIL user-prompt-hook UserPromptSubmit hook not registered in hooks.json"
fi
exit 0
```

### Settings.json Fallback Registration (for bootstrap skill)
```json
// Written to ~/.claude/settings.json by bootstrap skill if hooks.json output is not captured
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/cached/plugin/hooks/user-prompt-context.js",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bash + curl + jq for hooks | Node.js with native fetch | v1.2 research (April 2026) | 22% faster (405ms vs 518ms measured). Reuses forgetful-client.js |
| settings.json registration (workaround) | hooks.json primary, settings.json fallback | v2.1.82+ hook fixes (March 2026) | Official docs claim parity. Bug #12151 still open but many related fixes shipped |
| No async support for UserPromptSubmit | Still no async support | Confirmed April 2026 | UserPromptSubmit must be synchronous. Context injection requires blocking |
| 10K char limit for hook output | 50K char limit with file fallback | v2.1.90 (April 2026) | Output over 50K saved to disk with preview. Budget unchanged for this feature (~2K chars) |

**Deprecated/outdated:**
- v1.1 research recommended bash+curl+jq -- invalidated by live benchmarks showing Node.js is faster
- v1.1 pitfalls insisted on settings.json only -- current version has fixed many plugin hook issues; try hooks.json first

## Open Questions

1. **Does plugin hooks.json output capture work on v2.1.97?**
   - What we know: Bug #12151 is OPEN. But v2.1.69-v2.1.94 shipped 20+ hook fixes. Official docs claim parity across all sources. Existing SessionStart hook uses async so doesn't confirm sync output capture.
   - What's unclear: Whether sync UserPromptSubmit output from plugin hooks.json is captured in v2.1.97.
   - Recommendation: Try hooks.json first (D-03). Verify manually (D-04). Fall back to settings.json if broken (D-05). This is already the locked decision.

2. **Does bug #34713 (false hook error labels) affect every-prompt hooks?**
   - What we know: Bug is OPEN as of March 2026. Causes phantom "hook error" labels for all hook executions.
   - What's unclear: Whether it manifests on v2.1.97 and whether it causes Claude to prematurely end turns.
   - Recommendation: Test during implementation. If present, use `suppressOutput: true`. If destructive, report findings for future consideration.

3. **Does the first-message hookSpecificOutput bug (#17550) still affect v2.1.97?**
   - What we know: Bug closed Feb 2026. Multiple hook output fixes shipped since.
   - What's unclear: Whether it's fully resolved.
   - Recommendation: Test JSON output on first message of new session. If broken, first message can use plain text as fallback.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Hook script runtime | Yes | 24.12.0 | -- |
| Claude Code | Hook system | Yes | 2.1.97 | -- |
| git | Repo identity (`git remote`) | Yes | (system) | -- |
| Forgetful MCP | Memory queries | Conditional | 3.1.1 | Silent no-op (exit 0, no output) |
| forgetful-client.js | MCP session management | Yes | existing in repo | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Forgetful MCP server (may be unreachable) -- fallback is graceful silence (CTXI-03)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None (no test infrastructure in this project) |
| Config file | none |
| Quick run command | Manual: `echo '{"prompt":"test prompt","cwd":"/tmp"}' \| node hooks/user-prompt-context.js` |
| Full suite command | Manual: Run doctor checks + manual verification |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTXI-01 | Forgetful query triggered on user prompt | smoke | `echo '{"prompt":"how does auth work"}' \| node hooks/user-prompt-context.js` | Wave 0 (script must exist first) |
| CTXI-02 | Output format: additionalContext JSON with XML tags | smoke | Parse stdout of above command, verify JSON structure | Manual |
| CTXI-03 | Silent exit on failure | smoke | Stop Forgetful, run hook, verify exit 0 + no output | Manual |
| CTXI-04 | Completes within 3 seconds | smoke | `time echo '...' \| node hooks/user-prompt-context.js` | Manual |
| CTXI-05 | Importance >= 7 filter, k=5 | smoke | Run hook, verify filtered results | Manual |
| CTXI-06 | Skips /gsd: and /tb:load-context prompts | smoke | `echo '{"prompt":"/gsd:plan-phase test"}' \| node hooks/user-prompt-context.js` verify no output | Manual |
| CTXI-07 | Project ID cached | smoke | Run hook twice, verify temp file exists | Manual |
| HOOK-01 | Registered in hooks.json | smoke | `python3 -c "import json; d=json.load(open('hooks/hooks.json')); print('UserPromptSubmit' in d['hooks'])"` | Yes (hooks.json exists) |
| HOOK-02 | Doctor check passes | smoke | `bash scripts/checks/user-prompt-hook.sh .` | Wave 0 (check must exist first) |
| HOOK-03 | Settings.json fallback in bootstrap | manual-only | Requires simulating bug #12151 scenario | Manual |

### Sampling Rate
- **Per task commit:** Manual smoke test (run hook with test input)
- **Per wave merge:** Run all doctor checks
- **Phase gate:** Full manual verification checklist before `/gsd:verify-work`

### Wave 0 Gaps
- No test framework to install (project is zero-dependency)
- Verification is inherently manual (hook behavior requires Claude Code runtime)
- Doctor check script (`scripts/checks/user-prompt-hook.sh`) must be created as part of implementation

## Sources

### Primary (HIGH confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- UserPromptSubmit stdin/stdout format, hookSpecificOutput, exit codes, timeout defaults, async NOT supported. Verified 2026-04-09.
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog) -- v2.1.69-v2.1.97 hook fixes enumerated. 20+ hook improvements since bug #12151 filed.
- Existing codebase: `scripts/forgetful-client.js` -- MCP HTTP client module (inspected source)
- Existing codebase: `scripts/gsd-project-context.js` -- Reference implementation for project resolution, memory querying, output formatting (inspected source)
- Existing codebase: `hooks/hooks.json` -- Working SessionStart + SubagentStop hook registration (in production)
- Existing codebase: `hooks/session-start.sh` -- hookSpecificOutput.additionalContext JSON format (in production)
- Project research: `.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `FEATURES.md` -- Comprehensive pre-research from April 5, 2026

### Secondary (MEDIUM confidence)
- [Bug #12151](https://github.com/anthropics/claude-code/issues/12151) -- Plugin hook output not captured. OPEN, last activity Dec 2025. 23 comments.
- [Bug #34713](https://github.com/anthropics/claude-code/issues/34713) -- False hook error labels. OPEN, filed March 2026.
- [Bug #17550](https://github.com/anthropics/claude-code/issues/17550) -- hookSpecificOutput first-message error. CLOSED Feb 2026.
- [Issue #20659](https://github.com/anthropics/claude-code/issues/20659) -- UserPromptSubmit in plugins not injecting context. CLOSED "not planned" March 2026 as duplicate of #12151.
- [Issue #25987](https://github.com/anthropics/claude-code/issues/25987) -- Plugin hooks systemMessage not injected. CLOSED "completed" Feb 2026 as duplicate of #12151.
- Live benchmarks: Node.js 405ms vs bash 518ms round-trip (measured April 5, 2026 on target machine)

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist in the codebase, no new dependencies
- Architecture: HIGH -- single new file follows proven patterns from 4 existing scripts
- Pitfalls: HIGH -- bugs verified against issue tracker, patterns verified from existing code
- Hook registration strategy: MEDIUM -- bug #12151 status is ambiguous (OPEN bug vs official docs claiming parity)

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days -- stable domain, main risk is Claude Code hook bug fixes changing the landscape)

---
*Phase: 22-auto-inject-forgetful-context-on-every-prompt*
*Researched: 2026-04-09*
