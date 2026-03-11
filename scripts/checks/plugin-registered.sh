#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

SETTINGS_FILE="$HOME/.claude/settings.json"
INSTALLED_FILE="$HOME/.claude/plugins/installed_plugins.json"

if [ -f "$SETTINGS_FILE" ] && python3 -c "
import json, sys
data = json.load(open('$SETTINGS_FILE'))
plugins = data.get('enabledPlugins', [])
if any('tb' in p for p in plugins):
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
    echo "PASS plugin-registered Plugin is registered in Claude Code settings"
    exit 0
fi

if [ -f "$INSTALLED_FILE" ] && python3 -c "
import json, sys
data = json.load(open('$INSTALLED_FILE'))
if isinstance(data, list):
    entries = data
elif isinstance(data, dict):
    entries = data.get('plugins', [])
else:
    sys.exit(1)
for entry in entries:
    name = entry.get('name', '') if isinstance(entry, dict) else str(entry)
    if 'tb' in name:
        sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
    echo "PASS plugin-registered Plugin is registered in installed plugins"
    exit 0
fi

echo "FAIL plugin-registered Plugin not registered. Run: claude plugin install $PLUGIN_ROOT or claude --plugin-dir $PLUGIN_ROOT"
exit 0
