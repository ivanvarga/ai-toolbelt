#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_SRC="${1:-$SCRIPT_DIR/../../agents}"
DEST_DIR="${2:-$HOME/.codex/agents}"
MANAGED_HEADER="# tb:sync managed - generated from agents/, do not edit"

bash "$SCRIPT_DIR/codex-available.sh" || exit 0

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required"; exit 1
fi

mkdir -p "$DEST_DIR"
changed=0
expected=" "

for agent in "$AGENTS_SRC"/*.md; do
  name="tb-$(basename "$agent" .md)"
  dest="$DEST_DIR/$name.toml"
  expected="$expected$name.toml "

  if [ -f "$dest" ] && [ "$(head -n 1 "$dest")" != "$MANAGED_HEADER" ]; then
    echo "Skipped $dest — not managed by tb:sync."
    continue
  fi

  description=$(sed -n '2,/^---$/{s/^description: *//p;}' "$agent")
  body=$(awk 'c >= 2 { print } /^---$/ && c < 2 { c++ }' "$agent")

  tmp=$(mktemp "$DEST_DIR/.$name.XXXXXX")
  {
    printf '%s\n' "$MANAGED_HEADER"
    printf 'name = %s\n' "$(printf '%s' "$name" | jq -Rs .)"
    printf 'description = %s\n' "$(printf '%s' "$description" | jq -Rs .)"
    printf 'developer_instructions = %s\n' "$(printf '%s\n' "$body" | jq -Rs .)"
  } > "$tmp"

  if [ -f "$dest" ] && cmp -s "$tmp" "$dest"; then
    rm -f "$tmp"
  else
    chmod 644 "$tmp"
    mv "$tmp" "$dest"
    changed=$((changed + 1))
    echo "Wrote $dest"
  fi
done

for existing in "$DEST_DIR"/tb-*.toml; do
  [ -f "$existing" ] || continue
  [ "$(head -n 1 "$existing")" = "$MANAGED_HEADER" ] || continue
  case "$expected" in
    *" $(basename "$existing") "*) ;;
    *) rm -f "$existing"; changed=$((changed + 1)); echo "Removed stale $existing" ;;
  esac
done

[ "$changed" -gt 0 ] || echo "Codex agents already current in $DEST_DIR — left as is."
