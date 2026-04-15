---
phase: 24-paperclip-triage-pipeline
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 39
files_reviewed_list:
  - bin/resolve-credential
  - companies/triage-shop/.paperclip.yaml
  - companies/triage-shop/agents/gsd-orchestrator/AGENTS.md
  - companies/triage-shop/agents/gsd-orchestrator/SOUL.md
  - companies/triage-shop/agents/oneshot-coder/AGENTS.md
  - companies/triage-shop/agents/oneshot-coder/SOUL.md
  - companies/triage-shop/agents/triage/AGENTS.md
  - companies/triage-shop/agents/triage/SOUL.md
  - companies/triage-shop/COMPANY.md
  - docs/paperclip-triage-setup.md
  - scripts/paperclip-symlink.sh
  - scripts/tb-triage-worktree-wrapper.sh
  - scripts/tb-triage/cleanup.js
  - scripts/tb-triage/dedup-store.js
  - scripts/tb-triage/paths.js
  - scripts/tb-triage/relay-filters.js
  - scripts/tb-triage/relay-paperclip-client.js
  - scripts/tb-triage/relay.js
  - scripts/tb-triage/repo-map.js
  - scripts/tests/cleanup-on-merge.test.js
  - scripts/tests/companies-artifacts.test.js
  - scripts/tests/fixtures/github-issues-assigned.json
  - scripts/tests/fixtures/github-issues-labeled-triage-oneshot.json
  - scripts/tests/fixtures/github-pr-closed-merged.json
  - scripts/tests/fixtures/jira-issue-labeled.json
  - scripts/tests/fixtures/jira-issue-updated-assigned.json
  - scripts/tests/helpers/dedup-store.js
  - scripts/tests/helpers/hmac.js
  - scripts/tests/helpers/paperclip-mock.js
  - scripts/tests/helpers/paperclip-signature.js
  - scripts/tests/paperclip-symlink.test.sh
  - scripts/tests/relay-github-filter.test.js
  - scripts/tests/relay-github-verify.test.js
  - scripts/tests/relay-jira-filter.test.js
  - scripts/tests/relay-jira-verify.test.js
  - scripts/tests/relay-paperclip-fire.test.js
  - scripts/tests/relay-pr-cleanup.test.js
  - scripts/tests/scaffold.test.js
  - scripts/tests/tb-triage-dedup-store.test.js
  - scripts/tests/tb-triage-repo-map.test.js
  - scripts/tests/triage-tag-override.test.js
findings:
  critical: 0
  warning: 6
  info: 7
  total: 13
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-04-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 39
**Status:** issues_found

## Summary

Reviewed the paperclip-triage-pipeline phase (webhook relay, filters, cleanup,
dedup store, repo-map, company/agent markdown, setup docs, and the full test
suite). The code is well-structured, defense-in-depth for HMAC is sound
(`timingSafeEqual` with length guard), dedup keys are pattern-validated, and
agent markdown reinforces the untrusted-content boundary.

No critical (security/data-loss) issues. Six warnings center on logic contracts
between relay/cleanup (stored dedup entry shape mismatches what cleanup needs),
a real tag-override priority bug, a TOCTOU in concurrent webhook dedup, a CLI
arg parser that silently drops space-separated flags, a swallowed-error pattern
in the HTTP server, and a launchd template with a non-portable node path.
Seven info items cover naming, duplicated constants, docs polish, and plugin
path-variable convention drift.

## Warnings

### WR-01: Tag-override priority bug — `skip` loses to earlier labels

**File:** `scripts/tb-triage/relay-filters.js:23-30`
**Issue:** `extractTriageTag` returns the first label in array order that matches any key in `TAG_VOCAB`. But the triage contract (`companies/triage-shop/agents/triage/AGENTS.md:29-34`) explicitly orders priority as `triage:skip` > `triage:oneshot` > `triage:process`. Under the current implementation, a ticket labelled `["triage:oneshot", "triage:skip"]` routes to oneshot — the opposite of the "skip trumps everything" contract. This is a routing correctness bug: a reviewer who adds `triage:skip` expecting the pipeline to stop will instead see work dispatched.
**Fix:**
```js
const TAG_PRIORITY = ['triage:skip', 'triage:oneshot', 'triage:process'];

function extractTriageTag(labels) {
  if (!Array.isArray(labels)) return null;
  const names = new Set(
    labels
      .map((l) => (typeof l === 'string' ? l : l?.name))
      .filter(Boolean)
  );
  for (const tag of TAG_PRIORITY) {
    if (names.has(tag)) return TAG_VOCAB[tag];
  }
  return null;
}
```
Also update the test `scripts/tests/triage-tag-override.test.js` to cover the conflict case (e.g., `[{name:'triage:oneshot'},{name:'triage:skip'}]` MUST return `'skip'`).

### WR-02: Dedup store has TOCTOU between `check` and `insert` on concurrent webhooks

**File:** `scripts/tb-triage/relay.js:84-111` (github), `:136-162` (jira), and `scripts/tb-triage/dedup-store.js:21-28`
**Issue:** The webhook handler does `dedup.check(key)` → awaits `paperclip.fireRoutine` → `dedup.insert(key, ...)`. Two simultaneous webhook deliveries for the same dedupKey (e.g., GitHub retry + smee replay) will both observe empty, both fire the Paperclip routine (creating duplicate issues), and only the first insert wins (insert is idempotent). The Paperclip side sees two routine fires for what should have been one.
**Fix:** Insert an in-flight marker synchronously BEFORE firing, then patch with the runId after. Minimal patch:
```js
const inflight = dedup.check(decision.dedupKey);
if (inflight) { /* return dedup-hit as today */ }
dedup.insert(decision.dedupKey, { inflight: true, source: 'github', createdAt: new Date().toISOString() });
try {
  const result = await paperclip.fireRoutine(...);
  dedup.insert(decision.dedupKey, { paperclipIssueId: result.runId, source: 'github', createdAt: new Date().toISOString() });
} catch (err) {
  dedup.remove(decision.dedupKey);
  throw err;
}
```
Note: `dedup-store.insert` currently returns the existing value on conflict instead of overwriting — either add an `upsert` / `update` primitive or loosen the conflict semantics for the marker-flip case. The helper at `scripts/tests/helpers/dedup-store.js:26-32` already overwrites, so the two implementations disagree; align them.

### WR-03: Relay dedup entry is missing the fields `cleanup.removeWorktreeForPr` requires

**File:** `scripts/tb-triage/relay.js:105-111` (insert payload) vs `scripts/tb-triage/cleanup.js:7-28, 41-59`
**Issue:** The relay inserts `{ paperclipIssueId, source, createdAt }`. But `matchDedupKeyFromPr` keys off `entry.prUrl` or `entry.worktreeName`, and `removeWorktreeForPr` requires `entry.worktreeCwd` and `entry.worktreeName`. The intent (per `agents/triage/AGENTS.md:92-97`) is that the triage agent PATCHes these fields onto the dedup entry when it provisions the worktree. If that PATCH path is missing or the agent run fails mid-way, a later PR-merge webhook will enter the "dedup entry had no worktree; removed entry only" branch (`cleanup.js:43`) and silently skip the real `git worktree remove`, leaking the worktree on disk. There is no code in this PR that actually writes `worktreeName`/`worktreeCwd`/`prUrl` into the dedup store — the only writer is relay.js with the 3-field shape. This means cleanup's happy path is unreachable from the relay alone.
**Fix:** Either (a) add an explicit agent-side update helper in `dedup-store.js` (e.g., `update(key, partial)`) and reference it from the triage/executor AGENTS.md Step 5 so the linkage is visible; or (b) accept that the agent must call through a Paperclip endpoint and explicitly document the handoff. Option (a) snippet:
```js
function update(key, partial) {
  if (!KEY_PATTERN.test(key)) throw new Error(`invalid dedup key: ${key}`);
  const data = readAll();
  if (!data[key]) throw new Error(`no dedup entry for key: ${key}`);
  data[key] = { ...data[key], ...partial };
  writeAll(data);
  return data[key];
}
```
Add a test in `scripts/tests/cleanup-on-merge.test.js` that exercises the end-to-end shape: insert the 3-field relay entry, `update()` with worktree fields, then `removeWorktreeForPr` succeeds.

### WR-04: `repo-map.js` CLI drops space-separated flags

**File:** `scripts/tb-triage/repo-map.js:75-93`
**Issue:** The usage string at line 77 is `--source=<gh|jira>` (equals sign) but the argv parser at line 78-81 only handles `--key=value`:
```js
const opts = Object.fromEntries(rest.map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.join('=')];
}));
```
If a user types `--source gh` (space), the parser sees two argv elements `--source` and `gh`, yielding `{ source: '', gh: '' }`. The code then falls through to `resolve(opts, client)` with `opts.source === ''`, which throws `unknown source:` from resolve(). The error message is correct but the contract is inconsistent — the AGENTS.md at `agents/triage/AGENTS.md:55` invokes this as `node ... resolve --source <gh|jira> ...` (space), which will fail until the caller switches to `=`. Fix either the parser or the docs.
**Fix:** Support both forms:
```js
const opts = {};
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (!a.startsWith('--')) continue;
  const eq = a.indexOf('=');
  if (eq !== -1) {
    opts[a.slice(2, eq)] = a.slice(eq + 1);
  } else {
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) { opts[a.slice(2)] = next; i++; }
    else opts[a.slice(2)] = true;
  }
}
```

### WR-05: `relay.js` HTTP handler swallows all unhandled errors

**File:** `scripts/tb-triage/relay.js:192`
**Issue:** `server = http.createServer((req, res) => handleRequest(req, res, config).catch(() => {}))`. Any throw inside `handleRequest` that escapes the inner try/catch (e.g., a Buffer operation error before `reply()` is called) leaves the socket dangling — the client hangs until the GitHub/Jira timeout (default ~10s), and no log is produced. The silent `.catch(() => {})` defeats observability. Under load or transient errors this will present as mysterious 504s on the webhook sender side with no trace in the relay logs.
**Fix:**
```js
const server = http.createServer((req, res) =>
  handleRequest(req, res, config).catch((err) => {
    log({ route: req.url, status: 500, error: err.message, fatal: true });
    if (!res.headersSent) reply(res, 500, { error: 'internal error' });
    else res.destroy();
  })
);
```

### WR-06: launchd plist hardcodes `/usr/local/bin/node` — breaks on Apple Silicon homebrew

**File:** `docs/paperclip-triage-setup.md:177`
**Issue:** The template uses `/usr/local/bin/node`, which is the Intel-homebrew default. On Apple Silicon (M-series), brew installs node at `/opt/homebrew/bin/node`. Following this template verbatim on an M-series Mac produces a launchd job that fails to load with `No such file or directory` — and the operator will likely not check `launchctl print` to notice. Given this document is the whole onboarding path, a silent persistence failure is bad UX.
**Fix:** Replace with guidance to use `$(which node)` at plist-write time, or document both paths:
```xml
<string>/opt/homebrew/bin/node</string> <!-- Apple Silicon -->
<!-- OR -->
<string>/usr/local/bin/node</string>    <!-- Intel -->
```
Better: suggest the operator run `which node` and paste the output, and call out Apple Silicon vs Intel explicitly since both are common.

## Info

### IN-01: `paperclipIssueId` field actually stores `runId` — name is misleading

**File:** `scripts/tb-triage/relay.js:107, 158`
**Issue:** The inserted field is `paperclipIssueId: result.runId`. `fireRoutine` returns a run id from `/routine-triggers/.../fire`; the issue id would come from a separate call. `cleanup-on-merge.test.js:38` and `tb-triage-dedup-store.test.js:29` both treat it as `paperclipIssueId` which reinforces the drift. Downstream consumers will look up the wrong identifier if they ever need the actual issueId.
**Fix:** Rename the stored field to `paperclipRunId` (it is what fireRoutine returns), or add a separate PATCH step from the triage agent that fills in `paperclipIssueId` after the routine fire resolves into an issue.

### IN-02: Duplicate `KEY_PATTERN` constant in prod and test helper

**File:** `scripts/tb-triage/dedup-store.js:4` and `scripts/tests/helpers/dedup-store.js:4`
**Issue:** The regex is copy-pasted. If the prod pattern is ever extended (e.g., to support BitBucket keys), the helper will silently accept the new key while bypassing the prod validator, masking bugs. No test today catches this divergence.
**Fix:** Either `require('../../tb-triage/dedup-store').KEY_PATTERN` from the helper, or export a shared constants module both files import. The test helper's implementation is also subtly different (uses `Object.prototype.hasOwnProperty` instead of `?? null`), which could produce different behavior if a key were ever `undefined`. Align with the prod module.

### IN-03: `triage/AGENTS.md` uses `${PLUGIN_ROOT}`, CLAUDE.md convention is `${CLAUDE_PLUGIN_ROOT}`

**File:** `companies/triage-shop/agents/triage/AGENTS.md:55`
**Issue:** The markdown says `node ${PLUGIN_ROOT}/scripts/tb-triage/repo-map.js`. Project `CLAUDE.md` documents the canonical variable as `${CLAUDE_PLUGIN_ROOT}` (for hooks/MCP/scripts) and `${CLAUDE_SKILL_DIR}` (for SKILL.md bash). Plain `${PLUGIN_ROOT}` is not resolved by Claude Code and will be passed through literally; the agent will fail the invocation.
**Fix:** Replace with `${CLAUDE_PLUGIN_ROOT}` (matches repo convention and the other skill/agent references).

### IN-04: Setup doc references a two-pass seeding flow with placeholder values — good call-out, but the ordering doc (Step 1 → 2 → 3 → back to Step 1) is easy to miss

**File:** `docs/paperclip-triage-setup.md:44-80`
**Issue:** The "Note — two-pass seeding" note is correct and necessary, but it's buried below the 10 `setup-credential` commands. A first-time operator will likely run all 10 commands, fail at "paperclip_api_key (from Paperclip board settings)" with no key to paste, and either skip or abort.
**Fix:** Move the two-pass note ABOVE the command list and prefix the 4 deferred credentials with a marker, e.g.,
```
node scripts/setup-credential.js github_webhook_secret         # STEP 1a
...
node scripts/setup-credential.js paperclip_api_key             # STEP 3 — placeholder now, real value after Step 3
```
Or split into "Step 1a (immediate)" and "Step 1b (after Step 3)" subsections.

### IN-05: `cleanup.js` log line drops `worktreeName` and `reason`

**File:** `scripts/tb-triage/relay.js:76`
**Issue:** The log shape for the cleanup path is `{ route, event, cleaned, dedupKey, status }`. `removeWorktreeForPr` also returns `worktreeName` and `reason` — valuable forensic signals when debugging a missed cleanup. Omitting them forces the operator to reproduce the request.
**Fix:**
```js
log({ route: 'github', event, cleaned: result.cleaned, dedupKey: result.key || null, worktreeName: result.worktreeName || null, reason: result.reason || null, status: 200 });
```

### IN-06: `paperclip-symlink.sh` find depth/path enumeration is expensive on large `$HOME`

**File:** `scripts/paperclip-symlink.sh:7`
**Issue:** `find "$HOME" -maxdepth 4 -name "adapter-utils" -path "*/paperclip/packages/*" ...` walks every directory under `$HOME` up to depth 4. On a big dev machine this can take hundreds of milliseconds on every `/tb:update`. Also the `2>/dev/null` suppresses real permission errors that might mask a misconfigured monorepo. Low impact but easy win.
**Fix:** Prefer explicit locations first (e.g., `$HOME/Projects/paperclip`, `$HOME/code/paperclip`) and fall back to `find` only when none match. Template:
```bash
CANDIDATES=(
  "$HOME/Projects/paperclip"
  "$HOME/code/paperclip"
  "$HOME/src/paperclip"
)
for c in "${CANDIDATES[@]}"; do
  if [ -d "$c/packages/adapter-utils" ]; then PAPERCLIP_ROOT="$c"; break; fi
done
if [ -z "${PAPERCLIP_ROOT:-}" ]; then
  PAPERCLIP_ROOT=$(find "$HOME" -maxdepth 4 ...)
fi
```

### IN-07: `.paperclip.yaml` uses `dangerouslySkipPermissions: true` for all 3 agents

**File:** `companies/triage-shop/.paperclip.yaml:10, 28, 48`
**Issue:** Every agent sets `dangerouslySkipPermissions: true`. The triage agent is documented as read-only (no code writes, no PRs) per `agents/triage/SOUL.md:34-38` — it does not need to skip permission prompts for file writes. Leaving it enabled widens the blast radius of a successful prompt-injection from an issue body (even though AGENTS.md warns about untrusted content). For defense in depth, the classifier-only agent should run with permissions enforced.
**Fix:** Set `dangerouslySkipPermissions: false` (or omit) on the `triage` adapter; keep it `true` on `oneshot-coder` and `gsd-orchestrator` where code writes are the job. If this blocks the classifier from calling `tb:task-github` / `tb:task-jira` read skills, document that trade-off explicitly in SOUL.md.

---

_Reviewed: 2026-04-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
