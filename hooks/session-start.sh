#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

skill_list=""
skill_count=0

for skill_dir in "${PLUGIN_ROOT}"/skills/*/; do
    [ -d "$skill_dir" ] || continue
    skill_md="${skill_dir}SKILL.md"
    [ -f "$skill_md" ] || continue

    name=$(grep -m1 '^name:' "$skill_md" | sed 's/^name:[[:space:]]*//')
    desc=$(grep -m1 '^description:' "$skill_md" | sed 's/^description:[[:space:]]*//' | sed "s/^['\"]//;s/['\"]$//")

    if [ -n "$name" ]; then
        skill_list="${skill_list}- /tb:${name} -- ${desc}\n"
        skill_count=$((skill_count + 1))
    fi
done

if [ "$skill_count" -eq 0 ]; then
    context="tb plugin loaded. No skills installed yet."
else
    context="tb plugin skills available:\n${skill_list}"
fi

escaped=$(escape_for_json "$context")

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "${escaped}"
  }
}
EOF

exit 0
