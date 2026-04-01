#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Applying GSD workflow patches..."
echo ""

APPLIED=0; SKIPPED=0; ERRORS=0

for patch in "$PATCH_DIR"/patch-*.sh; do
  [ -f "$patch" ] || continue
  if bash "$patch"; then
    ((APPLIED++))
  else
    ((ERRORS++))
  fi
done

echo ""
echo "$APPLIED applied/confirmed, $ERRORS errors"
echo ""
bash "$PATCH_DIR/verify-patches.sh"
