---
name: tb:task-jira
description: Use when reading a Jira ticket, investigating a Jira issue by ID or URL, or starting work on a Jira task. Triggers on Jira ticket IDs like LFCR-360, Jira URLs, or mentions of Jira tickets.
---

# Read Jira Ticket

Fetch, summarize, and analyze a Jira ticket to prepare for implementation.

## Prerequisites

Verify acli is installed and authenticated:

```bash
node "${CLAUDE_SKILL_DIR}/setup.js"
```

If acli is not installed, follow the printed instructions to install via Homebrew. If acli is not authenticated, run `acli login` to complete the OAuth flow.

## Input

Accepts a Jira ticket ID (e.g., `LFCR-360`) or a full Atlassian URL.

- Ticket ID: `LFCR-360`
- URL: `https://stadion.atlassian.net/browse/LFCR-360`

Extract the ticket ID from the URL if a full URL is provided. If no input is given, ask the user for the ticket ID or URL.

## Steps (All Mandatory)

### 1. Fetch Ticket Details

```bash
acli jira workitem view <TICKET-ID>
```

### 2. Fetch Comments

```bash
acli jira workitem comment list --key <TICKET-ID>
```

### 3. Check Attachments

```bash
acli jira workitem attachment list --key <TICKET-ID>
```

Always run this step even if you expect no attachments.

### 4. Process Image Attachments

If attachments exist and include images:

1. Invoke the `attachment-documenter` agent via Agent tool with:
   - subagent_type: "attachment-documenter"
   - Jira attachment URLs: `https://stadion.atlassian.net/rest/api/3/attachment/content/<ATTACHMENT_ID>`
   - Naming convention: `jira_<TICKET>_<ATTACHMENT_ID>`
   - Task context: ticket title + description summary (1-2 sentences) so the agent can analyze images in context

2. If the agent reports failure, relay the exact error to the user -- do not silently skip.

### 5. Read Attachment Documentation

```bash
ls .claude/attachments/jira_<TICKET>_*.md 2>/dev/null
```

Read each `.md` file with the Read tool to get detailed image analysis. These files contain AI-generated descriptions of the images.

### 6. Summarize Ticket

Present a summary covering:
- Title
- Status
- Description
- Assignee
- Priority
- Type
- Comments (from comment list)
- Attachments (list filenames, include image analysis from attachment docs)
- Subtasks (if any)

### 7. Codebase Analysis

After summarizing, analyze the codebase:

1. **Identify relevant areas** -- search for keywords from the ticket description, find related components, screens, modules, and configuration files
2. **Understand current implementation** -- read key files to understand how the existing feature/area works, what patterns are used, and what dependencies exist
3. **Identify what needs to change** -- which files need modification, what new files may be needed, any configuration changes required

Keep analysis practical and focused on the immediate area of impact.

### 8. Confirm Understanding

**CRITICAL:** Before creating the implementation plan, present a summary and ask for confirmation.

```
## My Understanding of <TICKET-ID>

[1-3 sentences of what needs to be done]

Is this correct, or should I adjust my understanding?
```

**WAIT** for user confirmation before proceeding.

### 9. Create Implementation Plan

After confirmation, create a plan:

```
## Implementation Plan for <TICKET-ID>

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

Keep the plan concise and actionable. Include any Contentful/config IDs from the ticket and note order-sensitive changes.
