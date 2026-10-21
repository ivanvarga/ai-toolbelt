#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"

if [ ! -d "${PLUGIN_ROOT}/agents" ]; then
    echo "FAIL agents agents/ directory not found in plugin"
    exit 0
fi

INSTALL_PATH=""
if [ -f "$INSTALLED_FILE" ] && command -v jq &>/dev/null; then
    INSTALL_PATH=$(jq -r '.plugins | to_entries[] | select(.key | startswith("tb@")) | .value[0].installPath' "$INSTALLED_FILE" 2>/dev/null | head -n 1)
fi

if [ -z "$INSTALL_PATH" ] || [ ! -d "$INSTALL_PATH/agents" ]; then
    echo "WARN agents Installed plugin agents not found (OK if using --plugin-dir for development)"
    exit 0
fi

missing=""
for agent in "${PLUGIN_ROOT}"/agents/*.md; do
    name=$(basename "$agent")
    if [ ! -f "$INSTALL_PATH/agents/$name" ]; then
        missing="$missing $name"
    fi
done

if [ -n "$missing" ]; then
    echo "FAIL agents Missing from installed plugin:$missing. Run: claude plugin update tb@tb-marketplace"
else
    echo "PASS agents All agents are installed"
fi
exit 0
