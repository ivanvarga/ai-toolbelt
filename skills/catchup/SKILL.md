---
name: tb:catchup
description: Use when building context on current branch work, catching up on what was done, or understanding changes since branching from the base branch
---

# Catchup

Build context on what work has been done on the current branch compared to the base branch.

## Steps

### 1. Detect base branch

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
BASE=$(bash "$PLUGIN_ROOT/scripts/git-base-branch.sh" --fetch)
BRANCH=$(git branch --show-current)
REF=$(git remote | head -1 >/dev/null 2>&1 && echo "origin/$BASE" || echo "$BASE")
```

If the current branch is the base branch, tell the user there is nothing to compare and stop.

### 2. Commit history

```bash
git log $REF..HEAD --format="%h %s"
```

Check for an open PR and include the title and URL if one exists:

```bash
gh pr view --json title,body,url 2>/dev/null
```

### 3. Change overview

Committed changes against base:

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
bash "$PLUGIN_ROOT/scripts/git-diff-filtered.sh" "$REF...HEAD" --stat
```

Uncommitted changes (if any):

```bash
bash "$PLUGIN_ROOT/scripts/git-diff-filtered.sh" --stat
```

### 4. Code diff

Get the actual code changes (noise files are excluded automatically):

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
bash "$PLUGIN_ROOT/scripts/git-diff-filtered.sh" "$REF...HEAD"
```

If the diff exceeds 500 lines, focus the summary on commits and stat instead of inline diff.

Include uncommitted changes if any exist:

```bash
bash "$PLUGIN_ROOT/scripts/git-diff-filtered.sh"
```

### 5. Summary

```
## Branch: `<branch>` (N commits ahead of `<base>`)

### Purpose
One sentence: what task/ticket this branch addresses.

### Key Changes
- Bullet per logical change (not per file)

### Files Touched
- Group by area (e.g. "GraphQL schema", "UI components", "config")

### Status
Clean / uncommitted changes / PR open at <URL>
```

## Principles

- Commits tell the story -- prioritize them over raw diff
- Group changes by purpose, not by file path
- Keep the summary scannable -- someone should understand the branch in 30 seconds
