#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

ORG=$(node "${PLUGIN_ROOT}/scripts/resolve-org.js" 2>/dev/null)

if [ -n "$ORG" ]; then
  if security find-generic-password -s "tb.jira-token.${ORG}" >/dev/null 2>&1; then
    echo "PASS cred-jira-token Jira API token configured (org: ${ORG})"
    exit 0
  fi
fi

if security find-generic-password -s "tb.jira-token" >/dev/null 2>&1; then
  if [ -n "$ORG" ]; then
    echo "PASS cred-jira-token Jira API token configured (global fallback, no org-specific for ${ORG})"
  else
    echo "PASS cred-jira-token Jira API token configured (global)"
  fi
else
  echo "FAIL cred-jira-token Jira API token missing. Run: node ${PLUGIN_ROOT}/skills/task-jira/setup-token.js"
fi
exit 0
