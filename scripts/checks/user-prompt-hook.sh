#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

HOOKS_JSON="${PLUGIN_ROOT}/hooks/hooks.json"
SETTINGS_JSON="${HOME}/.claude/settings.json"
REGISTRATION_SOURCE=""

if python3 -c "import json; d=json.load(open('${HOOKS_JSON}')); assert 'UserPromptSubmit' in d.get('hooks', d)" 2>/dev/null; then
    REGISTRATION_SOURCE="hooks.json"
elif python3 -c "import json; d=json.load(open('${SETTINGS_JSON}')); assert 'UserPromptSubmit' in d.get('hooks', {})" 2>/dev/null; then
    REGISTRATION_SOURCE="settings.json"
else
    echo "FAIL user-prompt-hook UserPromptSubmit hook not registered in hooks.json or settings.json"
    exit 0
fi

if [ "$REGISTRATION_SOURCE" = "hooks.json" ]; then
    COMMAND=$(python3 -c "
import json
d = json.load(open('${HOOKS_JSON}'))
hooks_section = d.get('hooks', d)
ups = hooks_section.get('UserPromptSubmit', [])
for m in ups:
    for h in m.get('hooks', []):
        cmd = h.get('command', '')
        if cmd:
            print(cmd)
            break
    break
" 2>/dev/null)
else
    COMMAND=$(python3 -c "
import json
d = json.load(open('${SETTINGS_JSON}'))
ups = d.get('hooks', {}).get('UserPromptSubmit', [])
for m in ups:
    for h in m.get('hooks', []):
        cmd = h.get('command', '')
        if cmd:
            print(cmd)
            break
    break
" 2>/dev/null)
fi

RESOLVED="${COMMAND/\$\{CLAUDE_PLUGIN_ROOT\}/${PLUGIN_ROOT}}"
SCRIPT_PATH=$(echo "$RESOLVED" | sed 's/^node //')

if [ -f "$SCRIPT_PATH" ]; then
    if [ "$REGISTRATION_SOURCE" = "settings.json" ]; then
        echo "PASS user-prompt-hook UserPromptSubmit registered in settings.json (fallback mode) and script exists"
    else
        echo "PASS user-prompt-hook UserPromptSubmit hook registered and script exists"
    fi
else
    echo "FAIL user-prompt-hook UserPromptSubmit hook registered but script missing at ${SCRIPT_PATH}"
fi

exit 0
