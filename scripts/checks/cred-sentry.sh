#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if security find-generic-password -s "tb.sentry-token" >/dev/null 2>&1; then
    echo "PASS cred-sentry Sentry token configured"
else
    echo "FAIL cred-sentry Sentry token missing. Run: node ${PLUGIN_ROOT}/skills/sentry-investigate/setup.js"
fi
exit 0
