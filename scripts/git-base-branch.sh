#!/usr/bin/env bash
# Detect the base branch for the current repo.
# Checks remote branches first (origin/develop, origin/main, origin/master),
# falls back to local branches if no remote exists.
# Outputs the branch name (e.g., "develop") or exits 1 if none found.
#
# Usage: bash scripts/git-base-branch.sh
# With fetch: bash scripts/git-base-branch.sh --fetch

if [[ "$1" == "--fetch" ]]; then
  git fetch origin --quiet 2>/dev/null
fi

HAS_REMOTE=$(git remote | head -1)

for branch in develop main master; do
  if [[ -n "$HAS_REMOTE" ]]; then
    git rev-parse --verify "origin/$branch" &>/dev/null && echo "$branch" && exit 0
  else
    git rev-parse --verify "$branch" &>/dev/null && echo "$branch" && exit 0
  fi
done

echo "No base branch found (checked develop, main, master)" >&2
exit 1
