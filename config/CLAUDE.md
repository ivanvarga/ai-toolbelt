# Global Claude Code Guidelines

## Communication Style

- When reporting information to me, be extremely concise and sacrifice grammar for sake of concision.

## Knowledge Staleness (MANDATORY)

- ALWAYS assume your training data is outdated for APIs, libraries, frameworks, and tools
- Before using any API or library pattern, verify current usage via context7 MCP or web search
- NEVER rely on memory for syntax, config format, or API signatures — look it up first
- This applies especially to: package versions, CLI flags, config schemas, deprecated APIs

## Forgetful Memory (MANDATORY)

Forgetful is a semantic memory store available via the Forgetful MCP (`mcp__forgetful__*`), keyed per-repository. Use it as project memory:

- **Save useful findings.** When you discover something durable and non-obvious — a decision and its rationale, a gotcha, a non-trivial how-to, an architectural constraint — save it to Forgetful. Skip what the code or git history already makes obvious.
- **Check assumptions.** Before assuming something about a project (why a choice was made, where something lives, how a system behaves), query Forgetful first. Treat recalled memories as context that was true when written — verify against current code before relying on it.
- If Forgetful is unreachable, proceed without it and don't block.

## Bash Command Structure (avoid permission prompts)

Claude Code has hardcoded safety rules that trigger manual approval regardless of allowlist. To avoid needless prompts:

- NEVER combine `cd` with output redirection (`>`, `2>`, `>>`) in one command — triggers path-resolution bypass check. When working in another directory: (a) issue `cd /foo` as a separate Bash call (working dir persists across Bash calls in the same session), then run the command in a follow-up call; or (b) use absolute paths. Bad: `cd /foo && ls 2>/dev/null`. Good: two calls — `cd /foo`, then `ls 2>/dev/null`. Also good: `ls /foo/* 2>/dev/null`.
- NEVER use backslash-escaped whitespace in paths. Quote the path instead. Bad: `ls /foo/Target\ Support\ Files`. Good: `ls "/foo/Target Support Files"`.
- PREFER single-stage commands over compound `;`/`&&` chains. Multi-stage chains don't match simple allowlist prefixes and trigger approval. Split into separate Bash calls — each matches the allowlist cleanly.
- When inspecting build artifacts in `~/Library/Developer/Xcode/DerivedData/`, expect dynamic hash paths — don't rely on "don't ask again" permission captures since they're literal-match.

## Security Rules

- NEVER read, print, or extract actual values from environment variables, secrets managers (Doppler, etc.), or configuration files containing sensitive data
- Only reference environment variable names, never their values
- If you need to know a value, ask the user to provide it directly

## Verification Rules (MANDATORY)

**THIS IS NON-NEGOTIABLE - FOLLOW EXACTLY:**
- After ANY code change, you MUST verify before considering it done. CI will reject unverified work.
  1. Check for git hooks (husky, lint-staged, pre-commit) once per session to know what CI enforces
  2. Run autofix linter (look for `lint:fix` or similar in `package.json` scripts)
  3. Run full project linter + type checker (look for `lint`, `type`, `typecheck` in `package.json` scripts)
  4. If errors remain, fix manually, then re-run step 3
- **Work is verified ONLY when both linter and type checker pass with no new errors**
- NEVER claim something is fixed without confirming it. Ask user to verify if you cannot.

## Code Intelligence (MANDATORY)

- Prefer LSP over Grep/Read for code navigation — it's faster, precise, and avoids reading entire files
  - `workspaceSymbol` to find where something is defined
  - `findReferences` to see all usages across the codebase
  - `goToDefinition` / `goToImplementation` to jump to source
  - `hover` for type info without reading the file
- Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config)
- After writing or editing code, check LSP diagnostics and fix errors before proceeding

## Code Style & Patterns (MANDATORY)

**THIS IS NON-NEGOTIABLE - FOLLOW EXACTLY:**
- Don't reinvent the wheel — ALWAYS check existing patterns, utilities, and services in the codebase before writing new code. Reuse what exists.
- When establishing a new pattern (new utility, new abstraction, new convention), confirm with the user first.
- NEVER write comments. The only exceptions are external references (GitHub issue links, documentation URLs). Code must be self-documenting.
- Favour simple and readable over clever. Readability is an absolute must — if code requires mental gymnastics to understand, rewrite it plainly.

## Git Commit Guidelines (MANDATORY)

**THIS IS NON-NEGOTIABLE - FOLLOW EXACTLY:**
- Commit messages MUST be 1 line only (2-3 lines absolute maximum in rare cases)
- NO multi-line descriptions, NO bullet points, NO detailed explanations
- NO attribution (no Co-Authored-By, no Generated with Claude, no author credits)
- Example: `Fix audio artwork for lockscreen` - that's it, nothing more

<!-- tb:guidelines (managed) -->
@~/.claude/tb/shared-guidelines.md
