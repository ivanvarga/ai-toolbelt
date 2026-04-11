#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE_NAME="tb-marketplace"
PLUGIN_NAME="tb"

PAPERCLIP_ROOT=$(find "$HOME" -maxdepth 4 -name "adapter-utils" -path "*/paperclip/packages/*" -type d -not -path "*/node_modules/*" -not -path "*/.cache/*" -not -path "*/Library/*" 2>/dev/null | head -1 | sed 's|/packages/adapter-utils||' || true)

if [ -z "$PAPERCLIP_ROOT" ] || [ ! -d "$PAPERCLIP_ROOT/skills" ]; then
    exit 0
fi

PLUGIN_SKILLS="$HOME/.claude/plugins/cache/${MARKETPLACE_NAME}/${PLUGIN_NAME}"
PLUGIN_VERSION=$(ls -1 "$PLUGIN_SKILLS" 2>/dev/null | sort -V | tail -1)

if [ -z "$PLUGIN_VERSION" ]; then
    echo "Paperclip detected but tb plugin not cached yet"
    exit 0
fi

SKILL_SOURCE="$PLUGIN_SKILLS/$PLUGIN_VERSION/skills"
if [ ! -d "$SKILL_SOURCE" ]; then
    exit 0
fi

for skill in "$SKILL_SOURCE"/*/; do
    name=$(basename "$skill")
    rm -rf "$PAPERCLIP_ROOT/skills/$name"
    cp -R "$skill" "$PAPERCLIP_ROOT/skills/$name"
done

echo "Paperclip: copied tb skills into $PAPERCLIP_ROOT/skills (v$PLUGIN_VERSION)"
