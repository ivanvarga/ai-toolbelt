# Project Research Summary

**Project:** tb plugin v1.1 — GSD & Forgetful integration
**Domain:** Claude Code plugin — automated context injection and memory management for GSD workflows
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

This is a Claude Code plugin enhancement that integrates two external systems — the GSD (get-shit-done) workflow framework and the Forgetful persistent memory MCP server — into the existing `tb` plugin. The integration pattern is well-understood: a UserPromptSubmit hook intercepts GSD commands, queries Forgetful for relevant project memories, and injects context before Claude processes the prompt. Supporting this are bootstrap, doctor, update, load-context, and save-findings capabilities, all following established tb patterns (SKILL.md for skills, `scripts/checks/*.sh` for doctor checks, Node.js for shared modules).

The recommended approach is to build incrementally in three phases: first the shared Forgetful HTTP client and doctor check scripts (no dependencies), then the hook and bootstrap (depend on Phase 1), then the skills and update extension (depend on Phase 2). The stack requires no new runtime dependencies — curl and jq already exist, Node.js is already in use for all scripts. The one critical architectural constraint is that the UserPromptSubmit hook must be registered in `~/.claude/settings.json` rather than in the plugin's `hooks/hooks.json` due to an open bug (#12151) that silently discards plugin hook output.

The key risks are: silent hook failure from the plugin hooks bug (well-documented, clear workaround), prompt blocking when Forgetful is unreachable (requires strict curl timeouts), and context window bloat from unbounded memory injection (cap at k:3, ~1500 tokens). All three risks have concrete, tested mitigations. Confidence across all research areas is HIGH — findings are based on live testing against Forgetful 3.1.1, official Claude Code docs, and verified GitHub issues.

## Key Findings

### Recommended Stack

The v1.1 feature set requires no new Node packages or Python dependencies. The MCP Streamable HTTP protocol (JSON-RPC over POST with SSE responses) is handled in a new `scripts/forgetful-client.js` Node.js module using built-in `http` — curl would work for simple cases but SSE parsing is fragile in shell. jq (already installed at 1.7.1) handles all hook stdin/stdout JSON needs. GSD is not a git repo — it installs via `npx get-shit-done-cc@latest`. Forgetful exposes only 3 MCP tools; all 38+ memory operations route through the `execute_forgetful_tool` dispatcher.

**Core technologies:**
- `Node.js` (built-in): `scripts/forgetful-client.js` for MCP Streamable HTTP client — matches existing scripts/ pattern, handles SSE parsing cleanly
- `curl` + `jq`: doctor check health calls, hook stdin JSON parsing — already available on system
- `npx get-shit-done-cc@latest`: GSD install and update — interactive installer, cannot be silently automated
- `claude plugin` CLI: forgetful-plugin detection and install — stable API, prefer over direct file reads
- `bash` (system 3.2+): hook scripts, doctor checks — ~1ms startup vs ~100ms for Node.js matters on UserPromptSubmit

### Expected Features

**Must have (v1.1 launch):**
- Bootstrap skill (`/tb:bootstrap`) — single idempotent setup entrypoint: GSD install, marketplace add, forgetful-plugin install, MCP config, HTTP reachability check, hook registration in settings.json, doctor verification
- Doctor checks: `gsd-installed.sh`, `forgetful-mcp.sh`, `forgetful-plugin.sh` — follows existing `scripts/checks/*.sh` PASS/FAIL/WARN pattern
- Update integration — extend `/tb:update` SKILL.md with Steps 10-13: GSD update, forgetful-plugin update, hook path re-registration, doctor check
- GSD context hook (`hooks/gsd-context.js`) — UserPromptSubmit, fast-exit non-GSD prompts (~1ms), query Forgetful, inject plain text context (k:3, ~1500 token cap)
- Load-context skill (`/tb:load-context`) — manual Forgetful memory retrieval for ad-hoc use
- Save-findings skill (`/tb:save-findings`) — incremental extraction of GSD `.planning/` artifacts into Forgetful memories with query-before-create dedup

**Should have (v1.x after validation):**
- Smart context scoping using `STATE.md` project/milestone/phase for `query_context` parameter
- Automatic obsolescence marking on phase/milestone transition
- Pre-compaction save (PreCompact hook)
- SessionStart pre-warm for cold-start latency reduction

**Defer (v2+):**
- Token-budget tuning per GSD command type
- Cross-project memory linking
- Batch SUMMARY extraction across all phases

### Architecture Approach

The v1.1 additions are surgical: 3 new `scripts/checks/` bash scripts, 1 new Node.js module, 1 new hook script, 3 new SKILL.md files, and 1 modified SKILL.md. Existing v1.0 plugin structure is entirely unchanged. The critical separation is that SKILL.md-based skills run inside Claude's conversation (full MCP tool access), while the UserPromptSubmit hook runs as a subprocess command (no MCP access — must call Forgetful via direct HTTP). This drives the `forgetful-client.js` module as a shared layer between hook and potentially future scripts.

**Major components:**
1. `scripts/forgetful-client.js` — Node.js module implementing MCP Streamable HTTP: `resolveForgetfulUrl`, `createSession`, `callTool`, `queryMemories`. Shared by hook and extensible for future scripts.
2. `hooks/gsd-context.js` — UserPromptSubmit hook. Reads stdin JSON, regex-checks `/gsd:` prefix, exits 0 immediately for non-GSD, queries Forgetful via forgetful-client, emits plain text (not hookSpecificOutput JSON) to avoid additional bugs.
3. `scripts/checks/gsd-installed.sh`, `forgetful-mcp.sh`, `forgetful-plugin.sh` — Three independent doctor checks. `forgetful-mcp.sh` checks both config presence AND curl reachability (not just config).
4. `skills/bootstrap/SKILL.md` — 7-step idempotent setup. Writes hook registration to `~/.claude/settings.json` via read-merge-write (never overwrite). Runs doctor at end.
5. `skills/load-context/SKILL.md` + `skills/save-findings/SKILL.md` — SKILL.md files instructing Claude to use Forgetful MCP tools directly. Save-findings: incremental per-finding query-before-create, mark obsolete on supersession.
6. `skills/update/SKILL.md` (modified) — Appends Steps 10-13 conditionally (skip if GSD/forgetful-plugin not installed). Re-resolves installPath and updates settings.json hook command after each plugin update.

### Critical Pitfalls

1. **Plugin hook output silently discarded (bug #12151, OPEN as of April 2026)** — Register UserPromptSubmit in `~/.claude/settings.json`, not `hooks/hooks.json`. Bootstrap writes absolute path. Update skill re-registers after version change. Doctor check verifies script path resolves.

2. **Hook blocks all prompts when Forgetful is unreachable** — `"timeout": 5` on settings.json hook entry. `curl --connect-timeout 1 --max-time 3`. Exit 0 with empty output on any failure. Fast-exit before any HTTP call for non-GSD prompts.

3. **Context window bloat from unbounded memory injection** — `k: 3` max memories. Titles + first-sentence summaries only, ~1500 tokens total. Claude fetches full content via MCP tools on demand.

4. **Bootstrap partial failure leaves half-configured state** — Each step checks idempotently before acting. Read-merge-write for `~/.claude.json` and `settings.json`. Per-step status reporting. Doctor runs at end to confirm.

5. **Forgetful HTTP transport missing despite STDIO working** — Claude's MCP shows "Connected" via STDIO; hook needs separate HTTP endpoint. Bootstrap checks `type: "http"` in `~/.claude.json`. `forgetful-mcp.sh` does curl health check, not just config grep.

## Implications for Roadmap

### Phase 1: Foundation — Shared Client + Doctor Checks

**Rationale:** `forgetful-client.js` must exist before `gsd-context.js` can require it. Doctor checks must exist before bootstrap can reference them for final verification. These components have no dependencies on each other or on Phase 2 — build them first.
**Delivers:** Reusable Forgetful HTTP client module + three doctor check scripts. `/tb:doctor` auto-discovers new checks immediately.
**Addresses:** Forgetful MCP connectivity (table stakes), modular health checks (extends existing tb pattern)
**Avoids:** Anti-Pattern 3 (bash for MCP protocol — Node.js SSE handling). Pitfall 5 (HTTP vs STDIO detection in `forgetful-mcp.sh`).

### Phase 2: Core Integration — Hook + Bootstrap

**Rationale:** `gsd-context.js` depends on `forgetful-client.js` (Phase 1). Bootstrap references the hook script path and all three doctor checks. This is the highest-value, highest-risk work. Building it in Phase 2 validates Phase 1 in practice.
**Delivers:** Working UserPromptSubmit context injection + idempotent one-command environment setup.
**Uses:** `forgetful-client.js` from Phase 1. Plain text stdout (sidesteps hookSpecificOutput bugs from closed issue #17550). Settings.json registration (bug #12151 workaround).
**Avoids:** Pitfall 1 (settings.json, not hooks.json), Pitfall 2 (timeouts, fast-exit), Pitfall 3 (k:3, 1500 token cap), Pitfall 4 (idempotent bootstrap).

### Phase 3: Skills + Update Extension

**Rationale:** Load-context and save-findings use Claude's MCP tool system — no direct HTTP, no hook dependency. They deliver value independently once Forgetful is configured. Update extension must follow bootstrap because it reuses the hook path re-registration logic proven in Phase 2.
**Delivers:** `/tb:load-context`, `/tb:save-findings`, and extended `/tb:update`. Completes v1.1 MVP.
**Addresses:** All P1 features from FEATURES.md.
**Avoids:** Pitfall 8 (duplicate memories — incremental query-before-create in save-findings), Pitfall 9 (cache path staleness — update re-registers hook), Pitfall 10 (GSD structure brittleness — glob-based artifact discovery).

### Phase Ordering Rationale

- Hard dependency chain: `forgetful-client.js` -> `gsd-context.js` -> bootstrap validation flow
- Doctor checks must exist before bootstrap's final verification step
- Skills are independent of the hook (different execution context) but benefit from running in an already-bootstrapped environment
- Update extension shares hook path logic with bootstrap — implement after bootstrap is proven

### Research Flags

Phases with well-documented patterns (skip additional research):
- **Phase 1 (Foundation):** MCP HTTP protocol verified via live testing. Doctor check pattern established in existing codebase. Node.js module structure matches existing `scripts/*.js` files.
- **Phase 3 (Skills):** SKILL.md format well-established. Save-findings tool set documented in forgetful-plugin's `TOOL_REFERENCE.md` (on-disk at `~/.claude/plugins/cache/`).

Phases needing targeted investigation before starting:
- **Phase 2 (Hook + Bootstrap):** Verify bug #12151 status before building. If fixed, hook can go in `hooks/hooks.json` and bootstrap simplifies significantly. Also: confirm exact `settings.json` hook timeout field name and schema, as this was inferred from docs rather than verified in a running example.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified via live Forgetful 3.1.1 testing, official MCP spec, Claude Code hook docs, CLI output. All tools already installed. |
| Features | HIGH | P1 features from PROJECT.md, validated against 3 comparable plugins + official UserPromptSubmit behavior docs. Anti-features well-argued. |
| Architecture | HIGH | Build order from concrete dependency analysis. Bug #12151 verified OPEN by multiple users (Feb-March 2026). 96ms round-trip measured live. |
| Pitfalls | HIGH | Top 5 pitfalls confirmed via live testing or official GitHub issues with multiple confirmations. All have verified mitigations. |

**Overall confidence:** HIGH

### Gaps to Address

- **Bug #12151 resolution:** If fixed before Phase 2 implementation, hook moves to `hooks/hooks.json` and bootstrap settings.json step is removed. Check issue status at Phase 2 start.
- **settings.json hook timeout field name:** Research indicates `"timeout": 5` on the hook entry. Confirm exact schema at implementation time by inspecting an existing settings.json with hooks registered.
- **GSD interactive installer prompts:** `npx get-shit-done-cc@latest` is interactive. Bootstrap SKILL.md must guide the user through prompts. Confirm exact prompts against current GSD 1.30.0 installer before writing SKILL.md.
- **Forgetful project creation parameters:** Save-findings may need to create a Forgetful project if none exists for the repo. Confirm `create_project` tool parameters from TOOL_REFERENCE.md at implementation time.
- **Token budget in practice:** The 1500-token cap and k:3 limit are research-based estimates. Validate with real GSD sessions during Phase 2 and adjust before Phase 3.

## Sources

### Primary (HIGH confidence)
- [MCP Transports Specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — Streamable HTTP protocol, SSE response format, 3-step session handshake
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — UserPromptSubmit stdin/stdout format, exit codes, timeout config
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) — hooks.json format, path variables, plugin cache structure
- [Bug #12151](https://github.com/anthropics/claude-code/issues/12151) — plugin hook output not captured, OPEN as of April 2026, confirmed by prodan-s, wayne5w, jpicklyk (Feb-March 2026)
- Live Forgetful 3.1.1 testing at `http://192.168.2.104:8020/mcp` — full MCP session flow, tool names, SSE parsing, 96ms round-trip (March/April 2026)
- `~/.claude/plugins/cache/forgetful-plugins/forgetful-plugin/1.1.0/skills/using-forgetful-memory/TOOL_REFERENCE.md` — `execute_forgetful_tool` dispatcher, all 38+ tool names
- `claude plugin list --json`, `claude plugin marketplace list`, `claude mcp list` — output format verified live

### Secondary (MEDIUM confidence)
- [Forgetful Introduction (dev.to)](https://dev.to/scott_raisbeck_24ea5fbc1e/introducing-forgetful-shared-knowledge-and-memory-across-agents-40o6) — Zettelkasten principles, two-stage retrieval, cross-encoder reranking, 0.7 similarity auto-link threshold
- [forgetful-plugin GitHub](https://github.com/ScottRBK/forgetful-plugin) — commands, setup flow, skills reference
- [claude-mem GitHub](https://github.com/thedotmack/claude-mem) — progressive disclosure pattern, 5-hook lifecycle
- [memory-store-plugin GitHub](https://github.com/julep-ai/memory-store-plugin) — queue-based capture, auto-checkpoint pattern
- [claude-bootstrap GitHub](https://github.com/alinaqi/claude-bootstrap) — PreCompact hook pattern, environment setup conventions
- [Bug #17550](https://github.com/anthropics/claude-code/issues/17550) — hookSpecificOutput first-message error, CLOSED Feb 2026
- [UserPromptSubmit Issue #27365](https://github.com/anthropics/claude-code/issues/27365) — confirms no `updatedPrompt` support, additionalContext only

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
