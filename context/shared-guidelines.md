# tb shared guidelines

Reusable, machine-agnostic dev guidance, maintained centrally in the tb plugin and
imported into your global `~/.claude/CLAUDE.md` via `/tb:sync`.

- Edit this file **in the plugin repo**, not the synced copy at
  `~/.claude/tb/shared-guidelines.md` — that copy is overwritten on every `/tb:sync`.
- This file ships in the **public** plugin repo. Put only non-sensitive, genuinely
  shareable content here — no machine specifics, no secrets, no private project context.

## Bash Command Structure (avoid permission prompts)

Claude Code has hardcoded safety rules that trigger manual approval regardless of allowlist. To avoid needless prompts:

- NEVER combine `cd` with output redirection (`>`, `2>`, `>>`) in one command — triggers path-resolution bypass check. When working in another directory: (a) issue `cd /foo` as a separate Bash call (working dir persists across Bash calls in the same session), then run the command in a follow-up call; or (b) use absolute paths. Bad: `cd /foo && ls 2>/dev/null`. Good: two calls — `cd /foo`, then `ls 2>/dev/null`. Also good: `ls /foo/* 2>/dev/null`.
- NEVER use backslash-escaped whitespace in paths. Quote the path instead. Bad: `ls /foo/Target\ Support\ Files`. Good: `ls "/foo/Target Support Files"`.
- PREFER single-stage commands over compound `;`/`&&` chains. Multi-stage chains don't match simple allowlist prefixes and trigger approval. Split into separate Bash calls — each matches the allowlist cleanly.
- When inspecting build artifacts in `~/Library/Developer/Xcode/DerivedData/`, expect dynamic hash paths — don't rely on "don't ask again" permission captures since they're literal-match.

## Forgetful Memory

Forgetful is a semantic memory store available via the Forgetful MCP (`mcp__forgetful__*`), keyed per-repository. Use it as project memory:

- **Save useful findings.** When you discover something durable and non-obvious — a decision and its rationale, a gotcha, a non-trivial how-to, an architectural constraint — save it to Forgetful. Skip what the code or git history already makes obvious.
- **Check assumptions.** Before assuming something about a project (why a choice was made, where something lives, how a system behaves), query Forgetful first. Treat recalled memories as context that was true when written — verify against current code before relying on it.
- If Forgetful is unreachable, proceed without it and don't block.
