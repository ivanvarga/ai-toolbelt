# Phase 22: Auto-inject Forgetful Context - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 22-auto-inject-forgetful-context-on-every-prompt
**Areas discussed:** Trivial prompt filtering, Hook registration strategy, Failure visibility, Project ID caching

---

## Trivial Prompt Filtering

### Q1: Should the hook skip Forgetful queries for short/trivial prompts?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip short prompts | Skip queries when prompt is under ~20 chars or matches common continuation patterns. Saves 400ms on throwaway prompts. | ✓ |
| Query everything | Always query Forgetful regardless of prompt length. Simpler code, consistent behavior. | |
| You decide | Claude picks the approach during implementation. | |

**User's choice:** Skip short prompts
**Notes:** None

### Q2: How should trivial prompts be detected?

| Option | Description | Selected |
|--------|-------------|----------|
| Length threshold only | Skip prompts under 20 characters. Simple, catches most trivial prompts. | |
| Length + pattern list | Skip under 20 chars AND match a list of common patterns (yes, no, ok, continue, etc). More thorough. | ✓ |
| You decide | Claude picks the detection strategy. | |

**User's choice:** Length + pattern list
**Notes:** None

---

## Hook Registration Strategy

### Q3: How should the UserPromptSubmit hook be registered?

| Option | Description | Selected |
|--------|-------------|----------|
| hooks.json first, fallback if needed | Register in plugin hooks.json. Verify output capture. Fall back to settings.json if bug #12151 bites. | ✓ |
| Straight to settings.json | Skip hooks.json, register directly in ~/.claude/settings.json via bootstrap. Proven v1.1 approach. | |
| Both simultaneously | Register in both. Belt-and-suspenders. Risk of double execution. | |

**User's choice:** hooks.json first, fallback if needed
**Notes:** None

### Q4: If hooks.json output capture fails, how should the fallback work?

| Option | Description | Selected |
|--------|-------------|----------|
| Doctor check warns, manual fix | Doctor reports issue, user decides when to fix. Lower complexity. | |
| Bootstrap auto-registers | Bootstrap skill auto-detects and registers in settings.json. Seamless. | ✓ |
| You decide | Claude picks the fallback approach. | |

**User's choice:** Bootstrap auto-registers
**Notes:** None

---

## Failure Visibility

### Q5: When Forgetful is unreachable, should the user be notified?

| Option | Description | Selected |
|--------|-------------|----------|
| Completely silent | Exit 0, no output. Matches existing gsd-context behavior. Zero noise. | |
| One-time session notice | First failure logs brief note. Subsequent failures silent. Helps debugging. | ✓ |
| Always visible in verbose | Log to stderr on every failure. Only visible with --debug. | |

**User's choice:** One-time session notice
**Notes:** None

### Q6: How should the one-time notice be delivered?

| Option | Description | Selected |
|--------|-------------|----------|
| additionalContext message | Inject via additionalContext. Claude sees it, user sees in verbose. | |
| stderr only | Write to stderr (--debug mode only). Less intrusive. | |
| You decide | Claude picks the notification mechanism. | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Project ID Caching

### Q7: Should project ID caching be included in v1.2?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include in v1.2 | Cache to temp file keyed by repo name. Saves ~100ms per prompt. | ✓ |
| Defer to future | Ship without caching. Add only if latency is a problem. | |
| You decide | Claude evaluates during implementation. | |

**User's choice:** Yes, include in v1.2
**Notes:** None

### Q8: How should the project ID cache be invalidated?

| Option | Description | Selected |
|--------|-------------|----------|
| TTL-based | Cache expires after N minutes (e.g., 30min). Simple, covers repo switches. | |
| Session-scoped | Cache lives for Claude Code session only. Cleared on SessionStart. | |
| You decide | Claude picks the invalidation strategy. | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Claude's Discretion

- Notification mechanism for one-time Forgetful failure notice
- Cache invalidation strategy for project ID cache
- Exact trivial prompt pattern list composition
- Output formatting details within established conventions

## Deferred Ideas

None — discussion stayed within phase scope
