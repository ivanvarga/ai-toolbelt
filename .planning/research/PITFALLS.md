# Pitfalls Research

**Domain:** Auto-inject Forgetful context via UserPromptSubmit hook (v1.2 milestone)
**Researched:** 2026-04-05
**Confidence:** HIGH (verified against Claude Code issue tracker, official hooks docs, existing codebase analysis, and v1.1 pitfall outcomes)

## Critical Pitfalls

### Pitfall 1: Plugin Hook Output Silently Discarded (Bug #12151 -- STILL OPEN)

**What goes wrong:**
UserPromptSubmit hooks defined in plugin `hooks/hooks.json` execute successfully but their stdout/additionalContext is never injected into Claude's conversation context. The hook runs, Forgetful returns data, but Claude never sees it. Zero error messages.

**Why it happens:**
Claude Code's hook output capture pipeline treats plugin-scoped hooks differently from user-level hooks. Bug #12151 remains OPEN as of April 5, 2026 (23 comments, filed Feb 2026). Multiple users on v2.1.42+ confirm the behavior. Native hooks in `~/.claude/settings.json` with identical output work correctly (confirmed by @prodan-s on v2.1.45).

**How to avoid:**
1. Register the UserPromptSubmit hook in `~/.claude/settings.json`, NOT in plugin `hooks/hooks.json`.
2. Keep the hook script in the plugin repo (e.g., `hooks/user-prompt-context.sh`). Only the registration goes to settings.json.
3. Bootstrap skill writes the hook config to settings.json using the resolved absolute path to the cached plugin's hook script.
4. Include `hookEventName: "UserPromptSubmit"` in all JSON output -- this is silently required (confirmed by @jpicklyk, Feb 2026).
5. Track #12151 -- when fixed, migrate registration back to plugin hooks.json.

**Warning signs:**
Ask Claude "what additional context did you receive from hooks?" If Claude has no awareness of injected memory context, the output is being discarded. Run with `--debug` to see hook execution logs vs. context injection.

**Phase to address:**
Phase 1 (hook infrastructure). This is the make-or-break constraint -- if not addressed, the entire feature is silently broken.

---

### Pitfall 2: Every-Prompt Latency Tax From MCP Session Initialization

**What goes wrong:**
Unlike v1.1's GSD-only hooks, the v1.2 hook runs on EVERY prompt. Each invocation creates a new MCP session (initialize + notifications/initialized + tool call = 3 HTTP round trips). The existing `forgetful-client.js` has `DEFAULT_TIMEOUT = 5000` and `TOOL_TIMEOUT = 10000`. Even when Forgetful is healthy, session creation + query takes 150-400ms. On every single prompt, this adds perceptible lag between pressing Enter and Claude starting to respond.

**Why it happens:**
The existing forgetful-client was designed for GSD-only use (runs maybe 5-10 times per session). At every-prompt frequency, the cumulative overhead changes from "barely noticeable" to "constantly annoying." MCP Streamable HTTP transport has a fixed 10-50ms overhead floor per request, and three round trips compounds this.

**How to avoid:**
1. Set a strict `timeout: 3` on the hook definition (3 seconds total, not the default 600).
2. Use `--connect-timeout 1 --max-time 2` equivalent in the Node.js fetch calls (`AbortSignal.timeout(2000)`).
3. Run the hook with `"async": true` in the hook config. UserPromptSubmit supports async hooks -- the context arrives slightly after the prompt but before Claude's response completes. This eliminates blocking entirely.
4. If async is not supported for UserPromptSubmit additionalContext (verify experimentally), then the fast-path optimization is critical: detect trivial/short prompts (like "yes", "ok", "continue") and exit immediately without querying.

**Warning signs:**
Noticeable pause after pressing Enter on every prompt. Time the hook with `time node hooks/user-prompt-context.js` in isolation -- anything over 500ms is a red flag.

**Phase to address:**
Phase 1 (hook script implementation). Performance budget must be defined upfront: max 500ms synchronous, or use async mode.

---

### Pitfall 3: Context Noise Drowns Signal -- Irrelevant Memories on Every Prompt

**What goes wrong:**
Not every prompt benefits from memory context. "Fix the typo on line 42" does not need 5 Forgetful memories about architecture decisions. Injecting irrelevant context on every prompt wastes tokens, confuses the model, and degrades response quality. The "lost in middle" effect means injected context gets ignored in long conversations, but still consumes token budget.

**Why it happens:**
Semantic search returns "most similar" results, not "most useful for this prompt" results. A prompt about a CSS fix will still match memories about the project because project terms appear in both. The hook has no way to judge relevance -- it returns whatever Forgetful considers closest. At every-prompt frequency, the noise compounds across turns.

**How to avoid:**
1. Apply a minimum similarity threshold on query results. If the best match is below threshold, inject nothing. Silence is better than noise.
2. Limit to `k: 3` memories maximum. Return only title + one-sentence summary (~200-300 tokens total). Let Claude fetch full content via MCP if needed.
3. Consider prompt classification: only query Forgetful when the prompt looks like a decision, architecture question, or new feature start. Short/continuation prompts get no injection. Classification can be keyword-based (check for "how", "should", "design", "implement", "architecture", "pattern") rather than LLM-based.
4. Format injected context with clear XML delimiters and a brief meta-note: `<forgetful_context note="3 potentially relevant memories. Use /tb:load-context for full details.">`. This lets Claude decide relevance rather than treating injected content as authoritative instructions.

**Warning signs:**
Claude starts referencing injected memories that have nothing to do with the current task. Responses become longer/less focused. Token usage per turn increases noticeably.

**Phase to address:**
Phase 1 (query design) and Phase 2 (relevance tuning). Get the basic filter working first, then tune thresholds based on real usage.

---

### Pitfall 4: Token Budget Exhaustion From Cumulative Injection

**What goes wrong:**
Hook output has a 10,000-character hard cap (after which Claude Code saves to file and provides a preview). But even within that cap, injecting ~1500-2000 tokens per prompt across a 50-turn conversation means 75K-100K tokens consumed by hook context alone. Claude Code's context window is 200K with compaction at ~167K. System prompt + tools + skills already consume ~29K. This leaves ~138K for conversation, and cumulative hook injection eats 50-70% of it.

**Why it happens:**
Each individual injection seems small ("only 1500 tokens"). But it adds up across every turn. Unlike conversation messages which get compacted, hook context is fresh each turn -- it does not benefit from conversation summarization during compaction. Developers test with 5-10 turns and miss the cumulative effect visible at 40-50 turns.

**How to avoid:**
1. Set a hard budget: max 500 tokens of injected context per prompt. This is ~3 memory titles with one-line summaries.
2. Track cumulative injection size across the session if possible (or at minimum, know the theoretical worst case: 500 tokens x N turns).
3. Use the `additionalContext` field (injected "more discretely" per docs) rather than plain stdout, which takes up more visible space in the transcript.
4. Consider a session-level deduplication strategy: if the same memories were already injected in recent turns, skip re-injection.

**Warning signs:**
`/context` showing unexpectedly high usage. Compaction happening earlier than expected. Claude "forgetting" instructions from earlier in the conversation.

**Phase to address:**
Phase 1 (output formatting). Define the token budget before writing any output logic.

---

### Pitfall 5: False "Hook Error" Labels Cause Premature Turn Termination (Bug #34713 -- OPEN)

**What goes wrong:**
Claude Code displays "hook error" in the transcript for every hook execution, even when hooks exit 0 with valid JSON. On an every-prompt hook, this means EVERY user message shows a "UserPromptSubmit hook error" label. In plugin-heavy setups, these phantom errors compound across tool calls. The model interprets accumulated "error" labels as something being wrong and prematurely ends its turn.

**Why it happens:**
Bug #34713 is OPEN as of April 5, 2026. The display issue affects all hook types. For hooks that fire occasionally (like SubagentStop), this is cosmetic. For an every-prompt hook, it is functionally destructive -- Claude sees "error" on every single turn.

**How to avoid:**
1. Test the hook in isolation first to confirm whether the false "hook error" label appears with the current Claude Code version.
2. If the bug is present, consider using `"suppressOutput": true` in the hook JSON output to hide stdout from verbose mode -- though this may not suppress the error label itself.
3. As a last resort, if false error labels degrade Claude's behavior: switch from UserPromptSubmit hook to a different injection mechanism (e.g., SessionStart for initial context, then rely on Forgetful MCP for per-prompt queries triggered by Claude itself).
4. Monitor Claude Code releases for a fix to #34713.

**Warning signs:**
"hook error" appearing in the transcript after every prompt. Claude becoming cautious, cutting turns short, or adding unnecessary caveats to responses.

**Phase to address:**
Phase 1 (integration testing). Must verify behavior on current Claude Code version before committing to the UserPromptSubmit approach.

---

### Pitfall 6: Forgetful Server Unreachable Blocks Every Prompt

**What goes wrong:**
In v1.1, Forgetful downtime only affected GSD commands. In v1.2, it affects EVERY prompt. If Forgetful is unreachable and the hook lacks fast-fail logic, every single interaction stalls. The user cannot even type "hello" without waiting for a timeout.

**Why it happens:**
Developers test with Forgetful running and forget the failure path. The existing `forgetful-client.js` has `DEFAULT_TIMEOUT = 5000` (5 seconds) per HTTP call. With 3 calls per invocation (initialize + initialized + tool call), worst case is 15 seconds per prompt. Even with 2-second timeouts, 6 seconds of lag on every prompt is unacceptable.

**How to avoid:**
1. Health-check cache: On first invocation, try connecting. If it fails, set a flag (environment variable or temp file) and skip all subsequent invocations for the session. Re-check periodically (every 50 prompts or every 5 minutes).
2. Connection pooling: Resolve the Forgetful URL once at process start. If URL resolution fails (no config), exit immediately (0ms overhead).
3. Total wall-clock budget for the hook: 2 seconds absolute max. If any step exceeds this, abort and output nothing.
4. Run with `"async": true` so even worst-case timeout does not block the user.

**Warning signs:**
Lag after every keystroke/Enter when Forgetful server is stopped. Users complaining about slowness in unrelated work (non-GSD prompts).

**Phase to address:**
Phase 1 (degradation logic). The failure path must be designed before the happy path.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| New MCP session per hook invocation | Simple, stateless | 150-400ms overhead per prompt | Acceptable if hook is async; unacceptable if synchronous |
| Hardcoded similarity threshold | Works for current project | Different projects need different thresholds | MVP only -- make configurable via env var or config file |
| No prompt classification (query on every prompt) | Simpler implementation | Wastes tokens and latency on trivial prompts | Never -- even basic keyword detection is worth the complexity |
| Registering hook in settings.json instead of plugin hooks.json | Works around #12151 | Breaks plugin portability, requires manual cleanup | Acceptable until #12151 is fixed |
| Truncating memory content to first N chars | Caps token usage | Loses critical detail that may be in the middle/end of a memory | Acceptable with clear signal to Claude that truncation occurred |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| UserPromptSubmit JSON output | Omitting `hookEventName` in hookSpecificOutput | Always include `"hookEventName": "UserPromptSubmit"` -- silently required |
| UserPromptSubmit JSON output | Mixing plain stdout with JSON | Choose one: either plain text OR JSON. If both present, only JSON is processed |
| Hook registration in settings.json | Writing absolute path to plugin cache with version number | Use a stable path (bin/ wrapper or symlink) that survives plugin updates |
| forgetful-client session flow | Calling `query_memory` as top-level MCP tool | Must wrap in `execute_forgetful_tool({ tool_name: "query_memory", arguments: {...} })` |
| Async hook output | Assuming additionalContext arrives before Claude's first response token | Async output may arrive mid-response; verify timing experimentally |
| Hook stdin parsing | Using `read` for stdin (misses multi-line JSON) | Use `cat` or read entire stdin buffer; parse with `jq` |
| Exit codes | Using `exit 1` for "no results found" | Exit 1 = non-blocking error shown in verbose mode. Use `exit 0` with empty output for "nothing to inject" |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 3 HTTP round trips per invocation (init + notify + call) | 150-400ms per prompt | Use async hook; explore session reuse across invocations | Immediately noticeable on synchronous hook |
| Querying Forgetful on "yes"/"ok"/"continue" prompts | Wasted 200ms+ on prompts that need zero context | Keyword/length filter: skip prompts under 20 chars or matching trivial patterns | Every session, multiple times |
| `resolveForgetfulUrl()` reads ~/.claude.json from disk on every invocation | Disk I/O on every prompt | Cache the URL in an env var at session start or after first resolution | Unnoticeable on SSD, but wasteful |
| Full memory content in hook output when title+summary suffices | 2000+ tokens per injection instead of 300 | Return titles + first sentence only; Claude fetches full via MCP | Cumulative: noticeable at 30+ turns |
| No dedup across turns | Same 3 memories injected 50 times in a session | Track recently-injected memory IDs; skip re-injection within N turns | Mid-session, when conversation circles back to same topics |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging full Forgetful URL (including host:port) to stdout | URL may contain internal network addresses | Log connection status ("connected"/"failed"), not the URL itself |
| Memory content injected into context without sanitization | Forgetful memories could contain prompt injection payloads if compromised | Treat memory content as data, not instructions; wrap in XML data tags |
| Hook reads ~/.claude.json for Forgetful URL | Could expose other config entries if parsing is careless | Extract only `mcpServers.forgetful.url`; never log the full config object |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Injecting context on every prompt with no way to disable | User cannot opt out when memories are unhelpful | Provide `/tb:auto-context off` toggle that sets a session flag |
| No indication that context was injected | User does not know if the feature is working | Include a brief one-line note visible in verbose mode: "Injected 3 memories from Forgetful" |
| Noisy injection on simple prompts | "Fix the typo" gets 3 unrelated architecture memories prepended | Prompt classification: skip injection for short/simple/continuation prompts |
| Memories referencing obsolete decisions | Claude follows outdated patterns because memory says so | Include memory age in output; add "recency" weighting to query |

## "Looks Done But Isn't" Checklist

- [ ] **Hook registration:** Registered in settings.json (not plugin hooks.json) -- verify output actually reaches Claude by asking it
- [ ] **hookEventName included:** JSON output includes `"hookEventName": "UserPromptSubmit"` -- omitting this silently breaks injection
- [ ] **Failure path tested:** Forgetful stopped, hook exits 0 within 500ms with no output -- verify no stall
- [ ] **Every-prompt overhead measured:** Time the hook in isolation; confirm <500ms sync or async mode enabled
- [ ] **Token budget verified:** Check `/context` after 20+ turns; confirm hook context is not dominating token usage
- [ ] **Trivial prompt handling:** Type "ok" and verify no Forgetful query fires (check with --debug)
- [ ] **Plugin update survives:** Run `/tb:update`, verify hook path in settings.json still resolves
- [ ] **False error labels checked:** Verify whether bug #34713 manifests on current Claude Code version
- [ ] **Cross-project isolation:** Open a different repo, verify memories from other projects do not appear
- [ ] **Compaction behavior:** Run 40+ turns, verify compaction does not lose critical earlier conversation context

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bug #12151 (output discarded from plugin hooks) | LOW | Move hook registration to settings.json; keep script in plugin repo |
| Every-prompt latency | LOW | Add `"async": true` to hook config; no code changes needed |
| Token budget exhaustion | MEDIUM | Reduce k from 5 to 2; truncate to titles only; requires hook script edit |
| False hook error labels (#34713) | HIGH | No clean fix; may require switching injection mechanism entirely |
| Forgetful unreachable blocking | LOW | Add health-check cache + 2s total timeout; hook script edit |
| Noise from irrelevant memories | MEDIUM | Add prompt classification + similarity threshold; requires iterative tuning |
| Plugin update breaks hook path | LOW | Update skill patches settings.json path; doctor check catches it |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #12151 output discard | Phase 1 (hook infrastructure) | Ask Claude what context it received; must report injected memories |
| Every-prompt latency | Phase 1 (hook implementation) | `time` the hook script; <500ms or async mode confirmed |
| Context noise | Phase 1 (query design) + Phase 2 (tuning) | Test with 10 varied prompts; irrelevant prompts get zero injection |
| Token budget | Phase 1 (output formatting) | `/context` after 30 turns shows <15% hook overhead |
| False hook error #34713 | Phase 1 (integration test) | Visual check of transcript for phantom error labels |
| Forgetful unreachable | Phase 1 (degradation logic) | Stop Forgetful, send 5 prompts, all respond within 1 second |
| Hook path after update | Phase 2 or 3 (update integration) | Run update, verify hook still fires |
| Cross-project contamination | Phase 1 (project scoping) | Open different repo, verify zero cross-project memories |
| Prompt classification misfire | Phase 2 (tuning) | Verify "implement a new API endpoint" triggers injection but "ok" does not |

## Sources

- [Plugin hook output bug #12151](https://github.com/anthropics/claude-code/issues/12151) -- OPEN, 23 comments, confirmed by @prodan-s on v2.1.45 (Feb 2026)
- [UserPromptSubmit not triggering with initial prompt #17284](https://github.com/anthropics/claude-code/issues/17284) -- CLOSED, was regression in v2.0.77+
- [Feature: updatedPrompt for UserPromptSubmit #27365](https://github.com/anthropics/claude-code/issues/27365) -- OPEN, no prompt modification support yet
- [False "Hook Error" labels #34713](https://github.com/anthropics/claude-code/issues/34713) -- OPEN, causes premature turn termination in plugin-heavy setups
- [Cowork plugin hooks never fire #27398](https://github.com/anthropics/claude-code/issues/27398) -- CLOSED, was scoping issue
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- 10,000-char output cap, UserPromptSubmit spec, timeout defaults
- [MCP Transport Performance Benchmarks](https://www.tmdevlab.com/mcp-server-performance-benchmark-v2.html) -- 10-50ms HTTP latency floor, 10x session reuse benefit
- Existing codebase: `forgetful-client.js` (5s/10s timeouts), `hooks/hooks.json` (SessionStart + SubagentStop patterns), `gsd-*-context.js` (query patterns)
- v1.1 PITFALLS.md -- carried forward pitfalls #1, #2, #3, #5 with v1.2-specific updates

---
*Pitfalls research for: tb plugin v1.2 -- auto-inject Forgetful context on every prompt*
*Researched: 2026-04-05*
