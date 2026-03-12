# Phase 5: Credential System - Research

**Researched:** 2026-03-12
**Domain:** macOS Keychain credential management, API token verification, Node.js CLI tooling
**Confidence:** HIGH

## Summary

Phase 5 refactors four near-identical per-skill setup.js files into a shared base module (`scripts/setup-credential.js`) supporting two modes: `keychain` (store/retrieve secret with optional API verification) and `cli-check` (verify CLI tool installed + authenticated). Each skill retains a thin wrapper calling the shared base with a config object. The phase also adds doctor credential checks, audits all 18 skills for missed credentials, and creates a setup-all flow.

The existing codebase already has all the building blocks: `scripts/keychain.js` handles Keychain CRUD, three setup.js files (pr-upload, sentry-investigate, contentful) share 95% identical code, and the doctor check pattern (`scripts/checks/*.sh`) is well-established. The refactor is primarily deduplication and enhancement (adding API verification on setup, doctor integration).

**Primary recommendation:** Extract the common prompt-store-verify pattern into `scripts/setup-credential.js` accepting a config object, add per-service API verification endpoints, create four bash check scripts for doctor, and wire up a setup-all orchestrator.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Create `scripts/setup-credential.js` as a shared base module
- Supports two modes: `keychain` (store/retrieve secret) and `cli-check` (verify CLI tool installed + authenticated)
- Each skill keeps a thin `setup.js` wrapper (3-line file) calling the shared base with a config
- task-jira uses the `cli-check` mode (verifies acli install/auth)
- pr-upload, sentry-investigate, contentful use `keychain` mode
- sentry-sourcemaps continues to share sentry-investigate's setup (no own setup.js)
- Setup scripts verify credentials via a lightweight test API call after storing
- If verification fails: reject the credential and re-prompt (don't store invalid tokens)
- After max retries: offer to store anyway with warning or abort
- Exception: GitHub session cookie (pr-upload) is store-only, no API verification (cookie validation too fragile)
- One check script per credential service (cred-github.sh, cred-sentry.sh, cred-contentful.sh, cred-acli.sh)
- Checks Keychain presence only (no API calls) for fast, offline-safe health checks
- FAIL output includes the exact setup command to fix
- Fits the existing drop-in `scripts/checks/*.sh` pattern
- Add a `/tb:setup-all` skill or `scripts/setup-all.js` that runs all credential setups in sequence
- Audit all 18 skills for credential needs (not just the known 4)
- If a skill needs credentials without a setup.js, create one using the shared base
- Standardize SKILL.md "First-time Setup" section wording across all credential-needing skills
- SKILL.md instructions tell Claude to auto-detect missing credentials (check Keychain first) and run setup.js if missing

### Claude's Discretion
- Shared base interface design (config object vs CLI arguments)
- Retry count for failed verification
- Which API endpoints to use for verification per service
- setup-all implementation (skill vs standalone script)

### Deferred Ideas (OUT OF SCOPE)
- Auto-refresh for expiring credentials (v2 requirement SETU-03)
- Credential health check that verifies all secrets present AND valid via API (v2 requirement SETU-02, doctor currently checks presence only)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRED-01 | Keychain-based setup for Jira/acli credentials | task-jira uses `cli-check` mode -- verifies `which acli` + `acli jira auth status` |
| CRED-02 | Keychain-based setup for Sentry auth token | `keychain` mode with `GET /api/0/organizations/` verification endpoint |
| CRED-03 | Keychain-based setup for Contentful management token | `keychain` mode with `GET /spaces` verification endpoint |
| CRED-04 | Keychain-based setup for GitHub upload credentials | `keychain` mode, store-only (no API verification per decision) |
| CRED-05 | Per-skill setup.sh scripts following gh-upload pattern | Thin wrappers calling shared `scripts/setup-credential.js` with config object |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (built-in) | system | All setup scripts, Keychain interaction | Already used across all skills |
| `child_process.execSync` | built-in | Shell command execution (security CLI, curl) | Already used in keychain.js and all setup.js |
| `readline` | built-in | Interactive TTY prompting | Already used in all three keychain setup.js files |
| `https` | built-in | API verification calls | Already used in sentry-api.js |
| macOS `security` CLI | system | Keychain CRUD operations | Already used via keychain.js wrapper |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scripts/keychain.js` | existing | get/set/delete Keychain entries | All credential storage/retrieval |
| bash | system | Doctor check scripts | Drop-in `scripts/checks/*.sh` pattern |
| `acli` | external | Jira CLI with OAuth | cli-check mode verification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `security` CLI via keychain.js | `node-keychain` npm package | Adds dependency; existing keychain.js works fine, zero deps |
| Node.js https for verification | `curl` via execSync | curl is simpler for one-off checks, but https module avoids shell escaping issues; use https for consistency with sentry-api.js |
| Bash doctor checks | Node.js doctor checks | Bash matches established pattern in scripts/checks/*.sh |

**Installation:** No new dependencies required. Everything uses Node.js built-ins and macOS system tools.

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── keychain.js              # Existing -- Keychain CRUD
├── setup-credential.js      # NEW -- shared base for all setup scripts
├── setup-all.js             # NEW -- runs all setups in sequence
├── sentry-api.js            # Existing -- Sentry API client
├── github-api.js            # Existing -- GitHub upload client
└── checks/
    ├── plugin-registered.sh # Existing
    ├── hooks-valid.sh       # Existing
    ├── skills-valid.sh      # Existing
    ├── cred-github.sh       # NEW -- checks tb.github-session in Keychain
    ├── cred-sentry.sh       # NEW -- checks tb.sentry-token in Keychain
    ├── cred-contentful.sh   # NEW -- checks tb.contentful-token in Keychain
    └── cred-acli.sh         # NEW -- checks acli installed + authenticated

skills/
├── pr-upload/setup.js       # REFACTOR -- thin wrapper calling setup-credential.js
├── sentry-investigate/setup.js  # REFACTOR -- thin wrapper
├── contentful/setup.js      # REFACTOR -- thin wrapper
└── task-jira/setup.js       # REFACTOR -- thin wrapper using cli-check mode
```

### Pattern 1: Shared Base Config Object (Keychain Mode)

**What:** Each skill's setup.js passes a config object to the shared base.
**When to use:** All skills that store tokens in Keychain (pr-upload, sentry-investigate, contentful).

```javascript
// skills/sentry-investigate/setup.js (thin wrapper)
#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'keychain',
  service: 'tb.sentry-token',
  name: 'Sentry auth token',
  prompt: 'Enter Sentry auth token: ',
  verify: async (token) => {
    const https = require('https');
    return new Promise((resolve) => {
      const req = https.get('https://sentry.io/api/0/organizations/', {
        headers: { Authorization: `Bearer ${token}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
      });
      req.on('error', () => resolve(false));
    });
  }
});
```

### Pattern 2: CLI-Check Mode

**What:** Verifies an external CLI tool is installed and authenticated.
**When to use:** task-jira (acli manages its own OAuth credentials).

```javascript
// skills/task-jira/setup.js (thin wrapper)
#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'cli-check',
  name: 'acli (Atlassian CLI)',
  checks: [
    { cmd: 'which acli', failMsg: 'acli is not installed. Install via Homebrew: brew install acli' },
    { cmd: 'acli jira auth status', failMsg: 'acli is not authenticated. Run: acli login' }
  ]
});
```

### Pattern 3: Store-Only Mode (No Verification)

**What:** Stores credential without API verification.
**When to use:** pr-upload (GitHub session cookie -- verification too fragile).

```javascript
// skills/pr-upload/setup.js (thin wrapper)
#!/usr/bin/env node
const setup = require('../../scripts/setup-credential');
setup({
  mode: 'keychain',
  service: 'tb.github-session',
  name: 'GitHub session cookie',
  prompt: 'Paste the user_session cookie value: ',
  verify: null  // store-only, no API verification
});
```

### Pattern 4: Doctor Credential Check Script

**What:** Bash script checking Keychain presence via keychain.js.
**When to use:** Each credential service gets one.

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"
SERVICE="tb.sentry-token"
SKILL_SETUP="skills/sentry-investigate/setup.js"

if node "${PLUGIN_ROOT}/scripts/keychain.js" get "$SERVICE" > /dev/null 2>&1; then
    echo "PASS cred-sentry Sentry token configured (${SERVICE})"
else
    echo "FAIL cred-sentry Sentry token not found. Run: node ${PLUGIN_ROOT}/${SKILL_SETUP}"
fi
exit 0
```

### Pattern 5: SKILL.md Auto-Detection Pattern

**What:** Standardized prerequisite section that tells Claude to auto-detect and fix missing credentials.
**When to use:** Every skill that needs credentials.

```markdown
## Prerequisites

Check credentials and auto-configure if missing:

\```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "Sentry token not configured. Running setup..."
  node "${CLAUDE_SKILL_DIR}/setup.js"
fi
\```
```

### Anti-Patterns to Avoid
- **Storing secrets in files or env vars:** All credentials go in macOS Keychain via `scripts/keychain.js`, never in dotfiles or environment variables
- **API calls in doctor checks:** Doctor checks must be fast and offline-safe; presence-only via keychain.js get
- **Duplicating keychain.js logic:** All setup scripts must use `scripts/keychain.js` for storage, never call `security` directly
- **Hard-coding plugin paths:** Use `path.resolve(__dirname, '..', '..')` for PLUGIN_ROOT, `${CLAUDE_SKILL_DIR}` in SKILL.md

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keychain access | Direct `security` CLI calls in setup.js | `scripts/keychain.js` | Already handles add/get/delete with proper -a flag pattern |
| Interactive prompting | Custom stdin handling | Node.js `readline` module | Already proven in 3 existing setup.js files |
| API HTTP requests | curl via execSync for verification | Node.js `https` module | Avoids shell escaping issues with tokens containing special chars |
| CLI existence check | Custom path searching | `which <cmd>` via execSync | Standard Unix, already used in task-jira setup.js |

**Key insight:** The existing keychain.js handles the tricky parts (delete-before-add for updates, -a flag with service name as account). Setup scripts should only handle prompting, verification, and delegation to keychain.js.

## Common Pitfalls

### Pitfall 1: Token Shell Escaping
**What goes wrong:** Tokens containing special characters ($, `, ", !) break when passed through shell commands.
**Why it happens:** `execSync(`node keychain.js set service "${value}"`)` does string interpolation in the shell.
**How to avoid:** The current keychain.js pattern handles this, but the shared base should be careful with any new shell invocations. For API verification via https module (not curl), the token stays in Node.js memory and never touches the shell.
**Warning signs:** Tokens with `$` characters silently truncate or expand.

### Pitfall 2: readline Not Closing Properly
**What goes wrong:** Process hangs after prompt if readline is not properly closed.
**Why it happens:** readline keeps the event loop open until `rl.close()` is called.
**How to avoid:** Always call `rl.close()` before `process.exit()`, and handle empty input gracefully.
**Warning signs:** Setup script hangs after user enters input.

### Pitfall 3: Non-TTY Detection
**What goes wrong:** Interactive prompt fails when Claude invokes setup.js (stdin is not a TTY).
**Why it happens:** Claude Code runs commands in a non-TTY context.
**How to avoid:** Check `process.stdin.isTTY` and fall back to CLI argument mode. The shared base MUST support `node setup.js <value>` for non-interactive use.
**Warning signs:** "readline was closed" error or immediate EOF on stdin.

### Pitfall 4: Keychain Access Prompts
**What goes wrong:** macOS shows a system dialog asking "allow access to keychain?" on first use.
**Why it happens:** The `security` CLI needs permission to access keychain items it didn't create.
**How to avoid:** Items created with `security add-generic-password` by the same process are accessible without prompts. Ensure the `-T /usr/bin/security` flag is not needed since keychain.js already handles this correctly.
**Warning signs:** Automated scripts hang waiting for user click on a system dialog.

### Pitfall 5: Verification Endpoint Failures
**What goes wrong:** API verification fails due to network issues, not invalid credentials.
**Why it happens:** Network timeout, proxy, or DNS issues treated as "invalid token."
**How to avoid:** Distinguish HTTP 401/403 (bad token) from connection errors (network issue). On connection error, offer to store anyway with a warning rather than rejecting.
**Warning signs:** Valid tokens being rejected in offline or corporate network environments.

## Code Examples

### Shared Base Module Core Logic (Keychain Mode)

```javascript
// scripts/setup-credential.js - core flow
async function keychainMode(config) {
  const keychainPath = path.join(__dirname, 'keychain.js');

  // CLI argument mode (non-interactive)
  const argValue = process.argv[2];
  if (argValue) {
    if (config.verify) {
      const valid = await config.verify(argValue);
      if (!valid) {
        process.stderr.write(`${config.name} verification failed.\n`);
        process.exit(1);
      }
    }
    execSync(`node "${keychainPath}" set ${config.service} "${argValue}"`);
    console.log(`${config.name} saved to Keychain (${config.service}).`);
    process.exit(0);
  }

  // Check existing
  let existing = '';
  try {
    existing = execSync(`node "${keychainPath}" get ${config.service}`, { encoding: 'utf8' }).trim();
  } catch {}

  if (existing) {
    console.log(`${config.name} already configured (${config.service}).`);
    process.exit(0);
  }

  // Interactive mode
  if (!process.stdin.isTTY) {
    console.error(`No ${config.name} found. Provide as argument: node setup.js <value>`);
    process.exit(1);
  }

  // Prompt with retry loop for verification
  const maxRetries = 3;
  promptWithRetry(config, keychainPath, maxRetries);
}
```

### Sentry API Verification Endpoint

```javascript
// Lightweight: GET /api/0/organizations/ returns 200 if token valid, 401 if not
verify: async (token) => {
  const https = require('https');
  return new Promise((resolve) => {
    const req = https.get('https://sentry.io/api/0/organizations/', {
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
  });
}
```

### Contentful API Verification Endpoint

```javascript
// Lightweight: GET /spaces returns 200 if token valid, 401 if not
verify: async (token) => {
  const https = require('https');
  return new Promise((resolve) => {
    const req = https.get('https://api.contentful.com/spaces', {
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false);
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
  });
}
```

### Doctor Check Script Template

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"
# Uses keychain.js for consistency (not raw security command)
if node "${PLUGIN_ROOT}/scripts/keychain.js" get tb.sentry-token > /dev/null 2>&1; then
    echo "PASS cred-sentry Sentry token configured"
else
    echo "FAIL cred-sentry Sentry token missing. Run: node ${PLUGIN_ROOT}/skills/sentry-investigate/setup.js"
fi
exit 0
```

### acli Doctor Check (Different Pattern)

```bash
#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"
if ! command -v acli > /dev/null 2>&1; then
    echo "FAIL cred-acli acli not installed. Run: brew install acli"
    exit 0
fi
if ! acli jira auth status > /dev/null 2>&1; then
    echo "FAIL cred-acli acli not authenticated. Run: acli login"
    exit 0
fi
echo "PASS cred-acli acli installed and authenticated"
exit 0
```

## Credentials Audit: All 18 Skills

| Skill | Needs Credentials? | Current setup.js? | Credential Type | Action Needed |
|-------|-------------------|-------------------|-----------------|---------------|
| catchup | No | No | N/A (git only) | None |
| contentful | Yes | Yes | tb.contentful-token (Keychain) | Refactor to shared base |
| doctor | No | No | N/A | None |
| figma-component | No | No | Uses MCP tool (figma-desktop) | None |
| mobile-reset | No | No | N/A (xcrun/adb) | None |
| mobilecli | No | No | N/A (xcrun/adb) | None |
| pr-describe | No | No | Delegates to task-jira + pr-upload | None |
| pr-qa | No | No | N/A (gh CLI) | None |
| pr-read | No | No | N/A (gh CLI) | None |
| pr-submit | No | No | N/A (git + gh CLI) | None |
| pr-upload | Yes | Yes | tb.github-session (Keychain) | Refactor to shared base |
| release-create | No | No | N/A (git + gh CLI) | None |
| sentry-investigate | Yes | Yes | tb.sentry-token (Keychain) | Refactor to shared base |
| sentry-sourcemaps | Yes (shared) | No (uses sentry-investigate's) | tb.sentry-token (shared) | No own setup.js needed |
| task-github | No | No | N/A (gh CLI) | None |
| task-jira | Yes | Yes | acli CLI auth (OAuth) | Refactor to shared base |
| track-summary | No | No | N/A (git + gh CLI) | None |
| update | No | No | N/A (git) | None |

**Audit result:** 4 skills need credentials (plus sentry-sourcemaps sharing sentry-investigate's). No missed credentials found -- the known 4 setup.js files cover all credential needs. Skills using `gh` CLI rely on GitHub CLI's own authentication (managed by `gh auth login`), which is outside tb's scope.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Copy-paste setup.js per skill | Shared base module with config | This phase | Reduces 4x46-line files to 4x3-line wrappers |
| Store without verification | Verify via API call before storing | This phase | Catches typos/expired tokens at setup time |
| No doctor credential checks | Drop-in check scripts per service | This phase | `tb:doctor` reports missing credentials with fix commands |
| Manual "run setup.js" instructions | Auto-detect and run setup in SKILL.md | This phase | Claude auto-fixes missing credentials |

## Open Questions

1. **Retry count for verification failures**
   - What we know: User decided Claude's discretion
   - Recommendation: 3 retries. Practical balance -- enough to fix a typo, not so many as to be annoying. After 3 failures, offer store-anyway option.

2. **Config object vs CLI arguments for shared base**
   - What we know: User decided Claude's discretion
   - Recommendation: Config object (passed programmatically from require()). CLI arguments would require serializing verify functions, which is impractical. Config object allows passing async verify callbacks directly.

3. **setup-all: skill vs standalone script**
   - What we know: User decided Claude's discretion
   - Recommendation: `scripts/setup-all.js` standalone script. A skill would add overhead (SKILL.md, frontmatter) for what is a one-time administrative task. The script can be invoked directly: `node scripts/setup-all.js`. Optionally create a thin `/tb:setup-all` skill if discoverability matters more than simplicity.

4. **Verification endpoint for Sentry**
   - What we know: `GET /api/0/organizations/` returns 200 for valid tokens, 401 for invalid
   - Recommendation: Use this endpoint. It returns minimal data and confirms auth.

5. **Verification endpoint for Contentful**
   - What we know: `GET https://api.contentful.com/spaces` returns 200 for valid management tokens
   - Recommendation: Use this endpoint. Lists spaces accessible to the token.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification via bash scripts (no formal test framework in project) |
| Config file | none -- project has no package.json or test configuration |
| Quick run command | `bash scripts/checks/cred-sentry.sh .` |
| Full suite command | `for f in scripts/checks/*.sh; do bash "$f" .; done` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRED-01 | acli installed and authenticated | smoke | `bash scripts/checks/cred-acli.sh .` | Wave 0 |
| CRED-02 | Sentry token in Keychain | smoke | `bash scripts/checks/cred-sentry.sh .` | Wave 0 |
| CRED-03 | Contentful token in Keychain | smoke | `bash scripts/checks/cred-contentful.sh .` | Wave 0 |
| CRED-04 | GitHub session in Keychain | smoke | `bash scripts/checks/cred-github.sh .` | Wave 0 |
| CRED-05 | All setup.js wrappers call shared base | manual-only | Verify each setup.js is thin wrapper | N/A (code review) |

### Sampling Rate
- **Per task commit:** Run relevant doctor check script to verify credential check works
- **Per wave merge:** `for f in scripts/checks/*.sh; do bash "$f" .; done`
- **Phase gate:** All doctor checks runnable, all setup.js files refactored to thin wrappers

### Wave 0 Gaps
- [x] No formal test framework needed -- doctor check scripts ARE the tests (they verify credential presence)
- [ ] `scripts/checks/cred-github.sh` -- covers CRED-04
- [ ] `scripts/checks/cred-sentry.sh` -- covers CRED-02
- [ ] `scripts/checks/cred-contentful.sh` -- covers CRED-03
- [ ] `scripts/checks/cred-acli.sh` -- covers CRED-01

## Sources

### Primary (HIGH confidence)
- Existing codebase: `scripts/keychain.js`, `skills/*/setup.js` (4 files), `scripts/checks/*.sh` (3 files), `scripts/sentry-api.js`, `scripts/github-api.js` -- direct code inspection
- macOS `security` CLI documentation via [ss64.com](https://ss64.com/mac/security.html) and [scriptingosx.com](https://scriptingosx.com/2021/04/get-password-from-keychain-in-shell-scripts/)

### Secondary (MEDIUM confidence)
- [Sentry API Authentication docs](https://docs.sentry.io/api/auth/) -- `GET /api/0/organizations/` for token verification
- [Contentful Management API docs](https://www.contentful.com/developers/docs/references/content-management-api/) -- `GET /spaces` for token verification
- [Atlassian acli jira auth status](https://developer.atlassian.com/cloud/acli/reference/commands/jira-auth-status/) -- `acli jira auth status` for auth check
- [Sentry forum on credential validation](https://forum.sentry.io/t/validating-sentry-io-credentials-integration-health-check/1457) -- no dedicated ping endpoint, use organizations list

### Tertiary (LOW confidence)
- None -- all findings verified with official documentation or existing code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already in use in the codebase, zero new dependencies
- Architecture: HIGH -- refactoring existing patterns, not introducing new ones
- Pitfalls: HIGH -- patterns directly observed in existing code; shell escaping and non-TTY handling already solved
- Verification endpoints: MEDIUM -- confirmed via official API docs but not tested against live APIs
- Credentials audit: HIGH -- all 18 skills inspected, credential usage patterns verified in SKILL.md files

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable -- macOS Keychain and API auth patterns change slowly)
