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

6. **Copy global config** to the user's home directory.

```bash
cp "${PLUGIN_ROOT}/config/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
```

Print: `Global CLAUDE.md updated at ~/.claude/CLAUDE.md`

7. **Compare versions** after pulling.

```bash
NEW_VERSION=$(cat "${PLUGIN_ROOT}/.claude-plugin/plugin.json" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
```

If version changed, show: `Updated: {OLD_VERSION} -> {NEW_VERSION}`

8. **Show changelog** -- what changed since the previous commit.

```bash
git -C "${PLUGIN_ROOT}" log --oneline "${OLD_COMMIT}..HEAD"
```

Also show files changed:

```bash
git -C "${PLUGIN_ROOT}" diff --stat "${OLD_COMMIT}..HEAD"
```

If no new commits, tell the user the plugin is already up to date.

9. **Remind to reload** -- tell the user to run `/reload-plugins` to pick up changes in the current session.

10. **Update GSD** -- update GSD to the latest version if installed.

Check if GSD is installed:

```bash
GSD_CHECK=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
echo "$GSD_CHECK"
```

- If output starts with `PASS` (GSD is installed): run the update:

  ```bash
  npx -y get-shit-done-cc@latest --claude --global
  ```

  After completion, re-run the check to show the new version:

  ```bash
  GSD_CHECK=$(bash "$PLUGIN_ROOT/scripts/checks/gsd-installed.sh" "$PLUGIN_ROOT")
  echo "$GSD_CHECK"
  ```

- If output starts with `FAIL` (GSD not installed): skip this step, report "GSD not installed -- skipping update. Run /tb:bootstrap to install."

11. **Update forgetful-plugin** -- update the forgetful-plugin to the latest version if installed.

Check if forgetful-plugin is installed:

```bash
INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"
if [ -f "$INSTALLED_FILE" ] && jq -e '.plugins["forgetful-plugin@forgetful-plugins"]' "$INSTALLED_FILE" >/dev/null 2>&1; then
  echo "forgetful-plugin: installed, updating..."
else
  echo "forgetful-plugin: not installed"
fi
```

- If installed (jq succeeds): update via the Claude plugin CLI:

  ```bash
  claude plugin update forgetful-plugin@forgetful-plugins --scope user
  ```

  Report result.

- If not installed (jq fails or file missing): skip, report "forgetful-plugin not installed -- skipping update. Run /tb:bootstrap to install."

12. **Re-apply GSD patches** -- re-apply GSD workflow patches after GSD update.

Only run if GSD is installed (step 10 check was `PASS`). GSD update does a clean install that wipes workflow files, so patches must be re-applied.

```bash
bash "$PLUGIN_ROOT/patches/apply-all.sh"
```

If GSD is not installed, skip and note "GSD patches skipped (GSD not installed)."

13. **Summary** -- report what was updated.

Summarize the update results:

- **tb plugin:** version change (from step 7) or "already up to date"
- **GSD:** version after update or "skipped (not installed)"
- **forgetful-plugin:** "updated" or "skipped (not installed)"
- **GSD patches:** result from apply-all.sh or "skipped (GSD not installed)"

Remind user to run `/reload-plugins` to pick up all changes in the current session.
