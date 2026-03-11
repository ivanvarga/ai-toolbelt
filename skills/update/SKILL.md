---
name: update
description: Pull latest tb plugin changes, show changelog, and remind to reload
disable-model-invocation: true
---

# Update Plugin

Pull the latest changes for the tb plugin, show what changed, and remind to reload.

## Steps

1. **Detect environment** -- determine if running from plugin cache or from source.

Run:
```bash
test -d "${CLAUDE_SKILL_DIR}/../../.git"
```

If `.git` does NOT exist (running from plugin cache), tell the user:
> This plugin is installed from cache. Run `claude plugin update tb@tb-marketplace` to update, then `/reload-plugins`.

Stop here if running from cache.

2. **Capture current state** before pulling.

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
OLD_VERSION=$(cat "${PLUGIN_ROOT}/.claude-plugin/plugin.json" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
OLD_COMMIT=$(git -C "${PLUGIN_ROOT}" rev-parse HEAD)
```

3. **Stash local changes** to handle dirty working tree.

```bash
git -C "${PLUGIN_ROOT}" stash --include-untracked -q 2>/dev/null || true
```

4. **Pull latest** from origin main.

```bash
git -C "${PLUGIN_ROOT}" pull --rebase origin main
```

5. **Pop stash** to restore local changes.

```bash
git -C "${PLUGIN_ROOT}" stash pop -q 2>/dev/null || true
```

If stash pop fails (exit code non-zero and there was a stash), warn the user that stashed changes conflicted and they need to resolve manually. The stash is preserved and can be inspected with `git stash show`.

6. **Compare versions** after pulling.

```bash
NEW_VERSION=$(cat "${PLUGIN_ROOT}/.claude-plugin/plugin.json" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
```

If version changed, show: `Updated: {OLD_VERSION} -> {NEW_VERSION}`

7. **Show changelog** -- what changed since the previous commit.

```bash
git -C "${PLUGIN_ROOT}" log --oneline "${OLD_COMMIT}..HEAD"
```

Also show files changed:

```bash
git -C "${PLUGIN_ROOT}" diff --stat "${OLD_COMMIT}..HEAD"
```

If no new commits, tell the user the plugin is already up to date.

8. **Remind to reload** -- tell the user to run `/reload-plugins` to pick up changes in the current session.
