#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

if gh auth status >/dev/null 2>&1; then
  echo "PASS cred-github GitHub CLI authenticated"
else
  ORG=$(node "${PLUGIN_ROOT}/scripts/resolve-org.js" 2>/dev/null)

  if [ -n "$ORG" ]; then
    if security find-generic-password -s "tb.github-session.${ORG}" >/dev/null 2>&1; then
      echo "PASS cred-github GitHub session cookie configured (org: ${ORG})"
      exit 0
    fi
  fi

  if security find-generic-password -s "tb.github-session" >/dev/null 2>&1; then
    echo "PASS cred-github GitHub session cookie configured (global)"
  else
    echo "FAIL cred-github GitHub auth missing. Run: gh auth login"
  fi
fi
exit 0
