---
name: pr-describe
description: Use when generating a PR description for the current branch, creating a pull request body with Jira context and screenshots, or when pr-submit needs a PR body.
---

# Generate PR Description

Generate a pull request description with Jira ticket context, code changes summary, and optional screenshots/video.

## Flow

### 1. Gather Context

Get the current branch name and extract the Jira ticket ID:

```bash
BRANCH=$(git branch --show-current)
echo "$BRANCH"
```

Extract the Jira ticket ID from the branch name (e.g., `LFCR-360` from branch `lfcr-360` or `feature/LFCR-360`).

### 2. Get Diff Summary

```bash
git diff main --stat
git diff main --name-only
```

### 3. Get Jira Ticket Details

If a Jira ticket ID was found in the branch name, invoke /tb:task-jira with the ticket ID to get full ticket context (title, description, acceptance criteria).

If no ticket ID is found in the branch, ask the user if there is a related Jira ticket.

### 4. Screenshot and Video Capture

Ask the user:

**"Do you want to capture before/after screenshots or video for the PR?"**

Options:
1. Screenshots (before/after)
2. Video recording
3. Skip -- leave empty for manual upload

#### If screenshots selected:

1. Ask which device -- run `mbridge device list` and present options
2. Take "After" screenshot (current state):
   - iOS: `xcrun simctl io <device_id> screenshot /tmp/pr-after.png`
   - Android: `adb -s <device_id> exec-out screencap -p > /tmp/pr-after.png`
3. Ask if user has a "Before" screenshot or wants to capture one (e.g., by switching branches)
4. Upload images using /tb:pr-upload
5. Embed returned URLs in the Screenshots table

#### If video selected:

1. Ask which device
2. Ask user to perform the flow, then take a screen recording
3. iOS simulator: `xcrun simctl io <udid> recordVideo /tmp/pr-video.mp4` (start recording, ask user when done, stop with Ctrl+C)
4. Android: `adb -s <id> shell screenrecord /sdcard/pr-video.mp4` (max 180s, stop with Ctrl+C, then `adb pull`)
5. Upload using /tb:pr-upload
6. Embed URL in Video section

#### If skip:

Leave Screenshots and Video sections with empty placeholders for manual upload.

### 5. Generate PR Description

Generate markdown with these sections:

```markdown
## Scope
<!-- Brief description (max 2 sentences) of WHAT and WHY based on the Jira ticket and code changes -->

## JIRA url
https://stadion.atlassian.net/browse/<TICKET-ID>

## Implementation
<!-- Description (max 2 sentences) of HOW -- key files changed, patterns followed, architectural decisions -->

## Screenshots

| Before                     | After                      |
| -------------------------- | -------------------------- |
| <img width="300" src="BEFORE_URL" /> | <img width="300" src="AFTER_URL" /> |

## Video
<!-- Embed video URL if captured, otherwise leave for manual upload -->
```

## Guidelines

- Keep Scope and Implementation sections to max 2 sentences each
- Only include sections you have content for
- Be concise and technical
- If no Jira ticket was found, omit the JIRA url section
