# Project Research Summary

**Project:** tb plugin v1.2 — auto-inject Forgetful context via UserPromptSubmit hook
**Domain:** Claude Code plugin hook — ambient memory injection on every prompt
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

This feature adds a UserPromptSubmit hook to the tb plugin that automatically queries Forgetful for relevant memories on every user prompt and injects them as `additionalContext` before Claude processes the request. Unlike v1.1's GSD-only context injection (which fires on specific `/gsd:*` commands), v1.2 runs on every prompt, making project memory ambient rather than opt-in. The implementation is minimal: one new file (`hooks/user-prompt-context.js`) and one modified file (`hooks/hooks.json`), fully reusing the existing `forgetful-client.js` module and patterns proven across four existing context scripts.

The recommended approach is Node.js over bash (22% faster end-to-end at 405ms vs 518ms, measured on the target machine), synchronous hook execution (async hooks cannot inject `additionalContext` for the current prompt), k=5 retrieval with client-side importance >= 7 filtering, and early exit for `/gsd:*` and `/tb:load-context` prompts to avoid duplication with the existing targeted GSD context scripts. The entire feature stays within the existing zero-dependency philosophy — no new npm packages, no new architectural patterns.

The primary risk is Claude Code bug #12151: plugin-scoped hooks in `hooks/hooks.json` may have their stdout silently discarded. The mitigation is pragmatic — attempt registration in `hooks/hooks.json` first and verify output capture immediately; fall back to `~/.claude/settings.json` registration if broken. Two additional open bugs (#34713 false hook error labels, #17550 first-message hookSpecificOutput errors) require integration testing before declaring the feature complete. A second independent risk is every-prompt latency: at ~400ms synchronous per prompt, the feature needs a tight timeout (10s) and graceful no-op on all failure paths so Forgetful downtime never blocks the user.

## Key Findings

### Recommended Stack

The entire implementation reuses existing infrastructure with no new dependencies. Node.js (24.12.0 installed, native fetch available since v18) handles the hook script. The `forgetful-client.js` module provides all MCP communication. Live benchmarks confirmed Node.js is faster end-to-end than bash+curl because native fetch handles HTTP connection setup more efficiently than spawning three curl processes.

**Core technologies:**
- Node.js 24.12.0: hook script runtime — native fetch, 23ms startup, zero-dependency, already the runtime for all forgetful scripts
- `scripts/forgetful-client.js` (existing): MCP session + tool dispatch — proven in 4 scripts, exports `resolveForgetfulUrl`, `createSession`, `callTool`
- Claude Code `hooks/hooks.json` (existing): hook registration — add UserPromptSubmit entry alongside SessionStart and SubagentStop

**Hook I/O contract (verified against official docs):**
- Stdin field is `prompt` (not `user_prompt`)
- Output via `hookSpecificOutput.additionalContext` for discrete injection (not shown in transcript)
- Character limit: 10,000 chars; k=5 at 300 chars/snippet = ~2,000 chars, well within budget
- Timeout: override default 600s to 10s for fast-fail when Forgetful is down
- Async: must be synchronous — async hooks cannot inject context for the current prompt

### Expected Features

**Must have (v1.2 launch):**
- Auto-inject hook script — Node.js, reads stdin for prompt, queries Forgetful with project scope + importance threshold, outputs `additionalContext` JSON; exits 0 silently on any failure
- hooks.json UserPromptSubmit entry — synchronous, 10s timeout, no matcher
- GSD/load-context prompt skip — early exit when prompt matches `/gsd:` or `/tb:load-context` to avoid duplicating targeted GSD context scripts
- Graceful failure on every path — Forgetful unreachable, no git remote, no project, zero results — all produce silent exit 0
- Importance threshold filtering (>= 7) — matches existing load-context skill, filters noise
- No-results silence — zero memories after filter = exit 0 with no output, no empty XML tags
- Compact snippet format (300 chars, title + importance + snippet) — signals injection occurred without overwhelming

**Should have (v1.x after validation):**
- Session-scoped project ID cache — saves ~100ms per prompt; build only if latency is a real problem
- Prompt-aware `query_context` string — better reranking signal for Forgetful's cross-encoder
- Session-level deduplication — same memories re-injected across turns; observable only at 40+ turns

**Defer to v2+:**
- Multi-query retrieval (parallel queries like gsd-plan-context.js)
- Token budget awareness (check context usage before injecting)
- Cross-project memory injection

### Architecture Approach

The architecture is additive with minimal surface area. One new file lives in `hooks/` alongside `session-start.sh`. The hook imports `forgetful-client.js` via relative require, following the identical pattern used by `gsd-discuss-context.js`, `gsd-plan-context.js`, `gsd-project-context.js`, and `gsd-milestone-save.js`. No new directories, no bin/ wrapper (hook is invoked by Claude Code, not users), no changes to any existing script.

**Major components:**
1. `hooks/user-prompt-context.js` (NEW) — reads stdin JSON, checks skip conditions, queries Forgetful, emits `additionalContext`
2. `hooks/hooks.json` (MODIFY) — add UserPromptSubmit entry with `timeout: 10`, no `async: true`
3. `scripts/forgetful-client.js` (REUSE, unchanged) — all MCP communication, session management, URL resolution

**Data flow:** Claude Code fires hook on user prompt → script reads `prompt` from stdin → checks `/gsd:`/`/tb:load-context` prefix (exit 0 immediately if match) → resolves Forgetful URL → creates MCP session → resolves project ID from `git remote get-url origin` → calls `query_memory` with prompt as query, k=5, project-scoped → filters importance >= 7 → outputs JSON with `additionalContext` → Claude receives memories before processing prompt

**Key pattern — selective skip for GSD commands:**
```javascript
if (/^\/?gsd:|^\/?tb:load-context/i.test(prompt)) {
  process.exit(0);
}
```
GSD workflow patches already inject purpose-built context at each GSD decision point via dedicated scripts. Auto-inject would add redundant, less-targeted memories for those prompts.

### Critical Pitfalls

1. **Bug #12151 — plugin hook output silently discarded (OPEN)** — register in `~/.claude/settings.json` as fallback if `hooks/hooks.json` registration does not capture output; verify immediately after implementation by asking Claude what context it received; v2.1.82 may have fixed this but is unconfirmed for UserPromptSubmit specifically
2. **Every-prompt latency becoming user-visible** — 400ms measured acceptable but must not creep; set `timeout: 10` on hook, use `AbortSignal.timeout(2000)` equivalent on individual fetch calls, add fast-path exit for trivial prompts under 20 chars
3. **Forgetful downtime blocking every prompt** — wrap `main()` in `.catch(() => process.exit(0))`; the failure path must produce < 500ms no-op; every call has an individual timeout
4. **Bug #34713 — false "hook error" labels on every prompt (OPEN)** — must test on current version before declaring done; if present, these labels cause Claude to behave cautiously and cut turns short; no clean fix exists if the bug is present
5. **Context noise from irrelevant memories** — importance >= 7 threshold + low-K (5) + project scoping handles most noise; additionally skip trivial prompts under 20 chars that do not benefit from memory context

## Implications for Roadmap

This feature is scoped to a single phase (Phase 22). The architecture is too minimal for multiple phases. Within the phase, the recommended structure is two sequential plans with a conditional branch on bug #12151 status.

### Phase 22, Plan 1: Hook Script + Registration

**Rationale:** This is the entire feature. One new file, one modified file. All dependencies already exist. Build the happy path, then verify output capture immediately.
**Delivers:** Working auto-inject — every non-GSD prompt gets relevant Forgetful memories as `additionalContext` before Claude processes the request
**Addresses features:** auto-inject hook script, hooks.json registration, GSD skip logic, graceful failure on all paths, importance filtering, compact output format
**Avoids pitfalls:**
- Bug #12151 via immediate verification step (ask Claude what context it received after reload)
- Bug #34713 via visual transcript check during integration testing
- Every-prompt latency via 10s hook timeout and per-call 2s abort signal
- Forgetful downtime blocking via `.catch(() => process.exit(0))` project convention

**Build steps (from architecture research):**
1. Read stdin JSON, extract `prompt`
2. Regex check for `/gsd:` and `/tb:load-context` prefix — exit 0 immediately if match
3. `resolveForgetfulUrl()` — exit 0 if null
4. `git remote get-url origin` via `execSync` from `cwd` — exit 0 if fails
5. `createSession(url)` — exit 0 if fails
6. `callTool: list_projects` to resolve project ID — exit 0 if no project found
7. `callTool: query_memory` with prompt as query, k=5, project-scoped, `include_links: false`
8. Filter memories with importance >= 7
9. Exit 0 silently if zero memories after filter
10. Output `hookSpecificOutput.additionalContext` JSON with `<forgetful_context>` XML block

### Phase 22, Plan 2 (Conditional): Settings.json Fallback

**Rationale:** Only build if Plan 1 verification confirms bug #12151 still affects UserPromptSubmit output capture on Claude Code v2.1.92. Do not build speculatively.
**Delivers:** Hook registration via `~/.claude/settings.json` that reliably captures output, surviving plugin updates
**Implements:** Extend `skills/bootstrap/SKILL.md` to write the UserPromptSubmit entry to settings.json with absolute path to cached hook script. Extend `skills/update/SKILL.md` to re-register after plugin updates (cache path changes with version). Doctor check verifies settings.json registration resolves to existing file.
**Note:** v2.1.82 changelog confirms "plugin hooks being silently dropped" was fixed; this plan may be unnecessary.

### Phase Ordering Rationale

- Plan 1 before Plan 2: try simpler registration first; fallback adds complexity that may be unnecessary given v2.1.82 fixes
- Verification is built into Plan 1, not a separate phase: reload plugins, submit a prompt, ask Claude what context it received — this is the go/no-go gate for whether Plan 2 is needed
- No post-launch tuning phase: importance >= 7 + k=5 is validated by existing load-context skill; only add a tuning phase if real usage shows consistent noise or consistent sparsity after launch

### Research Flags

**Needs verification during implementation (not pre-research — requires running code):**
- **Plan 1 — Bug #12151 status on v2.1.92:** Cannot confirm without running the hook and observing output capture. Verification protocol is defined: reload plugins, submit prompt, ask Claude what context it received.
- **Plan 1 — Bug #34713 false error labels:** Cannot confirm without running on current version. Visual check of transcript during integration testing.
- **Plan 1 — Async mode for `additionalContext`:** STACK.md and PITFALLS.md give conflicting guidance on whether async UserPromptSubmit can inject context for the current prompt. STACK.md says it cannot; PITFALLS.md suggests trying it as a latency optimization. Verify experimentally only if synchronous 400ms latency becomes a real problem.

**Standard patterns (no additional research needed):**
- **Hook script implementation:** Pattern is identical to `gsd-project-context.js`. Copy structure, adapt for UserPromptSubmit stdin/stdout contract.
- **forgetful-client.js reuse:** Same `require('../scripts/forgetful-client')` pattern used in 4 existing scripts. No new API surface.
- **Graceful degradation:** `.catch(() => process.exit(0))` is an established project convention. Direct copy.
- **Output format:** `<forgetful_context>` XML tag follows established convention from GSD scripts. Claude already interprets these blocks.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies existing and proven. Node.js vs bash benchmark measured on target machine 2026-04-05. Hook I/O contract verified against official docs. Zero new dependencies. |
| Features | HIGH | Must-have features are direct extensions of proven patterns from 4 existing scripts. Deferred features clearly identified with rationale. Anti-features well-argued against comparable systems. |
| Architecture | HIGH | Single new file following established pattern. Component boundaries are crisp. Three open bugs identified with specific issue numbers, clear mitigations, and conditional fallback plans. |
| Pitfalls | HIGH | Verified against open GitHub issues with specific bug numbers and confirming commenters. Recovery strategies defined for every pitfall. Performance budget measured, not estimated. |

**Overall confidence:** HIGH

### Gaps to Address

- **Bug #12151 actual status on v2.1.92:** Research found the bug open but v2.1.82 changelog entries may have resolved it. Cannot confirm without running the code. Plan 2 is fully pre-designed as the fallback so the implementation path is clear regardless of outcome.
- **Async `additionalContext` timing:** STACK.md says async hooks cannot inject context for the current prompt. PITFALLS.md says to try it as a latency optimization. Official docs are ambiguous. Verify experimentally only if synchronous 400ms latency becomes an observed problem.
- **Importance threshold tuning:** 7 is borrowed from the load-context skill. Appropriate for interactive browsing; may be too high or too low for auto-inject. Treat as a post-launch observable metric, not a pre-launch blocker.

## Sources

### Primary (HIGH confidence)

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — UserPromptSubmit stdin format (`prompt` field), output format (`hookSpecificOutput.additionalContext`), exit codes, timeout defaults, 10,000-char limit. Verified 2026-04-05.
- Existing codebase: `scripts/forgetful-client.js`, `scripts/gsd-project-context.js`, `scripts/gsd-plan-context.js`, `scripts/gsd-discuss-context.js` — proven patterns for session creation, project resolution, memory querying, output formatting
- Existing codebase: `hooks/hooks.json`, `hooks/session-start.sh`, `bin/curate-discoveries` — working hook infrastructure in production
- Live benchmarks on target machine 2026-04-05: Node.js 23ms startup, 405ms full round-trip vs bash+curl 518ms
- [Claude Code Changelog v2.1.82](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) — fixed "plugin hooks being silently dropped," "plugin Stop/SessionEnd hooks not firing after /plugin operation"

### Secondary (MEDIUM confidence)

- [Bug #12151](https://github.com/anthropics/claude-code/issues/12151) — OPEN, plugin hook output silently discarded, 23 comments, confirmed on v2.1.45
- [Bug #34713](https://github.com/anthropics/claude-code/issues/34713) — OPEN, false hook error labels causing premature turn termination in plugin-heavy setups
- [Bug #17550](https://github.com/anthropics/claude-code/issues/17550) — CLOSED Feb 2026, hookSpecificOutput first-message errors; workaround was plain text
- [memsearch ccplugin](https://github.com/zilliztech/memsearch/tree/main/ccplugin), [claude-mem](https://github.com/thedotmack/claude-mem) — reference implementations for UserPromptSubmit auto-inject pattern; latency targets and failure mode conventions
- [RAG relevance threshold best practices](https://meisinlee.medium.com/better-rag-retrieval-similarity-with-threshold-a6dbb535ef9e) — importance threshold rationale, no universal optimal value
- [MCP Transport Performance Benchmarks](https://www.tmdevlab.com/mcp-server-performance-benchmark-v2.html) — 10-50ms HTTP latency floor, session reuse benefit

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
