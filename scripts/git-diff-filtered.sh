#!/usr/bin/env bash
# Filtered git diff that excludes generated/noise files.
# Passes all arguments through to git diff, appending standard exclusions.
#
# Usage:
#   bash scripts/git-diff-filtered.sh origin/main...HEAD --stat
#   bash scripts/git-diff-filtered.sh origin/develop...HEAD
#   bash scripts/git-diff-filtered.sh  (uncommitted changes)

git diff "$@" -- . \
  ':!*.generated.*' \
  ':!*.lock' \
  ':!**/types.ts' \
  ':!**/__generated__/**' \
  ':!**/__snapshots__/**'
