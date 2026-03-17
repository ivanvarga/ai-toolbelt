#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

NAME=$(git config user.name 2>/dev/null)
EMAIL=$(git config user.email 2>/dev/null)

if [ -z "$NAME" ] && [ -z "$EMAIL" ]; then
    echo "WARN git-identity No git user.name or user.email configured (set in ~/.gitconfig or per-repo)"
elif [ -z "$NAME" ]; then
    echo "WARN git-identity git user.name not set (email: $EMAIL)"
elif [ -z "$EMAIL" ]; then
    echo "WARN git-identity git user.email not set (name: $NAME)"
else
    echo "PASS git-identity $NAME <$EMAIL>"
fi
exit 0
