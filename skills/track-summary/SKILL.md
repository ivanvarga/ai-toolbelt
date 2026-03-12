---
name: track-summary
description: Use when the user wants a summary of work done, daily standup notes, end-of-day recap, or help logging timesheet hours. Triggers on mentions of daily summary, standup, hours, timesheet, what did I do, work recap.
---

# Daily Summary

Generate a timesheet-oriented work summary across all project repos.

## Arguments

Parse user input for date range and context:
- No args -- today only
- "yesterday" -- yesterday
- "last N days" / "N days" -- N days back from today
- "this week" -- Monday of current week to today
- Attached screenshot of scheduled hours -- compare against actual (see step 7)

Compute `START_DATE` from args (format: `YYYY-MM-DD`).

## Steps

### 1. Detect Identity

Try ALL of these and collect every identity found as `KNOWN_ALIASES`:

```bash
git config user.name 2>/dev/null
git config --global user.name 2>/dev/null
git config user.email 2>/dev/null
git config --global user.email 2>/dev/null
gh api user --jq '.login' 2>/dev/null
```

Store all results. If everything fails, discover identities in step 3 by scanning commit authors -- pick the most frequent non-bot author.

### 2. Discover Repos

Auto-discover all git repos:

```bash
ls -d ~/Projects/*/.git 2>/dev/null | sed 's|/.git||'
```

Use directory names as initial labels. Step 4b upgrades these to proper project names via Jira.

Skip repos with 0 user commits in the date range from output.

### 3. Scan All Repos

For each repo, run in parallel batches:

```bash
git -C <repo> log --all --since="<START_DATE>T00:00:00" --format="%an|%ae" | sort -u
```

```bash
git -C <repo> log --all --author="<alias>" --since="<START_DATE>T00:00:00" --format="%h|%s|%ai"
```

```bash
cd <repo> && gh pr list --author="@me" --state=all --search="created:>=<START_DATE>" --json number,title,state,mergedAt,createdAt
cd <repo> && gh pr list --author="@me" --state=merged --search="merged:>=<START_DATE>" --json number,title,state,mergedAt
```

```bash
cd <repo> && gh pr list --state=all --search="reviewed-by:@me created:>=<START_DATE> -author:@me" --json number,title,state
cd <repo> && gh pr list --state=merged --search="reviewed-by:@me merged:>=<START_DATE> -author:@me" --json number,title,state
```

**Identity snowball:** When commits by a known alias appear in a new repo, check if the author name/email reveals new aliases (e.g., "Ivan Varga" in local commits, "ivanvargo" in GitHub merge commits). Add new aliases and re-check repos that previously returned 0 results.

Deduplicate PRs by number within each repo. Deduplicate commits by hash.

### 4. Extract and Enrich Jira Tickets

Extract ticket IDs from all commit messages and PR titles:

```bash
grep -oE '[A-Z]+-[0-9]+'
```

Deduplicate. For each unique ticket, fetch summary in parallel:

```bash
acli jira workitem view <TICKET-ID>
```

Use the `Summary` field for work descriptions. Skip silently if acli fails.

### 4b. Resolve Project Names from Jira

Extract unique Jira prefixes from ticket IDs (e.g., `WCOT`, `NWA`, `UL`). For each unique prefix:

```bash
acli jira project view --key <PREFIX>
```

This returns the canonical project name (e.g., `WCOT` -> "ITF - World Cup of Tennis", `NWA` -> "Newcastle App", `UL` -> "Ultras").

**Mapping priority:** Jira project name > repo directory name. If a repo has commits with multiple Jira prefixes, group work by Jira project -- a single repo can produce rows for multiple timesheet projects. If commits have no Jira ticket, fall back to repo directory name.

When comparing against scheduled hours (step 7), fuzzy-match Jira project names to scheduled project names (e.g., "ITF - World Cup of Tennis" matches "ITF Retainer 2026", "Newcastle App" matches "Newcastle Retainer").

### 5. Estimate Hours Per Day Per Project

Group all commits/PRs by date and project. For each project-day:

| Signal | Estimate |
|--------|----------|
| Single small commit (1-liner, config fix) | ~0:30 |
| Multiple commits spanning N hours (timestamp spread) | N hours |
| PR with testing/review cycles | timestamp spread + 0:30 |
| Release (version bump, changelog, tag) | ~0:30-1:00 |
| PR review for someone else's code | ~0:30 |

These are rough starting points. User will correct. Round to nearest 0:15.

### 6. Output Format

Output one table per day, grouped by project:

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
- Work descriptions ~5 words max
- No full sentences, no preamble
- If a commit message already contains a PR number from the authored PRs list, do not list it separately
- Reviews section per day (omit if empty)
- Bold ticket IDs

### 7. Scheduled Hours Comparison

If user provides a screenshot or data of scheduled hours, add a comparison section after all daily tables:

```
## Scheduled vs Actual

| Project | Scheduled | Est. Actual | Delta |
|---------|-----------|-------------|-------|
| ITF | 3:45 | 3:45 | - |
| West Ham | 4:00 | 0 | -4:00 !! |
| Six Nations (NB) | 1:00 | 4:00 | +3:00 !! |
```

Flag with `!!` any delta >= 2:00. Summarize total scheduled vs total estimated actual.

### 8. Ask User for Corrections

After presenting the full summary, ask the user to correct hour estimates for anything that looks off -- especially:
- Days with low total hours (possible meetings/testing not in git)
- Projects with 0 commits but scheduled hours (may have done non-code work)
- Projects significantly over/under schedule
