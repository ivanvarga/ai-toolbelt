#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if security find-generic-password -s "tb.contentful-token" >/dev/null 2>&1; then
    echo "PASS cred-contentful Contentful token configured"
else
    echo "FAIL cred-contentful Contentful token missing. Run: node ${PLUGIN_ROOT}/skills/contentful/setup.js"
fi
exit 0
