#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${1:-$SCRIPT_DIR/../../context/shared-guidelines.md}"
TARGET="${2:-$HOME/.codex/AGENTS.md}"
MAX_BYTES=32768
BEGIN="<!-- tb:guidelines begin (managed) -->"
END="<!-- tb:guidelines end (managed) -->"

bash "$SCRIPT_DIR/codex-available.sh" || exit 0

if [ ! -f "$SRC" ]; then
  echo "ERROR: shared-guidelines.md not found at $SRC"; exit 1
fi

mkdir -p "$(dirname "$TARGET")"
[ -f "$TARGET" ] || : > "$TARGET"

tmp=$(mktemp "$TARGET.XXXXXX")
trap 'rm -f "$tmp"' EXIT

if grep -qF "$BEGIN" "$TARGET"; then
  awk -v begin="$BEGIN" -v end="$END" -v src="$SRC" '
    $0 == begin { print; while ((getline line < src) > 0) print line; skipping = 1; next }
    $0 == end { skipping = 0 }
    !skipping { print }
  ' "$TARGET" > "$tmp"
else
  { cat "$TARGET"; printf '\n%s\n' "$BEGIN"; cat "$SRC"; printf '%s\n' "$END"; } > "$tmp"
fi

if cmp -s "$tmp" "$TARGET"; then
  echo "Codex guidelines already current in $TARGET — left as is ($(wc -c < "$TARGET" | tr -d ' ') bytes)."
  exit 0
fi

size=$(wc -c < "$tmp" | tr -d ' ')
if [ "$size" -gt "$MAX_BYTES" ]; then
  echo "WARNING: $TARGET would be $size bytes, over Codex's $MAX_BYTES byte project_doc_max_bytes cap — guidelines step skipped, nothing written."
  exit 0
fi

chmod --reference="$TARGET" "$tmp" 2>/dev/null || chmod "$(stat -f '%Lp' "$TARGET")" "$tmp"
mv "$tmp" "$TARGET"
trap - EXIT
echo "Updated tb guidelines block in $TARGET ($size bytes of $MAX_BYTES)."
