#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if ! command -v acli >/dev/null 2>&1; then
    echo "FAIL cred-acli acli not installed. Run: brew install acli"
    exit 0
fi

if ! acli jira workitem view --help >/dev/null 2>&1; then
    echo "FAIL cred-acli acli not authenticated. Run: acli login"
    exit 0
fi

echo "PASS cred-acli acli installed and authenticated"
exit 0
