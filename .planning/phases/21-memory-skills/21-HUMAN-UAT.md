---
status: partial
phase: 21-memory-skills
source: [21-VERIFICATION.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Invoke /tb:load-context with a query
expected: Formatted memory results with importance >= 7, three refinement actions offered (refine/expand/load)
result: [pending]

### 2. Test load-context refinement loop
expected: Refine query re-runs search, expand shows full content + linked memories, load injects into context with XML tags
result: [pending]

### 3. Invoke /tb:save-findings for current phase
expected: Curation agent reads phase artifacts, presents batch plan table with CREATE/UPDATE/OBSOLETE/SKIP actions
result: [pending]

### 4. Approve save-findings batch
expected: Memories created in Forgetful, confirmation with Created/Updated/Obsoleted/Skipped counts
result: [pending]

### 5. Re-invoke /tb:save-findings to verify dedup
expected: Previously saved memories detected as duplicates and shown as SKIP
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
