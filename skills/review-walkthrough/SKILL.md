---
name: tb:review-walkthrough
description: Use when the user wants to review changes together, file by file, at their own pace. Triggers on "review with me", "walk me through the changes", "file by file review", "go through the diff with me". Also run by the orchestrator after the review gates and verifier-flow pass, before asking about the PR.
---

# Review walkthrough

You (the orchestrator) walk the user through a branch one file at a time. Subagents prepare the material and answer questions; you only talk, show and keep the state file. You never move to the next file unless the user says so.

No human reachable (headless): skip the walkthrough and write `review walkthrough skipped: no human` in REPORT.md.

## 1. Prepare (one subagent)

Make a handoff directory: the session scratchpad if there is one, otherwise `mktemp -d`. Never the repo.

Spawn ONE `tb:verifier-review` with gate `walkthrough`, the branch, its worktree path, the fetched base, the plan or SPEC.md if any, and the handoff directory. It writes there:

- `walkthrough.json`:

```json
{
  "base": "origin/main",
  "branch": "feature/x",
  "repo": "/abs/worktree",
  "tldr": "Plain words: what the whole change does.",
  "testsSkipped": "tests skipped: 3 files",
  "files": [
    {
      "path": "src/search.ts",
      "tldr": "Adds a cache so repeat searches are instant.",
      "why": "Search was slow on every keypress.",
      "risk": "Check the cache is cleared on logout.",
      "nodes": ["cache_check", "cache_hit"]
    }
  ]
}
```

- `flow.json`: ONE `tb:mermaid-render` flowchart model of the changed functionality (never split, grouped subgraphs, every branch). `nodes` in each file card are ids from this chart.
- `data.json`: a data-structure diagram model, only when a structure changed.
- `walkthrough-state.json`: `{ "current": 0, "files": [{ "path": "...", "status": "pending", "comments": [] }] }`. Status is `pending`, `reviewed`, `skipped` or `needs-change`.

Skipped from the walkthrough (the review gates still cover them): test files (`*.test.*`, `*.spec.*`, `*_test.*`, `*Test.*`, `*Tests.*`, `test_*.py`, anything under `__tests__/`, `__mocks__/`, `test/`, `tests/`, `e2e/`, `spec/`), lockfiles (`*.lock`, `package-lock.json`, `pnpm-lock.yaml`, `Podfile.lock`), generated files and vendored code (`vendor/`, `dist/`, `build/`, `*.min.*`).

## 2. Open

1. Render the flowchart in the zoomable viewer (it opens a cmux browser pane with focus off when cmux is present, else the default browser, else prints the path):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/html.mjs" --title "Change flow" --out "<dir>/flow.html" < "<dir>/flow.json"
```

   Do the same for `data.json` when it exists.
2. Tell the user, TL;DR first: what the change does in plain words, how many files you will show, how many tests were skipped, and that they move on by typing `next`.
3. Show file 1.

## 3. Each file

Show the card in plain words, starting `TL;DR: file X of N, <path>: <card tldr>`, then why, what to check, and which chart steps it touches.

Show the actual change. `cmux diff` cannot pick one file, so pipe a one-file patch to it:

```bash
git -C "<repo>" diff "<base>...<branch>" -- "<path>" | cmux diff - --title "<path>" --focus false || true
```

It prints `OK surface=<ref> ...`; keep the ref and close the previous file's diff with `cmux close-surface --surface <ref>` so tabs do not pile up. Without cmux, summarize the patch in a few lines and offer to open it (`open` on a `.diff` file, else give the path).

Then stop and wait.

## 4. Moving on (the rule)

Only these words change the file:

| User says | You do |
|---|---|
| `next` or `n` | mark `reviewed`, show the next file |
| `back` | show the previous file |
| `skip` | mark `skipped`, show the next file |
| `list` | show all files with their status, stay put |
| `done` or `stop` | go to the end summary |

Anything else keeps you on the same file, and every reply still starts with `TL;DR:`: questions, comments, "ok", "looks good", "yes", objections, change requests. Handle it, then end with `Still on file X of N; type next to move on.` and wait.

- **Question**: spawn `tb:quick` (or `tb:researcher` when it needs digging) with the file card, the one-file patch command and the question. Relay its answer in plain words. Never read the code yourself.
- **Comment**: add it to that file's `comments` in the state file.
- **Change request**: mark `needs-change`, spawn a fresh `tb:executor` with the request, the card and GOTCHAS.md, then re-show the same file with its new diff.

Write `walkthrough-state.json` after every step (a small write, or delegate it), so a fresh session can resume from `current`.

## 5. End

Tell the user, TL;DR first: how many files were reviewed, skipped and need changes, the list of change requests and what happened to each, and whether the approved plan held. Close what you opened (`cmux tree` shows the viewer's surface ref, since `html.mjs` does not print it). Then continue with the PR question.
