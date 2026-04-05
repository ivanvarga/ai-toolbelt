---
phase: 18-foundation
plan: 02
subsystem: doctor-integration-checks
tags: [doctor, health-check, gsd, forgetful, integration]
dependency_graph:
  requires: []
  provides: [gsd-installed-check, forgetful-mcp-check, forgetful-plugin-check, integration-category]
  affects: [skills/doctor/SKILL.md]
tech_stack:
  added: [jq, curl]
  patterns: [bash-doctor-check, mcp-http-health-probe]
key_files:
  created:
    - scripts/checks/gsd-installed.sh
    - scripts/checks/forgetful-mcp.sh
    - scripts/checks/forgetful-plugin.sh
  modified:
    - skills/doctor/SKILL.md
decisions:
  - "jq for JSON parsing in bash checks (faster, more readable than python3 one-liners for simple field extraction)"
  - "MCP initialize request for Forgetful reachability (not just TCP connect -- verifies actual MCP protocol)"
  - "WARN for unreachable Forgetful (server down is transient, not a plugin config error)"
metrics:
  duration: 1min
  completed: "2026-04-01T11:37:07Z"
---

# Phase 18 Plan 02: Doctor Health Checks Summary

Three bash doctor checks for GSD version, Forgetful MCP reachability, and forgetful-plugin installation, grouped under new Integration category.

## What Was Done

### Task 1: Create 3 doctor check scripts (0e7dad6)

Created three new bash scripts in `scripts/checks/`:

- **gsd-installed.sh** -- Checks `~/.claude/get-shit-done/VERSION` file existence, reports version number on PASS
- **forgetful-mcp.sh** -- Reads Forgetful URL from `~/.claude.json` via jq, sends MCP initialize request via curl with 3s timeout, reports FAIL (not configured), WARN (unreachable), or PASS (reachable)
- **forgetful-plugin.sh** -- Reads `~/.claude/plugins/installed_plugins.json`, uses jq to match plugin ID `forgetful-plugin@forgetful-plugins`

All follow existing check script conventions: shebang, PLUGIN_ROOT from $1, single-line output, exit 0.

### Task 2: Add Integration category to doctor SKILL.md (c247648)

Added single line to category mapping in `skills/doctor/SKILL.md`:
`- **Integration:** gsd-installed, forgetful-mcp, forgetful-plugin`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `gsd-installed.sh` output: `PASS gsd-installed GSD v1.30.0`
- `forgetful-mcp.sh` output: `PASS forgetful-mcp Forgetful reachable at http://...`
- `forgetful-plugin.sh` output: `FAIL forgetful-plugin forgetful-plugin not installed. Run: /tb:bootstrap` (correct -- plugin not yet installed)
- `grep Integration skills/doctor/SKILL.md` confirms category mapping present
- All scripts exit 0 regardless of PASS/FAIL
- All scripts are executable (chmod +x verified)

## Self-Check: PASSED
