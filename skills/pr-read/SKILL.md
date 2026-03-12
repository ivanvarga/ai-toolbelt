---
name: pr-read
description: Use when reading and summarizing a GitHub pull request, reviewing PR details, or when a PR number or URL is mentioned
---

# Read Pull Request

Fetch and summarize a GitHub pull request by number or URL.

## Input

Accepts a PR number, full URL, or `owner/repo#number` format.

- URL format: `https://github.com/{owner}/{repo}/pull/{number}`
- Number only: uses the current repository
- Cross-repo: `owner/repo#number`

If no input is provided, ask the user for the PR number or URL.

## Steps

1. **Parse input** to extract owner, repo, and PR number.

If only a number was given, resolve the current repo:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

2. **Fetch PR metadata** with full details:

```bash
gh pr view {number} --repo {owner}/{repo} --json number,title,state,author,assignees,labels,milestone,body,comments,reviews,commits,files,additions,deletions,mergeable,mergedAt,createdAt,updatedAt,baseRefName,headRefName
```

3. **Fetch the diff** for understanding changes:

```bash
gh pr diff {number} --repo {owner}/{repo}
```

4. **Fetch review comments** (inline code comments):

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments --jq '.[] | {path: .path, line: .line, body: .body, user: .user.login}'
```

5. **Fetch PR reviews** (approval/request-changes):

```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[] | {user: .user.login, state: .state, body: .body}'
```

6. **Summarize the PR** covering all of these:
   - Number and title
   - State (open/closed/merged)
   - Author
   - Branch (head -> base)
   - Assignees and labels (if any)
   - Reviewers and review status
   - Description (body content)
   - Changes summary (+additions/-deletions, files changed)
   - Key comments and review feedback (summarize important points)
   - Commits (list commit messages)
   - Mergeable status

## Handling Images and Attachments

If the PR body, comments, or reviews contain images (markdown `![` syntax or URLs ending in `.png`, `.jpg`, `.gif`, etc.):

1. Invoke the `attachment-documenter` agent via Task tool with:
   - The image URLs found
   - Naming convention: `gh-pr_{owner}-{repo}-{number}_{filename}`
   - Task context: PR title + 1-2 sentence description summary

2. Read existing attachment documentation for this PR:

```bash
ls .claude/attachments/gh-pr_{owner}-{repo}-{number}_*.md 2>/dev/null
```

Read each `.md` file found and incorporate visual descriptions into the summary.

3. Include relevant attachment context in the final summary (UI changes shown, before/after comparisons, etc.).
