---
name: tb:task-linear
description: Use when reading a Linear issue, investigating an issue by ID or URL, or starting work on a Linear task. Triggers on Linear issue IDs like ABC-123, Linear URLs (linear.app/*/issue/*), or mentions of Linear issues.
---

# Read Linear Issue

Fetch, summarize, and analyze a Linear issue to prepare for implementation.

## Prerequisites

Verify the Linear API key is configured:

```bash
node "${CLAUDE_SKILL_DIR}/setup.js"
```

If the key is missing, run `node "${CLAUDE_SKILL_DIR}/setup-token.js"` and follow the prompt. Create a personal API key at https://linear.app/settings/account/security/api-keys.

## Input

Accepts a Linear issue identifier (e.g., `ABC-123`) or any Linear URL (`https://linear.app/<workspace>/issue/ABC-123/...`).

The wrapper script extracts the identifier from either form via regex `[A-Z][A-Z0-9]+-\d+`. If no input is given, ask the user for the identifier or URL.

The skill is workspace-agnostic — the API key alone determines which workspace is queried.

## Steps (All Mandatory)

### 1. Fetch Issue Details

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/linear-api.js" issue <IDENTIFIER-OR-URL>
```

This single call returns a JSON blob containing:
- Core fields: `identifier`, `title`, `description`, `priority`, `priorityLabel`, `estimate`, `branchName`, `state`, `assignee`, `creator`, `project`, `team`, `url`
- `labels.nodes` — all labels
- `parent` and `children.nodes` — issue hierarchy
- `comments.nodes` — all comments with author and timestamp
- `attachments.nodes` — Linear "attachments" (typed links to external resources: GitHub PRs, Slack threads, Figma files, etc. — **not** file uploads)
- `imageUrls` — pre-extracted list of inline image URLs scraped from the description and comment bodies (Linear file uploads are embedded as markdown image links pointing to `https://uploads.linear.app/...`, not exposed as attachment entities)

Parse the JSON and keep it in working memory for the steps below.

### 2. Process Image Attachments

If `imageUrls` is non-empty:

1. Invoke the `attachment-documenter` agent via the Agent tool with:
   - subagent_type: `tb:attachment-documenter`
   - URLs: each entry from `imageUrls`
   - Naming convention: `linear_<IDENTIFIER>_<index>` (e.g., `linear_ABC-123_1`)
   - Task context: issue title + 1-2 sentence description summary so the agent can analyze images in context

2. If the agent reports failure, relay the exact error to the user — do not silently skip. Linear upload URLs are signed and short-lived; failures usually mean the link expired or the agent lacks auth — pass the API key in the prompt if needed.

### 3. Read Attachment Documentation

```bash
ls .claude/attachments/linear_<IDENTIFIER>_*.md 2>/dev/null
```

Read each `.md` file with the Read tool. Files contain AI-generated descriptions of the images.

### 4. Summarize Issue

Present a summary covering:
- **Identifier and title** (`<TEAM-KEY>-<NUM>: <title>`)
- **URL** (for click-through)
- **Status** (`state.name` / `state.type`)
- **Priority** (`priorityLabel`)
- **Type/Project** (`project.name` if set)
- **Team** (`team.key` — `team.name`)
- **Assignee** (`assignee.displayName`)
- **Estimate** (`estimate` if set)
- **Labels** (comma-separated names)
- **Branch name suggestion** (`branchName` — Linear's auto-generated git branch name)
- **Description** (rendered markdown)
- **Comments** — one block per comment with author, timestamp, body
- **Linear attachments** (typed external links: `sourceType` + `title` + `url`)
- **Inline images** (list of image filenames + analysis from attachment-documenter output)
- **Parent issue** (if any)
- **Sub-issues / children** (if any)

### 5. Codebase Analysis

After summarizing, analyze the codebase:

1. **Identify relevant areas** — search for keywords from the issue description, find related components, screens, modules, and config files
2. **Understand current implementation** — read key files to understand how the existing feature/area works, what patterns are used, what dependencies exist
3. **Identify what needs to change** — which files need modification, what new files may be needed, any config changes required

Keep analysis practical and focused on the immediate area of impact.

### 6. Confirm Understanding

**CRITICAL:** Before creating the implementation plan, present a summary and ask for confirmation.

```
## My Understanding of <IDENTIFIER>

[1-3 sentences of what needs to be done]

Is this correct, or should I adjust my understanding?
```

**WAIT** for user confirmation before proceeding.

### 7. Create Implementation Plan

After confirmation, create a plan:

```
## Implementation Plan for <IDENTIFIER>

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

Keep the plan concise and actionable. Include any IDs from the issue and note order-sensitive changes. If Linear's `branchName` field is set, surface it as the recommended git branch.
