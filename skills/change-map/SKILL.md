---
name: tb:change-map
description: Use when the user asks to visualize changes, map a diff, create a change diagram, review what changed, summarize a branch visually, show the impact of a PR, generate a mermaid diagram for code changes, create a flow chart of modifications, illustrate file dependencies in a diff, or wants a visual overview of their work before opening a pull request. Produces GitHub-compatible mermaid diagrams for PR descriptions.
---

# Change Map

Generate visual diagrams that tell the **story** of code changes. The output is GitHub-compatible markdown with mermaid diagrams — works both in the terminal and copy-pasted into PR descriptions.

The goal is minimum mental load for reviewers: they should glance at the diagrams and immediately know WHERE to look and WHY, not just WHAT changed.

## Scope and Limitations

The bundled scripts (`diff-graph.mjs`, `symbol-map.mjs`) analyze **TypeScript and TSX files only** (`.ts`, `.tsx`). For other languages the scripts will still run but emit "No changed TS/TSX files found" — the subagent should then fall back to generating diagrams directly from the git diff rather than relying on the scripts. Skills that need cross-language support should extend the scripts; the limitation is intentional, not a bug.

## Execution

Spawn a subagent to do all the heavy lifting. The main conversation stays clean — you just relay the final markdown output.

```
Agent(
  description: "Change Map: <branch-or-context>",
  subagent_type: "general-purpose",
  prompt: <see below>
)
```

Use a short descriptive label with context, e.g.:
- `"Change Map: feature/sso-v2-migration"`
- `"Change Map: uncommitted changes"`
- `"Change Map: last 3 commits"`

### Subagent prompt template

Adapt based on context (branch name, custom diff range, etc.):

```
Generate a visual change map for code changes. Output ONLY the final markdown block — no commentary, no explanations.

The output is read by PR reviewers who have ~30 seconds before their attention drifts. Your job is to make the first diagram they see tell them where the important logic is and why it matters, so they know where to focus their review.

Follow the five phases below in order. The research phases (1-3) feed the output phases (4-5) — do not skip ahead to generating diagrams before you have the data.

---

## Phase 1: Gather git context

Goal: determine the base branch and collect all diff data.

**1a. Find the base branch and store it** — subsequent commands use `$BASE_BRANCH`:
```bash
BASE_BRANCH=$(git fetch --quiet 2>/dev/null; for b in origin/dev origin/develop origin/main origin/master; do git rev-parse --verify "$b" >/dev/null 2>&1 && echo "$b" && break; done)
echo "$BASE_BRANCH"
```

**1b. Collect repo state in one call:**
```bash
echo "=== REPO ===" && git remote get-url origin && git branch --show-current && \
echo "=== COMMITS ===" && git log $BASE_BRANCH..HEAD --format="%h %s" && \
echo "=== BRANCH DIFF STAT ===" && git diff $BASE_BRANCH...HEAD --stat && \
echo "=== UNCOMMITTED STAT ===" && git diff --stat && git diff --cached --stat && \
echo "=== PR ===" && gh pr view --json title,url 2>/dev/null || true
```

**1c. Get the full diff** (generated files and lockfiles excluded to keep signal high):
```bash
git diff $BASE_BRANCH...HEAD -- . ':!*.generated.*' ':!*.lock' ':!**/types.ts' ':!**/__generated__/**' && \
echo "=== UNCOMMITTED ===" && \
git diff -- . ':!*.generated.*' ':!*.lock' ':!**/types.ts' ':!**/__generated__/**'
```

**1d. If the diff is > 500 lines:** don't try to hold it all in context. Use the `--stat` output from 1b to identify the changed files — you'll read the important ones directly in Phase 3.

---

## Phase 2: Run bundled analysis scripts

Two scripts do the mechanical work. Run each once and save their output — you'll use both later.

**2a. File dependencies diagram:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/change-map/scripts/diff-graph.mjs" \
  | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs" --split
```
`diff-graph.mjs` parses the git diff, resolves imports, extracts symbols, and emits a flowchart JSON model; `tb:mermaid-render`'s `render.mjs` applies all styling (classDef, subgraph grouping, linkStyle, click URLs) and `--split`s large graphs into an Overview + per-group diagrams. Its output goes directly into the final markdown as the File Dependencies section — do not modify it.

**2b. Symbol map (JSON lookup for click URLs):**
```bash
node "${CLAUDE_SKILL_DIR}/scripts/symbol-map.mjs"
```
Outputs a JSON object keyed by symbol name. Exported symbols use their name directly (e.g. `"handlePostAuthConsent"`); non-exported symbols are prefixed with their file path (e.g. `"providers/auth-provider:login"`). Each entry has `file`, `line`, `kind`, `label`, and `url`.

You will use this map in Phase 5 to build accurate `click` directives for the Logical Flow diagram. **Never guess line numbers or construct URLs manually — always look up the symbol in this map.** If a symbol isn't in the map, omit the click directive for that node.

**Note on TS/TSX-only scripts:** `diff-graph.mjs` and `symbol-map.mjs` only analyze `.ts` and `.tsx` files. If `diff-graph.mjs` prints "No changed TS/TSX files found," the current diff is in other languages — skip the scripted File Dependencies section and build a simpler flowchart model by hand (see Phase 4) from the diff stat, then pipe it through `render.mjs`.

---

## Phase 3: Understand the story (think — no tools)

Read the script outputs from Phase 2 and the diff from Phase 1c. Before drawing anything, answer:
- What is the main behavior change or feature?
- What are the key decision points / branching paths?
- What is the entry point a reviewer should start from?
- Which files are central (most connections in the dependency output)?

Apply scaling rules to decide what to draw:
- **Small (1-3 files):** Skip the Logical Flow diagram unless there is meaningful branching — a dependency diagram alone is enough.
- **Medium (4-10 files):** Full treatment — both diagrams.
- **Large (10+ files):** Split Logical Flow into multiple diagrams by feature area, keeping each under ~30 nodes.
- **Pure refactor (renames/moves, no branching):** Skip Logical Flow, use the dependency diagram to show before→after.

---

## Phase 4: Build the Logical Flow model

A flowchart that shows how the code flows through the changes, with the decision paths a reviewer should follow. You decide *what matters* (which nodes/paths); `tb:mermaid-render` owns *all styling*. Skip this entirely if Phase 3 determined it isn't needed.

Build a flowchart JSON model (the full contract is in `skills/mermaid-render/references/model-schema.md`):

```json
{
  "type": "flowchart",
  "direction": "TD",
  "groups": [{ "id": "auth", "label": "auth", "nodeIds": ["A", "B"] }],
  "nodes": [
    { "id": "A", "label": "auth-provider: login()", "shape": "action", "category": "modified", "url": "<from symbol map>" },
    { "id": "B", "label": "registered?", "shape": "decision", "category": "neutral" }
  ],
  "links": [
    { "from": "A", "to": "B", "label": "success", "type": "happy" },
    { "from": "B", "to": "A", "label": "401", "type": "error" }
  ]
}
```

Guidelines:
- **Nodes:** `shape` is `action` or `decision`; `label` uses `file: functionName()`; `category` is `new`/`modified`/`neutral` (matches the diff). Show 3–8 key paths — tell the story, don't overwhelm.
- **Links:** `type` is `happy` (success path), `error` (failure path), or `neutral`; add a `label` like `success` / `401 error`.
- **URLs:** populate `url` from the Phase 2b symbol map's `url` field. **Never guess line numbers or construct URLs** — if a symbol isn't in the map, omit `url` for that node. The renderer wraps clickable nodes in `<u>` and emits the `click`/`LINKS` directives.
- **Groups:** optional `subgraph` panes when layering clarifies (e.g. auth vs handlers).

Render it (and split if large):
```bash
echo "$LOGICAL_FLOW_JSON" | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs" --split
```
All colors, shapes, arrow styling, clickable wrapping, and the init directive are applied by the renderer — do not hand-write mermaid styling.

---

## Phase 5: Assemble the final markdown

Emit exactly one markdown block with this structure (no prose outside the block):

```
## Change Map

### Logical Flow
<render.mjs output for the Phase 4 model, or omit this subsection if Phase 3 said to skip it>

### File Dependencies
<render.mjs output for the Phase 2a pipe, verbatim>
```

Do not post-edit the rendered diagrams — `tb:mermaid-render` already handled styling, symbols, click URLs, splitting, and subgraph grouping. Your only job is to splice its output into the final markdown.

To view locally instead of emitting markdown, pipe either model through `mermaid-render/scripts/view.mjs` (writes a `.md` and opens it in the cmux markdown panel).
```

### What you do with the result

The subagent returns the complete markdown block. Output it directly to the user — they can:
1. Review it in the terminal
2. Copy-paste into a PR description (mermaid + links render natively on GitHub)

If the user wants adjustments (more detail, different grouping, focus on a specific area), you can either edit the output directly or re-run the subagent with refined instructions.
