#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

SOURCE="${PLUGIN_ROOT}/config/CLAUDE.md"
TARGET="$HOME/.claude/CLAUDE.md"

if [ ! -f "$SOURCE" ]; then
    echo "FAIL global-config config/CLAUDE.md not found in plugin"
    exit 0
fi

if [ ! -f "$TARGET" ]; then
    echo "FAIL global-config ~/.claude/CLAUDE.md not found. Run: /tb:update"
    exit 0
fi

if cmp -s "$SOURCE" "$TARGET"; then
    echo "PASS global-config Global CLAUDE.md is in sync"
else
    echo "FAIL global-config ~/.claude/CLAUDE.md out of sync. Run: /tb:update"
fi
exit 0
