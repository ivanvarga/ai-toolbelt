# Phase 18: Foundation - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver 3 new doctor health checks (GSD installed, Forgetful MCP reachable, forgetful-plugin installed) and a reusable Node.js Forgetful HTTP client module. This phase establishes connectivity verification and the shared client that all downstream phases (19, 20, 21) depend on.

</domain>

<decisions>
## Implementation Decisions

### Doctor Category Grouping
- **D-01:** New "Integration" category in doctor output for all 3 new checks (gsd-installed, forgetful-mcp, forgetful-plugin). Keeps them visually grouped and distinct from core plugin setup checks.

### Forgetful Endpoint Discovery
- **D-02:** Read Forgetful HTTP endpoint URL from `~/.claude.json` MCP server config. This is where Forgetful is configured for Claude Code, so it's the source of truth. No env var fallback, no hardcoded defaults.

### Client Module API Surface
- **D-03:** `forgetful-client.js` exposes full session lifecycle: health check + MCP session init + tool call dispatch + response parsing. Downstream phases import and call — no re-implementing the protocol in each consumer.

### Check Script Language
- **D-04:** All 3 new doctor check scripts are bash, consistent with existing 11 checks. `forgetful-mcp.sh` uses curl for HTTP reachability (does not import the Node.js client module). `gsd-installed.sh` checks file existence. `forgetful-plugin.sh` reads JSON.

### Claude's Discretion
- Exact error messages and fix hints in FAIL output
- Internal module structure of forgetful-client.js (function signatures, error handling patterns)
- MCP session timeout and retry behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Forgetful MCP Protocol
- `.planning/research/STACK.md` — MCP Streamable HTTP protocol flow, required headers, response format, Forgetful tool dispatcher pattern (`execute_forgetful_tool`)
- `.planning/research/ARCHITECTURE.md` — Component responsibilities, file layout, hook registration note (bug #12151)

### Existing Doctor Infrastructure
- `skills/doctor/SKILL.md` — Auto-discovery mechanism, category mapping, display rules, output format
- `scripts/checks/tool-mbridge.sh` — Reference implementation for a tool doctor check (multi-condition with detailed FAIL messages)
- `scripts/checks/plugin-registered.sh` — Reference implementation for checking JSON config files

### Requirements
- `.planning/REQUIREMENTS.md` §Foundation — FNDTN-01 through FNDTN-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/checks/*.sh` — 11 existing check scripts as templates for new checks
- `scripts/keychain.js`, `scripts/sentry-api.js` — Node.js module patterns in scripts/ (export style, error handling)
- `skills/doctor/SKILL.md` — Category mapping structure to extend

### Established Patterns
- Doctor checks: bash scripts, `PASS|FAIL|WARN <name> <message>` output, always exit 0
- Category mapping: hardcoded in `skills/doctor/SKILL.md` — new "Integration" category needs to be added there
- JSON config reading: `python3 -c "import json..."` pattern used in existing checks (plugin-registered.sh)
- HTTP reachability: curl with timeout (see tool-mbridge.sh pattern)

### Integration Points
- `skills/doctor/SKILL.md` — Must add "Integration" to category mapping with the 3 new check names
- `scripts/checks/` — New scripts auto-discovered by doctor skill
- `scripts/forgetful-client.js` — New module consumed by Phase 19 (hook), Phase 21 (skills)
- `~/.claude.json` — Read-only source for Forgetful MCP server URL

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-foundation*
*Context gathered: 2026-04-01*
