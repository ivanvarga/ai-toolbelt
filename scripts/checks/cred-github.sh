#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if security find-generic-password -s "tb.github-session" >/dev/null 2>&1; then
    echo "PASS cred-github GitHub session cookie configured"
else
    echo "FAIL cred-github GitHub session cookie missing. To get it: Chrome > github.com > DevTools (Cmd+Option+I) > Application > Cookies > https://github.com > copy user_session value. Then run: node ${PLUGIN_ROOT}/skills/pr-upload/setup.js"
fi
exit 0
