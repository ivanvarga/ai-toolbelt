#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/paperclip-symlink.sh"

[ -x "$SCRIPT" ] || chmod +x "$SCRIPT"

TMP=$(mktemp -d "$HOME/.tb-paperclip-symlink-test.XXXXXX")
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

FAKE_HOME="$TMP/fakehome"
FAKE_PAPERCLIP="$FAKE_HOME/Projects/paperclip"
mkdir -p "$FAKE_PAPERCLIP/packages/adapter-utils"
mkdir -p "$FAKE_PAPERCLIP/skills"

FAKE_CACHE="$FAKE_HOME/.claude/plugins/cache/tb-marketplace/tb/0.0.1-test"
mkdir -p "$FAKE_CACHE/skills/tb:fake-skill"
echo "fake" > "$FAKE_CACHE/skills/tb:fake-skill/SKILL.md"
mkdir -p "$FAKE_CACHE/companies/triage-shop/agents/triage"
echo "fake" > "$FAKE_CACHE/companies/triage-shop/COMPANY.md"
echo "fake" > "$FAKE_CACHE/companies/triage-shop/agents/triage/AGENTS.md"

HOME="$FAKE_HOME" bash "$SCRIPT"

assert_copied() {
  local path="$1"
  if [ ! -e "$FAKE_PAPERCLIP/$path" ]; then
    echo "FAIL: expected $FAKE_PAPERCLIP/$path to exist"
    exit 1
  fi
}

assert_copied "skills/tb:fake-skill/SKILL.md"
assert_copied "companies/triage-shop/COMPANY.md"
assert_copied "companies/triage-shop/agents/triage/AGENTS.md"

HOME="$FAKE_HOME" bash "$SCRIPT"
assert_copied "companies/triage-shop/COMPANY.md"

echo "PASS: paperclip-symlink.test.sh"
