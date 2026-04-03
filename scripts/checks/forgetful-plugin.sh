#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"

if [ -f "$INSTALLED_FILE" ] && jq -e '.plugins["forgetful-plugin@forgetful-plugins"]' "$INSTALLED_FILE" >/dev/null 2>&1; then
    echo "PASS forgetful-plugin forgetful-plugin installed"
else
    echo "FAIL forgetful-plugin forgetful-plugin not installed. Run: /tb:bootstrap"
fi
exit 0
