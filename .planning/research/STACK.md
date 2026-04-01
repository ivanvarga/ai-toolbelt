# Stack Research

**Domain:** Claude Code plugin -- GSD & Forgetful integration (v1.1 additions)
**Researched:** 2026-03-31
**Confidence:** HIGH

This covers ONLY what's needed for the new v1.1 features. The existing stack (Node.js scripts, Python mbridge, SKILL.md format, macOS Keychain) is validated and unchanged.

## Recommended Stack Additions

### HTTP Requests to Forgetful MCP from Shell Scripts

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| curl | system (8.x on macOS) | MCP Streamable HTTP transport calls | Already available, zero dependencies. Forgetful at `http://HOST:PORT/mcp` uses MCP Streamable HTTP -- JSON-RPC 2.0 over POST with SSE responses. |
| jq | 1.7+ (brew install jq) | Parse JSON-RPC responses and SSE `data:` lines | Already installed (`jq-1.7.1-apple`). Essential for extracting `mcp-session-id` from headers and parsing `data:` JSON payloads. Far better than python3 one-liners for this. |

**MCP Streamable HTTP protocol flow (verified against Forgetful 3.1.1):**

```bash
# 1. Initialize session -- capture Mcp-Session-Id header
SESSION_ID=$(curl -s -D - -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"tb-hook","version":"0.1.0"}},"id":1}' \
  "$MCP_URL" | grep -i 'mcp-session-id' | sed 's/.*: //' | tr -d '\r\n')

# 2. Send initialized notification (fire-and-forget)
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  "$MCP_URL" >/dev/null

# 3. Call tool -- response is SSE, parse data: line
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"execute_forgetful_tool","arguments":{"tool_name":"query_memory","arguments":{"query":"...","query_context":"..."}}},"id":2}' \
  "$MCP_URL" | grep '^data:' | sed 's/^data: //')
```

**Critical detail:** Forgetful exposes 3 MCP tools (`discover_forgetful_tools`, `how_to_use_forgetful_tool`, `execute_forgetful_tool`). All memory/project operations go through `execute_forgetful_tool(tool_name, arguments)` as a dispatcher pattern. Do NOT call `query_memory` directly as a tool name -- it will fail with "Unknown tool."

**Required headers:**
- `Content-Type: application/json` (always)
- `Accept: application/json, text/event-stream` (MUST include both; Forgetful returns 400 without `text/event-stream`)
- `Mcp-Session-Id: <id>` (required after initialize)

**Response format:** Always SSE (`text/event-stream`). Parse with `grep '^data:' | sed 's/^data: //'` then pipe to jq.

### UserPromptSubmit Hook Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| bash | system (3.2+ on macOS) | Hook command script | Plugin hooks must be `type: "command"`. Bash is the existing pattern (session-start.sh). |
| jq | 1.7+ | Parse stdin JSON, build response JSON | Cleaner than the manual `escape_for_json` function in session-start.sh. For v1.1 hooks that parse `prompt` field and build `additionalContext`, jq is the right tool. |

**Hook stdin format (verified against official docs):**

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

**Hook stdout format for context injection:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "injected context string"
  }
}
```

**hooks.json format for plugin (different from settings.json):**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/gsd-context.sh"
          }
        ]
      }
    ]
  }
}
```

**Matcher behavior:** UserPromptSubmit supports matchers (regex on `prompt` field). For GSD detection, use `"matcher": "/gsd:"` or check the prompt inside the script. Checking inside the script is more flexible -- matcher regex has limited documentation and the script can do a fast `grep -q '/gsd:'` and exit 0 with empty output for non-GSD prompts.

**Exit codes:** 0 = success (stdout parsed), 2 = block prompt, other = non-blocking error (ignored).

### GSD Dependency Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| npx | bundled with Node.js | Install/update GSD | GSD installs via `npx get-shit-done-cc@latest`. NOT a git repo -- npx copies files to `~/.claude/get-shit-done/`. |
| Node.js child_process | built-in | Run npx from bootstrap script | Matches existing pattern (keychain.js, github-api.js use `execSync`). |

**GSD detection:** Check `~/.claude/get-shit-done/VERSION` exists. Current version: 1.30.0.

**GSD install:** `npx get-shit-done-cc@latest` -- interactive installer prompts for runtime and scope. For automated bootstrap, this means the script should guide the user through the interactive prompts rather than trying to automate them silently.

**GSD update:** Same command: `npx get-shit-done-cc@latest`. Idempotent.

### Plugin Management (Forgetful Plugin)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `claude` CLI | current | Check/install forgetful-plugin | `claude plugin list --json` for detection, `claude plugin marketplace add` and `claude plugin install` for setup. |

**Detection flow (verified):**

```bash
# Check if forgetful-plugin is installed
claude plugin list --json 2>/dev/null | jq -e '.[] | select(.id == "forgetful-plugin@forgetful-plugins")' >/dev/null 2>&1

# Check if marketplace is registered
claude plugin marketplace list 2>&1 | grep -q "forgetful-plugins"
```

**Install flow:**

```bash
# 1. Add marketplace (if not present)
claude plugin marketplace add ScottRBK/forgetful-plugin

# 2. Install plugin
claude plugin install forgetful-plugin@forgetful-plugins

# 3. Run setup (via /forgetful-setup command in Claude Code session)
```

**MCP server detection (Forgetful running):**

```bash
# Check if forgetful MCP is configured
claude mcp list 2>&1 | grep -q "forgetful"

# Check if reachable (quick health check)
curl -s -m 2 -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"tb-health","version":"0.1.0"}},"id":1}' \
  "http://192.168.2.104:8020/mcp" >/dev/null 2>&1
```

### JSON Parsing in Shell Scripts

| Technology | Purpose | When to Use |
|------------|---------|-------------|
| jq | Structured JSON operations | Parse MCP responses, build JSON-RPC payloads, extract fields from hook stdin. Use for anything non-trivial. |
| grep + sed | Extract SSE `data:` lines from curl responses | First-pass extraction of JSON from SSE stream before piping to jq. |
| python3 -c | Fallback for complex transformations | Only if jq can't handle it. Avoid -- jq handles all our cases. |

**jq patterns for MCP responses:**

```bash
# Extract memory content from execute_forgetful_tool response
echo "$RESPONSE" | jq -r '.result.structuredContent.primary_memories[]?.title'

# Check for errors
echo "$RESPONSE" | jq -e '.result.isError == false' >/dev/null 2>&1

# Build JSON-RPC payload
jq -n --arg query "$QUERY" --arg ctx "$CONTEXT" \
  '{jsonrpc:"2.0",method:"tools/call",params:{name:"execute_forgetful_tool",arguments:{tool_name:"query_memory",arguments:{query:$query,query_context:$ctx,k:3}}},id:2}'
```

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| get-shit-done-cc | latest (npm) | GSD framework install/update | Bootstrap skill only. Not a runtime dependency. |
| jq | 1.7+ (brew) | JSON processing in hooks/scripts | All new shell scripts that interact with MCP or parse hook stdin. |

No new Node.js packages needed. No new Python packages needed. The v1.1 features are pure shell scripts + existing Node.js patterns.

## Installation

```bash
# jq (likely already installed on dev machines)
brew install jq

# GSD (interactive)
npx get-shit-done-cc@latest

# Forgetful plugin (via claude CLI)
claude plugin marketplace add ScottRBK/forgetful-plugin
claude plugin install forgetful-plugin@forgetful-plugins

# Forgetful MCP server (if using remote HTTP -- already configured for this user)
claude mcp add forgetful --scope user --transport http http://HOST:PORT/mcp
```

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| curl + jq for MCP calls | Node.js `fetch()` in scripts | Shell scripts are faster to invoke from hooks (no Node.js startup time ~100ms). MCP calls are simple POST requests -- curl is sufficient. Hooks need to be fast since they run on every prompt. |
| jq for JSON parsing | python3 -c one-liners | jq is purpose-built, more readable, and faster. The existing session-start.sh uses manual string escaping -- jq eliminates that class of bugs. |
| Check prompt in script body | Use hook matcher regex | Script-side checking is more flexible: can do substring match, case-insensitive, and short-circuit with empty output. Matcher regex works but ties detection logic to hooks.json. |
| `claude plugin list --json` for detection | Read installed_plugins.json directly | CLI is the stable API. File format may change. The existing plugin-registered.sh reads files directly -- fine for v1.0, but v1.1 should use the CLI where available. |
| bash for hooks | Node.js for hooks | Hook scripts should start instantly. Bash is ~1ms startup vs ~100ms for Node.js. The UserPromptSubmit hook runs on EVERY prompt -- latency matters. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| wget | Not consistently available on macOS, curl is universal | curl |
| Node.js fetch for hook scripts | 100ms+ startup penalty on every prompt | curl in bash |
| python3 for JSON in new scripts | Slower than jq, more verbose, error-prone string escaping | jq |
| Direct file reads of `~/.claude/plugins/installed_plugins.json` | Undocumented format, may change | `claude plugin list --json` |
| git clone for GSD | GSD is NOT a git repo -- it's installed via npx package manager | `npx get-shit-done-cc@latest` |
| MCP stdio transport for Forgetful from hooks | Can't spawn a persistent stdio process from a one-shot hook script | HTTP transport (already configured) |
| Calling `query_memory` directly as MCP tool name | Forgetful uses dispatcher pattern -- only 3 tools are exposed at MCP level | Call `tools/call` with `name: "execute_forgetful_tool"` and pass `tool_name` + `arguments` in params |

## Forgetful MCP URL Configuration

The Forgetful MCP URL (`http://192.168.2.104:8020/mcp`) is currently hardcoded in `~/.claude.json`. Hook scripts need this URL at runtime.

**Recommended approach:** Read from `~/.claude.json` at script startup:

```bash
FORGETFUL_URL=$(jq -r '.mcpServers.forgetful.url // empty' ~/.claude.json 2>/dev/null)
if [ -z "$FORGETFUL_URL" ]; then
  exit 0  # Forgetful not configured, skip silently
fi
```

This makes scripts portable -- they work regardless of whether Forgetful runs locally, on a NAS, or in the cloud.

## Version Compatibility

| Component | Required Version | Current | Notes |
|-----------|-----------------|---------|-------|
| Node.js | 18+ | 24.12.0 | For bootstrap/doctor scripts using `execSync` |
| jq | 1.6+ | 1.7.1 | Already installed via Homebrew |
| curl | 7.x+ | system | Already available on macOS |
| bash | 3.2+ | 3.2.57 | macOS system bash (no bashisms beyond 3.2) |
| Claude Code | current | current | For `claude plugin` and `claude mcp` CLI commands |
| GSD | any | 1.30.0 | Detected via `~/.claude/get-shit-done/VERSION` |
| Forgetful MCP | 3.x | 3.1.1 | MCP protocol version 2025-03-26 |
| MCP Protocol | 2025-03-26 | 2025-03-26 | Streamable HTTP transport with SSE responses |

## Sources

- [MCP Transports Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) -- Streamable HTTP protocol (HIGH confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- UserPromptSubmit stdin/stdout format (HIGH confidence)
- [Claude Code Hook Development Skill](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) -- Plugin hooks.json format (HIGH confidence)
- [GSD GitHub Repository](https://github.com/gsd-build/get-shit-done) -- Installation via npx (HIGH confidence)
- [Forgetful Plugin README](https://github.com/ScottRBK/forgetful-plugin) -- Plugin install commands (HIGH confidence)
- Live testing against Forgetful 3.1.1 at `http://192.168.2.104:8020/mcp` -- MCP session flow, tool names, SSE response format (HIGH confidence, verified March 2026)
- [UserPromptSubmit plugin hook bug #10225](https://github.com/anthropics/claude-code/issues/10225) -- CLOSED, resolved Dec 2024 (HIGH confidence)
- [UserPromptSubmit JSON first-message bug #17550](https://github.com/anthropics/claude-code/issues/17550) -- CLOSED, resolved Feb 2026 (HIGH confidence)
- `claude plugin list --json` -- JSON output format for programmatic detection (HIGH confidence, verified live)
- `claude plugin marketplace list` -- Marketplace detection (HIGH confidence, verified live)

---
*Stack research for: tb plugin v1.1 -- GSD & Forgetful integration*
*Researched: 2026-03-31*
