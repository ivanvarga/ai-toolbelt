---
name: pr-upload
description: Use when uploading images or videos to GitHub for PR descriptions, issue comments, or any GitHub markdown content. Triggers on upload screenshot, add image to PR, or embed media in GitHub.
---

# GitHub Upload

Upload files to GitHub's CDN. Returns `https://github.com/user-attachments/assets/...` URLs for embedding in PRs and issues.

## Setup

Run setup once to save your GitHub session cookie to Keychain:

```bash
node "${CLAUDE_SKILL_DIR}/setup.js"
```

Manual alternative (pass cookie directly):

```bash
node "${CLAUDE_SKILL_DIR}/setup.js" "<user_session_cookie_value>"
```

### Getting the cookie value

1. Open Chrome and navigate to github.com (ensure you are logged in)
2. Open DevTools (Cmd+Option+I)
3. Go to Application tab, then Cookies, then `https://github.com`
4. Copy the `user_session` cookie Value

Re-run setup when the session expires (typically after ~2 weeks or after GitHub logout).

## Usage

Upload a file and capture the CDN URL:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
URL=$(node "$PLUGIN_ROOT/scripts/github-api.js" upload /path/to/file.png)
```

Upload to a specific repo (auto-detects current repo if omitted):

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
URL=$(node "$PLUGIN_ROOT/scripts/github-api.js" upload /path/to/file.png owner/repo)
```

Embed in markdown:

```
![description]($URL)
```

## With mobilecli screenshots

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
mobilecli screenshot --device <id> -o /tmp/screenshot.png
URL=$(node "$PLUGIN_ROOT/scripts/github-api.js" upload /tmp/screenshot.png)
echo "![screenshot]($URL)"
```

## Errors

| Error | Cause | Fix |
|-------|-------|-----|
| GitHub session not found | No cookie stored in Keychain | Run `node "${CLAUDE_SKILL_DIR}/setup.js"` |
| Failed to get upload policy | Session expired or invalid | Re-run setup with a fresh cookie |
| File not found | Invalid file path | Verify the file exists at the given path |
| Could not detect repository | Not in a git repo, no owner/repo provided | Pass `owner/repo` as second argument |
