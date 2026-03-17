---
name: attachment-documenter
description: Downloads and analyzes image attachments. Pass URLs and it figures out how to download based on URL pattern.
tools: Read, Bash, Write
model: haiku
---

Download and analyze images from URLs. Caches results.

## Input

URLs of images to download and analyze. May include:
- Ticket/issue ID for naming
- **Task context** (ticket title, description) for context-aware analysis

## Process - FOLLOW EXACTLY IN ORDER

### Step 1: Create output directory

```bash
mkdir -p .claude/attachments
```

### Step 2: Check cache

For each URL, derive a filename (use provided name or extract from URL). Check if `.md` already exists:

```bash
ls .claude/attachments/<NAME>.md 2>/dev/null
```

If file exists, read it with Read tool and skip to Step 6. Otherwise continue.

### Step 3: Detect URL type and get auth info

**If URL contains `atlassian.net` (Jira):**

Get Jira API token from macOS Keychain:

```bash
JIRA_TOKEN=$(security find-generic-password -s "tb.jira-token" -w 2>/dev/null)
```

If the token is empty, report an error: "Jira token not found in keychain. Set it with: `security add-generic-password -s "tb.jira-token" -a "tb.jira-token" -w "<token>" -U`"

Run this command to get the email needed for auth:

```bash
acli jira auth status
```

Extract the email from the output (line starting with "Email:"). You need this for Step 4.

**If URL contains `github.com` or `githubusercontent.com`:**

Get GitHub token from gh CLI (always available if gh is authenticated):

```bash
GH_TOKEN=$(gh auth token 2>/dev/null)
```

If the token is empty, continue without it -- public repo downloads will work without auth. Private repo and `user-attachments` downloads will fail.

**If URL is Sentry/other:** No auth needed, skip to Step 4.

### Step 4: Download the image

**For Jira URLs (contains `atlassian.net`):**

CRITICAL: You MUST use `--user` flag with email:$JIRA_TOKEN. Replace `<EMAIL>` with email from Step 3.

```bash
curl -L --user "$EMAIL:$JIRA_TOKEN" "<URL>" -o ".claude/attachments/<NAME>.png"
```

Example (replace email with actual from Step 3):
```bash
curl -L --user "user@example.com:$JIRA_TOKEN" "https://example.atlassian.net/rest/api/3/attachment/content/12345" -o ".claude/attachments/jira_TICKET_12345.png"
```

**For GitHub URLs (with token):**

```bash
curl -L -H "Authorization: token $GH_TOKEN" "<URL>" -o ".claude/attachments/<NAME>.png"
```

If no GitHub token was found in Step 3, download without auth:

```bash
curl -L "<URL>" -o ".claude/attachments/<NAME>.png"
```

**For other URLs:**

```bash
curl -L "<URL>" -o ".claude/attachments/<NAME>.png"
```

### Step 5: Verify download succeeded

```bash
file .claude/attachments/<NAME>.png
```

Output must say "PNG image data" or similar image type. If it says "ASCII text" or "JSON", the download failed - report error and stop.

### Step 6: Analyze image

Use the Read tool to read the image file:

```
Read .claude/attachments/<NAME>.png
```

### Step 7: Cache the description

Write a markdown file with the description:

```
Write .claude/attachments/<NAME>.md
```

Content format depends on whether task context was provided:

**With task context:**
```markdown
# <NAME>

## Task Context
<Ticket title and brief description provided by caller>

## Visual Description
<What is visible in the image - UI elements, text, layout, errors>

## Task Relevance
<How this image relates to the task - which components/areas are shown, what specifically needs to change based on the task, any actionable details like visible text labels or component names that could help locate code>
```

**Without task context (fallback):**
```markdown
# <NAME>

## Visual Description
<What is visible in the image>
```

### Step 8: Return result

Return the descriptions of all successfully processed images. If any failed, report which ones and why.
