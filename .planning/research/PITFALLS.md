# Domain Pitfalls

**Domain:** Claude Code plugin -- GSD & Forgetful integration (v1.1)
**Researched:** 2026-03-31
**Confidence:** HIGH (verified against GitHub issue tracker, official docs, and live MCP testing)

## Critical Pitfalls

### Pitfall 1: Plugin Hook Output Silently Discarded (Bug #12151 -- OPEN)

**What goes wrong:** UserPromptSubmit hooks defined in plugin `hooks/hooks.json` execute correctly but their stdout/additionalContext is never injected into Claude's conversation. The hook runs, curl succeeds, Forgetful returns data, but Claude never sees it. Zero error messages -- completely silent failure.

**Why it happens:** Claude Code's hook output capture pipeline treats plugin-scoped hooks differently from user-level hooks (`~/.claude/settings.json`). Bug #12151 is OPEN as of March 31, 2026. Multiple users confirm the behavior on v2.1.42+. The same hook config works when placed in settings.json.

**Consequences:** The entire GSD context hook is useless if registered in the plugin's hooks.json. Every curl call to Forgetful is wasted. The user sees no error and assumes memories are being injected when they're not.

**Prevention:**
1. Register UserPromptSubmit hooks in `~/.claude/settings.json`, not in plugin hooks.json.
2. Keep the hook SCRIPT in the plugin repo (`hooks/gsd-context.sh`). Only the hook REGISTRATION goes to settings.json.
3. Bootstrap skill must write the hook config to settings.json with the absolute path to the cached plugin's hook script.
4. Doctor check must verify: (a) hook exists in settings.json, (b) hook script path resolves, (c) hook output actually reaches Claude (test by having Claude report what context it received).
5. If/when #12151 is fixed, migrate back to plugin hooks.json and clean up settings.json.

**Detection:** Ask Claude "what additional context did you receive from hooks?" after a GSD command. If Claude has no awareness of memory context, the output is being discarded.

### Pitfall 2: UserPromptSubmit Hook Blocks All Prompts When Forgetful Is Unreachable

**What goes wrong:** The hook queries Forgetful on GSD commands. If Forgetful is unreachable (server down, network change, port conflict), curl blocks until timeout. Default hook timeout is 600 seconds. Every GSD prompt stalls for 10 minutes.

**Why it happens:** Developers add the Forgetful query and test it when the server is running. They never test when the server is down. curl without explicit timeout inherits the system TCP timeout (~60s per attempt with retries).

**Consequences:** Every GSD command takes 60-600 seconds. The hook appears "stuck." Users disable the hook entirely to restore responsiveness.

**Prevention:**
1. Set `"timeout": 5` on the hook definition in settings.json.
2. Use `curl --connect-timeout 1 --max-time 3` for all Forgetful HTTP calls.
3. On any curl failure (timeout, connection refused, non-200), `exit 0` with empty stdout. Never `exit 2` (that blocks and erases the prompt).
4. For non-GSD prompts (`prompt` doesn't start with `/gsd:`), `exit 0` immediately before making any HTTP calls. This path costs ~1ms.

**Detection:** Noticeable delay between pressing Enter and Claude starting to respond. Visible only on GSD commands if gating is implemented; on ALL prompts if gating is missing.

### Pitfall 3: Context Window Bloat From Unbounded Memory Injection

**What goes wrong:** Forgetful returns up to 8K tokens per query (default MEMORY_TOKEN_BUDGET) with up to 20 memories. Injecting all of this into every GSD prompt consumes massive context. The 200K window compacts at ~167K. System prompt + tools + skills already use ~29K. Adding 8K per GSD prompt triggers compaction much sooner, losing earlier conversation history.

**Why it happens:** "More context = better" mentality. Forgetful's default budget (8K) is designed for direct agent use where Claude selects relevance. Automatic injection dumps everything.

**Consequences:** Frequent auto-compaction. Claude "forgets" earlier conversation turns. `/context` shows unexpectedly high hook context usage. Long GSD sessions lose their beginning.

**Prevention:**
1. Limit query to `k: 3` (3 memories max).
2. Return only memory titles + first-sentence summaries in hook output (~1500 tokens max).
3. Let Claude fetch full memory content via Forgetful MCP tools if it needs more detail.
4. Track with `/context` command during development to measure actual impact.

**Detection:** `/context` showing large hook context blocks. Compaction happening earlier than expected.

### Pitfall 4: Bootstrap Partial Failure Leaves Half-Configured State

**What goes wrong:** Bootstrap installs 5+ independent components (GSD, marketplace, forgetful-plugin, MCP config, hook registration). If step 3 of 5 fails (e.g., network error during plugin install), the system is half-configured. Hooks reference a missing Forgetful, doctor checks report mixed results.

**Why it happens:** Sequential setup scripts assume each step succeeds. No idempotency checks. No step-tracking for retry.

**Consequences:** Cryptic errors from hooks trying to reach unconfigured Forgetful. Re-running bootstrap may duplicate MCP entries in `~/.claude.json` or overwrite settings.json hooks.

**Prevention:**
1. Each step checks "is this already done?" before acting (idempotent).
2. Report per-step status: "GSD: OK, Marketplace: OK, Plugin: FAILED (network), Hook: SKIPPED".
3. Never write to `~/.claude.json` without reading first and merging (not overwriting).
4. After all steps, run doctor checks and report consolidated status.

**Detection:** Doctor checks showing mixed PASS/FAIL after bootstrap. Re-running bootstrap creates duplicates.

### Pitfall 5: Forgetful HTTP Transport Not Available Despite STDIO Working

**What goes wrong:** Claude connects to Forgetful via STDIO transport (`uvx forgetful-ai`). The hook needs HTTP (`curl http://host:port/mcp`). These are completely separate. If user set up Forgetful as STDIO-only, there's no HTTP endpoint for the hook to query.

**Why it happens:** Forgetful's recommended default is STDIO (zero config). Developers assume HTTP is also available. The `/forgetful-setup` "Standard" option configures STDIO only.

**Consequences:** Hook gets "connection refused" on every GSD command. Forgetful "works" for Claude's MCP tools but not for the hook. Two separate Forgetful instances (STDIO + HTTP) would create two databases.

**Prevention:**
1. Bootstrap must verify Forgetful is configured with HTTP transport in `~/.claude.json` (check `type: "http"`).
2. If configured as STDIO, bootstrap must guide user to reconfigure as HTTP (or configure both sharing the same DB).
3. Doctor check must verify the HTTP endpoint is reachable with a curl health check.
4. The current user already has HTTP configured (`http://192.168.2.104:8020/mcp`), but bootstrap must handle the general case.

**Detection:** Hook returns empty output on GSD commands. Doctor check for Forgetful reachability fails while `claude mcp list` shows Forgetful "Connected."

## Moderate Pitfalls

### Pitfall 6: Hook Stdin JSON Parsing Edge Cases

**What goes wrong:** The hook reads stdin JSON containing `prompt`, `session_id`, `cwd`, etc. Prompts with quotes, backslashes, newlines, or JSON content break naive parsing. Multi-line prompts split across `read` calls.

**Prevention:**
1. Always use `INPUT=$(cat)` to read all stdin at once.
2. Extract fields with `jq -r '.prompt // empty'`.
3. Quote all variables in shell: `"$PROMPT"` not `$PROMPT`.
4. Handle empty/missing prompt: `if [ -z "$PROMPT" ]; then exit 0; fi`.
5. Use `set -euo pipefail` but trap jq failures explicitly (jq returns non-zero on parse error, triggering errexit).

### Pitfall 7: Cross-Project Memory Contamination

**What goes wrong:** Forgetful memories from project A appear in queries made from project B. GSD decisions from one repo pollute another repo's context.

**Prevention:**
1. Always include `project_ids` filter when querying in the hook.
2. Derive project identity from `git remote get-url origin` (unique, stable).
3. Always include `project_ids` when creating memories in save-findings.
4. Use `mark_memory_obsolete` when milestones complete.

### Pitfall 8: Duplicate Memories From Repeated Save-Findings

**What goes wrong:** Running save-findings twice on the same phase creates duplicates. Phase 3 and phase 7 both mention the same tech stack -- two identical memories exist.

**Prevention:**
1. Before creating a memory, query for semantically similar existing memories on the same project. If very similar, update instead of create.
2. When saving from a new phase, mark superseded memories from previous phases as obsolete.
3. Extract decisions and learnings as atomic Zettelkasten notes, not raw file contents.
4. Include phase/milestone identifiers in memory metadata.

### Pitfall 9: Plugin Cache Path Changes on Update

**What goes wrong:** Bootstrap writes an absolute path to the hook script in settings.json (e.g., `~/.claude/plugins/cache/tb-marketplace/tb/0.1.0/hooks/gsd-context.sh`). When the plugin updates to 0.2.0, the path changes. The hook breaks silently.

**Prevention:**
1. Use a path that doesn't include the version: check if Claude Code's cache structure includes a stable "latest" symlink.
2. If not, the update skill must also update the hook path in settings.json after each plugin update.
3. Doctor check must verify the hook script path still resolves to an existing file.

### Pitfall 10: GSD Structure Changes Break Artifact Extraction

**What goes wrong:** Save-findings hardcodes paths like `.planning/research/STACK.md`. GSD updates its template structure, and extraction breaks silently.

**Prevention:**
1. Use glob patterns (`find .planning -name "*.md"`) instead of hardcoded paths.
2. Parse based on content patterns (headings, frontmatter) not exact file paths.
3. Track GSD VERSION and warn on mismatch.

## Minor Pitfalls

### Pitfall 11: MCP Session ID Not Reused Across Calls

**What goes wrong:** Each hook invocation creates a new MCP session (initialize + tool call). This is fine for the current use case (one query per hook) but wastes ~100ms on session setup.

**Prevention:** Accept the cost. Hook invocations are independent -- no session state to preserve. Reusing sessions across invocations would require persistent state, adding complexity.

### Pitfall 12: Forgetful's execute_forgetful_tool Dispatcher

**What goes wrong:** Developer calls `query_memory` as a top-level MCP tool name. Fails with "Unknown tool." Forgetful exposes only 3 MCP tools; all 38+ operations go through `execute_forgetful_tool(tool_name, arguments)`.

**Prevention:** Always wrap in `execute_forgetful_tool`. Document this in the mcp-client.sh helper.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Bootstrap | Partial failure, non-idempotent | Check-before-act for each step; per-step reporting |
| Bootstrap | Plugin cache path in settings.json | Resolve path at bootstrap time; update on plugin update |
| Doctor checks | Checking MCP config but not reachability | Health check via curl, not just config presence |
| GSD context hook | Silent output discard (plugin hooks.json) | Register in settings.json, NOT plugin hooks.json |
| GSD context hook | Blocking on Forgetful unreachable | curl timeouts, fast-path for non-GSD prompts |
| GSD context hook | Token bloat from large results | Cap at k:3, summarize, ~1500 tokens max |
| Save-findings | Duplicate memories | Query-before-create, obsolescence marking |
| Save-findings | GSD structure changes | Glob-based discovery, defensive parsing |
| Update integration | Plugin cache path changes | Update hook path in settings.json after plugin update |

## Sources

- [Plugin hook output bug #12151](https://github.com/anthropics/claude-code/issues/12151) -- OPEN as of March 31, 2026
- [hookSpecificOutput first-message bug #17550](https://github.com/anthropics/claude-code/issues/17550) -- CLOSED Feb 2026
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- timeout, output format, exit codes
- [Forgetful TOOL_REFERENCE.md](~/.claude/plugins/cache/forgetful-plugins/forgetful-plugin/1.1.0/skills/using-forgetful-memory/TOOL_REFERENCE.md) -- tool dispatcher pattern
- Live MCP testing against Forgetful 3.1.1 -- verified session flow, error responses
- Comments on #12151 from prodan-s, wayne5w, jpicklyk (Feb-March 2026) -- confirmed hookEventName required, plugin output still broken

---
*Pitfalls research for: tb plugin v1.1 -- GSD & Forgetful integration*
*Researched: 2026-03-31*
