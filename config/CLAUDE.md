# Global Claude Code Guidelines

## Communication Style

- When reporting information to me, be extremely concise and sacrifice grammar for sake of concision.

## Knowledge Staleness (MANDATORY)

- ALWAYS assume your training data is outdated for APIs, libraries, frameworks, and tools
- Before using any API or library pattern, verify current usage via context7 MCP or web search
- NEVER rely on memory for syntax, config format, or API signatures — look it up first
- This applies especially to: package versions, CLI flags, config schemas, deprecated APIs

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

## React Native / Expo Debugging

### Metro Bundler

```bash
# Reload JS bundle: Press 'r' in Metro terminal
# Open dev menu: Press 'd' in Metro terminal
```

### Common Issues & Solutions

#### App stuck on splash screen
1. Check Metro bundler output for errors
2. Check if persisted query cache is corrupted (stale "pending" queries)
   - Fix: Uninstall app to clear persistent storage
3. Ensure initialization code has timeouts to prevent hanging forever

#### Network issues in simulator
1. Native iOS networking works via NSURLSession - check native logs with `xcrun simctl spawn`
2. JavaScript `fetch()` works in React Native
3. Third-party SDKs using `whatwg-fetch` polyfill may fail (XMLHttpRequest doesn't work properly in RN)
4. Safari in simulator can test if network is reachable

#### React Query / TanStack Query CancelledError
- Usually means hydrated queries from storage were in "pending" state
- Fix: Clear app data by uninstalling the app
