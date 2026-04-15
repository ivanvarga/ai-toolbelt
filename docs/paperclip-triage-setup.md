# Paperclip Triage Pipeline — Setup

Turn your GitHub + Jira inbound-issue workflow into a Paperclip-orchestrated triage
pipeline that routes all-high-confidence work to autonomous oneshot or GSD agents
in isolated worktrees, gated on human approval in Paperclip before opening a PR.

> Assumes macOS. Linux works but Keychain paths differ; substitute your OS keyring
> via `scripts/keychain.js` shim.

## Prerequisites

- Paperclip running locally (`pnpm dev` in the Paperclip repo). Default base: `http://localhost:3100`.
- tb plugin installed: `/tb:bootstrap` passes, `/tb:doctor` is all green.
- macOS Keychain available (`security` CLI).
- Node.js 20+ (`node --version` >= 20).
- `gh` CLI authenticated (`gh auth status`).
- `smee-client` for dev tunneling: `npm install -g smee-client` (production uses a real public HTTPS endpoint; smee.io is DEV-ONLY).
- `acli` authenticated if using Jira (`acli login`).

## Architecture at a glance

```
GitHub/Jira webhook ───▶ smee.io (dev) ───▶ tb-triage relay (localhost:3100)
                                              │
                                              ▼  (re-signed with X-Paperclip-Signature)
                                         Paperclip routine fire
                                              │
                                              ▼
                                         Triage agent (in Paperclip)
                                              │
                                              ▼ (classifies; if all-high)
                                         Oneshot or GSD agent in Claude Code worktree
                                              │
                                              ▼
                                         Draft PR + diff comment
                                              │
                                              ▼
                                         Human approve/reject in Paperclip UI
                                              │
                                              ▼ (on merge)
                                         PR merge webhook ───▶ relay cleans up worktree
```

## Step 1 — Seed Keychain credentials

The relay needs 10 secrets. Run these once, pasting values when prompted. **Values
never appear in shell history** — `setup-credential.js` reads from stdin:

```bash
node scripts/setup-credential.js github_webhook_secret         # openssl rand -hex 32
node scripts/setup-credential.js jira_webhook_secret           # openssl rand -hex 32
node scripts/setup-credential.js paperclip_webhook_signing_key # openssl rand -hex 32
node scripts/setup-credential.js github_triage_user_login      # your GitHub handle
node scripts/setup-credential.js jira_triage_user_accountid    # your Jira accountId
node scripts/setup-credential.js paperclip_api_base            # http://localhost:3100
node scripts/setup-credential.js paperclip_api_key             # from Paperclip board settings
node scripts/setup-credential.js paperclip_company_id          # UUID from Paperclip UI
node scripts/setup-credential.js paperclip_triage_routine_github  # publicId from .paperclip.yaml import
node scripts/setup-credential.js paperclip_triage_routine_jira    # publicId from .paperclip.yaml import
```

Generate secrets with: `openssl rand -hex 32` (256 bits). Paste the output into the
prompt. Never use dictionary words for webhook secrets.

Get your Jira `accountId`:

```bash
acli jira user me --output json | jq -r .accountId
```

Verify with: `bin/resolve-credential github_webhook_secret | wc -c` (should print
length of your secret).

> **Note — two-pass seeding.** Four of the entries above require values that only
> exist AFTER Step 3 (Paperclip company + agents + routines import completes):
> `paperclip_company_id`, `paperclip_api_key`, `paperclip_triage_routine_github`,
> `paperclip_triage_routine_jira`. Seed them now with placeholder strings
> (e.g., `placeholder-will-update-after-step-3`) so Step 4 can sanity-check the
> keychain surface, then **return here after Step 3** to overwrite the four
> placeholders with the real values before starting the relay.

## Step 2 — Deploy the triage company into Paperclip

```bash
/tb:update
```

This runs `scripts/paperclip-symlink.sh`, which now copies BOTH:

- `skills/*` → `$PAPERCLIP_ROOT/skills/`
- `companies/triage-shop/` → `$PAPERCLIP_ROOT/companies/triage-shop/`

After the copy, **restart Paperclip OR run `paperclipai company import
$PAPERCLIP_ROOT/companies/triage-shop --target existing`** — Paperclip does not
auto-scan `companies/` for changes. (This is the Research Open Question #2 manual
step; automation deferred per D-24 locked scope.)

Verify in Paperclip UI: Companies → Triage Shop appears with 3 agents (triage,
oneshot-coder, gsd-orchestrator).

## Step 3 — Create Paperclip company + agents + routines

On first setup, Paperclip needs concrete database entries for the company. After
Step 2's import:

1. Open Paperclip UI → Companies → Triage Shop → Agents. You should see the 3
   agents populated from `companies/triage-shop/agents/`.
2. Click each agent → confirm adapter is `claude_local` (matches `.paperclip.yaml`).
3. Company → Routines. You should see `intake-github` and `intake-jira` with webhook
   triggers. Copy each `publicId` from the routine detail panel.
4. Return to Step 1 and update `paperclip_triage_routine_github` + `..._jira` keychain
   entries with these publicIds.
5. Company → Settings → copy `companyId`. Update `paperclip_company_id` keychain.
6. Board → API Keys → create a key. Update `paperclip_api_key` keychain.

## Step 4 — Start the webhook relay

The relay resolves its 10 secrets at startup (source: `scripts/tb-triage/relay.js`).
Paperclip (and the tb company package it hosts) does the same for agent env inputs
declared in `.paperclip.yaml`. The `bin/resolve-credential` wrapper reads the macOS
Keychain; use it to pre-resolve any env the processes expect BEFORE launching them.

**Operator start command — tb-triage relay** (run in ai-toolbelt repo root):

```bash
cd ~/Projects/ai-toolbelt
export GITHUB_WEBHOOK_SECRET=$(bin/resolve-credential github_webhook_secret)
export JIRA_WEBHOOK_SECRET=$(bin/resolve-credential jira_webhook_secret)
export PAPERCLIP_WEBHOOK_SIGNING_KEY=$(bin/resolve-credential paperclip_webhook_signing_key)
export GITHUB_TRIAGE_USER_LOGIN=$(bin/resolve-credential github_triage_user_login)
export JIRA_TRIAGE_USER_ACCOUNTID=$(bin/resolve-credential jira_triage_user_accountid)
export PAPERCLIP_API_BASE=$(bin/resolve-credential paperclip_api_base)
export PAPERCLIP_API_KEY=$(bin/resolve-credential paperclip_api_key)
export PAPERCLIP_COMPANY_ID=$(bin/resolve-credential paperclip_company_id)
export PAPERCLIP_TRIAGE_ROUTINE_GITHUB=$(bin/resolve-credential paperclip_triage_routine_github)
export PAPERCLIP_TRIAGE_ROUTINE_JIRA=$(bin/resolve-credential paperclip_triage_routine_jira)

node -e "
  const { createServer } = require('./scripts/tb-triage/relay');
  const { getCredential } = require('./scripts/resolve-credential');
  createServer({ port: 3100, keychainResolver: getCredential })
    .then(server => console.log('tb-triage relay listening on', server.url));
"
```

(The relay itself calls `keychainResolver` directly — the `export` lines above are for
any sibling tooling invoked from the same shell AND for symmetry with the Paperclip
start command below.)

**Operator start command — Paperclip** (run in the Paperclip repo root): the
`.paperclip.yaml` sidecar declares env inputs as `kind: secret, requirement: optional`;
Paperclip's `claude_local` adapter inherits the parent process env. Pre-resolve before
starting the dev server so agent runs pick them up:

```bash
cd ~/Projects/paperclip
export ANTHROPIC_API_KEY=$(bin/resolve-credential anthropic_api_key || echo "")
export GH_TOKEN=$(bin/resolve-credential gh_token || echo "")
pnpm --filter @paperclip/server dev
```

(Run `bin/resolve-credential` from the ai-toolbelt repo; path is `~/Projects/ai-toolbelt/bin/resolve-credential`
if invoking from the Paperclip repo. The `|| echo ""` guards let Paperclip start even
if the agent secrets aren't seeded yet — `requirement: optional` in `.paperclip.yaml`
matches this behavior.)

For persistence, wrap in a launchd plist at
`~/Library/LaunchAgents/com.ai-toolbelt.tb-triage.plist` — example template:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTD/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.ai-toolbelt.tb-triage</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>-e</string>
    <string>require('/Users/YOU/Projects/ai-toolbelt/scripts/tb-triage/relay').createServer({port:3100,keychainResolver:require('/Users/YOU/Projects/ai-toolbelt/scripts/resolve-credential').getCredential})</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
```

Load: `launchctl load ~/Library/LaunchAgents/com.ai-toolbelt.tb-triage.plist`.

## Step 5 — Start smee.io tunnel (DEV ONLY)

```bash
smee --url https://smee.io/YOUR_CHANNEL --target http://localhost:3100/github
# in a second terminal:
smee --url https://smee.io/YOUR_JIRA_CHANNEL --target http://localhost:3100/jira
```

Get channel URLs at <https://smee.io> (click "Start a new channel", copy the URL).

> **smee.io is DEV-ONLY.** Do not use for production. Production requires a public
> HTTPS endpoint (your own domain + TLS cert). The relay itself is production-ready;
> only the tunnel is dev-scoped.

## GitHub setup

### Option A — Repo UI (recommended for one repo)

1. Navigate: Repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** your smee.io URL (or production relay URL)
3. **Content type:** `application/json` (REQUIRED — relay assumes JSON body for HMAC)
4. **Secret:** paste the `github_webhook_secret` value from Step 1
5. **SSL verification:** Enable (default)
6. **Which events:** select "Let me select individual events" → check **Issues** AND **Pull requests** (the `pull_request` event is REQUIRED — without it the relay never receives `pull_request.closed` merged and worktrees accumulate indefinitely; see D-15 cleanup contract)
7. **Active:** checked
8. Click **Add webhook**

GitHub fires a `ping` event. Verify 200 in smee.io console.

### Option B — `gh api` (scriptable)

```bash
OWNER=acme REPO=myrepo
SECRET=$(bin/resolve-credential github_webhook_secret)
gh api "repos/$OWNER/$REPO/hooks" -X POST \
  -f name=web \
  -f 'config[url]=https://smee.io/YOUR_CHANNEL' \
  -f 'config[content_type]=json' \
  -f "config[secret]=$SECRET" \
  -f 'events[]=issues' \
  -f 'events[]=pull_request' \
  -F active=true
```

Both `issues` and `pull_request` MUST be present in the event subscription list. The
relay dispatches `pull_request.closed merged:true` deliveries to the cleanup path
(worktree remove + dedup entry delete); omitting `pull_request` means merged PRs
leave stale worktrees on disk.

### Verify

Assign a test issue to yourself. Watch:
1. smee.io console shows delivery → 200.
2. Relay stdout prints structured log: `{"route":"github","event":"issues","relay":true,"dedupKey":"gh:acme/myrepo#N","status":200}`.
3. Paperclip UI shows a new triage issue within seconds.

## Jira setup

Two paths depending on what your Cloud admin UI exposes. Try Option A first.

### Option A — Cloud admin WebHooks UI (legacy, still works on many instances)

1. Site admin (cog) → **System** → **WebHooks** (under "Advanced")
2. **Create a WebHook**
3. Fill:
   - **Name:** `tb-triage`
   - **URL:** smee.io URL for Jira channel
   - **JQL:** `assignee = <YOUR-ACCOUNTID-UUID>` (use `currentUser()` only if you're creating the webhook in your own user context)
   - **Secret:** paste `jira_webhook_secret` from Step 1
   - **Events:** check `Issue: updated` (primary) and `Issue: created` (optional for new-issue-with-assignee cases)
4. Create.

### Option B — Automation for Jira (fallback — use when Option A's UI is absent)

> **DEV ONLY.** Automation-for-Jira does not sign outbound webhooks with HMAC, so this
> path bypasses inbound signature verification at the application layer. Only use it
> for local development against a smee.io tunnel whose channel URL is kept secret.
> **Production Jira MUST use native webhooks (Option A) with HMAC** — the relay
> enforces `verifyJiraSignature` with no bypass, so Option B traffic will be rejected
> by the relay unless pointed at a dev-only smee.io channel AND the relay is started
> with the same `jira_webhook_secret` that Option A would have used (the relay does
> not skip verification; Automation-for-Jira's lack of signing means you will see
> 401s until you either switch to Option A or run a signing proxy in front of the
> relay).

Modern Jira Cloud may hide the legacy WebHooks UI. Use Automation only for
development-mode exploration of the pipeline:

1. Project settings → **Automation** → **Create rule**
2. **Trigger:** `Issue assigned`
3. **Condition:** `Assigned to` = your user
4. **Action:** `Send web request`
   - URL: smee.io Jira URL (DEV ONLY — never a public relay URL)
   - Method: POST
   - Headers: Content-Type: application/json
   - Body: `{{issue}}` (Jira's smart-value for the full issue JSON)

Because Automation cannot sign the outbound payload, the relay will 401 this traffic.
For local-dev exploration of downstream triage behavior, produce signed requests by
replaying captured Automation payloads through a small signing script using
`bin/resolve-credential jira_webhook_secret` — do NOT modify `relay.js` to bypass
verification. For any real Jira workload, revert to Option A.

### Verify

Assign an LFCR (or your project's) ticket to yourself. Same verification flow as GitHub:
smee → relay → Paperclip UI.

## End-to-end smoke (manual)

1. Create an issue on your test repo, assign to yourself.
2. smee console: 200.
3. Relay log: `relay:true, dedupKey:gh:...`.
4. Paperclip UI: new issue, status `in_progress`, assigned to triage agent.
5. Wait for triage heartbeat (up to 1-2 min). Triage posts a comment with 3 confidence labels + routing verdict.
6. If all-high → triage reassigns to oneshot-coder (or gsd-orchestrator), creates worktree at `<cwd>/.claude/worktrees/gh-<owner>-<repo>-<number>/`.
7. Coder agent runs. Posts diff comment + draft PR URL.
8. Coder transitions to `done`. Paperclip intercepts — status becomes `in_review`, assigned to YOU (human approver).
9. Open the Paperclip UI card. Review the diff comment + draft PR.
10. Approve → transitions to `done`. PR remains draft on GitHub (merge stays manual).
11. Merge the PR on GitHub manually.
12. Relay receives `pull_request.closed merged:true` → invokes cleanup → worktree removed → dedup entry deleted.

## Tag overrides (D-25)

Apply these labels on the source ticket/issue to override triage classifier:

| Tag | Effect |
|-----|--------|
| `triage:oneshot` | Force oneshot-coder route (skip confidence scoring) |
| `triage:process` | Force gsd-orchestrator route |
| `triage:skip` | Exclude from pipeline — triage agent transitions to `done` with skip comment |

## Troubleshooting

### Relay returns 401
- Verify webhook secret matches the Keychain entry: `bin/resolve-credential github_webhook_secret` must equal the secret pasted into GitHub webhook settings.
- Check smee.io is forwarding with `Content-Type: application/json` (not form-urlencoded).

### Paperclip issue never appears
- Check relay log for `paperclip fire failed` — then check Paperclip server log for signature verification errors.
- Confirm `paperclip_webhook_signing_key` keychain entry matches the secret configured on the Paperclip routine (routine detail → signing key).

### Triage agent never wakes
- Check Paperclip agent adapter config — `claude_local` requires the `claude` CLI on PATH. Confirm `which claude`.
- Check `.paperclip.yaml` template variables. If `{{issue.metadata.worktreeCwd}}` doesn't resolve, activate the wrapper fallback: edit `companies/triage-shop/.paperclip.yaml`, replace the `extraArgs` block with `command: [$PLUGIN_ROOT/scripts/tb-triage-worktree-wrapper.sh]` and expose `TB_TRIAGE_WORKTREE_NAME` as an env input.

### Worktree not cleaned up after merge
- Confirm GitHub webhook subscription includes `pull_request` event (Step 5, #6).
- Check relay log for `event:"pull_request",cleaned:true`.
- Manual cleanup: `git -C <repo> worktree remove --force <worktree-name>` + `node -e 'require("./scripts/tb-triage/dedup-store").remove("gh:owner/repo#N")'`.

## Rotate / revoke

Rotate any secret by:
1. Generate new value: `openssl rand -hex 32`.
2. Update Keychain: `node scripts/setup-credential.js <name>` (overwrites).
3. Update the corresponding GitHub/Jira/Paperclip configuration with the new secret.
4. Restart the relay (`launchctl kickstart -k gui/$UID/com.ai-toolbelt.tb-triage`).

To revoke access entirely:
- Delete the Keychain entry: `security delete-generic-password -s '<name>'`.
- Delete the webhook on GitHub/Jira side.
- Stop the relay: `launchctl unload ~/Library/LaunchAgents/com.ai-toolbelt.tb-triage.plist`.
