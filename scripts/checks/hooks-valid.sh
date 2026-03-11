#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

HOOKS_JSON="${PLUGIN_ROOT}/hooks/hooks.json"

if [ ! -f "$HOOKS_JSON" ]; then
    echo "FAIL hooks-valid hooks/hooks.json not found at ${PLUGIN_ROOT}"
    exit 0
fi

if ! python3 -c "import json; json.load(open('${HOOKS_JSON}'))" 2>/dev/null; then
    echo "FAIL hooks-valid hooks/hooks.json is not valid JSON"
    exit 0
fi

MISSING=()
COMMANDS=$(python3 -c "
import json
data = json.load(open('${HOOKS_JSON}'))
hooks_section = data.get('hooks', data)
if isinstance(hooks_section, dict):
    for event_name, matchers in hooks_section.items():
        if not isinstance(matchers, list):
            continue
        for matcher in matchers:
            inner_hooks = matcher.get('hooks', [])
            for hook in inner_hooks:
                cmd = hook.get('command', '')
                if cmd:
                    print(cmd)
elif isinstance(hooks_section, list):
    for hook in hooks_section:
        cmd = hook.get('command', '')
        if cmd:
            print(cmd)
" 2>/dev/null)

while IFS= read -r cmd; do
    [ -z "$cmd" ] && continue
    RESOLVED="${cmd/\$\{CLAUDE_PLUGIN_ROOT\}/${PLUGIN_ROOT}}"
    SCRIPT_PATH=$(echo "$RESOLVED" | awk '{print $1}')

    if [ ! -f "$SCRIPT_PATH" ]; then
        MISSING+=("$SCRIPT_PATH")
    elif [ ! -x "$SCRIPT_PATH" ]; then
        MISSING+=("$SCRIPT_PATH (not executable)")
    fi
done <<< "$COMMANDS"

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "FAIL hooks-valid Missing or non-executable hook scripts: ${MISSING[*]}"
    exit 0
fi

if [ -z "$COMMANDS" ]; then
    HOOK_COUNT=0
else
    HOOK_COUNT=$(echo "$COMMANDS" | wc -l | tr -d ' ')
fi
echo "PASS hooks-valid hooks.json valid with ${HOOK_COUNT} hook(s)"
exit 0
