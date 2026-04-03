---
name: tb:track-summary
description: Use when the user wants a summary of work done, daily standup notes, end-of-day recap, or help logging timesheet hours. Triggers on mentions of daily summary, standup, hours, timesheet, what did I do, work recap.
---

# Daily Summary

Generate a timesheet-oriented work summary across project repos.

## Arguments

Parse user input for date range:
- No args -- today only
- "yesterday" -- yesterday
- "last N days" / "N days" -- N days back from today
- "this week" -- Monday of current week to today
- Attached screenshot of scheduled hours -- compare against actual (see step 6)

Compute `START_DATE` from args (format: `YYYY-MM-DD`).

## Steps

### 1. Detect Identity

```bash
PLUGIN_ROOT="${CLAUDE_SKILL_DIR}/../.."
ALIASES=$(bash "$PLUGIN_ROOT/scripts/git-identity.sh")
```

This returns all known names, emails, and GitHub login. Use all of them as `--author` patterns when scanning commits.

### 2. Discover Repos

Scan sibling directories of the current working directory for git repos:

```bash
PARENT=$(dirname "$PWD")
ls -d "$PARENT"/*/.git 2>/dev/null | sed 's|/.git||'
```

Skip repos with 0 user commits in the date range from the final output.

### 3. Scan Repos

For each repo, collect commits, authored PRs, and reviewed PRs. Run repos in parallel where possible.

**Commits** (run once per alias):

```bash
git -C <repo> log --all --author="<alias>" --since="<START_DATE>T00:00:00" --format="%h|%s|%ai"
```

**Authored PRs:**

```bash
cd <repo> && gh pr list --author="@me" --state=all --search="created:>=<START_DATE>" --json number,title,state,mergedAt,createdAt 2>/dev/null
```

**Reviewed PRs:**

```bash
cd <repo> && gh pr list --state=all --search="reviewed-by:@me created:>=<START_DATE> -author:@me" --json number,title,state 2>/dev/null
```

Deduplicate PRs by number within each repo. Deduplicate commits by hash.

### 4. Enrich with Jira Context

Extract ticket IDs from commit messages and PR titles:

```bash
grep -oE '[A-Z]+-[0-9]+'
```

Deduplicate. For each unique ticket, fetch summary:

```bash
acli jira workitem view <TICKET-ID>
```

Use the `Summary` field for work descriptions. Skip silently if acli fails.

**Resolve project names** from Jira prefixes (e.g., `UL` -> "Ultras"):

```bash
acli jira project view --key <PREFIX>
```

Use the `Name` field. Jira project name takes priority over repo directory name. If a repo has commits with multiple Jira prefixes, group work by Jira project. Fall back to repo directory name when commits have no ticket.

### 5. Estimate Hours

Group all commits/PRs by date and project. For each project-day:

| Signal | Estimate |
|--------|----------|
| Single small commit (config fix, typo) | ~0:30 |
| Multiple commits spanning N hours (timestamp spread) | N hours |
| PR with testing/review cycles | timestamp spread + 0:30 |
| Release (version bump, changelog, tag) | ~0:30-1:00 |
| PR review for someone else's code | ~0:30 |

Round to nearest 0:15. These are starting points -- user will correct.

### 6. Output

One table per day, grouped by project:

```
## Mon 16 Feb

| Project | Est. Hours | Ticket | Work |
|---------|------------|--------|------|
| ITF | 3:45 | WCOT-878 | Disable SSO + doppler fix |
| Newcastle | 1:45 | UL-2058 | Image caching/proxy |
| **Total** | **5:30** | | |

**Reviews:**
- Newcastle PR #756 - NWA-353 Notifications OS
```

Rules:
- Work descriptions ~5 words max, no full sentences
- Omit PRs already referenced in commit messages
- Reviews section per day (omit if empty)

### 7. Scheduled Hours Comparison

If user provides a screenshot or data of scheduled hours, add after all daily tables:

```
## Scheduled vs Actual

| Project | Scheduled | Est. Actual | Delta |
|---------|-----------|-------------|-------|
| ITF | 3:45 | 3:45 | - |
| West Ham | 4:00 | 0 | -4:00 !! |
```

Flag deltas >= 2:00 with `!!`. Fuzzy-match Jira project names to scheduled names (e.g., "ITF - World Cup of Tennis" matches "ITF Retainer 2026").

### 8. Ask for Corrections

After presenting results, ask the user to correct estimates for:
- Days with low total hours (meetings/testing not in git)
- Projects with scheduled hours but 0 commits
- Projects significantly over/under schedule
