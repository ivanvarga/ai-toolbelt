# Architecture Research

**Domain:** Claude Code plugin -- GSD & Forgetful integration (v1.1 additions to existing tb plugin)
**Researched:** 2026-04-01
**Confidence:** HIGH

Focuses exclusively on NEW components and modifications. Existing v1.0 plugin structure (skills/, hooks/, scripts/, tools/) is unchanged.

## System Overview

```
EXISTING (unchanged)                       NEW / MODIFIED
==========================                 ==========================

hooks/                                     hooks/
  hooks.json  [SessionStart only]            hooks.json  [+ no change -- see note]
  session-start.sh                           gsd-context.js  [NEW]

scripts/                                   scripts/
  checks/                                    checks/
    cred-*.sh                                  gsd-installed.sh      [NEW]
    global-config.sh                           forgetful-mcp.sh      [NEW]
    hooks-valid.sh                             forgetful-plugin.sh   [NEW]
    plugin-registered.sh                     forgetful-client.js     [NEW]
    skills-valid.sh
    tool-mbridge.sh
  keychain.js
  resolve-credential.js
  resolve-org.js
  setup-all.js
  setup-credential.js

skills/                                    skills/
  doctor/SKILL.md    [auto-discovers]        bootstrap/SKILL.md      [NEW]
  update/SKILL.md    [MODIFY]                load-context/SKILL.md   [NEW]
  [18 existing skills]                       save-findings/SKILL.md  [NEW]

~/.claude/settings.json                    ~/.claude/settings.json
  hooks.SessionStart (GSD)                   hooks.UserPromptSubmit  [ADD via bootstrap]
  hooks.PostToolUse (GSD)
  hooks.Stop, Notification (cmux)
  hooks.PreToolUse (GSD)
```

**Key architectural note on hooks.json:** Do NOT add UserPromptSubmit to the plugin's `hooks/hooks.json`. Bug [#12151](https://github.com/anthropics/claude-code/issues/12151) (OPEN as of April 2026) causes plugin hook output to be silently discarded -- hooks execute but stdout/additionalContext never reaches Claude. The hook script lives in the plugin repo, but registration goes to `~/.claude/settings.json` via the bootstrap skill.

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `hooks/gsd-context.js` | UserPromptSubmit hook: parse stdin, fast-exit non-GSD, query Forgetful, emit context | Node.js script, reads stdin JSON, calls Forgetful HTTP |
| `scripts/forgetful-client.js` | Reusable Forgetful MCP HTTP client: session init, tool call, response parsing | Node.js module, exports functions, used by hook and potentially by other scripts |
| `scripts/checks/gsd-installed.sh` | Doctor check: verify GSD at `~/.claude/get-shit-done/` | Bash, outputs PASS/FAIL |
| `scripts/checks/forgetful-mcp.sh` | Doctor check: verify Forgetful MCP configured + HTTP-reachable | Bash, reads `~/.claude.json`, curl health check |
| `scripts/checks/forgetful-plugin.sh` | Doctor check: verify forgetful-plugin installed | Bash, checks `installed_plugins.json` |
| `skills/bootstrap/SKILL.md` | Step-by-step instructions for Claude to install GSD, forgetful-plugin, configure MCP, register hooks | SKILL.md with bash commands |
| `skills/load-context/SKILL.md` | Instructions for Claude to manually query Forgetful for project context | SKILL.md referencing Forgetful MCP tools |
| `skills/save-findings/SKILL.md` | Instructions for Claude to extract .planning/ artifacts into Forgetful memories | SKILL.md with file reading + Forgetful MCP tool calls |
| `skills/update/SKILL.md` | MODIFIED: existing update + GSD update + forgetful-plugin update | Extended SKILL.md with additional steps |

## Recommended Project Structure

```
hooks/
  hooks.json               # Plugin hooks (SessionStart only -- NOT UserPromptSubmit)
  session-start.sh         # Existing: skill list injection
  gsd-context.js           # NEW: UserPromptSubmit hook script

scripts/
  checks/
    gsd-installed.sh       # NEW: GSD doctor check
    forgetful-mcp.sh       # NEW: Forgetful MCP doctor check
    forgetful-plugin.sh    # NEW: forgetful-plugin doctor check
    [existing checks]
  forgetful-client.js      # NEW: shared Forgetful HTTP client
  [existing scripts]

skills/
  bootstrap/
    SKILL.md               # NEW: full environment setup
  load-context/
    SKILL.md               # NEW: manual Forgetful memory loading
  save-findings/
    SKILL.md               # NEW: extract artifacts into Forgetful
  update/
    SKILL.md               # MODIFIED: add GSD + forgetful-plugin update steps
  doctor/
    SKILL.md               # EXISTING: auto-discovers new check scripts
  [16 other existing skills]
```

### Structure Rationale

- **hooks/gsd-context.js in hooks/ not scripts/:** Hook scripts belong in hooks/ because hooks.json and session-start.sh already live there. Consistent grouping. Even though it's registered in settings.json, the script itself is a hook.
- **scripts/forgetful-client.js not a bash script:** The MCP Streamable HTTP protocol returns SSE-formatted responses (`event: message\ndata: {...}`). Parsing SSE in bash requires fragile `grep/sed` chains. Node.js handles JSON-RPC + SSE parsing natively, and the existing scripts/ directory is already Node.js-heavy (8 of 11 scripts are .js). Avoids `jq` dependency.
- **Three separate doctor checks not one:** Each component (GSD, Forgetful MCP, forgetful-plugin) can fail independently. Separate checks give targeted fix instructions. Consistent with existing pattern (11 separate check scripts).

## Architectural Patterns

### Pattern 1: UserPromptSubmit Hook for GSD Context Injection

**What:** A Node.js script that receives the user's prompt via stdin JSON, checks if it's a GSD command, queries Forgetful for relevant memories, and injects them as plain text stdout.

**When to use:** Every time the user submits a prompt. The hook runs synchronously before Claude processes the prompt. Must be fast.

**Trade-offs:**
- PRO: Automatic context injection -- user never needs to manually load context for GSD workflows
- PRO: Plain text stdout is the most reliable output format (avoids hookSpecificOutput bugs)
- CON: Adds latency to every prompt submission (mitigated by fast-exit for non-GSD prompts)
- CON: Requires settings.json registration (can't use plugin hooks.json due to bug #12151)

**Implementation:**

```javascript
#!/usr/bin/env node
const { initSession, callTool, parseSSE } = require('../scripts/forgetful-client');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  const data = JSON.parse(input);
  const prompt = data.prompt || '';

  // Fast exit: not a GSD command
  if (!prompt.match(/^\/?gsd:/)) {
    process.exit(0);
  }

  // Query Forgetful for project context
  // ...format and echo results...
});
```

### Pattern 2: Settings.json Hook Registration (Workaround for Bug #12151)

**What:** The bootstrap skill writes an absolute-path command entry into `~/.claude/settings.json` under `hooks.UserPromptSubmit`, pointing to the hook script in the plugin cache directory.

**When to use:** During bootstrap and after plugin updates (cache path may change).

**Trade-offs:**
- PRO: Works around the plugin hook output capture bug
- CON: Couples to plugin cache path (must update on plugin version changes)
- CON: Modifies user-level config file (risk of conflicts with other tools)

**Path resolution approach:** The bootstrap skill runs `cat ~/.claude/plugins/installed_plugins.json | jq` to find the tb plugin's `installPath`, then constructs the absolute path to `hooks/gsd-context.js`.

**When bug is fixed:** Move UserPromptSubmit to hooks/hooks.json, remove settings.json entry, simplify bootstrap. Doctor check should detect both configurations and flag the old one.

### Pattern 3: Forgetful MCP Client via Direct HTTP

**What:** A Node.js module that speaks the MCP Streamable HTTP protocol directly (JSON-RPC over HTTP POST with SSE responses), bypassing Claude's MCP tool system.

**When to use:** In hook scripts that run outside Claude's context (hooks can't call MCP tools -- they're command scripts, not Claude conversations).

**Trade-offs:**
- PRO: Hooks can query Forgetful without Claude involvement
- PRO: ~96ms round-trip (init + notify + tool call) measured against local Forgetful 3.1.1
- CON: Must implement MCP handshake (initialize, initialized notification, then tool call)
- CON: Needs to parse SSE response format
- CON: URL read from `~/.claude.json` -- must handle missing/malformed config

**MCP Protocol Flow (verified via live testing):**

```
Step 1: POST /mcp  {initialize}   --> Response header: Mcp-Session-Id
Step 2: POST /mcp  {initialized}  --> (notification, no response body needed)
Step 3: POST /mcp  {tools/call}   --> SSE response: event:message\ndata:{result}
```

**Response format:** SSE with `data:` prefix containing JSON-RPC result. The `structuredContent` field has parsed data; `content[0].text` has stringified JSON.

## Data Flow

### GSD Context Hook (UserPromptSubmit)

```
User types: /gsd:plan-phase "Add authentication"
    |
    v
Claude Code fires UserPromptSubmit (sync, blocks prompt processing)
    |
    v
hooks/gsd-context.js reads stdin JSON
  {prompt: "/gsd:plan-phase Add authentication", cwd: "/path/to/project", ...}
    |
    v
Regex check: prompt.match(/^\/?gsd:/)
    |
    NO --> process.exit(0)  [~1ms, zero overhead for non-GSD prompts]
    |
    YES --> continue
    |
    v
require('../scripts/forgetful-client')
    |
    v
Read Forgetful URL from ~/.claude.json
    |
    MISSING --> exit 0 silently (no Forgetful = no context, not an error)
    |
    FOUND --> continue
    |
    v
Derive repo scope from cwd:
    git remote get-url origin  -->  "ivarga/ai-toolbelt"
    |
    v
MCP Initialize --> get session ID  [~30ms]
    |
    v
MCP tools/call: list_projects({repo_name: "ivarga/ai-toolbelt"})  [~20ms]
    |
    NO PROJECT --> exit 0 (no project in Forgetful for this repo)
    |
    GOT project_id --> continue
    |
    v
MCP tools/call: query_memory({
    query: "authentication" (extracted from prompt after /gsd:command),
    query_context: "GSD workflow context for plan-phase",
    k: 5,
    project_ids: [project_id],
    include_links: true,
    max_links_per_primary: 2
})  [~40ms]
    |
    v
Parse SSE, extract primary_memories  [~1ms]
    |
    v
Format plain text (capped at ~1500 tokens):
  "Relevant memories for ivarga/ai-toolbelt (3 found):
   - [Title1] (importance: 9): brief content...
   - [Title2] (importance: 8): brief content...
   - [Title3] (importance: 7): brief content..."
    |
    v
echo to stdout, exit 0
    |
    v
Claude Code adds text as context, processes /gsd:plan-phase
```

### Bootstrap Flow

```
User runs: /tb:bootstrap
    |
    v
Claude reads skills/bootstrap/SKILL.md
    |
    v
Step 1: Check & install GSD
  - test -f ~/.claude/get-shit-done/VERSION
  - If missing: npx get-shit-done-cc@latest
  - If present: show version
    |
    v
Step 2: Check & add forgetful-plugin marketplace
  - claude plugin marketplace list | grep forgetful
  - If missing: claude plugin marketplace add ScottRBK/forgetful-plugin
    |
    v
Step 3: Check & install forgetful-plugin
  - cat ~/.claude/plugins/installed_plugins.json | grep forgetful-plugin
  - If missing: claude plugin install forgetful-plugin@forgetful-plugins
    |
    v
Step 4: Check & configure Forgetful MCP
  - claude mcp list | grep forgetful
  - If missing: run /forgetful-setup (delegates to forgetful-plugin's command)
    |
    v
Step 5: Verify Forgetful reachable
  - curl to Forgetful URL (from ~/.claude.json)
  - If unreachable: WARN (continue but skip hook registration)
    |
    v
Step 6: Register UserPromptSubmit hook
  - Find tb plugin installPath from installed_plugins.json
  - Read ~/.claude/settings.json
  - Add/update UserPromptSubmit entry with absolute path to hooks/gsd-context.js
  - Write back preserving existing hooks
    |
    v
Step 7: Run /tb:doctor for verification
    |
    v
Report summary
```

### Save Findings Flow

```
User runs: /tb:save-findings
    |
    v
Claude reads skills/save-findings/SKILL.md
    |
    v
Step 1: Discover project in Forgetful
  - git remote get-url origin --> repo identifier
  - execute_forgetful_tool("list_projects", {repo_name: "..."})
  - If no project: create one
    |
    v
Step 2: Read .planning/ artifacts
  - STATE.md: current milestone, phase, status
  - ROADMAP.md: phase list with completion status
  - Most recent SUMMARY.md files from completed phases
  - Key Decisions from PROJECT.md
    |
    v
Step 3: Extract atomic memories (incremental, not batch)
  For each finding:
    a. query_memory to check for existing similar memory
    b. If exists and outdated: update_memory or mark_memory_obsolete
    c. If new: create_memory with proper importance scoring
    d. Link related memories
    |
    v
Step 4: Report what was saved/updated/obsoleted
```

### Update Flow (Extended)

```
User runs: /tb:update
    |
    v
Claude reads skills/update/SKILL.md
    |
    v
[Existing Steps 1-9: tb plugin git pull, version check, changelog, CLAUDE.md sync]
    |
    v
NEW Step 10: Update GSD
  - cat ~/.claude/get-shit-done/VERSION (capture old version)
  - npx get-shit-done-cc@latest
  - Compare versions, report if changed
    |
    v
NEW Step 11: Update forgetful-plugin
  - claude plugin update forgetful-plugin@forgetful-plugins
  - Report result
    |
    v
NEW Step 12: Re-register UserPromptSubmit hook
  - Plugin cache path may have changed after update
  - Re-resolve installPath and update settings.json hook command
    |
    v
NEW Step 13: Run doctor for quick health check
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Forgetful MCP (HTTP) | JSON-RPC over Streamable HTTP at `~/.claude.json` URL | 3-step handshake per session; ~96ms total; SSE response format |
| GSD (local files) | `~/.claude/get-shit-done/` directory, `npx` for install/update | Not an MCP server; file-based workflow system with commands/workflows |
| forgetful-plugin (Claude Code plugin) | Plugin marketplace install, provides skills/commands | tb does not depend on forgetful-plugin at runtime; bootstrap ensures it's installed for the user |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Hook script to Forgetful | Direct HTTP (scripts/forgetful-client.js) | Hook can't use MCP tools -- it runs as a command subprocess |
| Skill to Forgetful | Claude's MCP tool system (execute_forgetful_tool) | Skills run inside Claude's conversation; full MCP access |
| Bootstrap to settings.json | File read/write via Claude's bash commands | Must preserve existing hooks; merge, don't replace |
| Doctor checks to external deps | File existence, curl, jq | Each check is independent, outputs PASS/FAIL/WARN |

### Hook Registration vs Plugin Hooks

| Aspect | Plugin hooks.json | settings.json (user hooks) |
|--------|-------------------|---------------------------|
| Output captured | NO (bug #12151) | YES |
| Path resolution | `${CLAUDE_PLUGIN_ROOT}` auto-resolved | Absolute path required |
| Survives plugin update | YES (auto-deployed) | Must re-register (path changes) |
| User sees in `/hooks` | `[Plugin]` label | `[User]` label |

**Decision:** Use settings.json for UserPromptSubmit. Accept the re-registration burden on update. This is the only reliable path until bug #12151 is fixed.

## Key Architectural Decisions

### Q1: Where does UserPromptSubmit hook live?

**Answer:** New script `hooks/gsd-context.js` in the plugin repo. Registered in `~/.claude/settings.json` (NOT in hooks/hooks.json). This is a new hook entry alongside the existing SessionStart, not an extension of session-start.sh.

**Rationale:** session-start.sh runs once at session start to inject the skill list. The UserPromptSubmit hook runs on every prompt and has completely different logic (parse prompt, conditionally query Forgetful). Separate concerns = separate scripts.

### Q2: Bootstrap vs setup-all.js?

**Answer:** Separate skill, does NOT extend setup-all.js.

**Rationale:** setup-all.js handles credential setup (interactive prompts for Sentry, Contentful, GitHub, Jira tokens). Bootstrap handles dependency installation (GSD, forgetful-plugin, MCP config, hook registration). Different concerns, different triggers. A user may need to bootstrap once but run credential setup multiple times for different orgs.

However, bootstrap SHOULD call `node scripts/setup-all.js` as an optional final step if the user wants full setup. The SKILL.md can ask: "Want to also configure credentials? Run `/tb:doctor` first to see what's needed."

### Q3: Forgetful HTTP abstraction?

**Answer:** New Node.js module at `scripts/forgetful-client.js`.

**Rationale:**
- Node.js over bash because: SSE parsing, JSON-RPC construction, error handling are all significantly cleaner in Node
- Consistent with existing scripts/ (8 of 11 are .js)
- Reusable by hook script and potentially by future scripts
- `jq` would be a new dependency; Node.js is already a given

**Exports:**
- `resolveForgetfulUrl()` -- reads from `~/.claude.json`
- `createSession(url)` -- MCP initialize + initialized notification, returns session ID
- `callTool(url, sessionId, toolName, args)` -- tools/call, parses SSE, returns structured result
- `queryMemories(url, sessionId, query, context, options)` -- convenience wrapper for query_memory

### Q4: Doctor check structure and status levels?

**Answer:** Three new bash scripts in `scripts/checks/`, following existing conventions exactly.

| Check Script | PASS Condition | FAIL Condition | WARN Condition |
|-------------|----------------|----------------|----------------|
| `gsd-installed.sh` | `~/.claude/get-shit-done/VERSION` exists | Directory missing | Version older than expected (optional) |
| `forgetful-mcp.sh` | `~/.claude.json` has `mcpServers.forgetful` AND curl to URL succeeds | MCP config missing | Config present but server unreachable |
| `forgetful-plugin.sh` | `installed_plugins.json` contains `forgetful-plugin` | Plugin not installed | -- |

**Status levels follow existing convention:**
- `PASS check-name message` -- everything working
- `FAIL check-name message. Run: <fix command>` -- broken, with fix hint
- `WARN check-name message` -- degraded but not blocking

**Category mapping in doctor/SKILL.md:** Add new category:
- **Dependencies:** gsd-installed, forgetful-mcp, forgetful-plugin

### Q5: /tb:update integration?

**Answer:** Extend the existing `skills/update/SKILL.md` with additional steps at the end (Steps 10-13).

**Rationale:** One update command, one mental model. The user runs `/tb:update` and everything gets updated. No separate orchestration skill needed.

**New steps added to existing SKILL.md:**
- Step 10: `npx get-shit-done-cc@latest` to update GSD
- Step 11: `claude plugin update forgetful-plugin@forgetful-plugins`
- Step 12: Re-resolve plugin installPath, update settings.json hook command path
- Step 13: Quick doctor check for health verification

Each new step is conditional: if GSD not installed, skip. If forgetful-plugin not installed, skip. This keeps update safe for users who haven't bootstrapped yet.

### Q6: Latency budget for UserPromptSubmit hook?

**Answer:** Target <200ms for GSD prompts. <5ms for non-GSD prompts.

**Measured performance (Forgetful 3.1.1 over LAN):**
- Full 3-step MCP handshake + query: ~96ms
- Non-GSD fast-exit (stdin parse only): ~1-3ms

**Budget breakdown for GSD prompts:**
```
stdin read + JSON parse:     ~2ms
Regex check:                 ~0ms
Read ~/.claude.json:         ~1ms
MCP initialize:              ~30ms
MCP initialized notify:      ~5ms (fire-and-forget is possible but risky)
git remote get-url:          ~5ms
list_projects:               ~25ms
query_memory:                ~40ms
Response parse + format:     ~2ms
                     Total:  ~110ms
```

**Optimization opportunities:**
1. Session caching: Skip init handshake if session ID is cached in /tmp. Saves ~35ms but adds complexity. DEFER -- 110ms is well within budget.
2. Batch list_projects + query_memory: Not possible in MCP (no batch tool calls). But can skip list_projects by caching project_id per repo in /tmp.
3. Project ID cache: Write `repo -> project_id` mapping to `/tmp/tb-forgetful-projects.json`. Saves ~25ms per prompt. RECOMMEND.

**Async consideration:** The hook SHOULD run synchronously (default). Async would mean Claude processes the prompt before context arrives, defeating the purpose. The 110ms latency is imperceptible to the user.

### Q7: Save findings -- batch or incremental?

**Answer:** Incremental. Each finding is checked against existing memories before create/update.

**Rationale:**
- Forgetful auto-links semantically similar memories (similarity >= 0.7) during creation
- Batch insert without checking would create duplicates on repeated runs
- The `using-forgetful-memory` skill explicitly mandates "Query Before Create"
- Incremental allows marking obsolete memories that have been superseded
- Forgetful's `mark_memory_obsolete` with `superseded_by` creates a proper audit trail

**Workflow per finding:**
1. `query_memory` with the finding's topic to check for existing
2. If similar exists: `update_memory` if content changed, or skip if identical
3. If new: `create_memory` with proper importance, project_id, tags
4. If supersedes old: `mark_memory_obsolete` the old one with `superseded_by`
5. `link_memories` for cross-references between related findings

**What to extract from .planning/ artifacts:**
- From `PROJECT.md` Key Decisions table: importance 8-9, tag "decision"
- From `ROADMAP.md` phase structure: importance 6-7, tag "milestone-structure"
- From phase `SUMMARY.md` files: importance 7-8, tag "phase-outcome"
- From `STATE.md` current state: skip (transient, changes every session)
- From research files: importance 7-8, tag "research"

## Anti-Patterns

### Anti-Pattern 1: UserPromptSubmit in Plugin hooks.json

**What people do:** Add UserPromptSubmit to `hooks/hooks.json` alongside SessionStart.
**Why it's wrong:** Bug [#12151](https://github.com/anthropics/claude-code/issues/12151) -- plugin hook output is captured but never injected into Claude's context. Hook executes (confirmed by side effects) but stdout is silently discarded.
**Do this instead:** Register in `~/.claude/settings.json` via bootstrap. Keep hook script in plugin repo, reference by absolute path.

### Anti-Pattern 2: Query Forgetful on Every Prompt

**What people do:** Run full Forgetful query for every user prompt.
**Why it's wrong:** Adds ~110ms to every prompt. Injects irrelevant context for non-GSD work. Wastes context window tokens and accelerates compaction.
**Do this instead:** Fast-exit regex check: `if (!prompt.match(/^\/?gsd:/)) process.exit(0)`. Cost: ~1-3ms for non-GSD prompts.

### Anti-Pattern 3: Bash for MCP Protocol

**What people do:** Implement MCP HTTP client in bash with curl + grep + sed.
**Why it's wrong:** MCP Streamable HTTP returns SSE format (`event: message\ndata: {json}`). Bash SSE parsing is fragile (multi-line events, URL-encoded data, error handling). JSON-RPC construction requires quoting gymnastics.
**Do this instead:** Node.js module. Existing scripts/ are predominantly Node.js. Native JSON handling, proper error handling, testable.

### Anti-Pattern 4: Hardcoded Forgetful URL

**What people do:** Embed `http://192.168.2.104:8020/mcp` in scripts.
**Why it's wrong:** URL changes per machine, network, or deployment mode (local vs remote).
**Do this instead:** Always read from `~/.claude.json`: `JSON.parse(fs.readFileSync(~/.claude.json)).mcpServers.forgetful.url`.

### Anti-Pattern 5: Unbounded Memory Injection

**What people do:** Pass all Forgetful query results (up to 8K tokens) into hook output.
**Why it's wrong:** Floods context window. Most memories may be tangentially related. Accelerates compaction.
**Do this instead:** Cap at 5 primary memories, return titles + truncated content (~1500 tokens max). Let Claude use Forgetful MCP tools to fetch full details if needed.

### Anti-Pattern 6: Extending setup-all.js for Bootstrap

**What people do:** Add GSD/Forgetful install steps to setup-all.js.
**Why it's wrong:** setup-all.js is for credential setup (interactive Keychain prompts). Bootstrap is for dependency installation (non-interactive package installs). Mixing them conflates two user workflows.
**Do this instead:** Separate bootstrap skill. Optionally suggest running setup-all.js at the end.

## Suggested Build Order

Based on dependency analysis:

```
Phase 1: Foundation (no dependencies on other new components)
  1a. scripts/forgetful-client.js      -- shared module, needed by hook
  1b. scripts/checks/gsd-installed.sh  -- standalone check
  1c. scripts/checks/forgetful-mcp.sh  -- standalone check
  1d. scripts/checks/forgetful-plugin.sh -- standalone check

Phase 2: Core Integration (depends on Phase 1)
  2a. hooks/gsd-context.js             -- depends on forgetful-client.js
  2b. skills/bootstrap/SKILL.md        -- references doctor checks + hook script
  2c. Update doctor/SKILL.md category  -- add Dependencies category for new checks

Phase 3: Skills (depends on Phase 2 for bootstrap)
  3a. skills/load-context/SKILL.md     -- uses Forgetful MCP tools directly (no script dep)
  3b. skills/save-findings/SKILL.md    -- uses Forgetful MCP tools directly
  3c. Extend skills/update/SKILL.md    -- adds GSD + forgetful-plugin update steps + hook re-registration
```

**Rationale:**
- forgetful-client.js must exist before gsd-context.js can require it
- Doctor checks must exist before bootstrap references them
- Bootstrap must exist before users can set up the hook
- load-context and save-findings are independent of the hook (they use Claude's MCP connection, not direct HTTP)
- update extension must come after bootstrap (so the hook re-registration logic is proven)

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- hook lifecycle, UserPromptSubmit spec, output format (HIGH confidence)
- [Bug #12151](https://github.com/anthropics/claude-code/issues/12151) -- plugin hook output not captured, OPEN (HIGH confidence, verified April 2026)
- [Bug #17550](https://github.com/anthropics/claude-code/issues/17550) -- hookSpecificOutput first-message error, CLOSED (MEDIUM confidence)
- [MCP Streamable HTTP Spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) -- protocol requirements (HIGH confidence)
- [Forgetful GitHub](https://github.com/ScottRBK/forgetful) -- server config, meta-tools pattern (HIGH confidence)
- [forgetful-plugin](https://github.com/ScottRBK/forgetful-plugin) -- skills, commands, tool reference (HIGH confidence, inspected on-disk v1.1.0)
- Live Forgetful 3.1.1 HTTP testing -- verified full JSON-RPC flow, 96ms round-trip (HIGH confidence)
- Existing tb codebase -- hooks/, scripts/checks/, skills/doctor, skills/update patterns (HIGH confidence)
- `~/.claude/settings.json` -- existing GSD hooks configuration, user-level hook pattern (HIGH confidence)
- `~/.claude.json` -- MCP server configuration format for Forgetful URL resolution (HIGH confidence)

---
*Architecture research for: tb plugin v1.1 -- GSD & Forgetful integration*
*Researched: 2026-04-01*
