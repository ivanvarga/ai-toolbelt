# Phase 4: Complex Skill Conversion - Research

**Researched:** 2026-03-12
**Domain:** Claude Code SKILL.md authoring with supporting files, Node.js helper scripts, macOS Keychain credential management
**Confidence:** HIGH

## Summary

This phase converts 8 complex items from `~/.claude/commands/` and `~/.claude/skills/` into the plugin's `skills/` directory. Unlike Phase 3's pure-markdown skills, these items involve helper scripts (gh-upload's setup.sh/upload.sh, mobilecli's 472-line test-helpers.sh), external CLI dependencies (acli, sentry-cli, eas-cli, contentful CLI, mobilecli), and credential requirements (GitHub session cookies, Sentry tokens, Contentful tokens, Jira/acli credentials). The core challenge is decomposing inline bash logic into Node.js helpers, building shared infrastructure (scripts/keychain.js, scripts/sentry-api.js, scripts/github-api.js), and wiring credential setup per skill.

The established Phase 3 patterns (frontmatter format, trigger-optimized descriptions, cross-skill `/tb:*` references, `disable-model-invocation`, full rewrite approach) carry forward directly. The new complexity is: (1) supporting files alongside SKILL.md, (2) shared scripts in the plugin root `scripts/` directory referenced via `${CLAUDE_PLUGIN_ROOT}` from hooks/scripts (but NOT from SKILL.md markdown -- SKILL.md bash blocks use `${CLAUDE_SKILL_DIR}`), and (3) credential first-run setup using macOS Keychain with `tb.{service}` naming.

**Primary recommendation:** Build shared infrastructure first (Wave 1: scripts/keychain.js, scripts/sentry-api.js, scripts/github-api.js), then convert skills that depend on it (Wave 2: pr-upload, sentry-investigate, sentry-sourcemaps), then remaining skills (Wave 3: task-jira, pr-describe, contentful, figma-component), then mobilecli solo (Wave 4). Each Node.js helper is a standalone script invocable via `node ${CLAUDE_SKILL_DIR}/helper.js` from SKILL.md bash blocks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Hybrid approach: shared utilities in scripts/ for cross-cutting concerns, skill-specific helpers alongside SKILL.md
- All heavy bash/logic converted to Node.js (preferred) or Python (only where Python dependencies like OCR exist)
- Shared utilities: scripts/keychain.js (Keychain access), scripts/sentry-api.js (Sentry API client), scripts/github-api.js (GitHub API client)
- Skill-specific helpers live alongside SKILL.md: skills/pr-upload/upload.js, skills/sentry-investigate/analyze.js, etc.
- SKILL.md calls helpers via `node ${CLAUDE_SKILL_DIR}/helper.js` for skill-local scripts or `node ${CLAUDE_PLUGIN_ROOT}/scripts/keychain.js` for shared utilities
- All credentials stored in macOS Keychain -- no Doppler, no sentryclirc, no env files
- Keychain service naming: `tb.{service}` pattern (e.g., tb.github-session, tb.sentry-token, tb.contentful-token, tb.jira-token)
- Each credential-needing skill gets a setup.js that prompts for the credential and stores via shared scripts/keychain.js
- Skills include basic 'first run' credential setup -- not deferred to Phase 5
- Phase 5 later unifies these into a central setup-all flow
- Plan 1 (Wave 1): Shared infrastructure -- scripts/keychain.js, scripts/sentry-api.js, scripts/github-api.js
- Plan 2 (Wave 2): gh-upload (-> pr-upload), investigate-sentry-issue (-> sentry-investigate), upload-sentry-sourcemaps (-> sentry-sourcemaps) -- skills that consume shared infra
- Plan 3 (Wave 3): jira (-> task-jira), pr-description (-> pr-describe), contentful-cli (-> contentful), create-figma-component (-> figma-component) -- remaining skills, forward refs accepted
- Plan 4 (Wave 3): mobilecli (-> mobilecli) -- solo plan due to massive size (500+ line SKILL.md + 470-line test-helpers.sh)
- Full rewrite from scratch based on intent and behavior (same as Phase 3)
- Trigger-optimized descriptions with "Use when..." pattern
- Inter-skill orchestration preserved: orchestrating skills reference /tb:* names in SKILL.md instructions
- Forward references to not-yet-converted skills accepted (same pattern as Phase 3)
- External CLI dependencies (acli, sentry-cli, eas-cli, contentful CLI): Claude decides per skill whether to keep CLI or switch to direct API calls
- All names follow PROJECT.md mapping:
  - gh-upload -> pr-upload (pr family)
  - mobilecli -> mobilecli (standalone)
  - contentful-cli -> contentful (standalone)
  - create-figma-component -> figma-component (figma family)
  - jira -> task-jira (task family)
  - investigate-sentry-issue -> sentry-investigate (sentry family)
  - pr-description -> pr-describe (pr family)
  - upload-sentry-sourcemaps -> sentry-sourcemaps (sentry family)

### Claude's Discretion
- Whether each external CLI should be preserved or replaced with direct API calls
- Exact Node.js helper structure per skill (what functions, what modules)
- SKILL.md content structure per skill (step-based vs template-based)
- How to handle mobilecli's 470-line test-helpers.sh decomposition

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-02 | All 8 complex items converted to SKILL.md + frontmatter format with supporting files | Skill-by-skill analysis completed, all 8 source files analyzed (2226 total lines), conversion strategy per skill documented, frontmatter patterns established from Phase 3 |
| MIGR-03 | All `$HOME/.claude/` path references rewritten to plugin-relative paths | Path variable rules documented: `${CLAUDE_SKILL_DIR}` in SKILL.md bash, skill-local helper access via relative paths, shared scripts via absolute resolution from SKILL.md |
| MIGR-04 | Inline bash/logic converted to Node.js helper scripts stored as supporting files | Node.js helper architecture documented per skill, shared infra design (keychain.js, sentry-api.js, github-api.js), test-helpers.sh decomposition strategy for mobilecli |
</phase_requirements>

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| SKILL.md format | Agent Skills spec | Skill definition file | Claude Code native skill format, proven in Phase 3 |
| YAML frontmatter | Standard YAML | Skill metadata | Required for Claude Code discovery |
| Node.js helpers | Node.js (system) | Supporting scripts for complex logic | User decision: all heavy logic in Node.js, invoked from SKILL.md bash blocks |
| macOS Keychain | `security` CLI | Credential storage | User decision: all credentials via Keychain, `tb.{service}` naming |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `${CLAUDE_SKILL_DIR}` | Path to skill's own directory | In SKILL.md bash commands referencing co-located helpers |
| `${CLAUDE_PLUGIN_ROOT}` | Path to plugin root | In hooks, scripts, MCP configs -- NOT in SKILL.md markdown |
| `child_process.execSync` | Shell command execution from Node.js | In helper scripts that need to call `security`, `gh`, `curl`, `acli` |
| `process.argv` / `process.stdin` | Input handling in Node.js helpers | For helpers invoked with arguments or piped data |
| `acli` | Jira CLI (v1.3.9+ installed) | task-jira skill for ticket reading |
| `mobilecli` | Mobile device automation CLI (v0.1.58) | mobilecli skill (kept as external dependency) |
| `contentful` CLI | Contentful CMS operations | contentful skill (keep -- complex migration DSL) |
| `sentry-cli` | Sentry operations | sentry-sourcemaps skill (keep for sourcemap upload) |
| `gh` | GitHub CLI | pr-upload, pr-describe (already used) |

### External CLI Decisions (Claude's Discretion)
| CLI | Decision | Rationale |
|-----|----------|-----------|
| `acli` | KEEP | Jira REST API is complex with auth. acli handles it. Already installed at `/opt/homebrew/bin/acli` |
| `mobilecli` | KEEP | Core CLI tool, not replacing. Installed at user's nvm path |
| `contentful` CLI | KEEP | Migration DSL is powerful and Contentful-specific. No benefit to reimplementing |
| `sentry-cli` | KEEP for sourcemap uploads | sentry-cli sourcemaps upload is well-tested and handles debug IDs. API calls for issue/event fetching move to scripts/sentry-api.js |
| `eas-cli` | KEEP | EAS build queries are eas-cli specific |
| `gh` | KEEP | Already used extensively, proven pattern |

## Architecture Patterns

### Recommended Project Structure (After Phase 4)
```
skills/
├── pr-upload/              # gh-upload -> pr-upload
│   ├── SKILL.md
│   ├── upload.js           # GitHub CDN upload logic (rewrite of upload.sh)
│   └── setup.js            # First-run credential setup
├── sentry-investigate/     # investigate-sentry-issue -> sentry-investigate
│   ├── SKILL.md
│   └── analyze.js          # Sentry issue fetching + analysis helpers
├── sentry-sourcemaps/      # upload-sentry-sourcemaps -> sentry-sourcemaps
│   └── SKILL.md            # References scripts/sentry-api.js for token access
├── task-jira/              # jira -> task-jira
│   ├── SKILL.md
│   └── setup.js            # First-run acli credential setup
├── pr-describe/            # pr-description -> pr-describe
│   └── SKILL.md            # Orchestrates /tb:task-jira + /tb:pr-upload + /tb:mobilecli
├── contentful/             # contentful-cli -> contentful
│   ├── SKILL.md
│   └── setup.js            # First-run Contentful token setup
├── figma-component/        # create-figma-component -> figma-component
│   └── SKILL.md            # Pure instructions, uses Figma MCP tool
├── mobilecli/              # mobilecli -> mobilecli (standalone)
│   ├── SKILL.md
│   └── test-helpers.sh     # Preserved as bash (too bash-specific for Node.js)
scripts/
├── keychain.js             # Shared: Keychain get/set/delete operations
├── sentry-api.js           # Shared: Sentry API client (fetch issues, events)
├── github-api.js           # Shared: GitHub upload API (CDN attachment upload)
└── checks/                 # Existing: health check scripts
    ├── hooks-valid.sh
    ├── plugin-registered.sh
    └── skills-valid.sh
```

### Pattern 1: Shared Utility Script (scripts/keychain.js)
**What:** Single Node.js script providing get/set/delete for macOS Keychain entries using the `security` CLI.
**When to use:** Any skill that needs to store or retrieve credentials.
**Interface:**
```bash
# From SKILL.md bash blocks (skill-local context):
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token)
node "$PLUGIN_ROOT/scripts/keychain.js" set tb.sentry-token "$VALUE"
node "$PLUGIN_ROOT/scripts/keychain.js" delete tb.sentry-token
```
**Implementation approach:**
```javascript
const { execSync } = require('child_process');
const [,, action, service, ...rest] = process.argv;

function get(service) {
  try {
    return execSync(
      `security find-generic-password -s "${service}" -w`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch { return ''; }
}

function set(service, value) {
  try { execSync(`security delete-generic-password -s "${service}" 2>/dev/null`); } catch {}
  execSync(`security add-generic-password -s "${service}" -w "${value}"`);
}
```

### Pattern 2: Skill-Specific Helper Script
**What:** Node.js script co-located with SKILL.md, invoked via `${CLAUDE_SKILL_DIR}`.
**When to use:** Logic specific to one skill that doesn't need sharing.
**Example (pr-upload/upload.js):**
```bash
# In SKILL.md bash block:
URL=$(node "${CLAUDE_SKILL_DIR}/upload.js" /path/to/file.png owner/repo)
```
**Key:** The helper receives arguments via `process.argv` and outputs the result to stdout. SKILL.md captures stdout.

### Pattern 3: Plugin Root Resolution from SKILL.md
**What:** Since `${CLAUDE_PLUGIN_ROOT}` does NOT work in SKILL.md markdown content, resolve it from `${CLAUDE_SKILL_DIR}`.
**When to use:** Any SKILL.md that needs to call shared scripts.
**Pattern:**
```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token
```
**Why:** `${CLAUDE_SKILL_DIR}` resolves to `<plugin_root>/skills/<skill-name>`, so `../..` reliably reaches plugin root.

### Pattern 4: First-Run Credential Setup
**What:** Each credential-needing skill includes a setup.js that checks for credentials and prompts if missing.
**When to use:** Skills that need API tokens or session cookies.
**Flow:**
1. SKILL.md "Setup" section tells user to run: `node ${CLAUDE_SKILL_DIR}/setup.js`
2. setup.js checks Keychain for existing credential via scripts/keychain.js
3. If missing, prompts user (interactive terminal) for the value
4. Stores via scripts/keychain.js with `tb.{service}` naming
5. Prints confirmation message

### Pattern 5: Credential Check in SKILL.md
**What:** SKILL.md instructions include a credential check step before main logic.
**When to use:** Every skill with credential dependencies.
**Pattern in SKILL.md:**
```markdown
## Prerequisites

Check credentials are configured:
\```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token)
if [ -z "$TOKEN" ]; then
  echo "Sentry token not configured. Run: node ${CLAUDE_SKILL_DIR}/setup.js"
  exit 1
fi
\```
```

### Pattern 6: mobilecli test-helpers.sh Preservation
**What:** Keep test-helpers.sh as bash (not Node.js) because it is deeply bash-idiomatic.
**Why:** The 472-line test-helpers.sh uses bash-specific features extensively: `source`, function definitions, subshell evaluation, jq piping, `trap`, `sleep` with sub-second granularity, stdout/stderr redirection, exit codes as return values. Converting to Node.js would lose the tight shell integration that makes it work with mobilecli's Bash tool calls. The script is sourced at the start of each Bash tool call via `source "$SKILL_DIR/test-helpers.sh"`.
**Conversion scope:** Rewrite the SKILL.md content from scratch (full rewrite), preserve test-helpers.sh as-is but update any `$HOME/.claude/` or `$SKILL_DIR` references to use `${CLAUDE_SKILL_DIR}`.

### Anti-Patterns to Avoid
- **Using `${CLAUDE_PLUGIN_ROOT}` in SKILL.md content:** Does NOT resolve. Use `${CLAUDE_SKILL_DIR}/../..` pattern instead.
- **Hardcoded `$HOME/.claude/` paths:** Must be rewritten to plugin-relative. Original sources are full of these.
- **Inline credential extraction in SKILL.md:** Move to helper scripts. Don't have SKILL.md doing `security find-generic-password` inline -- use scripts/keychain.js.
- **Reading ~/.sentryclirc directly:** Original investigate-sentry-issue reads `~/.sentryclirc` for Sentry token. Replace with Keychain lookup via scripts/keychain.js.
- **Doppler references:** Original contentful-cli uses Doppler for secrets. Replace with Keychain.
- **Converting test-helpers.sh to Node.js:** Bash is the right tool here. The entire mobilecli workflow is Bash tool calls with `source` and jq. Node.js would be fighting the paradigm.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keychain access | Per-skill `security` commands | scripts/keychain.js shared utility | 5 skills need Keychain; one utility handles error cases, deletion-before-add, and consistent `tb.{service}` naming |
| Sentry API calls | Per-skill curl commands with token extraction | scripts/sentry-api.js shared utility | sentry-investigate and sentry-sourcemaps both need Sentry API; share token retrieval and HTTP logic |
| GitHub CDN upload | Inline curl chains | pr-upload/upload.js (rewrite of upload.sh) | Upload flow is multi-step (policy -> S3 -> finalize), too complex for inline SKILL.md |
| Skill discovery | Custom registration | SessionStart hook (already built) | Auto-discovers from frontmatter scanning |
| Skill validation | Manual checks | scripts/checks/skills-valid.sh (already exists) | Validates SKILL.md presence and name field |
| Argument handling | Custom parsing | Claude's built-in argument injection | Remove `$ARGUMENTS`, document args inline |

## Common Pitfalls

### Pitfall 1: CLAUDE_PLUGIN_ROOT in SKILL.md
**What goes wrong:** SKILL.md references `${CLAUDE_PLUGIN_ROOT}/scripts/keychain.js` but the variable doesn't resolve, causing "file not found" errors.
**Why it happens:** `${CLAUDE_PLUGIN_ROOT}` only works in hooks, MCP configs, and scripts -- not in SKILL.md markdown content.
**How to avoid:** Always use `PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."` pattern in SKILL.md bash blocks.
**Warning signs:** Any `${CLAUDE_PLUGIN_ROOT}` appearing in a SKILL.md file.

### Pitfall 2: Keychain Service Name Inconsistency
**What goes wrong:** One skill stores as `gh-upload` and another reads as `tb.github-session`, causing credential not found.
**Why it happens:** Original skills used inconsistent naming (gh-upload used `gh-upload` as service name).
**How to avoid:** Enforce `tb.{service}` naming pattern in scripts/keychain.js. All new skills use this convention.
**Warning signs:** Any `security` command with a service name not starting with `tb.`.

### Pitfall 3: setup.sh vs setup.js Interactive Mismatch
**What goes wrong:** setup.js tries to read stdin but Claude Code's Bash tool doesn't support interactive input.
**Why it happens:** Original setup.sh had `read -r COOKIE` for interactive terminal input.
**How to avoid:** setup.js should accept credentials as command-line arguments OR check if running interactively. SKILL.md should document both flows: (1) interactive terminal `node setup.js` and (2) non-interactive `node setup.js --token VALUE`. The SKILL.md instructions should tell Claude to ask the user for the credential value, then pass it as an argument.
**Warning signs:** `read` or `readline` calls without checking `process.stdin.isTTY`.

### Pitfall 4: mobilecli SKILL_DIR vs CLAUDE_SKILL_DIR
**What goes wrong:** test-helpers.sh is sourced with `source "$SKILL_DIR/test-helpers.sh"` but `$SKILL_DIR` is undefined in the plugin context.
**Why it happens:** Original mobilecli SKILL.md used `$SKILL_DIR` (which was the implicit skill directory). In the plugin context, it must be `$CLAUDE_SKILL_DIR` or resolved by the user setting `SKILL_DIR="${CLAUDE_SKILL_DIR}"`.
**How to avoid:** In the rewritten SKILL.md, use `${CLAUDE_SKILL_DIR}` consistently. For the Usage Pattern section, show: `source "${CLAUDE_SKILL_DIR}/test-helpers.sh"`.
**Warning signs:** Any `$SKILL_DIR` reference that is not `${CLAUDE_SKILL_DIR}`.

### Pitfall 5: Sentry Token Migration from sentryclirc to Keychain
**What goes wrong:** sentry-cli still looks for `~/.sentryclirc` by default, but we've moved the token to Keychain.
**Why it happens:** sentry-cli has its own config discovery mechanism.
**How to avoid:** For sentry-sourcemaps (which uses sentry-cli directly), pass the token via environment variable: `SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token) npx sentry-cli ...`. For sentry-investigate (which uses the API directly), scripts/sentry-api.js handles token retrieval internally.
**Warning signs:** Any reference to `~/.sentryclirc` or `grep "token=" ~/.sentryclirc`.

### Pitfall 6: pr-describe Orchestration Dependencies
**What goes wrong:** pr-describe calls `/tb:task-jira`, `/tb:pr-upload`, and `mobilecli` -- if any of these aren't converted yet when testing, the orchestration fails.
**Why it happens:** pr-describe is in Wave 3 but depends on Wave 2 (pr-upload) and Wave 3 (task-jira).
**How to avoid:** Convert pr-upload (Wave 2) before pr-describe (Wave 3). Task-jira is in the same wave, so order matters within Plan 3: convert task-jira before pr-describe.
**Warning signs:** Testing pr-describe before its dependencies are converted.

### Pitfall 7: Node.js Helpers Missing Shebang or Error Handling
**What goes wrong:** `node helper.js` fails silently or returns cryptic errors.
**Why it happens:** Forgetting try/catch, not handling missing arguments, not providing usage messages.
**How to avoid:** Every helper script should: (1) validate required arguments with a usage message, (2) wrap main logic in try/catch, (3) exit with non-zero on failure, (4) output errors to stderr.

## Code Examples

### scripts/keychain.js - Shared Keychain Utility
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');

const [,, action, service, ...rest] = process.argv;

if (!action || !service) {
  console.error('Usage: keychain.js <get|set|delete> <service> [value]');
  process.exit(1);
}

switch (action) {
  case 'get': {
    try {
      const value = execSync(
        `security find-generic-password -s "${service}" -w`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      process.stdout.write(value);
    } catch {
      process.exit(1);
    }
    break;
  }
  case 'set': {
    const value = rest[0];
    if (!value) { console.error('Usage: keychain.js set <service> <value>'); process.exit(1); }
    try { execSync(`security delete-generic-password -s "${service}" 2>/dev/null`); } catch {}
    execSync(`security add-generic-password -s "${service}" -w "${value}"`);
    break;
  }
  case 'delete': {
    try { execSync(`security delete-generic-password -s "${service}"`); } catch {}
    break;
  }
  default:
    console.error(`Unknown action: ${action}`);
    process.exit(1);
}
```

### scripts/sentry-api.js - Shared Sentry API Client
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const https = require('https');

const PLUGIN_ROOT = require('path').resolve(__dirname, '..');
const KEYCHAIN = require('path').join(PLUGIN_ROOT, 'scripts', 'keychain.js');

function getToken() {
  try {
    return execSync(`node "${KEYCHAIN}" get tb.sentry-token`, { encoding: 'utf8' }).trim();
  } catch {
    console.error('Sentry token not found. Run setup for sentry-investigate or sentry-sourcemaps.');
    process.exit(1);
  }
}

function fetchJSON(path) {
  const token = getToken();
  return new Promise((resolve, reject) => {
    const req = https.get(`https://sentry.io${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

// CLI interface
const [,, action, ...args] = process.argv;
// Actions: issue <id>, event <issue_id>, events <issue_id>
```

### scripts/github-api.js - Shared GitHub Upload API
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const KEYCHAIN = path.join(PLUGIN_ROOT, 'scripts', 'keychain.js');

function getSession() {
  try {
    return execSync(`node "${KEYCHAIN}" get tb.github-session`, { encoding: 'utf8' }).trim();
  } catch {
    console.error('GitHub session not found. Run: node <skill-dir>/setup.js');
    process.exit(1);
  }
}

// Upload file to GitHub CDN, return URL
// Rewrite of gh-upload/upload.sh logic in Node.js
```

### Skill-Specific setup.js Pattern
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const KEYCHAIN = path.join(PLUGIN_ROOT, 'scripts', 'keychain.js');
const SERVICE = 'tb.sentry-token';

const tokenArg = process.argv[2];
if (tokenArg) {
  execSync(`node "${KEYCHAIN}" set ${SERVICE} "${tokenArg}"`);
  console.log(`Sentry token saved to Keychain (${SERVICE}).`);
  process.exit(0);
}

const existing = (() => {
  try { return execSync(`node "${KEYCHAIN}" get ${SERVICE}`, { encoding: 'utf8' }).trim(); }
  catch { return ''; }
})();

if (existing) {
  console.log(`Sentry token already configured (${SERVICE}).`);
  process.exit(0);
}

if (!process.stdin.isTTY) {
  console.error(`No token found. Provide as argument: node setup.js <TOKEN>`);
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter Sentry auth token: ', (token) => {
  rl.close();
  if (!token.trim()) { console.error('No token provided.'); process.exit(1); }
  execSync(`node "${KEYCHAIN}" set ${SERVICE} "${token.trim()}"`);
  console.log(`Sentry token saved to Keychain (${SERVICE}).`);
});
```

### SKILL.md with Supporting Files Pattern (pr-upload)
```yaml
---
name: pr-upload
description: Use when uploading images or videos to GitHub for PR descriptions, issue comments, or any GitHub markdown content. Triggers on upload screenshot, add image to PR, or embed media in GitHub.
---

# GitHub Upload

Upload files to GitHub's CDN. Returns URLs for embedding in PRs/issues.

## Setup

Run setup once to save GitHub session cookie to Keychain:

\```bash
node "${CLAUDE_SKILL_DIR}/setup.js"
\```

Manual alternative (pass cookie directly):
\```bash
node "${CLAUDE_SKILL_DIR}/setup.js" "<user_session_cookie_value>"
\```

## Usage

\```bash
URL=$(node "${CLAUDE_SKILL_DIR}/upload.js" /path/to/file.png)
URL=$(node "${CLAUDE_SKILL_DIR}/upload.js" /path/to/file.png owner/repo)
\```

[rest of skill content]
```

## Skill-by-Skill Conversion Analysis

### 1. gh-upload -> pr-upload
**Source:** `~/.claude/skills/gh-upload/` (SKILL.md 54 lines + setup.sh 38 lines + upload.sh 64 lines)
**Complexity:** MEDIUM -- 3 files, Keychain credential, multi-step upload API
**Supporting files needed:** upload.js (rewrite of upload.sh), setup.js (rewrite of setup.sh)
**Credential:** `tb.github-session` (user_session cookie from GitHub)
**Path rewrites:** `$HOME/.claude/skills/gh-upload/setup.sh` -> `${CLAUDE_SKILL_DIR}/setup.js`, `$SKILL_DIR/upload.sh` -> `${CLAUDE_SKILL_DIR}/upload.js`
**External CLIs kept:** `gh` (for repo ID lookup), `curl` (for upload API)
**Notes:** upload.sh logic (policy request -> S3 upload -> asset finalization) maps cleanly to Node.js with `https` module. setup.sh's AppleScript Chrome cookie extraction can be documented as manual flow instead (the original already had a manual fallback).

### 2. investigate-sentry-issue -> sentry-investigate
**Source:** `~/.claude/commands/investigate-sentry-issue.md` (522 lines)
**Complexity:** HIGH -- longest source file, heavy curl/jq patterns, Sentry API integration
**Supporting files needed:** analyze.js (optional -- most logic is Claude instructions, not executable code)
**Credential:** `tb.sentry-token` (Sentry auth token, was in ~/.sentryclirc)
**Path rewrites:** `~/.sentryclirc` token extraction -> Keychain lookup, `grep "token=" ~/.sentryclirc` -> `node scripts/keychain.js get tb.sentry-token`
**External CLIs kept:** `sentry-cli` (for events list, issues list), `curl` (for API calls using Keychain token), `jq` (for JSON parsing)
**Notes:** Most of the 522 lines are Claude instructions (investigation flow, error patterns, breadcrumb analysis), not executable scripts. The main conversion is: (1) rewrite curl commands to use Keychain token instead of sentryclirc, (2) replace `/upload-sentry-sourcemaps` reference with `/tb:sentry-sourcemaps`, (3) remove `$ARGUMENTS`. The analyze.js helper is optional -- could just inline the token retrieval in SKILL.md bash blocks.

### 3. upload-sentry-sourcemaps -> sentry-sourcemaps
**Source:** `~/.claude/commands/upload-sentry-sourcemaps.md` (193 lines)
**Complexity:** MEDIUM -- sentry-cli usage, EAS queries, two upload methods
**Supporting files needed:** None required (SKILL.md instructions with inline bash)
**Credential:** `tb.sentry-token` (same as sentry-investigate)
**Path rewrites:** None (no `$HOME/.claude/` references in source)
**External CLIs kept:** `sentry-cli` (sourcemap upload), `eas-cli` (build list query), `doppler` (mentioned but Keychain replaces it for token)
**Notes:** The two methods (Local Native Build vs OTA Export) are instructional -- Claude follows them. Main conversion: (1) pass Sentry token via env var from Keychain: `SENTRY_AUTH_TOKEN=$(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.sentry-token)`, (2) remove `$ARGUMENTS`, (3) add setup.js for Sentry token or reuse sentry-investigate's setup.

### 4. jira -> task-jira
**Source:** `~/.claude/commands/jira.md` (139 lines)
**Complexity:** LOW-MEDIUM -- acli CLI usage, attachment-documenter agent reference
**Supporting files needed:** setup.js (acli credential setup)
**Credential:** `tb.jira-token` (or `tb.acli-config` -- acli uses its own auth mechanism)
**Path rewrites:** `.claude/attachments/` references stay as-is (project-local, not plugin paths)
**External CLIs kept:** `acli` (Jira CLI, handles auth internally)
**Notes:** acli manages its own credentials via `acli login` flow. The setup.js for task-jira may just verify acli is installed and authenticated rather than storing a token in Keychain. The SKILL.md is primarily instructions for Claude to call acli commands. Reference to attachment-documenter agent preserved.

### 5. pr-description -> pr-describe
**Source:** `~/.claude/commands/pr-description.md` (66 lines)
**Complexity:** MEDIUM -- orchestrates other skills (task-jira, pr-upload, mobilecli)
**Supporting files needed:** None (pure orchestration instructions)
**Credential:** None directly (delegates to other skills for credentials)
**Path rewrites:** `$HOME/.claude/skills/gh-upload/upload.sh` -> `/tb:pr-upload`
**External CLIs kept:** `mobilecli` (screenshots), `gh` (diff, branch)
**Notes:** This skill is an orchestrator. Main conversion: (1) replace `/jira` with `/tb:task-jira`, (2) replace `bash "$HOME/.claude/skills/gh-upload/upload.sh"` with `/tb:pr-upload`, (3) replace `mobilecli screenshot` with reference to `/tb:mobilecli` or direct mobilecli usage, (4) remove `$ARGUMENTS`. Forward reference to `/tb:task-jira` and `/tb:pr-upload` both resolved by this phase.

### 6. contentful-cli -> contentful
**Source:** `~/.claude/skills/contentful-cli/SKILL.md` (657 lines)
**Complexity:** MEDIUM -- largest SKILL.md, but mostly reference documentation
**Supporting files needed:** setup.js (Contentful management token setup)
**Credential:** `tb.contentful-token` (management API token, was from Doppler)
**Path rewrites:** None (no `$HOME/.claude/` references)
**External CLIs kept:** `contentful` CLI, `contentful-migration` (npx)
**Notes:** 657 lines is over the 500-line recommendation. Most content is the Migration DSL reference (field types, validations, widget IDs). Could split into SKILL.md (core instructions, ~200 lines) + a reference file, or keep as one file since Claude handles large skills fine. Main conversion: (1) replace Doppler token passing with Keychain: `--mt $(node "$PLUGIN_ROOT/scripts/keychain.js" get tb.contentful-token)`, (2) add setup.js for token. Safety rules and migration DSL reference preserved as-is.

### 7. create-figma-component -> figma-component
**Source:** `~/.claude/commands/create-figma-component.md` (70 lines)
**Complexity:** LOW -- pure instructions, uses Figma MCP tool
**Supporting files needed:** None
**Credential:** None (Figma MCP handles auth)
**Path rewrites:** None
**External CLIs kept:** None (uses `mcp__figma-desktop__get_design_context` MCP tool)
**Notes:** Simplest of the 8. Just rewrite with proper frontmatter, remove `$ARGUMENTS`, add trigger-optimized description. The Figma MCP tool is external -- skill just provides component creation patterns and design token references.

### 8. mobilecli -> mobilecli
**Source:** `~/.claude/skills/mobilecli/` (SKILL.md 525 lines + test-helpers.sh 472 lines + DEBUG-MODE.md + GAPS.md + TEST-SCENARIOS.md)
**Complexity:** HIGHEST -- massive skill, 50+ bash functions, platform-aware logic
**Supporting files to keep:** test-helpers.sh (preserved as bash), optionally DEBUG-MODE.md
**Supporting files to drop:** GAPS.md (runtime output, not part of skill), TEST-SCENARIOS.md (reference, could be preserved or dropped)
**Credential:** None (mobilecli CLI doesn't need credentials)
**Path rewrites:** `$SKILL_DIR/test-helpers.sh` -> `${CLAUDE_SKILL_DIR}/test-helpers.sh`, `$HOME/.claude/skills/mobilecli/` -> `${CLAUDE_SKILL_DIR}/`
**External CLIs kept:** `mobilecli` (core dependency), `adb` (Android), `jq` (JSON processing)
**Notes:** test-helpers.sh must stay as bash -- the entire mobilecli workflow depends on `source`-ing this file in Bash tool calls. The SKILL.md rewrite should: (1) update all path references, (2) remove `$SKILL_DIR` and use `${CLAUDE_SKILL_DIR}` consistently, (3) keep `allowed-tools: Bash(mobilecli:*)` in frontmatter, (4) preserve the recommended global permissions section. DEBUG-MODE.md can be preserved as a supporting file. GAPS.md and TEST-SCENARIOS.md can be dropped (they're runtime artifacts, not skill definitions).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `~/.sentryclirc` for Sentry token | macOS Keychain via `tb.sentry-token` | This phase | All Sentry skills use shared keychain.js |
| Doppler for Contentful token | macOS Keychain via `tb.contentful-token` | This phase | No Doppler dependency for Contentful |
| `$HOME/.claude/skills/gh-upload/setup.sh` | `node ${CLAUDE_SKILL_DIR}/setup.js` | This phase | Plugin-relative, Node.js |
| `$SKILL_DIR` (implicit) | `${CLAUDE_SKILL_DIR}` (explicit) | Plugin format | Consistent, documented path variable |
| Bash helper scripts | Node.js helper scripts | This phase (user decision) | Except mobilecli's test-helpers.sh which stays bash |
| Per-skill ad-hoc credential handling | Shared scripts/keychain.js with `tb.{service}` naming | This phase | Consistent, Phase 5 can unify setup |

## Open Questions

1. **acli credential model**
   - What we know: acli manages its own auth via `acli login` (OAuth flow with Atlassian). It stores credentials in its own config.
   - What's unclear: Whether we need a `tb.jira-token` in Keychain or just verify acli is authenticated. acli may not support passing tokens via env var.
   - Recommendation: task-jira's setup.js should verify `acli` is installed and configured (`acli jira workitem view --help` succeeds). If acli needs explicit token, store in Keychain. Otherwise, just document the `acli login` setup step.

2. **contentful SKILL.md length**
   - What we know: Original is 657 lines, above the 500-line recommendation.
   - What's unclear: Whether Claude Code has a hard limit or just a soft recommendation.
   - Recommendation: Keep as single file. The migration DSL reference is valuable inline and splitting it would hurt usability. Phase 3's research confirmed the 500-line limit is a recommendation, not a hard cap.

3. **mobilecli DEBUG-MODE.md and TEST-SCENARIOS.md**
   - What we know: DEBUG-MODE.md is referenced in SKILL.md ("read and follow [DEBUG-MODE.md](DEBUG-MODE.md)"). TEST-SCENARIOS.md appears to be a separate reference document.
   - What's unclear: Whether these supporting files are auto-loaded by Claude Code or need explicit references in SKILL.md.
   - Recommendation: Keep DEBUG-MODE.md (explicitly referenced via relative path in SKILL.md). Drop TEST-SCENARIOS.md and GAPS.md (runtime artifacts).

4. **GitHub session cookie extraction method**
   - What we know: Original setup.sh used AppleScript to extract Chrome cookies. The original already documented a manual fallback.
   - What's unclear: Whether AppleScript cookie extraction still works reliably with current Chrome security.
   - Recommendation: setup.js should support manual input (ask user to paste from DevTools). Document the manual flow as primary approach. AppleScript extraction is fragile and Chrome increasingly restricts cookie access.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bash check scripts + /skill-creator verification |
| Config file | scripts/checks/skills-valid.sh (exists) |
| Quick run command | `bash scripts/checks/skills-valid.sh .` |
| Full suite command | `/tb:doctor` (runs all check scripts) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-02-a | All 8 SKILL.md files exist with proper frontmatter | unit | `bash scripts/checks/skills-valid.sh .` | Yes |
| MIGR-02-b | Supporting files (setup.js, upload.js, etc.) exist alongside SKILL.md | unit | `ls skills/pr-upload/upload.js skills/pr-upload/setup.js ...` | Wave 0 |
| MIGR-02-c | Shared scripts exist | unit | `ls scripts/keychain.js scripts/sentry-api.js scripts/github-api.js` | Wave 0 |
| MIGR-02-d | Each skill loads correctly in Claude Code | manual-only | Invoke `/tb:skill-name` in Claude Code session | N/A |
| MIGR-03-a | No `$HOME/.claude/` references in any SKILL.md or helper | unit | `grep -r '\$HOME/.claude' skills/ scripts/ && echo FAIL \|\| echo PASS` | Wave 0 |
| MIGR-03-b | No `~/.claude/` references | unit | `grep -r '~/.claude' skills/ scripts/ && echo FAIL \|\| echo PASS` | Wave 0 |
| MIGR-03-c | No `~/.sentryclirc` references | unit | `grep -r 'sentryclirc' skills/ scripts/ && echo FAIL \|\| echo PASS` | Wave 0 |
| MIGR-04-a | Node.js helpers are executable and have valid syntax | unit | `node --check scripts/keychain.js && node --check scripts/sentry-api.js ...` | Wave 0 |
| MIGR-04-b | Keychain utility get/set/delete operations work | manual-only | `node scripts/keychain.js set tb.test testval && node scripts/keychain.js get tb.test` | N/A |
| MIGR-04-c | Skills with credentials check Keychain before proceeding | manual-only | `/skill-creator` benchmarking | N/A |

**Manual-only justification:** Skill behavior verification and credential flows require interactive Claude Code sessions or actual macOS Keychain access.

### Sampling Rate
- **Per task commit:** `bash scripts/checks/skills-valid.sh .`
- **Per wave merge:** `/tb:doctor` + verify no `$HOME/.claude/` path references + `node --check` all .js helpers
- **Phase gate:** All 8 skills pass skills-valid.sh + `/skill-creator` verification

### Wave 0 Gaps
- [ ] Verification script for `$HOME/.claude/` path references (grep-based check, could be added to scripts/checks/)
- [ ] `node --check` validation for all .js helper scripts (syntax validation)

## Sources

### Primary (HIGH confidence)
- Existing plugin skills: `skills/doctor/SKILL.md`, `skills/pr-submit/SKILL.md`, `skills/task-github/SKILL.md` -- proven SKILL.md patterns in this plugin
- Original source files: All 8 complex items analyzed in full (2226 total lines)
- macOS `security` CLI man page -- Keychain add/find/delete generic password operations
- Phase 3 RESEARCH.md and completed skills -- established conversion patterns

### Secondary (MEDIUM confidence)
- Claude Code Skills documentation (from Phase 3 research) -- SKILL.md spec, frontmatter fields, path variables
- Phase 4 CONTEXT.md -- user decisions constraining implementation

### Tertiary (LOW confidence)
- None -- all findings verified against existing codebase and official patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Same SKILL.md patterns as Phase 3, Node.js helpers are standard
- Architecture: HIGH -- Shared utility pattern is well-defined, skill decomposition analyzed per skill
- Pitfalls: HIGH -- Derived from actual bugs found in analysis (path variable limitations, Keychain naming, interactive input)
- Credential management: HIGH -- macOS Keychain `security` CLI is well-documented, pattern proven by existing gh-upload setup.sh

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable -- SKILL.md spec is mature, Keychain API is stable)
