#!/usr/bin/env bash
PLUGIN_ROOT="${1:-.}"

VERSION_FILE="$HOME/.claude/get-shit-done/VERSION"

if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE")
    echo "PASS gsd-installed GSD v${VERSION}"
else
    echo "FAIL gsd-installed GSD not found. Run: npx get-shit-done-cc@latest"
fi
exit 0
