---
phase: 22-auto-inject-forgetful-context-on-every-prompt
verified: 2026-04-09T16:00:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 9/11
  gaps_closed:
    - "hooks.json contains SubagentStop, SessionStart, and UserPromptSubmit (regression restored)"
    - "Hook self-terminates within 3 seconds via internal Promise.race timeout"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Confirm UserPromptSubmit hook output is captured by Claude"
    expected: "After a non-trivial prompt, Claude reports receiving forgetful_context XML block in additionalContext if Forgetful is running with project memories"
    why_human: "Bug #12151 means plugin hooks.json output may be silently discarded. Cannot verify capture without a live Claude session and Forgetful server."
  - test: "Confirm failure notice appears exactly once when Forgetful is unreachable"
    expected: "First prompt while Forgetful is down produces the one-time notice. Second prompt produces no output."
    why_human: "Requires simulating Forgetful downtime and inspecting Claude transcript across multiple prompts."
---

# Phase 22: Auto-inject Forgetful Context Verification Report

**Phase Goal:** User prompts automatically trigger Forgetful similarity search with project scoping, filtered by importance
**Verified:** 2026-04-09T16:00:00Z
**Status:** human_needed
**Re-verification:** Yes -- after gap closure (plan 22-03, commit 411d2a6)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User prompt automatically triggers Forgetful similarity search scoped to current project | VERIFIED | queryForgetful() calls createSession+resolveProjectId+callTool/query_memory with project_ids from git remote |
| 2 | Relevant memories appear in Claude's context as XML-tagged compact snippets | VERIFIED | forgetful_context tags, 300-char substring(0,300), title+importance format, hookSpecificOutput additionalContext |
| 3 | Prompts starting with /gsd: or /tb:load-context skip Forgetful entirely | VERIFIED | Regex `/^\/?gsd:|^\/?tb:load-context/i` at line 139; behavioral test passes (exit 0, no output) |
| 4 | Short trivial prompts (yes, ok, continue, etc.) skip Forgetful entirely | VERIFIED | isTrivialPrompt: 23-word TRIVIAL_PATTERNS Set, length < 20 AND pattern match; behavioral test passes |
| 5 | Any failure produces exit 0 with no output | VERIFIED | All code paths end in process.exit(0); outer main().catch(() => process.exit(0)) catches leaks |
| 6 | First Forgetful failure in session delivers one-time notice; subsequent failures silent | VERIFIED | failureFlagPath() uses process.ppid; first catch writes flag + outputFailureNotice(); flag check at top of main() |
| 7 | Project ID is cached to temp file after first resolution | VERIFIED | getCachedProjectId/setCachedProjectId with 1-hour TTL at tb-project-{repo}.json |
| 8 | Hook completes within 3 seconds under normal conditions | VERIFIED | Promise.race([queryForgetful(prompt), timeout]) with 3000ms setTimeout + timer.unref(); hooks.json 10s as hard ceiling |
| 9 | Doctor check reports whether UserPromptSubmit hook is registered and script exists | VERIFIED | scripts/checks/user-prompt-hook.sh; behavioral test: "PASS user-prompt-hook UserPromptSubmit hook registered and script exists" |
| 10 | Doctor check detects settings.json fallback registration as alternative | VERIFIED | elif branch in user-prompt-hook.sh checks ~/.claude/settings.json for UserPromptSubmit key |
| 11 | Bootstrap skill auto-registers hook in settings.json when plugin hooks.json output is not captured | VERIFIED | skills/bootstrap/SKILL.md step 5 provides python3 json merge registration; step 6 summary reports hook status |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `hooks/user-prompt-context.js` | UserPromptSubmit hook script | VERIFIED | 161 lines, executable, syntax valid, all 19 content checks pass |
| `hooks/hooks.json` | Hook registration with SessionStart, SubagentStop, UserPromptSubmit | VERIFIED | All 3 entries present; SubagentStop: matcher gsd-phase-researcher, async true, timeout 120; UserPromptSubmit: timeout 10, no async, no matcher |
| `scripts/checks/user-prompt-hook.sh` | Doctor check for UserPromptSubmit hook | VERIFIED | 59 lines, executable, bash syntax valid, outputs PASS format |
| `skills/bootstrap/SKILL.md` | Extended bootstrap with settings.json fallback | VERIFIED | Step 5 has UserPromptSubmit + settings.json fallback; 6 step headings (1-6) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| hooks/user-prompt-context.js | scripts/forgetful-client.js | require('../scripts/forgetful-client') | VERIFIED | Line 6: exact match |
| hooks/user-prompt-context.js | Forgetful MCP server | callTool with execute_forgetful_tool/query_memory | VERIFIED | Lines 101-110: query_memory with project_ids, k:5 |
| hooks/hooks.json | hooks/user-prompt-context.js | command field in UserPromptSubmit entry | VERIFIED | "node ${CLAUDE_PLUGIN_ROOT}/hooks/user-prompt-context.js" |
| hooks/hooks.json | bin/curate-discoveries | SubagentStop command field | VERIFIED | "${CLAUDE_PLUGIN_ROOT}/bin/curate-discoveries" with async:true, timeout:120 |
| scripts/checks/user-prompt-hook.sh | hooks/hooks.json | python3 JSON parse checking for UserPromptSubmit | VERIFIED | Line 8: python3 assert UserPromptSubmit in hooks |
| scripts/checks/user-prompt-hook.sh | hooks/user-prompt-context.js | file existence check on resolved command path | VERIFIED | Lines 46-49: RESOLVED + SCRIPT_PATH + -f check |
| skills/bootstrap/SKILL.md | ~/.claude/settings.json | python3 json merge to add UserPromptSubmit | VERIFIED | Step 5 uses python3 json merge with setdefault |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| hooks/user-prompt-context.js | memories | callTool execute_forgetful_tool/query_memory -> parseMemories() -> filter(importance>=7) | Conditionally (Forgetful server required) | FLOWING (when Forgetful available) |
| hooks/user-prompt-context.js | projectId | callTool execute_forgetful_tool/list_projects + 1h TTL cache | Conditionally (Forgetful server required) | FLOWING (when Forgetful available) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| /gsd: prompt skip | `echo '{"prompt":"/gsd:plan-phase test"}' \| node hooks/user-prompt-context.js` | No output, exit 0 | PASS |
| /tb:load-context skip | `echo '{"prompt":"/tb:load-context something"}' \| node hooks/user-prompt-context.js` | No output, exit 0 | PASS |
| Trivial prompt skip | `echo '{"prompt":"ok"}' \| node hooks/user-prompt-context.js` | No output, exit 0 | PASS |
| Empty prompt skip | `echo '{"prompt":""}' \| node hooks/user-prompt-context.js` | No output, exit 0 | PASS |
| Doctor check runs | `bash scripts/checks/user-prompt-hook.sh .` | PASS user-prompt-hook UserPromptSubmit hook registered and script exists | PASS |
| Syntax valid | `node -c hooks/user-prompt-context.js` | No errors | PASS |
| hooks.json valid JSON | `python3 -c "import json; json.load(open('hooks/hooks.json'))"` | No errors | PASS |
| hooks.json 3 entries | python3 assert set == {SessionStart, SubagentStop, UserPromptSubmit} | All 3 entries present | PASS |
| SubagentStop config | python3 assert matcher/async/timeout/command | gsd-phase-researcher, true, 120, curate-discoveries | PASS |
| Internal timeout | python3 assert Promise.race + 3000 + timer.unref | All present | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CTXI-01 | 22-01 | Forgetful similarity search with project scoping via git remote | SATISFIED | extractRepoName + resolveProjectId + project_ids in query_memory callTool |
| CTXI-02 | 22-01 | Structured additionalContext JSON with XML-tagged compact snippets (300 char, title + importance) | SATISFIED | Lines 115-131: forgetful_context tags, substring(0,300), title+importance format |
| CTXI-03 | 22-01 | Hook exits silently (exit 0, no output) on any failure | SATISFIED | All code paths end in process.exit(0); main().catch(() => process.exit(0)) |
| CTXI-04 | 22-01 | Hook completes within 3 seconds; times out gracefully if slower | SATISFIED | Promise.race with 3000ms setTimeout + timer.unref(); 10s hooks.json hard cap |
| CTXI-05 | 22-01 | Results filtered by importance threshold (>=7) and low-K retrieval (k=5) | SATISFIED | Line 112: .filter(m => m.importance >= 7); line 106: k: 5 |
| CTXI-06 | 22-01 | Skip when prompt starts with /gsd: or /tb:load-context | SATISFIED | Line 139: /^\/?gsd:|^\/?tb:load-context/i regex |
| CTXI-07 | 22-01 | Project ID cached per session | SATISFIED | getCachedProjectId/setCachedProjectId with 1-hour TTL |
| HOOK-01 | 22-01, 22-03 | UserPromptSubmit hook registered in hooks.json (synchronous, ~10s timeout) | SATISFIED | timeout:10, no async field, no matcher; SubagentStop also restored |
| HOOK-02 | 22-02 | Doctor check verifies UserPromptSubmit hook registered and script exists | SATISFIED | scripts/checks/user-prompt-hook.sh passes with correct PASS output |
| HOOK-03 | 22-02 | Fallback to settings.json if plugin hooks.json output discarded | SATISFIED | bootstrap step 5 provides fallback registration procedure |

### Anti-Patterns Found

None. All previously identified anti-patterns have been resolved:
- SubagentStop regression: restored in commit 411d2a6
- CTXI-04 missing internal timeout: resolved with Promise.race + timer.unref() in commit 411d2a6

### Human Verification Required

#### 1. UserPromptSubmit Output Capture (Bug #12151)

**Test:** Start a Claude session with the tb plugin loaded. Submit a non-trivial prompt about the current project. Ask Claude "what Forgetful context was injected with your last prompt?"
**Expected:** Claude reports receiving forgetful_context XML block in additionalContext (if Forgetful is running with project memories)
**Why human:** Plugin hooks.json output may be silently discarded due to bug #12151. Cannot verify capture programmatically without a live Claude session and Forgetful server.

#### 2. One-Time Failure Notice

**Test:** Stop the Forgetful server. Submit two non-trivial prompts back to back. Check if failure notice appears exactly once.
**Expected:** First prompt transcript shows the one-time notice about Forgetful being unreachable. Second prompt has no notice.
**Why human:** Requires simulating Forgetful downtime and inspecting Claude transcript across multiple prompts.

### Re-verification Summary

Both gaps from the initial verification are now closed:

**Gap 1 (was Blocker): SubagentStop regression** -- hooks.json now contains all three hook event types: SessionStart, SubagentStop (matcher gsd-phase-researcher, async true, timeout 120, command curate-discoveries), and UserPromptSubmit. Verified by python3 assertion check and behavioral tests.

**Gap 2 (was Warning): CTXI-04 internal timeout** -- user-prompt-context.js now extracts Forgetful operations into a queryForgetful() helper and races it against a 3000ms setTimeout with timer.unref(). The hook self-terminates gracefully at 3 seconds without relying solely on the 10s hooks.json process kill. Verified by content checks confirming Promise.race, 3000, timer.unref, and queryForgetful are all present.

All 11 must-have truths are now verified. Two human verification items remain (unchanged from initial verification) -- these require a live Claude session with Forgetful running and cannot be automated.

---

_Verified: 2026-04-09T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
