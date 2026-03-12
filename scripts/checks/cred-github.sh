#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if node "${PLUGIN_ROOT}/scripts/keychain.js" get tb.github-session >/dev/null 2>&1; then
    echo "PASS cred-github GitHub session cookie configured"
else
    echo "FAIL cred-github GitHub session cookie missing. Run: node ${PLUGIN_ROOT}/skills/pr-upload/setup.js"
fi
exit 0
