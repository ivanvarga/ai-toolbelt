#!/usr/bin/env bash
set -euo pipefail

SETTINGS_FILE="${1:-$HOME/.claude/settings.json}"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required"; exit 1
fi

mkdir -p "$(dirname "$SETTINGS_FILE")"
[ -f "$SETTINGS_FILE" ] || echo '{}' > "$SETTINGS_FILE"

if jq -e '(.attribution | type) == "object" and .attribution.commit == "" and .attribution.pr == ""' "$SETTINGS_FILE" >/dev/null; then
  echo "Attribution already disabled in $SETTINGS_FILE — left as is."
  exit 0
fi

tmp=$(mktemp "$SETTINGS_FILE.XXXXXX")
trap 'rm -f "$tmp"' EXIT

jq '.attribution = ((if (.attribution | type) == "object" then .attribution else {} end) + {commit: "", pr: ""})' "$SETTINGS_FILE" > "$tmp"
chmod --reference="$SETTINGS_FILE" "$tmp" 2>/dev/null || chmod "$(stat -f '%Lp' "$SETTINGS_FILE")" "$tmp"
mv "$tmp" "$SETTINGS_FILE"
trap - EXIT
echo "Set attribution commit/pr to empty in $SETTINGS_FILE"
