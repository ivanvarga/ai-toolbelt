# Phase 18: Foundation - Research

**Researched:** 2026-04-01
**Domain:** Forgetful MCP HTTP client + doctor health checks for Claude Code plugin
**Confidence:** HIGH

## Summary

Phase 18 delivers two things: three new doctor health checks under an "Integration" category (GSD installed, Forgetful MCP reachable, forgetful-plugin installed), and a reusable Node.js HTTP client module (`scripts/forgetful-client.js`) that speaks the MCP Streamable HTTP protocol to Forgetful. The doctor checks are bash scripts following the existing 11-check pattern. The client module is Node.js following the existing `scripts/*.js` pattern (CommonJS, no dependencies, `require.main === module` dual-use).

All external dependencies (Node.js 24, jq 1.7.1, curl 8.7.1, bash 3.2) are already installed. Forgetful MCP is configured at `~/.claude.json` and verified reachable at HTTP 200. GSD 1.30.0 is installed. forgetful-plugin is installed. No new packages or tooling needed.

**Primary recommendation:** Build `forgetful-client.js` first (it's the novel piece requiring MCP protocol handling), then the three bash check scripts (straightforward, following existing patterns). Update `skills/doctor/SKILL.md` category mapping last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New "Integration" category in doctor output for all 3 new checks (gsd-installed, forgetful-mcp, forgetful-plugin). Keeps them visually grouped and distinct from core plugin setup checks.
- **D-02:** Read Forgetful HTTP endpoint URL from `~/.claude.json` MCP server config. This is where Forgetful is configured for Claude Code, so it's the source of truth. No env var fallback, no hardcoded defaults.
- **D-03:** `forgetful-client.js` exposes full session lifecycle: health check + MCP session init + tool call dispatch + response parsing. Downstream phases import and call -- no re-implementing the protocol in each consumer.
- **D-04:** All 3 new doctor check scripts are bash, consistent with existing 11 checks. `forgetful-mcp.sh` uses curl for HTTP reachability (does not import the Node.js client module). `gsd-installed.sh` checks file existence. `forgetful-plugin.sh` reads JSON.

### Claude's Discretion
- Exact error messages and fix hints in FAIL output
- Internal module structure of forgetful-client.js (function signatures, error handling patterns)
- MCP session timeout and retry behavior

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FNDTN-01 | User can run /tb:doctor and see whether GSD is installed and its version | Bash check script pattern verified (11 existing examples). GSD detected via `~/.claude/get-shit-done/VERSION` file. |
| FNDTN-02 | User can run /tb:doctor and see whether Forgetful HTTP endpoint is reachable | curl health check pattern verified (live test: HTTP 200 from Forgetful 3.1.1). URL sourced from `~/.claude.json` per D-02. |
| FNDTN-03 | User can run /tb:doctor and see whether forgetful-plugin is installed | `claude plugin list --json` verified (returns JSON array with `id` field). Also verifiable via `installed_plugins.json`. |
| FNDTN-04 | Forgetful HTTP client module exists in scripts/ for health checks and bootstrap verification | MCP Streamable HTTP protocol fully verified via live testing. 3-step handshake (initialize -> notifications/initialized -> tools/call), SSE response parsing, session ID from response header. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- No comments in code (only external reference URLs allowed)
- No new patterns without user confirmation
- Reuse existing codebase utilities and patterns
- Favor simple and readable over clever
- Verification: run linter + type checker after changes (no package.json exists -- verify via syntax/execution)
- Git commits: 1 line max, no attribution

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js native `http` or `fetch` | 24.12.0 (native fetch available) | MCP Streamable HTTP client | Zero dependencies. Node 24 has native `fetch()` -- verified. Existing scripts use `require('https')` (sentry-api.js) but `fetch` is cleaner for JSON-RPC + SSE. |
| curl | 8.7.1 (system) | HTTP reachability checks in bash doctor scripts | Already available on macOS, used in existing tool-mbridge.sh pattern |
| jq | 1.7.1 (brew) | JSON parsing in bash doctor scripts | Already installed. Used for reading `~/.claude.json` in forgetful-mcp.sh and parsing `installed_plugins.json` in forgetful-plugin.sh |
| bash | 3.2.57 (system) | Doctor check scripts | All 11 existing checks are bash. D-04 requires bash. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `python3 -c "import json..."` | system | JSON parsing fallback in bash | Existing pattern in plugin-registered.sh, hooks-valid.sh. Use for complex JSON queries where jq would be awkward, or as fallback if jq unavailable. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js native `fetch` | `require('http')` | `http` module is lower-level, requires manual response body assembly. `fetch` is cleaner for JSON-RPC. Both zero-dependency. Recommend `fetch` for forgetful-client.js since Node 24 has it. |
| `jq` in bash checks | `python3 -c` one-liners | Either works. jq is faster and more readable for simple field extraction. Existing codebase uses both patterns. |
| `claude plugin list --json` for detection | Read `installed_plugins.json` directly | CLI is stable API but slower (~500ms startup). Direct file read is faster but undocumented format. D-04 says "reads JSON" -- recommend `installed_plugins.json` for speed in doctor check. |

## Architecture Patterns

### Recommended Project Structure

```
scripts/
  checks/
    gsd-installed.sh          # NEW: checks ~/.claude/get-shit-done/VERSION
    forgetful-mcp.sh          # NEW: reads ~/.claude.json + curl health check
    forgetful-plugin.sh       # NEW: checks installed_plugins.json
  forgetful-client.js         # NEW: MCP Streamable HTTP client module

skills/
  doctor/
    SKILL.md                  # MODIFIED: add "Integration" category mapping
```

### Pattern 1: Doctor Check Script (Bash)

**What:** A bash script in `scripts/checks/` that outputs `PASS|FAIL|WARN <name> <message>` and always exits 0.

**When to use:** Every new health check. Auto-discovered by doctor skill.

**Template (from existing codebase):**

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

# Check condition
if <condition>; then
    echo "PASS check-name Success message with details"
else
    echo "FAIL check-name Failure message. Run: <fix command>"
fi
exit 0
```

**Key conventions (verified from 11 existing scripts):**
- `$1` is always plugin root, default to `.`
- Output is exactly one line: `STATUS name message`
- Always `exit 0` -- status communicated via output text, not exit code
- FAIL messages include actionable fix hint after "Run:"
- WARN is for degraded-but-not-blocking states (see plugin-registered.sh)

### Pattern 2: Node.js Module with Dual-Use (CLI + require)

**What:** A `.js` file in `scripts/` that exports functions AND can be run directly.

**When to use:** Reusable logic needed by other scripts/hooks AND testable standalone.

**Template (from resolve-credential.js):**

```javascript
#!/usr/bin/env node
const fs = require('fs');

function doSomething(arg) {
  // implementation
}

if (require.main === module) {
  const arg = process.argv[2];
  // CLI usage
}

module.exports = { doSomething };
```

**Key conventions:**
- CommonJS (`require`/`module.exports`) -- all 8 existing .js scripts use this
- `#!/usr/bin/env node` shebang
- `require.main === module` guard for CLI usage
- Error output to `process.stderr.write()`, not `console.error()`
- Success output to `process.stdout.write()`, not `console.log()`

### Pattern 3: MCP Streamable HTTP Client

**What:** A Node.js module that implements the MCP Streamable HTTP protocol for Forgetful.

**When to use:** Any script/hook that needs to talk to Forgetful outside of Claude's MCP tool system.

**Protocol flow (verified live against Forgetful 3.1.1):**

```
1. POST /mcp  {initialize}      -> SSE response with Mcp-Session-Id header
2. POST /mcp  {initialized}     -> 202 Accepted (notification, no body)
3. POST /mcp  {tools/call}      -> SSE response with JSON-RPC result
```

**Critical protocol details (verified):**
- Request headers MUST include both `Content-Type: application/json` AND `Accept: application/json, text/event-stream`
- `Mcp-Session-Id` header required on all requests after initialize
- Response is `text/event-stream` with `event: message\n` + `data: {json}\n` format
- The `initialized` notification returns HTTP 202 with no body
- Forgetful uses dispatcher pattern: call `execute_forgetful_tool(tool_name, arguments)`, NOT direct tool names
- Session ID comes from `mcp-session-id` response header (lowercase in HTTP/1.1)

**Recommended API surface (per D-03):**

```javascript
// Read Forgetful URL from ~/.claude.json
function resolveForgetfulUrl()

// Full MCP init handshake, returns sessionId
async function createSession(url)

// Call any MCP tool, parse SSE response, return result
async function callTool(url, sessionId, toolName, args)

// Health check -- just verifies initialize succeeds
async function healthCheck(url)
```

### Anti-Patterns to Avoid

- **Hardcoded Forgetful URL:** Always read from `~/.claude.json`. URL varies per machine/network.
- **Calling tool names directly:** Forgetful exposes only 3 MCP tools (`discover_forgetful_tools`, `how_to_use_forgetful_tool`, `execute_forgetful_tool`). Memory operations go through `execute_forgetful_tool` dispatcher.
- **Non-zero exit codes in check scripts:** All doctor checks must `exit 0`. Status is communicated via output text.
- **Adding Node.js dependencies:** No `package.json` exists. Use only Node.js built-ins and native `fetch`.
- **Bash for SSE parsing:** MCP responses are SSE format (`event: message\ndata: {json}`). Fragile in bash. Node.js handles this cleanly.
- **`console.log`/`console.error` in scripts:** Existing pattern uses `process.stdout.write` and `process.stderr.write`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE response parsing | Custom line-by-line parser | Simple split on `data: ` prefix after `fetch` body text | SSE from Forgetful is simple (single `event: message` + `data:` per response). No need for a full EventSource client. |
| JSON config reading in bash | grep/sed on JSON | `jq -r '.field'` or `python3 -c "import json..."` | Both available, both used in existing checks. jq preferred for simple extractions. |
| MCP protocol state machine | Full MCP client with reconnection, batching, resumption | Simple 3-step function (init, notify, call) | Forgetful sessions are short-lived. No need for reconnection or stream resumption. Keep it simple. |

## Common Pitfalls

### Pitfall 1: SSE Response Parsing with fetch()

**What goes wrong:** Using `response.json()` on an SSE (`text/event-stream`) response fails because the content type is not JSON.
**Why it happens:** MCP Streamable HTTP spec says responses to requests can be either `application/json` OR `text/event-stream`. Forgetful always returns SSE.
**How to avoid:** Use `response.text()`, then extract JSON from lines starting with `data: `. The `event:` lines can be ignored for simple request-response.
**Warning signs:** `SyntaxError: Unexpected token 'e'` (from trying to parse `event: message` as JSON).

### Pitfall 2: Missing Accept Header

**What goes wrong:** Forgetful returns HTTP 400 or 406.
**Why it happens:** MCP spec requires `Accept: application/json, text/event-stream` (both). Omitting `text/event-stream` triggers rejection.
**How to avoid:** Always include both content types in Accept header on every POST.
**Warning signs:** HTTP 400/406 on first request.

### Pitfall 3: Session ID Header Case

**What goes wrong:** Session-dependent requests fail with 400.
**Why it happens:** The response header is `mcp-session-id` (lowercase per HTTP/1.1 convention). The request header should be `Mcp-Session-Id` (capitalized per MCP spec). Node.js `fetch` headers are case-insensitive for reading, but curl in bash needs explicit handling.
**How to avoid:** In Node.js fetch, read with `response.headers.get('mcp-session-id')`. In bash curl, use `grep -i 'mcp-session-id'`.
**Warning signs:** Requests after initialize return 400.

### Pitfall 4: Doctor Category Mapping Update

**What goes wrong:** New checks appear under "Other" category instead of "Integration".
**Why it happens:** The category mapping in `skills/doctor/SKILL.md` is hardcoded. New check names must be added explicitly.
**How to avoid:** Add `gsd-installed`, `forgetful-mcp`, `forgetful-plugin` to a new "Integration" category in the SKILL.md category mapping section.
**Warning signs:** Doctor output shows "Other" section with new checks.

### Pitfall 5: forgetful-plugin Detection Method

**What goes wrong:** `claude plugin list --json` takes ~500ms and adds noticeable latency to doctor runs.
**Why it happens:** CLI spawns a full process to query plugin state.
**How to avoid:** Read `~/.claude/plugins/installed_plugins.json` directly for doctor checks (fast file read). CLI is better for interactive/bootstrap scripts where latency is acceptable.
**Warning signs:** Doctor run time increases noticeably.

### Pitfall 6: Forgetful URL Config Nesting

**What goes wrong:** Script fails to find Forgetful URL despite it being configured.
**Why it happens:** `~/.claude.json` has the structure `{"mcpServers": {"forgetful": {"type": "http", "url": "..."}}}`. Different from `~/.claude/settings.json` which has a different MCP config format.
**How to avoid:** Use `jq -r '.mcpServers.forgetful.url // empty'` for bash, `JSON.parse(fs.readFileSync(path)).mcpServers.forgetful.url` for Node.js.
**Warning signs:** URL is undefined/null despite config file existing.

## Code Examples

### Example 1: forgetful-client.js Core Structure

Verified pattern for MCP Streamable HTTP with Node.js native fetch.

```javascript
const fs = require('fs');
const path = require('path');

const MCP_PROTOCOL_VERSION = '2025-03-26';
const CLIENT_INFO = { name: 'tb-client', version: '0.1.0' };
const DEFAULT_TIMEOUT = 5000;

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
};

function resolveForgetfulUrl() {
  const configPath = path.join(process.env.HOME, '.claude.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.mcpServers?.forgetful?.url || null;
}

function parseSSE(text) {
  const dataLine = text.split('\n').find(l => l.startsWith('data: '));
  if (!dataLine) return null;
  return JSON.parse(dataLine.slice(6));
}

async function createSession(url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: CLIENT_INFO,
      },
      id: 1,
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });
  const sessionId = res.headers.get('mcp-session-id');
  // Send initialized notification
  await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Mcp-Session-Id': sessionId },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });
  return sessionId;
}

async function callTool(url, sessionId, toolName, args) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, 'Mcp-Session-Id': sessionId },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: 2,
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });
  const text = await res.text();
  return parseSSE(text);
}
```

Source: Verified against live Forgetful 3.1.1 at `http://192.168.2.104:8020/mcp` and MCP Streamable HTTP spec.

### Example 2: gsd-installed.sh

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

VERSION_FILE="$HOME/.claude/get-shit-done/VERSION"

if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE")
    echo "PASS gsd-installed GSD v${VERSION}"
else
    echo "FAIL gsd-installed GSD not found. Run: npx get-shit-done-cc@latest"
fi
exit 0
```

Source: Pattern from existing scripts/checks/, GSD path from STACK.md research.

### Example 3: forgetful-mcp.sh

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

FORGETFUL_URL=$(jq -r '.mcpServers.forgetful.url // empty' ~/.claude.json 2>/dev/null)

if [ -z "$FORGETFUL_URL" ]; then
    echo "FAIL forgetful-mcp Forgetful MCP not configured in ~/.claude.json. Run: claude mcp add forgetful --scope user --transport http <url>"
    exit 0
fi

if curl -s -m 3 -o /dev/null -w "" -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"tb-health","version":"0.1.0"}},"id":1}' \
    "$FORGETFUL_URL" 2>/dev/null; then
    echo "PASS forgetful-mcp Forgetful reachable at ${FORGETFUL_URL}"
else
    echo "WARN forgetful-mcp Forgetful configured but unreachable at ${FORGETFUL_URL}"
fi
exit 0
```

Source: Pattern from tool-mbridge.sh, URL resolution from STACK.md, curl test verified live.

### Example 4: forgetful-plugin.sh

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"

if [ -f "$INSTALLED_FILE" ] && jq -e '.[] | select(.id == "forgetful-plugin@forgetful-plugins")' "$INSTALLED_FILE" >/dev/null 2>&1; then
    echo "PASS forgetful-plugin forgetful-plugin installed"
else
    echo "FAIL forgetful-plugin forgetful-plugin not installed. Run: /tb:bootstrap"
fi
exit 0
```

Source: `claude plugin list --json` output structure verified live, file path from existing plugin-registered.sh pattern.

### Example 5: Doctor SKILL.md Category Update

Add to existing category mapping in `skills/doctor/SKILL.md`:

```
**Category mapping:**
- **Setup:** plugin-registered, global-config, git-identity, skills-valid, hooks-valid
- **Credentials:** cred-acli, cred-contentful, cred-github, cred-jira-token, cred-sentry
- **Tools:** tool-mbridge
- **Integration:** gsd-installed, forgetful-mcp, forgetful-plugin
```

Source: Existing doctor/SKILL.md category mapping structure, D-01 decision.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE transport (2024-11-05) | Streamable HTTP (2025-03-26) | MCP spec March 2025 | Single endpoint, POST-based, SSE optional. Forgetful 3.1.1 uses current spec. |
| `require('http')` for HTTP | Native `fetch()` in Node.js | Node.js 21+ (stable in 24) | Cleaner API, built-in timeout via AbortSignal, no manual response assembly. |

## Open Questions

1. **fetch vs http for SSE parsing**
   - What we know: Node.js 24 native `fetch` returns a Response object. SSE responses can be read via `response.text()` for simple single-message responses.
   - What's unclear: For streaming responses with multiple SSE events, `response.body` (ReadableStream) would be needed. Forgetful tool calls return single SSE events in practice.
   - Recommendation: Use `response.text()` for simplicity. All verified Forgetful responses are single `event: message` + `data:` pairs. If multi-event streaming is needed later, upgrade to ReadableStream parsing.

2. **Doctor check for unreachable vs misconfigured**
   - What we know: `forgetful-mcp.sh` can distinguish "not configured" (FAIL) from "configured but unreachable" (WARN). The curl timeout at 3 seconds handles network issues.
   - What's unclear: Should a WARN for unreachable include the specific error (timeout vs connection refused)?
   - Recommendation: Claude's discretion per CONTEXT.md. A single WARN message with the URL is sufficient -- the user knows whether their server is running.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | forgetful-client.js | Yes | 24.12.0 | -- |
| jq | forgetful-mcp.sh, forgetful-plugin.sh | Yes | 1.7.1 | python3 -c |
| curl | forgetful-mcp.sh | Yes | 8.7.1 | -- |
| bash | All 3 check scripts | Yes | 3.2.57 | -- |
| GSD | gsd-installed.sh (target) | Yes | 1.30.0 | -- |
| Forgetful MCP | forgetful-mcp.sh (target) | Yes | 3.1.1 (HTTP 200) | -- |
| forgetful-plugin | forgetful-plugin.sh (target) | Yes | installed | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None -- no test framework exists in the project |
| Config file | none -- no package.json, no test config |
| Quick run command | Manual execution of scripts |
| Full suite command | Manual execution of scripts |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDTN-01 | GSD installed check outputs PASS with version | smoke | `bash scripts/checks/gsd-installed.sh .` | Wave 0 |
| FNDTN-02 | Forgetful reachable check outputs PASS with URL | smoke | `bash scripts/checks/forgetful-mcp.sh .` | Wave 0 |
| FNDTN-03 | forgetful-plugin check outputs PASS | smoke | `bash scripts/checks/forgetful-plugin.sh .` | Wave 0 |
| FNDTN-04 | forgetful-client.js can create session and call tool | smoke | `node scripts/forgetful-client.js health` | Wave 0 |

### Sampling Rate

- **Per task commit:** Run the relevant check script directly (< 1 second each)
- **Per wave merge:** Run all 3 checks + forgetful-client health check
- **Phase gate:** All 4 commands return expected output before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework -- validation is via direct script execution (smoke tests)
- [ ] `scripts/forgetful-client.js` needs CLI mode (`require.main === module`) with a `health` subcommand for verification
- [ ] All 3 bash check scripts are self-verifying (output is the test)

Note: Given the project has no test framework and all deliverables are standalone scripts with observable output, smoke testing via direct execution is the appropriate validation strategy. Each script's output IS the test result.

## Sources

### Primary (HIGH confidence)

- [MCP Streamable HTTP Spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) - Protocol flow, required headers, session management, SSE response format
- Live Forgetful 3.1.1 testing at `http://192.168.2.104:8020/mcp` - Verified full 3-step handshake, SSE response format, tool dispatch, response headers, HTTP status codes
- Existing codebase (`scripts/checks/*.sh`, `scripts/*.js`, `skills/doctor/SKILL.md`, `hooks/`) - Patterns, conventions, category mapping
- `.planning/research/STACK.md` - MCP protocol flow, tool patterns, version compatibility
- `.planning/research/ARCHITECTURE.md` - Component responsibilities, build order, anti-patterns

### Secondary (MEDIUM confidence)

- Node.js 24 native `fetch` -- verified available via `node -e "console.log(typeof fetch)"` returning "function"
- `claude plugin list --json` output format -- verified live, JSON array with `id` field

### Tertiary (LOW confidence)

None -- all findings verified against live systems or official spec.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools verified present on machine, all versions confirmed
- Architecture: HIGH - All patterns extracted from existing codebase, MCP protocol verified live
- Pitfalls: HIGH - Each pitfall based on verified protocol behavior or observed codebase patterns

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- Forgetful 3.x, MCP spec 2025-03-26, all local tools)
