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

if jq -e ".enabledPlugins[\"$PLUGIN_KEY\"]" "$SETTINGS_FILE" &>/dev/null; then
    echo "Plugin already registered in settings.json"
else
    tmp=$(mktemp)
    jq --arg key "$PLUGIN_KEY" '.enabledPlugins[$key] = true' "$SETTINGS_FILE" > "$tmp" && mv "$tmp" "$SETTINGS_FILE"
    echo "Added $PLUGIN_KEY to $SETTINGS_FILE"
fi

echo ""
echo "Registering marketplace..."
claude plugin marketplace add "$REPO_URL" 2>/dev/null && echo "Marketplace registered." || echo "Marketplace already registered (or Claude CLI not in PATH)."

echo ""
echo "Done! Next steps:"
echo "  1. Restart Claude Code (or run /reload-plugins in an active session)"
echo "  2. Type /tb: to see available skills"
echo ""
