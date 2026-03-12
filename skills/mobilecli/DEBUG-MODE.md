# mobilecli Debug Mode

> Only loaded when `--debug` is passed. Normal mobilecli usage never reads this file.

Monitors your own execution for deviation signals -- moments where the skill's helpers or documentation failed you and you had to work around them.

## Session Setup

```bash
mkdir -p .mobilecli/debug
DEBUG_LOG=".mobilecli/debug/session-$(date +%Y%m%d-%H%M%S).md"
```

Write header: `# Debug Session {date}` + task description.

## Deviation Signals

Only log when you catch yourself doing one of these:

| Signal | What it means |
|--------|---------------|
| Used `screenshot` for navigation or verification | dump_ui failed or was unreliable -- helper gap |
| Wrote manual jq pipeline (>1 filter) | Missing helper that should encapsulate this query |
| Wrote >3 lines of bash for a single interaction | Missing compound helper |
| Repeated same sequence 2+ times | Pattern needs a helper |
| Used a helper wrong, then corrected | Docs or function signature unclear |
| Had to tap coordinates without dump_ui context | Structural gap in element finding |
| fill_input/dismiss_focus caused side effect | Helper behavior incorrect |
| Tried a helper, it failed, used different approach | Helper has undocumented limitation |

If none of these happen, log nothing. No overhead.

## How to Log

Append to debug log immediately when deviation occurs:

```markdown
### {N}. {one-line description}

did: {what you actually executed -- the bash command or sequence}
expected: {what the ideal helper call would have been if it existed/worked}
why: {why the ideal path didn't work}
fix: {file}:{function} -- {what to add or change}
```

## Session End

Read GAPS.md + debug log. For each deviation not already in GAPS.md, append a fix-ready entry following the GAPS.md format. Deduplicate against existing entries -- annotate re-occurrences, reopen FIXED gaps if they reappeared.
