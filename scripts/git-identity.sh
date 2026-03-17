#!/usr/bin/env bash
# Collect git identities for the current user scoped to a specific repo.
# Uses effective git config (respects includeIf) + derives GitHub login from remote.
# Outputs one identity per line (deduplicated).
#
# Usage: bash scripts/git-identity.sh [repo-path]
# repo-path defaults to current directory

REPO="${1:-.}"

REMOTE=$(git -C "$REPO" remote get-url origin 2>/dev/null)

GH_LOGIN=""
if [[ "$REMOTE" == *github-stadion* ]]; then
  GH_LOGIN="ivanvargo"
elif [[ "$REMOTE" == *github-syncdesign* ]]; then
  GH_LOGIN="iv-syncdesign"
elif [[ "$REMOTE" == *github.com* ]] || [[ "$REMOTE" == *github-personal* ]]; then
  GH_LOGIN=$(gh api user --jq '.login' 2>/dev/null)
fi

{
  git -C "$REPO" config user.name 2>/dev/null
  git -C "$REPO" config user.email 2>/dev/null
  [[ -n "$GH_LOGIN" ]] && echo "$GH_LOGIN"
} | sort -u | grep -v '^$'
