---
name: tb:mermaid-render
description: Render styled, GitHub-compatible mermaid diagrams from a JSON model. Use when another skill or workflow has a graph (nodes + links) and needs consistent mermaid styling — flowcharts, class diagrams, or ER diagrams. Producers (e.g. tb:change-map, architecture analysis) emit the JSON model; this skill owns all styling, splitting, and viewing, including a zoomable HTML viewer for plans.
---

# Mermaid Render

Deterministic mermaid renderer. Pipe a JSON model to `scripts/render.mjs` on stdin; it prints a
fenced ` ```mermaid ` block (plus a trailing `<!-- LINKS: {...} -->` comment when nodes carry URLs).

## Render (stdout, e.g. for PR descriptions)

```bash
echo '<json-model>' | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs"
```

Pipe a producer directly:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/change-map/scripts/diff-graph.mjs" \
  | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs" --split
```

Flags: `--split` (break a large flowchart into an Overview + per-group diagrams), `--threshold N`
(node count that triggers splitting, default 25). Use `--split` only for PR bodies or other fixed-size
viewers; never for plans.

## View zoomable (default for plans and anything shown to the user)

Writes ONE self-contained HTML file (Mermaid 11.17.2 vendored in `vendor/`, no network) and opens it.
The diagram is never split: plans keep the one-flowchart rule.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/html.mjs" \
  --title "Search flow" --out "<scratchpad>/flow.html" < flow.mmd
```

- Input on stdin: a JSON model, raw Mermaid source, or markdown (first ` ```mermaid ` block is used).
- Viewer: follows system light/dark, fits on load without going below a readable 75%, drag to pan,
  wheel or pinch to zoom, `+ - Fit Reset` buttons, keys arrows / `+` `-` / `0` fit / `r` reset,
  click a node to highlight its neighbours (`Esc` clears).
- Opening is best-effort and never fails the caller: cmux browser pane with `--focus false` when
  cmux is present, else macOS `open`, else the path is printed. `MERMAID_VIEW_NO_OPEN=1` skips it.
- Each cmux open adds a new pane; close old ones with `cmux close-surface --surface <ref>`.
- One file per diagram: render the data-structure diagram and the flowchart to separate files.

## View in the cmux markdown panel (legacy)

Fixed-size, no zoom; kept for existing callers such as `tb:change-map`:

```bash
echo '<json-model>' \
  | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/view.mjs" --title "My Diagram"
```

`view.mjs` renders with `--split`, writes a `.md` (`--out <path>`, default
`/tmp/mermaid-render-view.md`), then runs `cmux markdown open`. The panel live-reloads, so re-running
refreshes it. Set `MERMAID_VIEW_NO_OPEN=1` to skip the cmux call (non-cmux environments / tests).

## Supported model types

`flowchart`, `class`, `er`. All share `nodes[]` + `links[]` with uniform optional `url`. The full
JSON contract is in `references/model-schema.md` — read it before producing a model.

## Splitting (fixed-size readability)

Viewers like cmux markdown and GitHub render at a fixed size (no zoom). For large graphs in those
viewers use `--split`: a flowchart with groups over the threshold becomes an **Overview** (one node per group +
cross-group edges) plus **one diagram per group** (intra-group only). `class`/`er` always render
single.

## Adding a new chart type

1. Add `scripts/renderers/<type>.mjs` exporting `render<Type>(model)`.
2. Register it in `scripts/render.mjs`'s `RENDERERS` map.
3. Add its connector vocab to `scripts/lib/links.mjs`.
4. Document its model shape in `references/model-schema.md` + add a renderer test.

## GitHub note

GitHub strips `click`/hyperlinks from mermaid. The renderer still emits them (for other viewers) and
always appends a `<!-- LINKS: {id → url} -->` comment so a consumer can post links out-of-band. ER
diagrams have no node interaction — they carry no clicks.
