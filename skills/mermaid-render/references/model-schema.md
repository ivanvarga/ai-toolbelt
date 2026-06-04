# mermaid-render model schema

The JSON contract producers feed to `render.mjs` / `view.mjs` on stdin. Common envelope: every
model has a `type` discriminator and optional `title`. Unknown `type` → non-zero exit listing the
supported types.

## Generic links (all chart types)

Every type uses ONE `links` array for connectors — no per-type `edges`/`relations`/`cardinality`.
A link's **type is a data string** resolved via the renderer's per-type registry:

```json
{ "from": "A", "to": "B", "type": "inheritance", "label": "uses", "url": "https://..." }
```

- `type` (string) → mermaid connector + style via the registry. Adding a connector is one map entry,
  never a schema change. Unknown `type` → default connector + a stderr warning (degrade, never crash).
- `label` (optional) — edge/relationship label.
- `url` (optional) — see Uniform URLs.

Per-type link registries (starting vocabulary; extend in `scripts/lib/links.mjs`):

```
flowchart:  happy → "-->" green  · error → "-->" red  · deleted → "-.->" dashed-red  · neutral → "-->" gray
class:      inheritance → "<|--" · composition → "*--" · aggregation → "o--"
            · association → "-->" · dependency → "..>"
er:         one-to-one → "||--||" · one-to-many → "||--o{" · many-to-one → "}o--||"
            · many-to-many → "}o--o{"   (identifying:false swaps "--" for "..")
```

## Uniform URLs

Any **node** and any **link** may carry an optional `url`:

- flowchart → `click <id> "<url>" _blank`; clickable labels wrapped in `<u>`.
- class → `click <name> href "<url>" "<tooltip>"`.
- er → no native interaction; `url` is not emitted inline.
- **All types** append a single `<!-- LINKS: {id → url} -->` comment, so links survive when GitHub
  strips inline `click`/`href`.

## flowchart

One flowchart type covers dependency graphs and logical-flow diagrams.

```json
{
  "type": "flowchart",
  "direction": "TD",
  "groups": [{ "id": "auth", "label": "providers/auth", "nodeIds": ["a", "b"] }],
  "nodes":  [{ "id": "a", "label": "auth: login()", "shape": "action",
               "category": "new", "url": "https://github.com/.../auth.ts#L12" }],
  "links":  [{ "from": "a", "to": "b", "label": "success", "type": "happy" }]
}
```

- `shape`: `action` (rounded) | `decision` (diamond). Default `action`.
- node `category`: `new` (green) | `modified` (blue) | `deleted` (red) | `neutral` (default) → `classDef`.
- `groups` optional → `subgraph` panes.

## class

```json
{
  "type": "class",
  "nodes": [{
    "id": "AuthProvider", "category": "modified", "url": "https://github.com/.../auth.ts#L12",
    "members": [
      { "kind": "field",  "name": "token", "type": "string", "visibility": "-" },
      { "kind": "method", "name": "login", "type": "Promise<void>", "visibility": "+" }
    ]
  }],
  "links": [{ "from": "AuthProvider", "to": "HttpClient", "type": "composition", "label": "uses" }]
}
```

- `visibility`: `+` public | `-` private | `#` protected.
- `category` → `classDef` + `cssClass "<id>" <category>`.

## er

```json
{
  "type": "er",
  "nodes": [{
    "id": "PERSON", "category": "new",
    "attributes": [
      { "name": "id", "type": "uuid", "key": "PK" },
      { "name": "companyId", "type": "uuid", "key": "FK" },
      { "name": "email", "type": "string", "key": null }
    ]
  }],
  "links": [{ "from": "PERSON", "to": "COMPANY", "type": "many-to-one",
              "label": "works at", "identifying": false }]
}
```

- attribute `key`: `PK` | `FK` | `UK` | `null`.
- `identifying:false` swaps the `--` connector for `..`.
- `category` → `classDef` + `<id>:::<category>` (mermaid v11). No click.

## Splitting

`render.mjs --split [--threshold N]` (default 25) — flowchart only. Over threshold with >1 group:
emits `### Overview` (one node per group + cross-group edges) then `### <group>` per group
(intra-group nodes/links only). Implemented by `splitFlowchart(model, threshold)` in
`scripts/lib/split.mjs`.
