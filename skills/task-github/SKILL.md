---
name: tb:task-github
description: Use when reading a GitHub issue, investigating an issue by number or URL, or starting work on a GitHub issue. Triggers on mentions of GitHub issues, issue numbers, or issue URLs.
---

# Read GitHub Issue

Fetch, summarize, and analyze a GitHub issue to prepare for implementation.

## Input

Accepts an issue number, full URL, or `owner/repo#number` format.

- URL format: `https://github.com/{owner}/{repo}/issues/{number}`
- Number only: uses the current repository
- Cross-repo: `owner/repo#number`

If no input is provided, ask the user for the issue number or URL.

## Steps

### Fetch Issue Data

1. **Parse input** to extract owner, repo, and issue number.

If only a number was given, resolve the current repo:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

2. **Fetch issue metadata**:

```bash
gh issue view {number} --repo {owner}/{repo} --json number,title,state,author,assignees,labels,milestone,body,comments,createdAt,updatedAt
```

3. **Fetch with comments** for full context:

```bash
gh issue view {number} --repo {owner}/{repo} --comments
```

### Summarize

Present a summary covering:
- Number and title
- State (open/closed)
- Author
- Assignees (if any)
- Labels (if any)
- Milestone (if any)
- Description (body content)
- Key points from comments
- Created and updated dates

### Handle Images and Attachments

If the issue body or comments contain images (markdown `![` syntax or URLs ending in `.png`, `.jpg`, `.gif`, etc.):

1. Invoke the `attachment-documenter` agent via Agent tool with:
   - subagent_type: "attachment-documenter"
   - The image URLs found
   - Naming convention: `gh-issue_{owner}-{repo}-{number}_{filename}`
   - Task context: issue title + 1-2 sentence description summary

2. Read existing attachment documentation:

```bash
ls .claude/attachments/gh-issue_{owner}-{repo}-{number}_*.md 2>/dev/null
```

Read each `.md` file found and incorporate visual descriptions into the summary.

### Codebase Analysis

After summarizing, analyze the codebase to understand the scope of work:

1. **Identify relevant areas** -- search for keywords from the issue, find related components, screens, modules, and configuration files
2. **Understand current implementation** -- read key files to understand how the existing feature/area works, what patterns are used, and what dependencies exist
3. **Identify what needs to change** -- which files need modification, what new files may be needed, any configuration changes required

Keep the analysis practical and focused. Prioritize understanding the immediate area of impact over exhaustive codebase exploration.

### Confirm Understanding

**IMPORTANT:** Before creating the implementation plan, present a brief summary to the user and ask for confirmation. This prevents wasted effort from misinterpreting the issue.

```
## My Understanding of #{number}

[1-3 sentences of what needs to be done]

Is this correct, or should I adjust my understanding?
```

Wait for user confirmation before proceeding.

### Implementation Plan

After confirmation, create a plan:

```
## Implementation Plan for #{number}

### Problem Summary
[1-2 sentences describing what needs to be done]

### Files to Modify
- `path/to/file1.ts` -- [what change]
- `path/to/file2.tsx` -- [what change]

### New Files (if any)
- `path/to/newfile.ts` -- [purpose]

### Steps
1. [First step]
2. [Second step]
3. [etc.]

### Testing
- [How to verify the change works]
```
