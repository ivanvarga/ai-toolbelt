#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE_NAME="tb-marketplace"
PLUGIN_NAME="tb"

PAPERCLIP_ROOT=$(find "$HOME" -maxdepth 4 -name "adapter-utils" -path "*/paperclip/packages/*" -type d -not -path "*/node_modules/*" -not -path "*/.cache/*" -not -path "*/Library/*" 2>/dev/null | head -1 | sed 's|/packages/adapter-utils||' || true)

if [ -z "$PAPERCLIP_ROOT" ] || [ ! -d "$PAPERCLIP_ROOT" ] || [ ! -d "$PAPERCLIP_ROOT/skills" ]; then
    exit 0
fi
readonly PAPERCLIP_ROOT
case "$(realpath "$PAPERCLIP_ROOT")" in
    "$HOME"/*) : ;;
    *) echo "Refusing: PAPERCLIP_ROOT must be under \$HOME" >&2; exit 1 ;;
esac

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

COMPANIES_SOURCE="$PLUGIN_SKILLS/$PLUGIN_VERSION/companies"
if [ -d "$COMPANIES_SOURCE" ]; then
    mkdir -p "$PAPERCLIP_ROOT/companies"
    for company in "$COMPANIES_SOURCE"/*/; do
        name=$(basename "$company")
        rm -rf "$PAPERCLIP_ROOT/companies/$name"
        cp -R "$company" "$PAPERCLIP_ROOT/companies/$name"
    done
    echo "Paperclip: copied tb companies into $PAPERCLIP_ROOT/companies (v$PLUGIN_VERSION)"
fi

echo "Paperclip: copied tb skills into $PAPERCLIP_ROOT/skills (v$PLUGIN_VERSION)"
