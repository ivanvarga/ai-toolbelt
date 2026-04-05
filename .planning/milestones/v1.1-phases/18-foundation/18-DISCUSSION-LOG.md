# Phase 18: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 18-foundation
**Areas discussed:** Doctor category grouping, Forgetful endpoint discovery, Client module API surface, Check script language

---

## Doctor Category Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| New "Integration" category | Add a 4th category for GSD & Forgetful checks. Keeps them visually grouped and distinct from core plugin setup. | ✓ |
| Fold into "Setup" | GSD and Forgetful are setup prerequisites. No new category — simpler output. | |
| New "Dependencies" category | Call them external dependencies rather than integrations. Distinct from Setup (which is plugin-internal). | |

**User's choice:** New "Integration" category
**Notes:** None

---

## Forgetful Endpoint Discovery

| Option | Description | Selected |
|--------|-------------|----------|
| Read from ~/.claude.json | Parse the MCP server config in ~/.claude.json to find the Forgetful server entry and extract its URL. Source of truth for Claude Code. | ✓ |
| Environment variable | Check FORGETFUL_URL or similar env var. Simple but requires user to set it separately from MCP config. | |
| Both with fallback | Check ~/.claude.json first, fall back to env var, then default to localhost:3000. Most flexible but more complexity. | |

**User's choice:** Read from ~/.claude.json
**Notes:** None

---

## Client Module API Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Full session lifecycle | Health check + MCP session init + tool call dispatch + response parsing. Downstream phases just import and call. | ✓ |
| Health check + generic tool call only | Health check function + one generic callTool(name, args). Consumers build their own wrappers on top. | |
| Minimal — health check only | Only what Phase 18 needs. Expand in later phases. Risks re-work. | |

**User's choice:** Full session lifecycle
**Notes:** None

---

## Check Script Language

| Option | Description | Selected |
|--------|-------------|----------|
| Bash for all 3 checks | Consistent with existing 11 checks. curl for HTTP reachability, file checks for GSD, JSON parsing for plugin. | ✓ |
| Bash for GSD + plugin, Node.js for Forgetful MCP | forgetful-mcp check imports forgetful-client.js to test real MCP session init. | |
| Node.js for all 3 checks | Break from bash convention. Native JSON parsing. Requires doctor skill update. | |

**User's choice:** Bash for all 3 checks
**Notes:** None

---

## Claude's Discretion

- Exact error messages and fix hints in FAIL output
- Internal module structure of forgetful-client.js
- MCP session timeout and retry behavior

## Deferred Ideas

None — discussion stayed within phase scope
