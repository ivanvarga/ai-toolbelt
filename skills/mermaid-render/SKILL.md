---
name: tb:mermaid-render
description: Render styled, GitHub-compatible mermaid diagrams from a JSON model. Use when another skill or workflow has a graph (nodes + links) and needs consistent mermaid styling — flowcharts, class diagrams, or ER diagrams. Producers (e.g. tb:change-map, architecture analysis) emit the JSON model; this skill owns all styling, splitting, and viewing.
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
(node count that triggers splitting, default 25).

## View (default — cmux markdown panel)

Always display generated diagrams in the cmux markdown panel, never a browser:

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

Viewers like cmux markdown and GitHub render at a fixed size (no zoom). For large graphs use
`--split`: a flowchart with groups over the threshold becomes an **Overview** (one node per group +
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
