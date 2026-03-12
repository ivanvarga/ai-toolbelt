---
name: pr-submit
description: Use when committing current work, creating a feature branch for a Jira ticket, pushing, and opening a PR. Triggers on ship, create PR for ticket, push this work, or when work is ready to submit.
disable-model-invocation: true
---

# Ship Ticket

Package current work into a feature branch, commit, push, and open a PR for a Jira ticket.

## Flow

1. **Get Jira ticket** -- use argument if provided, otherwise ask user for the ticket ID
2. **Read ticket context** -- invoke /tb:task-jira with the ticket ID to understand what was worked on
3. **Detect base branch** -- determine which branch to base off of
4. **Sync and branch** -- stash, pull latest, create feature branch
5. **Commit** -- stage specific files, write commit message
6. **Push and create PR** -- push branch, generate PR body, open PR

## Steps

### Detect base branch

```bash
git fetch origin
BASE=$(git branch -r | grep -oE 'origin/(develop|main)' | head -1 | sed 's|origin/||')
```

Use the first match from: `develop`, `main`.

### Stash and sync

```bash
DIRTY=$(git status --porcelain)
[ -n "$DIRTY" ] && git stash push -m "ship-ticket-auto-stash"

git checkout "$BASE"
git pull origin "$BASE"
```

### Create feature branch

```bash
git checkout -b "<ticket-id>"
```

Use the ticket ID (lowercased) as branch name.

If the branch already exists, ask the user before overwriting.

### Pop stash

```bash
[ -n "$DIRTY" ] && git stash pop
```

If stash pop conflicts, alert the user immediately instead of force-resolving. The stash is preserved and can be inspected with `git stash show`.

### Commit

Stage only the relevant files individually -- never use `git add -A` or `git add .` to avoid committing secrets or lockfiles.

```bash
git add <specific-files>
git commit -m "<TICKET-ID>: <brief description>"
```

Follow the repo's commit message style from CLAUDE.md: 1 line only, no attribution, no multi-line descriptions.

### Push

```bash
git push -u origin "<ticket-id>"
```

### Create PR

1. Invoke /tb:pr-describe to generate the PR body based on the ticket context and diff
2. Create the PR:

```bash
gh pr create --base "$BASE" --title "<TICKET-ID>: <title>" --body "<generated body>"
```

## Important

- Always use `git add <specific-files>` -- never `git add -A` or `git add .`
- Commit messages: 1 line, no attribution (per CLAUDE.md)
- If stash pop conflicts, stop and alert user
- If branch already exists, ask user before proceeding
- If there are no changes to commit, tell the user and stop
