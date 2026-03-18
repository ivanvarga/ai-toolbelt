#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

ORG=$(node "${PLUGIN_ROOT}/scripts/resolve-org.js" 2>/dev/null)

if [ -n "$ORG" ]; then
  if security find-generic-password -s "tb.github-session.${ORG}" >/dev/null 2>&1; then
    echo "PASS cred-github GitHub session cookie configured (org: ${ORG})"
    exit 0
  fi
fi

if security find-generic-password -s "tb.github-session" >/dev/null 2>&1; then
  if [ -n "$ORG" ]; then
    echo "PASS cred-github GitHub session cookie configured (global fallback, no org-specific for ${ORG})"
  else
    echo "PASS cred-github GitHub session cookie configured (global)"
  fi
else
  echo "FAIL cred-github GitHub session cookie missing. Run: node ${PLUGIN_ROOT}/skills/pr-upload/setup.js"
fi
exit 0
