---
name: catchup
description: Use when building context on current branch work, catching up on what was done, or understanding changes since branching from the base branch
---

# Catchup

Build context on what work has been done on the current branch.

## Steps

### 1. Setup

Fetch latest from origin and determine the base branch.

```bash
git fetch origin
```

Detect base branch -- use the first that exists:

```bash
for ref in origin/dev origin/develop origin/main origin/master; do
  git rev-parse --verify "$ref" &>/dev/null && echo "${ref#origin/}" && break
done
```

If the current branch IS the base branch, tell the user there is nothing to compare and stop.

### 2. Narrative Context

Show commits on the current branch not on base to understand what was done and why.

```bash
git log origin/<BASE>..HEAD --format="%h %s"
```

Check for an open PR:

```bash
gh pr view --json title,body,url 2>/dev/null
```

If a PR exists, include the title and URL.

### 3. Change Overview

Show which files were touched.

Committed changes against base:

```bash
git diff origin/<BASE>...HEAD --stat
```

Uncommitted changes (if any):

```bash
git diff --stat
```

### 4. Meaningful Diff

Get the actual code changes, excluding generated and noise files:

```bash
git diff origin/<BASE>...HEAD -- . ':!*.generated.*' ':!*.lock' ':!**/types.ts' ':!**/__generated__/**'
```

If the diff is large (>500 lines), mention this and focus the summary on commits and stat instead of inline diff.

Include uncommitted changes too if any exist, with the same exclusions:

```bash
git diff -- . ':!*.generated.*' ':!*.lock' ':!**/types.ts' ':!**/__generated__/**'
```

### 5. Summary

Write a concise summary in this format:

```
## Branch: `branch-name` (N commits ahead of `base`)

### Purpose
One sentence: what task/ticket this branch addresses.

### Key Changes
- Bullet per logical change (not per file)

### Files Touched
- Group by area (e.g. "GraphQL schema", "UI components", "config")

### Status
Clean / uncommitted changes / PR open at URL
```

## Principles

- Commits tell the story -- prioritize them over raw diff
- Generated files (codegen types, lock files) are noise -- mention they changed in stat, skip the diff
- Group changes by purpose, not by file path
- Keep the summary scannable -- someone should understand the branch in 30 seconds
