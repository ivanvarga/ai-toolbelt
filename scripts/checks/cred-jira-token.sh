#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if security find-generic-password -s "tb.jira-token" >/dev/null 2>&1; then
    echo "PASS cred-jira-token Jira API token configured"
else
    echo "FAIL cred-jira-token Jira API token missing. Run: node ${PLUGIN_ROOT}/skills/task-jira/setup-token.js"
fi
exit 0
