---
name: tb:pr-upload
description: Use when the user wants to upload an image, screenshot, video, or GIF to GitHub's CDN to get an embeddable URL for PRs or issues. This skill handles the actual file upload to GitHub and returns a markdown-ready URL. Trigger this whenever the user says "upload to github", "upload screenshot", "upload image for the PR", "get a github CDN url", "embed this in the PR", or wants to upload any file (png, jpg, gif, mp4) to GitHub for embedding in markdown. Also trigger when the user wants to take a simulator screenshot AND upload it to GitHub. Do NOT trigger for writing PR descriptions that mention screenshots (use pr-describe), or for just taking a screenshot without uploading.
---

# GitHub Upload

Upload files to GitHub's CDN. Returns `https://github.com/user-attachments/assets/...` URLs for embedding in PRs and issues.

## Prerequisites

Check credentials and auto-configure if missing:

```bash
if ! node "$PLUGIN_ROOT/scripts/resolve-credential.js" tb.github-session >/dev/null 2>&1; then
  echo "GitHub session cookie not configured. Running setup..."
  node "${CLAUDE_SKILL_DIR}/setup.js"
fi
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

## With device screenshots

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
# iOS:
xcrun simctl io <device_id> screenshot /tmp/screenshot.png
# Android:
# adb -s <device_id> exec-out screencap -p > /tmp/screenshot.png
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
