# Phase 14: Per-Organization Credential Scoping - Research

**Researched:** 2026-03-18
**Domain:** Credential management, git remote parsing, macOS Keychain scoping
**Confidence:** HIGH

## Summary

This phase makes the existing credential system organization-aware. Today, credentials are stored as `tb.{service}` (e.g., `tb.sentry-token`). After this phase, org-scoped credentials are stored as `tb.{service}.{org}` (e.g., `tb.sentry-token.org-x`), with the global `tb.{service}` kept as a fallback. The org is auto-detected from `git remote get-url origin`.

The codebase has a clean, layered architecture: `keychain.js` is a low-level CLI, `setup-credential.js` is the shared setup base, per-skill `setup.js` wrappers are 3-line config objects, `sentry-api.js`/`github-api.js` are API clients that hardcode service names, and SKILL.md files use both `security find-generic-password` (auto-detect) and `keychain.js get` (runtime retrieval). The change propagates through all layers.

**Primary recommendation:** Create a shared `scripts/resolve-credential.js` module that encapsulates the org-detection + fallback resolution logic. All credential consumers (API scripts, SKILL.md bash, setup scripts, doctor checks, agent) call through this single module. This avoids duplicating the git-remote-parse + try-org-first-then-global logic in every consumer.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Extract org/owner from git remote URL (`git remote get-url origin`)
- For `git@github.com:org-x/my-app.git` -> org is `org-x`
- When no git remote exists, check with user (prompt: "No git remote found -- use global credentials or specify an org name?")
- No config file needed -- git remote is the source of truth
- Org-scoped: `tb.{service}.{org}` (e.g., `tb.sentry-token.org-x`)
- Global: `tb.{service}` (unchanged, kept as fallback)
- Try `tb.{service}.{org}` first (org-scoped), fall back to `tb.{service}` (global)
- All four credentials (Sentry, GitHub session, Contentful, Jira) use org scoping uniformly
- Running setup.js from a project directory auto-detects org from git remote
- Shows detected org and confirms: "Detected org: org-x. Storing sentry token for org-x."
- `--global` flag overrides auto-detection, stores to `tb.{service}` regardless
- Non-interactive mode (CLI argument) also respects auto-detected org
- Migration script scans common directories (~/Projects, ~/Work) for git repos
- Groups repos by org extracted from git remote
- Asks user to confirm org-credential mapping
- Copies existing `tb.{service}` globals to `tb.{service}.{org}` for confirmed orgs
- Keeps original global credentials as fallback after migration
- Doctor shows all org-scoped credentials found plus global
- Lists each org with its credential status

### Claude's Discretion
- Exact migration script UX (interactive prompts, confirmation flow)
- Which directories to scan during migration (configurable list vs hardcoded)
- How to handle SSH vs HTTPS git remote URL parsing edge cases
- Whether setup-credential.js absorbs org detection or a separate utility extracts it

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `child_process` (Node.js built-in) | N/A | Execute `git`, `security` CLI commands | Already used throughout codebase |
| `path` (Node.js built-in) | N/A | Script path resolution | Already used throughout codebase |
| `readline` (Node.js built-in) | N/A | Interactive prompts in migration/setup | Already used in setup-credential.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs` (Node.js built-in) | N/A | Directory scanning during migration | Migration script only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual git URL parsing | `url` module / `new URL()` | Git SSH URLs (`git@github.com:...`) are not valid URLs; regex is more reliable and simpler |
| Scanning filesystem for repos | Git config / credential helper | User decided git remote is source of truth; scanning is the right approach |

**Installation:**
```bash
# No new dependencies needed -- all Node.js built-ins
```

## Architecture Patterns

### Current Credential Architecture (Before)
```
skills/*/setup.js           -> scripts/setup-credential.js -> scripts/keychain.js -> macOS security CLI
scripts/sentry-api.js       -> scripts/keychain.js          -> macOS security CLI
scripts/github-api.js       -> scripts/keychain.js          -> macOS security CLI
skills/*/SKILL.md (bash)    -> security find-generic-password (auto-detect check)
                            -> scripts/keychain.js get (runtime retrieval)
agents/attachment-documenter -> security find-generic-password (direct)
scripts/checks/cred-*.sh    -> security find-generic-password (doctor checks)
```

### Target Credential Architecture (After)
```
scripts/resolve-org.js            NEW: git remote -> org extraction
scripts/resolve-credential.js     NEW: org-aware get (try org-scoped, fall back to global)

skills/*/setup.js           -> scripts/setup-credential.js (+ org detection) -> scripts/keychain.js
scripts/sentry-api.js       -> scripts/resolve-credential.js -> scripts/keychain.js
scripts/github-api.js       -> scripts/resolve-credential.js -> scripts/keychain.js
skills/*/SKILL.md (bash)    -> scripts/resolve-credential.js (replaces direct security calls)
agents/attachment-documenter -> scripts/resolve-credential.js (replaces direct security call)
scripts/checks/cred-*.sh    -> org-aware iteration + global check
scripts/migrate-credentials.js  NEW: one-time migration
```

### Pattern 1: Org Detection from Git Remote
**What:** Parse org/owner from `git remote get-url origin`
**When to use:** Every credential lookup and setup operation
**Example:**
```javascript
// scripts/resolve-org.js
function resolveOrg() {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    // SSH: git@github.com:org-x/repo.git -> org-x
    const sshMatch = url.match(/[:\/]([^/]+)\/[^/]+?(?:\.git)?$/);
    if (sshMatch) return sshMatch[1];
    // HTTPS: https://github.com/org-x/repo.git -> org-x
    const httpsMatch = url.match(/\/\/[^/]+\/([^/]+)\//);
    if (httpsMatch) return httpsMatch[1];
    return null;
  } catch {
    return null;
  }
}
```

### Pattern 2: Credential Resolution with Fallback
**What:** Try `tb.{service}.{org}` first, fall back to `tb.{service}`
**When to use:** Every credential retrieval at runtime
**Example:**
```javascript
// scripts/resolve-credential.js
function getCredential(service) {
  const org = resolveOrg();
  if (org) {
    const orgValue = keychainGet(`${service}.${org}`);
    if (orgValue) return orgValue;
  }
  return keychainGet(service);
}
```

### Pattern 3: Setup with Org-Awareness
**What:** setup-credential.js detects org and stores to scoped key
**When to use:** All credential setup flows
**Example:**
```javascript
// In setup-credential.js runKeychainMode:
const org = resolveOrg();
const effectiveService = (process.argv.includes('--global') || !org)
  ? config.service
  : `${config.service}.${org}`;
// Show: "Detected org: org-x. Storing sentry token for org-x."
```

### Anti-Patterns to Avoid
- **Hardcoding service names in consumers:** Every `get tb.sentry-token` must go through the resolution layer, not hardcode the global key
- **Modifying keychain.js:** keychain.js is a low-level abstraction. Org-awareness belongs one layer above it. Callers pass the full service name.
- **Duplicating org detection:** Extract to a single utility, not inline in every consumer
- **Breaking non-git-repo usage:** When no git remote exists, the system must gracefully fall back to global credentials (not crash)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git URL parsing | Full URL parser supporting all protocols | Simple regex for SSH + HTTPS patterns | Git remotes have a small number of well-known formats; a full parser is overkill |
| Directory tree walking | Custom recursive filesystem scanner | Simple `find` + `git remote get-url` combo | Migration runs once, doesn't need optimization |
| Keychain enumeration | Parsing `security dump-keychain` output | Track known service names + iterate | Keychain enumeration requires unlock prompts and is unreliable |

**Key insight:** The credential names are known at build time (sentry-token, github-session, contentful-token, jira-token). There are only 4 services. Don't try to dynamically discover credentials -- iterate over the known set.

## Common Pitfalls

### Pitfall 1: Git Remote URL Format Diversity
**What goes wrong:** Regex fails for certain remote formats
**Why it happens:** Git remotes can be SSH (`git@github.com:org/repo.git`), HTTPS (`https://github.com/org/repo.git`), or less common formats (`ssh://git@github.com/org/repo.git`)
**How to avoid:** Support the 3 common patterns: `git@host:org/repo`, `https://host/org/repo`, `ssh://git@host/org/repo`. Test with and without `.git` suffix.
**Warning signs:** resolveOrg() returns null when you expect a value

### Pitfall 2: No Git Repo / No Remote
**What goes wrong:** `git remote get-url origin` fails with non-zero exit
**Why it happens:** User is in their home directory, a non-git project, or a repo without remotes
**How to avoid:** Catch the error, return null, and fall through to global credentials. The CONTEXT.md specifies prompting the user in setup flows, but silently falling back in resolution flows.
**Warning signs:** Skills crash when invoked outside of a git repo

### Pitfall 3: SKILL.md Uses `security` Directly (Not keychain.js)
**What goes wrong:** SKILL.md auto-detect blocks use `security find-generic-password -s "tb.sentry-token"` which is NOT org-aware
**Why it happens:** SKILL.md bash snippets were written before org scoping existed
**How to avoid:** Replace SKILL.md `security find-generic-password` checks with calls to `resolve-credential.js`. The pattern is: `node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.sentry-token` should output the value or exit 1.
**Warning signs:** Credential checks succeed for global but miss org-scoped credentials

### Pitfall 4: attachment-documenter Agent Uses Direct `security` Command
**What goes wrong:** The agent body contains `security find-generic-password -s "tb.jira-token" -w` which bypasses org resolution
**Why it happens:** Phase 13 decision was to use macOS security directly to avoid CLAUDE_PLUGIN_ROOT path issues in agents
**How to avoid:** Need to find a way to call resolve-credential.js from the agent. Options: (a) use a known plugin path discovery pattern, (b) store the resolved token path in the agent's instructions, (c) accept that agents always use global credentials
**Warning signs:** Agent uses wrong org's Jira token

### Pitfall 5: Doctor Check Discovery of Org-Scoped Entries
**What goes wrong:** Doctor only checks `tb.{service}` and misses org-scoped entries
**Why it happens:** Current doctor checks are hardcoded to specific Keychain service names
**How to avoid:** Doctor should know the list of known service names (4 services) and attempt to list orgs by scanning common project directories (same approach as migration). Alternatively, doctor could just report the current project's org-scoped status plus global status.
**Warning signs:** Doctor reports PASS when org-scoped credential is actually missing for current context

### Pitfall 6: setup-all.js Org Propagation
**What goes wrong:** setup-all.js runs setups in sequence but doesn't pass org context
**Why it happens:** Each setup.js independently detects org from git remote, so setup-all.js run from a project directory will correctly scope to that project's org
**How to avoid:** This is actually fine as-is because each setup.js calls resolveOrg() itself. But setup-all.js should document/show which org is being configured.
**Warning signs:** User runs setup-all.js from home directory and all credentials go to global

## Code Examples

### File Inventory: All Touch Points

**Files that need modification:**

| File | Change Type | Current Pattern | New Pattern |
|------|-------------|-----------------|-------------|
| `scripts/setup-credential.js` | Modify | Stores to `config.service` | Detect org, store to `config.service.{org}` or `config.service` with `--global` |
| `scripts/sentry-api.js` | Modify | `keychain get tb.sentry-token` | Use `resolve-credential.js` |
| `scripts/github-api.js` | Modify | `keychain get tb.github-session` | Use `resolve-credential.js` |
| `skills/sentry-investigate/SKILL.md` | Modify | `security find-generic-password -s "tb.sentry-token"` | Use `resolve-credential.js` |
| `skills/sentry-sourcemaps/SKILL.md` | Modify | `security find-generic-password -s "tb.sentry-token"` + `keychain.js get tb.sentry-token` | Use `resolve-credential.js` for both |
| `skills/pr-upload/SKILL.md` | Modify | `security find-generic-password -s "tb.github-session"` | Use `resolve-credential.js` |
| `skills/contentful/SKILL.md` | Modify | `security find-generic-password -s "tb.contentful-token"` + `keychain.js get tb.contentful-token` | Use `resolve-credential.js` for both |
| `agents/attachment-documenter.md` | Modify | `security find-generic-password -s "tb.jira-token" -w` | Use `resolve-credential.js` or accept global-only |
| `skills/task-jira/setup.js` | Modify | `security find-generic-password -s "tb.jira-token"` | Use `resolve-credential.js` |
| `scripts/checks/cred-sentry.sh` | Modify | Check `tb.sentry-token` | Org-aware check |
| `scripts/checks/cred-github.sh` | Modify | Check `tb.github-session` | Org-aware check |
| `scripts/checks/cred-contentful.sh` | Modify | Check `tb.contentful-token` | Org-aware check |
| `scripts/checks/cred-jira-token.sh` | Modify | Check `tb.jira-token` | Org-aware check |
| `scripts/checks/cred-acli.sh` | No change | CLI check (not keychain) | acli auth is not org-scoped |
| `scripts/setup-all.js` | Modify | Runs setups sequentially | Show detected org before running setups |

**New files:**

| File | Purpose |
|------|---------|
| `scripts/resolve-org.js` | Extract org from git remote (shared utility) |
| `scripts/resolve-credential.js` | Org-aware credential get with fallback (CLI + require) |
| `scripts/migrate-credentials.js` | One-time migration: scan repos, discover orgs, copy globals to org-scoped |

### Git Remote URL Parsing (Comprehensive)
```javascript
function resolveOrg() {
  let url;
  try {
    url = execSync('git remote get-url origin', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
  // git@github.com:org/repo.git
  // git@github.com:org/repo
  const sshColonMatch = url.match(/:([^/]+)\/[^/]+?$/);
  if (sshColonMatch) return sshColonMatch[1];
  // https://github.com/org/repo.git
  // ssh://git@github.com/org/repo.git
  const slashMatch = url.match(/\/\/[^/]+\/([^/]+)\/[^/]+?$/);
  if (slashMatch) return slashMatch[1];
  return null;
}
```

### Credential Resolution (Dual-mode: CLI + require)
```javascript
// scripts/resolve-credential.js
// CLI usage: node resolve-credential.js tb.sentry-token
// Require usage: const { getCredential } = require('./resolve-credential');

const resolveOrg = require('./resolve-org');

function getCredential(service) {
  const org = resolveOrg();
  if (org) {
    const orgValue = keychainGet(`${service}.${org}`);
    if (orgValue) return orgValue;
  }
  return keychainGet(service);
}

// CLI mode
if (require.main === module) {
  const service = process.argv[2];
  if (!service) { process.stderr.write('Usage: resolve-credential.js <service>\n'); process.exit(1); }
  const value = getCredential(service);
  if (!value) process.exit(1);
  process.stdout.write(value);
}

module.exports = { getCredential, resolveOrg };
```

### SKILL.md Updated Pattern
```bash
# Auto-detect (replaces security find-generic-password check)
if ! node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.sentry-token >/dev/null 2>&1; then
  echo "Sentry token not configured. Running setup..."
  node "${CLAUDE_SKILL_DIR}/setup.js"
fi

# Runtime retrieval (replaces keychain.js get with hardcoded service)
SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.sentry-token) \
npx sentry-cli sourcemaps upload ...
```

### Doctor Check Updated Pattern
```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

# Try org-scoped first (from current directory's git remote)
ORG=$(node "${PLUGIN_ROOT}/scripts/resolve-org.js" 2>/dev/null)

if [ -n "$ORG" ]; then
  if security find-generic-password -s "tb.sentry-token.${ORG}" >/dev/null 2>&1; then
    echo "PASS cred-sentry Sentry token configured (org: ${ORG})"
    exit 0
  fi
fi

# Fall back to global
if security find-generic-password -s "tb.sentry-token" >/dev/null 2>&1; then
  if [ -n "$ORG" ]; then
    echo "PASS cred-sentry Sentry token configured (global fallback, no org-specific for ${ORG})"
  else
    echo "PASS cred-sentry Sentry token configured (global)"
  fi
else
  echo "FAIL cred-sentry Sentry token missing. Run: node ${PLUGIN_ROOT}/skills/sentry-investigate/setup.js"
fi
exit 0
```

### Migration Script Pattern
```javascript
// scripts/migrate-credentials.js
const SCAN_DIRS = [
  path.join(os.homedir(), 'Projects'),
  path.join(os.homedir(), 'Work')
];
const SERVICES = ['tb.sentry-token', 'tb.github-session', 'tb.contentful-token', 'tb.jira-token'];

// 1. For each dir, find git repos: find DIR -name .git -maxdepth 3
// 2. For each repo, extract org from git remote
// 3. Group repos by org
// 4. Show summary: "Found orgs: org-x (5 repos), org-y (2 repos)"
// 5. For each org, ask: "Copy global credentials to org-x? (y/N)"
// 6. For confirmed orgs, copy: keychain get tb.{service} -> keychain set tb.{service}.{org}
// 7. Keep globals untouched
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tb.{service}` global only | `tb.{service}.{org}` with global fallback | Phase 14 (this phase) | All 4 credential services become org-aware |
| Direct `security` in SKILL.md | `resolve-credential.js` abstraction | Phase 14 (this phase) | Single point of change for credential resolution logic |
| No org detection | Git remote-based org detection | Phase 14 (this phase) | Enables per-org credential isolation |

## Open Questions

1. **Agent credential resolution path**
   - What we know: `attachment-documenter.md` uses `security find-generic-password -s "tb.jira-token" -w` directly because `CLAUDE_PLUGIN_ROOT` doesn't work in agent markdown
   - What's unclear: How to call `resolve-credential.js` from the agent body without a reliable path to the script
   - Recommendation: Use the same path discovery pattern from Phase 13 research: `find ~/.claude/plugins -name resolve-credential.js -path '*/ai-toolbelt/*' 2>/dev/null | head -1`. Alternatively, accept that agent always uses global credentials (simpler, and the agent is typically invoked from a project context where org-scoped is preferred).

2. **Doctor check granularity**
   - What we know: User wants doctor to "show all org-scoped credentials found plus global" and "list each org with its credential status"
   - What's unclear: Whether doctor should scan directories to discover all orgs, or just check the current project's org + global
   - Recommendation: Doctor checks should report: (1) current org from git remote (if in a repo), (2) org-scoped credential status for current org, (3) global fallback status. Full org enumeration can be a separate `--verbose` feature or part of the migration script output. Scanning directories on every doctor run is slow and unexpected.

3. **Migration scan directories**
   - What we know: CONTEXT.md says "scan common directories (~/Projects, ~/Work)"
   - What's unclear: Whether this should be configurable or hardcoded
   - Recommendation: Hardcode the defaults but accept additional directories as CLI arguments: `node migrate-credentials.js [dir1] [dir2]`. The defaults cover the user's actual setup.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework exists in this project) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map

No formal requirement IDs were assigned for this phase. The key behaviors to verify:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| resolveOrg parses SSH git remote | manual-only | `cd /tmp && git init && git remote add origin git@github.com:test-org/repo.git && node scripts/resolve-org.js` | N/A |
| resolveOrg parses HTTPS git remote | manual-only | Similar with HTTPS URL | N/A |
| resolveOrg returns null for no remote | manual-only | `cd /tmp && mkdir no-git && cd no-git && node scripts/resolve-org.js` | N/A |
| resolve-credential tries org-scoped first | manual-only | Requires Keychain entries | N/A |
| resolve-credential falls back to global | manual-only | Requires Keychain entries | N/A |
| setup-credential.js stores to org-scoped key | manual-only | Requires interactive TTY or CLI arg | N/A |
| setup-credential.js --global stores to global | manual-only | Requires interactive TTY or CLI arg | N/A |
| SKILL.md auto-detect uses resolve-credential.js | manual-only | Invoke skill in Claude Code | N/A |
| Doctor checks report org-scoped status | manual-only | Run doctor from a project directory | N/A |
| Migration discovers orgs from repos | manual-only | Run migration script interactively | N/A |

### Sampling Rate
- **Per task commit:** Manual verification of changed files (linting, syntax checks)
- **Per wave merge:** Run `claude --plugin-dir ./ /tb:doctor` to verify credential checks work
- **Phase gate:** Full `/tb:doctor` green + manual skill invocation test

### Wave 0 Gaps
None -- no test framework exists in this project. All verification is manual per established project pattern (Phase 5 and 13 used the same approach).

## Sources

### Primary (HIGH confidence)
- `scripts/keychain.js` -- Read source: 42-line CLI wrapper around macOS `security` command
- `scripts/setup-credential.js` -- Read source: 131-line shared setup base with keychain/cli-check modes
- `scripts/sentry-api.js` -- Read source: Hardcodes `tb.sentry-token` on line 10
- `scripts/github-api.js` -- Read source: Hardcodes `tb.github-session` on line 10
- `scripts/setup-all.js` -- Read source: Sequential setup runner for 4 credential types
- `skills/*/setup.js` -- Read source: 4 thin wrappers passing config to setup-credential.js
- `skills/task-jira/setup-token.js` -- Read source: Jira API token setup with acli email extraction
- `skills/*/SKILL.md` -- Read source: Auto-detect patterns using `security find-generic-password` and `keychain.js get`
- `agents/attachment-documenter.md` -- Read source: Direct `security` command for `tb.jira-token`
- `scripts/checks/cred-*.sh` -- Read source: 5 doctor check scripts using `security find-generic-password`
- `.planning/phases/05-credential-system/05-CONTEXT.md` -- Original credential system decisions

### Secondary (MEDIUM confidence)
- Git remote URL formats: well-known patterns documented in git-scm.com (SSH, HTTPS, ssh:// protocol)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, all Node.js built-ins already used in codebase
- Architecture: HIGH -- Clear layered architecture visible from source code; org-awareness is a clean addition to existing layers
- Pitfalls: HIGH -- All pitfalls derived from reading actual source code and identifying every hardcoded credential reference

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external dependencies or fast-moving APIs)
