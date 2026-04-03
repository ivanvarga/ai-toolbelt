#!/usr/bin/env bash
set -euo pipefail

REPO_URL="ivanvarga/ai-toolbelt"
MARKETPLACE_NAME="tb-marketplace"
PLUGIN_NAME="tb"
SETTINGS_FILE="$HOME/.claude/settings.json"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_NAME}"

echo "=== tb — Personal Dev Toolkit Plugin ==="
echo ""

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install it from https://jqlang.github.io/jq/download/"
    exit 1
fi

if ! command -v claude &>/dev/null; then
    echo "Error: Claude Code CLI not found."
    echo "Install it from https://docs.anthropic.com/en/docs/claude-code"
    exit 1
fi

mkdir -p "$HOME/.claude"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo '{}' > "$SETTINGS_FILE"
    echo "Created $SETTINGS_FILE"
fi

ALLOW_RULES='[
  "Bash(source *)",
  "Bash(mobilecli *)",
  "Bash(adb *)",
  "Bash(cat *)",
  "Bash(jq *)",
  "Bash(cd *)",
  "Bash(git status *)",
  "Bash(git diff *)",
  "Bash(git log *)",
  "Bash(git add *)",
  "Bash(git commit *)",
  "Bash(git branch *)",
  "Bash(git checkout *)",
  "Bash(git remote *)",
  "Bash(git stash *)",
  "Bash(gh *)",
  "Bash(node *)",
  "Bash(bash *)",
  "Bash(ls *)",
  "Bash(diff *)",
  "Bash(chmod *)",
  "Bash(find *)",
  "Bash(grep *)",
  "Bash(sed *)",
  "Bash(head *)",
  "Bash(tail *)",
  "Bash(npx *)",
  "Bash(npm *)",
  "Bash(yarn *)",
  "Bash(pnpm *)",
  "Bash(mkdir *)",
  "Bash(rm -rf node_modules*)",
  "Bash(rm -rf .expo*)",
  "Bash(rm -rf dist*)",
  "Bash(rm -rf build*)",
  "Edit",
  "Write",
  "Skill(gsd:*)",
  "Skill(tb:*)"
]'

DENY_RULES='[
  "Bash(rm -rf /*)",
  "Bash(rm -rf ~/*)"
]'

ASK_RULES='[
  "Bash(git push *)",
  "Bash(git push)"
]'

tmp=$(mktemp)
jq --arg key "$PLUGIN_KEY" \
   --argjson allow "$ALLOW_RULES" \
   --argjson deny "$DENY_RULES" \
   --argjson ask "$ASK_RULES" '
  .enabledPlugins[$key] = true |
  .permissions.allow = ((.permissions.allow // []) + $allow | unique) |
  .permissions.deny = ((.permissions.deny // []) + $deny | unique) |
  .permissions.ask = ((.permissions.ask // []) + $ask | unique)
' "$SETTINGS_FILE" > "$tmp" && mv "$tmp" "$SETTINGS_FILE"
echo "Updated $SETTINGS_FILE (plugin + permissions)"

echo ""
echo "Registering marketplace..."
claude plugin marketplace add "$REPO_URL" 2>/dev/null && echo "Marketplace registered." || echo "Marketplace already registered (or Claude CLI not in PATH)."

echo ""
echo "Done! Next steps:"
echo "  1. Restart Claude Code (or run /reload-plugins in an active session)"
echo "  2. Type /tb: to see available skills"
echo ""
