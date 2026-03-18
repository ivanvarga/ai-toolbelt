#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

ORG=$(node "${PLUGIN_ROOT}/scripts/resolve-org.js" 2>/dev/null)

if [ -n "$ORG" ]; then
  if security find-generic-password -s "tb.sentry-token.${ORG}" >/dev/null 2>&1; then
    echo "PASS cred-sentry Sentry token configured (org: ${ORG})"
    exit 0
  fi
fi

if security find-generic-password -s "tb.sentry-token" >/dev/null 2>&1; then
  if [ -n "$ORG" ]; then
    echo "PASS cred-sentry Sentry token configured (global fallback, no org-specific for ${ORG})"
  else
    echo "PASS cred-sentry Sentry token configured (global)"
  fi
else
  echo "FAIL cred-sentry Sentry token missing. Run: node ${PLUGIN_ROOT}/skills/sentry-investigate/setup.js"
fi
exit 0
