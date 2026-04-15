#!/usr/bin/env bash
set -euo pipefail

: "${TB_TRIAGE_WORKTREE_NAME:?must be set by paperclip adapter}"

if ! [[ "$TB_TRIAGE_WORKTREE_NAME" =~ ^[a-z0-9-]+$ ]]; then
    echo "invalid worktree name: $TB_TRIAGE_WORKTREE_NAME" >&2
    exit 2
fi

if [ -n "${TB_TRIAGE_WORKTREE_CWD:-}" ]; then
    cd "$TB_TRIAGE_WORKTREE_CWD" || {
        echo "cannot cd to $TB_TRIAGE_WORKTREE_CWD" >&2
        exit 3
    }
fi

exec claude --worktree "$TB_TRIAGE_WORKTREE_NAME" "$@"
