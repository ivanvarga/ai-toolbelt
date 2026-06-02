# Design: `tb:mermaid-render` styling skill + `tb:change-map` refactor

Date: 2026-06-02
Status: Approved (design); pending implementation plan

## Problem

`tb:change-map` couples two concerns in one place: (a) analyzing a git diff and (b)
rendering styled, GitHub-compatible mermaid. The mermaid styling logic (`generateMermaid`
in `file-deps.mjs` plus the Phase 4 prose in `SKILL.md`) is locked to the diff use case and
cannot be reused for other diagram needs (e.g. architecture analysis).

We want the mermaid styling to be a standalone, reusable engine that any producer can target,
with the diff workflow as its first consumer.

## Goals

- A standalone styling skill, `tb:mermaid-render`, that owns **all** mermaid styling/rendering.
- A deterministic renderer script: JSON model on stdin → finished, styled mermaid on stdout.
- A registry of chart types. v1 ships **flowchart**, **class**, and **er**. Adding a type later
  is a new render function + schema entry; consumers are unaffected.
- Refactor `tb:change-map` to be a pure **producer**: git diff → JSON model → piped into
  `mermaid-render`. No styling logic remains in change-map.
- The styling skill is general enough that a future architecture-analysis producer feeds it the
  same way the diff skill does.

## Non-goals

- No architecture-analysis skill is built. (The styling skill must merely be reusable by one.)
- No new chart types beyond flowchart/class/er in v1.
- No call-graph / cross-language analysis. change-map stays TS/TSX, as today.

## Architecture

```
skills/mermaid-render/
  SKILL.md                     # when/how to use; the contract; how consumers invoke render.mjs
  scripts/render.mjs           # entry: reads JSON model on stdin, validates, dispatches on model.type
  scripts/renderers/
    flowchart.mjs              # model -> flowchart TD (subgraphs, categories, clicks)
    class.mjs                  # model -> classDiagram
    er.mjs                     # model -> erDiagram
  scripts/lib/style.mjs        # shared palette, init directive, <u>/click + FILE_LINKS helpers
  references/model-schema.md   # the JSON contract for each type (what producers target)

skills/change-map/             # refactored: analysis only
  scripts/diff-graph.mjs       # git diff -> flowchart JSON model (renamed/derived from file-deps.mjs)
  scripts/symbol-map.mjs       # unchanged (symbol -> URL lookup, used to populate node.url)
  SKILL.md                     # pipes diff-graph.mjs output into mermaid-render's render.mjs
```

### How consumers invoke the styling skill

A producer skill calls the renderer by absolute plugin path and pipes JSON to stdin:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/change-map/scripts/diff-graph.mjs" \
  | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs"
```

`render.mjs` prints a fenced ` ```mermaid ` block ready to drop into a PR description or terminal.
For multiple diagrams the producer calls `render.mjs` once per model.

## The contract (render.mjs stdin)

Common envelope: every model has a `type` discriminator and an optional `title`.
Unknown `type` → `render.mjs` exits non-zero with a clear error listing supported types.

### Generic links (all chart types)

Every chart type uses ONE `links` array for connectors — no per-type `edges`/`relations`/
`cardinality` fields. A link's **type is a data string** the renderer resolves through an
extensible per-renderer registry:

```json
{ "from": "A", "to": "B", "type": "inheritance", "label": "uses", "url": "https://..." }
```

- `type` (string): resolved via the renderer's link-type map → mermaid connector + style.
  Adding a new connector is one map entry, never a schema change.
- `label` (optional): edge/relationship label.
- `url` (optional): see "Uniform URLs" below — links are clickable wherever the chart type allows.

Per-renderer link-type registries (the starting vocabulary; grows over time):

```
flowchart:  happy → "-->" green  · error → "-->" red  · deleted → "-.->" dashed-red  · neutral → "-->" gray
class:      inheritance → "<|--" · composition → "*--" · aggregation → "o--"
            · association → "-->" · dependency → "..>"
er:         one-to-one → "||--||" · one-to-many → "||--o{" · many-to-one → "}o--||"
            · many-to-many → "}o--o{"   (er adds: identifying:false → ".." connector instead of "--")
```

Unknown `type` → renderer falls back to a default connector + emits a stderr warning (degrade,
never crash). The registry is the single place a new link type is registered.

### Uniform URLs

Any **node** and any **link** may carry an optional `url`. The renderer emits it as the chart
type allows, with a consistent out-of-band fallback:

- flowchart → `click <id> "<url>" _blank`, clickable labels wrapped in `<u>`.
- class → `click <name> href "<url>" "<tooltip>"`.
- er → no native node/link interaction; `url` is not emitted inline.
- **All types** additionally emit a trailing `<!-- LINKS: {id|name → url} -->` comment, so links
  survive even when GitHub strips inline `click`/`href` (see caveats). One unified comment marker
  (`LINKS`) replaces the old per-type `FILE_LINKS`/`ENTITY_LINKS`.

### flowchart

One flowchart type covers BOTH diagrams change-map produces today (the dependency graph and the
hand-authored logical-flow), so producers never hand-write flowchart syntax.

```json
{
  "type": "flowchart",
  "direction": "TD",
  "groups":  [{ "id": "auth", "label": "providers/auth", "nodeIds": ["a", "b"] }],
  "nodes":   [{ "id": "a", "label": "auth-provider: login()", "shape": "action",
                "category": "new", "url": "https://github.com/.../auth.ts#L12" }],
  "links":   [{ "from": "a", "to": "b", "label": "success", "type": "happy" }]
}
```

- `shape`: `action` (rounded `(...)`) | `decision` (diamond `{...}`). Default `action`.
- node `category`: `new` (green) | `modified` (blue) | `deleted` (red) | `neutral` (default). Maps to `classDef`.
- link `type`: resolved via the flowchart link-type registry → `linkStyle`.
- `groups` optional → `subgraph` panes with the existing pane styling.

### class

```json
{
  "type": "class",
  "nodes": [{
    "id": "AuthProvider",
    "label": "AuthProvider",
    "category": "modified",
    "url": "https://github.com/.../auth.ts#L12",
    "members": [
      { "kind": "field",  "name": "token",  "type": "string", "visibility": "-" },
      { "kind": "method", "name": "login",  "type": "Promise<void>", "visibility": "+" }
    ]
  }],
  "links": [
    { "from": "AuthProvider", "to": "HttpClient", "type": "composition", "label": "uses" }
  ]
}
```

- `visibility`: `+` public | `-` private | `#` protected. Rendered in mermaid member syntax.
- link `type` → arrow via the class registry (`inheritance`, `composition`, …).
- `category` → `classDef` + `cssClass "<id>" <category>` (mermaid class diagrams support classDef/cssClass).

### er

```json
{
  "type": "er",
  "nodes": [{
    "id": "PERSON",
    "category": "new",
    "attributes": [
      { "name": "id",        "type": "uuid",   "key": "PK" },
      { "name": "companyId", "type": "uuid",   "key": "FK" },
      { "name": "email",     "type": "string", "key": null }
    ]
  }],
  "links": [
    { "from": "PERSON", "to": "COMPANY", "type": "many-to-one",
      "label": "works at", "identifying": false }
  ]
}
```

- attribute `key`: `PK` | `FK` | `UK` | `null`. Rendered as the mermaid key suffix.
- link `type` → crow's-foot via the er registry; `identifying:false` swaps the `--` connector for `..`.
- `category` → `classDef` + `<id>:::<category>` (mermaid v11 ER styling).

> **Node naming**: every type uses a `nodes` array with an `id`. flowchart/er use `id` directly as
> the mermaid node id; class uses `id` as the class name. `members`/`attributes` are node fields
> specific to class/er. This keeps `nodes` + `links` + `url` uniform across all renderers.

## Styling semantics (owned by `lib/style.mjs`)

Single source of truth for the palette and directives, identical to today's change-map output so
existing PRs stay visually consistent:

- init directive: `%%{init: {'flowchart': {'wrappingWidth': 9999}, 'themeVariables': {'fontSize': '14px'}}}%%`
- category palette: new `#4ade80`, modified `#60a5fa`, deleted `#f87171`, neutral/gray `#475569`;
  always include `color:#000` + (for nodes) `text-align:left` for contrast on GitHub dark theme.
- subgraph panes: `rx:10,ry:10,fill:#1e293b,stroke:#334155,color:#94a3b8`.

## GitHub-compatibility caveats (verified 2026-06-02)

- GitHub renders mermaid but **strips `click`/hyperlinks and tooltips** for security. The renderer
  still emits `click`/`href` (works in other viewers) AND emits a single trailing
  `<!-- LINKS: {id → url} -->` comment (all chart types) carrying the id→url map, so a consumer can
  post links out-of-band. This preserves and unifies the existing change-map FILE_LINKS behavior.
- ER `classDef`/`style` is mermaid v11. If GitHub's pinned renderer rejects it, the diagram still
  renders unstyled rather than failing — category coloring is best-effort for ER.
- Class/ER coloring is best-effort; flowchart styling is full. This is a known mermaid limitation,
  not a bug to fix.

## change-map refactor

- `file-deps.mjs` splits: the analysis half (gatherChangedFiles, getSymbols/scanExports, import
  resolution, A/M/D status, GitHub URL building) becomes `diff-graph.mjs` and **emits a flowchart
  JSON model** instead of mermaid. The `generateMermaid` half moves into and is generalized by
  `mermaid-render/scripts/renderers/flowchart.mjs`.
- `symbol-map.mjs` stays; its output still populates `node.url` for the logical-flow model.
- `SKILL.md` Phase 2 (dependency diagram) becomes: run `diff-graph.mjs | render.mjs`. Phase 4
  (logical flow) becomes: subagent builds a flowchart JSON model (it decides which nodes/paths
  matter) and pipes it through `render.mjs` — so the subagent no longer hand-writes styled mermaid,
  only the semantic graph. The Phase 4 styling prose moves to `mermaid-render/references/`.
- Diff-status (A/M/D) maps to model categories: A→new, M→modified, D→deleted.

## Testing

- Per-renderer unit tests in `scripts/tests/`: feed a fixture model, assert the output contains the
  expected mermaid markers — init directive; `classDef` lines for each category; correct link-type
  arrows (`<|--`, `*--`, `..>`); crow's-foot cardinality (`||--o{`); the unified `LINKS` comment.
- Link-type registry tests: known `type` → expected connector/style; unknown `type` → default
  connector + stderr warning (no crash).
- `render.mjs` dispatch tests: unknown `type` exits non-zero with a helpful message; each known type
  routes to its renderer.
- Update `companies-artifacts`-style expectations only if affected (they are not).
- Run with `node --test scripts/tests/*.test.js` (matches the repo's existing runner; note `node
  --test <dir>` does not auto-discover on the installed Node, use the glob).

## Open implementation details (decide during planning)

- Exact skill name surfaced to users: `tb:mermaid-render` (working name).
- Whether `diff-graph.mjs` emits one combined model or one model per diagram (lean: one per diagram;
  render.mjs is single-model).
- Shared JSON-schema validation depth in `render.mjs` (lean: lightweight hand-written guards, no dep).
