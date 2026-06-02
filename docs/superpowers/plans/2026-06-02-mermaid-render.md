# mermaid-render Skill + change-map Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all mermaid styling into a standalone, deterministic `tb:mermaid-render` skill (JSON model → styled mermaid, registry of chart types: flowchart/class/er), and refactor `tb:change-map` into a pure producer that feeds it.

**Architecture:** A `render.mjs` entry reads a JSON model on stdin, dispatches on `model.type` to a per-type renderer. Shared palette/init/helpers live in `lib/style.mjs`; connector vocab lives in `lib/links.mjs` as per-type registries (data-driven `type` strings, extensible). All chart types share one `nodes` + `links` shape with uniform optional `url`. change-map's analysis emits the flowchart model; the renderer styles it.

**Tech Stack:** Node ESM (`.mjs`) scripts, `node:test` (CommonJS test files using dynamic `import()`), mermaid (GitHub-compatible output). Repo: `~/Projects/ai-toolbelt` (tb plugin). Spec: `docs/superpowers/specs/2026-06-02-mermaid-render-skill-design.md`.

**Conventions:**
- Run a single test file: `node --test scripts/tests/<file>.test.js`
- Run all: `node --test scripts/tests/*.test.js` (dir auto-discovery does NOT work on the installed Node — always glob)
- Commit messages: 1 line, imperative, no attribution (repo convention).
- ESM modules export named functions; CJS tests load them via `const m = await import('../path.mjs')`.

---

## File Structure

**Create (new `mermaid-render` skill):**
- `skills/mermaid-render/scripts/lib/style.mjs` — palette, init directive, classDef lines, fence + LINKS comment, label escaping
- `skills/mermaid-render/scripts/lib/links.mjs` — per-type link registries + resolver functions (flowchart/class/er)
- `skills/mermaid-render/scripts/renderers/flowchart.mjs` — flowchart model → mermaid
- `skills/mermaid-render/scripts/renderers/class.mjs` — class model → mermaid
- `skills/mermaid-render/scripts/renderers/er.mjs` — er model → mermaid
- `skills/mermaid-render/scripts/render.mjs` — stdin JSON → dispatch → stdout
- `skills/mermaid-render/references/model-schema.md` — the JSON contract (producer-facing)
- `skills/mermaid-render/SKILL.md` — when/how to use; invocation
- Tests: `scripts/tests/mermaid-style.test.js`, `mermaid-links.test.js`, `mermaid-flowchart.test.js`, `mermaid-class.test.js`, `mermaid-er.test.js`, `mermaid-render-dispatch.test.js`, `change-map-diff-graph.test.js`

**Modify (`change-map`):**
- `skills/change-map/scripts/file-deps.mjs` → becomes `skills/change-map/scripts/diff-graph.mjs` (emits flowchart JSON model instead of mermaid)
- `skills/change-map/SKILL.md` (pipe diff-graph → render.mjs; move Phase 4 styling prose out)

---

## Task 1: Shared style module

**Files:**
- Create: `skills/mermaid-render/scripts/lib/style.mjs`
- Test: `scripts/tests/mermaid-style.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scripts/tests/mermaid-style.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('mermaid-style', async (t) => {
  const style = await import('../../skills/mermaid-render/scripts/lib/style.mjs');

  await t.test('classDefLines covers new/modified/deleted with #000 text', () => {
    const out = style.classDefLines().join('\n');
    assert.match(out, /classDef new fill:#4ade80/);
    assert.match(out, /classDef modified fill:#60a5fa/);
    assert.match(out, /classDef deleted fill:#f87171/);
    assert.match(out, /color:#000/);
  });

  await t.test('fence wraps body in a mermaid code block', () => {
    assert.equal(style.fence('X'), '```mermaid\nX\n```');
  });

  await t.test('linksComment emits a LINKS comment or null when empty', () => {
    assert.equal(style.linksComment({}), null);
    assert.match(style.linksComment({ a: 'http://x' }), /^<!-- LINKS: \{"a":"http:\/\/x"\} -->$/);
  });

  await t.test('escapeLabel neutralizes double quotes', () => {
    assert.equal(style.escapeLabel('say "hi"'), 'say &quot;hi&quot;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/mermaid-style.test.js`
Expected: FAIL — `Cannot find module '.../lib/style.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/mermaid-render/scripts/lib/style.mjs
export const PALETTE = {
  new:      { fill: "#4ade80", stroke: "#22c55e" },
  modified: { fill: "#60a5fa", stroke: "#3b82f6" },
  deleted:  { fill: "#f87171", stroke: "#ef4444" },
};

export const FLOWCHART_INIT =
  "%%{init: {'flowchart': {'wrappingWidth': 9999}, 'themeVariables': {'fontSize': '14px'}}}%%";
export const SUBGRAPH_STYLE = "rx:10,ry:10,fill:#1e293b,stroke:#334155,color:#94a3b8";

export function classDefLines() {
  return Object.entries(PALETTE).map(
    ([cat, c]) => `classDef ${cat} fill:${c.fill},color:#000,stroke:${c.stroke},stroke-width:2px`
  );
}

export function escapeLabel(s) {
  return String(s).replace(/"/g, "&quot;");
}

export function fence(body) {
  return "```mermaid\n" + body + "\n```";
}

export function linksComment(urlMap) {
  if (!urlMap || Object.keys(urlMap).length === 0) return null;
  return `<!-- LINKS: ${JSON.stringify(urlMap)} -->`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/tests/mermaid-style.test.js`
Expected: PASS (4 subtests).

- [ ] **Step 5: Commit**

```bash
git add skills/mermaid-render/scripts/lib/style.mjs scripts/tests/mermaid-style.test.js
git commit -m "Add mermaid-render shared style module"
```

---

## Task 2: Link-type registries

**Files:**
- Create: `skills/mermaid-render/scripts/lib/links.mjs`
- Test: `scripts/tests/mermaid-links.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scripts/tests/mermaid-links.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('mermaid-links', async (t) => {
  const { flowchartLink, classLink, erLink } = await import('../../skills/mermaid-render/scripts/lib/links.mjs');

  await t.test('flowchart known + unknown fallback', () => {
    assert.equal(flowchartLink('happy').connector, '-->');
    assert.equal(flowchartLink('deleted').connector, '-.->');
    assert.equal(flowchartLink('nope').color, flowchartLink('neutral').color); // falls back to neutral
  });

  await t.test('class known + unknown fallback to association', () => {
    assert.equal(classLink('inheritance'), '<|--');
    assert.equal(classLink('composition'), '*--');
    assert.equal(classLink('weird'), classLink('association'));
  });

  await t.test('er cardinality + identifying swaps -- for ..', () => {
    assert.equal(erLink('one-to-many', true), '||--o{');
    assert.equal(erLink('one-to-many', false), '||..o{');
    assert.equal(erLink('mystery', true), erLink('one-to-many', true)); // fallback
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/mermaid-links.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/mermaid-render/scripts/lib/links.mjs
const FLOWCHART_LINKS = {
  happy:   { connector: "-->",  color: "#4ade80", width: "2px" },
  error:   { connector: "-->",  color: "#f87171", width: "2px" },
  deleted: { connector: "-.->", color: "#f87171", width: "2px", dasharray: "5" },
  neutral: { connector: "-->",  color: "#475569", width: "1.5px" },
};

const CLASS_LINKS = {
  inheritance: "<|--",
  composition: "*--",
  aggregation: "o--",
  association: "-->",
  dependency:  "..>",
};

const ER_LINKS = {
  "one-to-one":   "||--||",
  "one-to-many":  "||--o{",
  "many-to-one":  "}o--||",
  "many-to-many": "}o--o{",
};

function warn(msg) {
  process.stderr.write(`[mermaid-render] ${msg}\n`);
}

export function flowchartLink(type) {
  if (FLOWCHART_LINKS[type]) return FLOWCHART_LINKS[type];
  warn(`unknown flowchart link type "${type}", using neutral`);
  return FLOWCHART_LINKS.neutral;
}

export function classLink(type) {
  if (CLASS_LINKS[type]) return CLASS_LINKS[type];
  warn(`unknown class link type "${type}", using association`);
  return CLASS_LINKS.association;
}

export function erLink(type, identifying = true) {
  const base = ER_LINKS[type] || (warn(`unknown er link type "${type}", using one-to-many`), ER_LINKS["one-to-many"]);
  return identifying ? base : base.replace("--", "..");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/tests/mermaid-links.test.js`
Expected: PASS (3 subtests).

- [ ] **Step 5: Commit**

```bash
git add skills/mermaid-render/scripts/lib/links.mjs scripts/tests/mermaid-links.test.js
git commit -m "Add mermaid-render link-type registries"
```

---

## Task 3: Flowchart renderer

**Files:**
- Create: `skills/mermaid-render/scripts/renderers/flowchart.mjs`
- Test: `scripts/tests/mermaid-flowchart.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scripts/tests/mermaid-flowchart.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODEL = {
  type: 'flowchart',
  direction: 'TD',
  groups: [{ id: 'auth', label: 'providers/auth', nodeIds: ['a'] }],
  nodes: [
    { id: 'a', label: 'auth: login()', shape: 'action', category: 'new', url: 'http://x/a' },
    { id: 'b', label: 'ok?', shape: 'decision', category: 'modified' },
  ],
  links: [{ from: 'a', to: 'b', label: 'success', type: 'happy' }],
};

test('mermaid-flowchart', async (t) => {
  const { renderFlowchart } = await import('../../skills/mermaid-render/scripts/renderers/flowchart.mjs');
  const out = renderFlowchart(MODEL);

  await t.test('has init directive and flowchart header', () => {
    assert.match(out, /%%\{init:/);
    assert.match(out, /flowchart TD/);
  });
  await t.test('subgraph wraps grouped node', () => {
    assert.match(out, /subgraph auth\["providers\/auth"\]/);
  });
  await t.test('action node rounded, decision node diamond', () => {
    assert.match(out, /a\("<u>auth: login\(\)<\/u>"\)/); // clickable wrapped in <u>
    assert.match(out, /b\{"ok\?"\}/);
  });
  await t.test('link uses happy connector + label', () => {
    assert.match(out, /a --> \|success\| b/);
  });
  await t.test('classDef + class assignment by category', () => {
    assert.match(out, /classDef new fill:#4ade80/);
    assert.match(out, /class a new/);
    assert.match(out, /class b modified/);
  });
  await t.test('click + LINKS comment emitted for url node', () => {
    assert.match(out, /click a "http:\/\/x\/a" _blank/);
    assert.match(out, /<!-- LINKS: \{"a":"http:\/\/x\/a"\} -->/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/mermaid-flowchart.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/mermaid-render/scripts/renderers/flowchart.mjs
import { FLOWCHART_INIT, SUBGRAPH_STYLE, classDefLines, escapeLabel, fence, linksComment } from "../lib/style.mjs";
import { flowchartLink } from "../lib/links.mjs";

export function renderFlowchart(model) {
  const dir = model.direction || "TD";
  const nodes = model.nodes || [];
  const links = model.links || [];
  const groups = model.groups || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines = [FLOWCHART_INIT, `flowchart ${dir}`];

  const nodeText = (n) => {
    const label = n.url ? `<u>${escapeLabel(n.label)}</u>` : escapeLabel(n.label);
    return n.shape === "decision" ? `${n.id}{"${label}"}` : `${n.id}("${label}")`;
  };

  const grouped = new Set();
  groups.forEach((g, i) => {
    const sgId = g.id || `sg_${i}`;
    lines.push(`    subgraph ${sgId}["${escapeLabel(g.label || sgId)}"]`);
    for (const nid of g.nodeIds || []) {
      const n = byId.get(nid);
      if (!n) continue;
      grouped.add(nid);
      lines.push(`        ${nodeText(n)}`);
    }
    lines.push("    end");
  });
  for (const n of nodes) if (!grouped.has(n.id)) lines.push(`    ${nodeText(n)}`);

  lines.push("");
  links.forEach((l) => {
    const spec = flowchartLink(l.type || "neutral");
    const label = l.label ? ` |${escapeLabel(l.label)}|` : "";
    lines.push(`    ${l.from} ${spec.connector}${label} ${l.to}`);
  });

  lines.push("");
  for (const cd of classDefLines()) lines.push(`    ${cd}`);
  const byCat = {};
  for (const n of nodes) {
    const cat = n.category || "neutral";
    if (cat === "neutral") continue;
    (byCat[cat] ||= []).push(n.id);
  }
  for (const [cat, ids] of Object.entries(byCat)) lines.push(`    class ${ids.join(",")} ${cat}`);

  if (groups.length) {
    lines.push("");
    groups.forEach((g, i) => lines.push(`    style ${g.id || `sg_${i}`} ${SUBGRAPH_STYLE}`));
  }

  lines.push("");
  lines.push("    linkStyle default stroke:#475569,stroke-width:1.5px");
  links.forEach((l, i) => {
    const spec = flowchartLink(l.type || "neutral");
    let s = `stroke:${spec.color},stroke-width:${spec.width}`;
    if (spec.dasharray) s += `,stroke-dasharray:${spec.dasharray}`;
    lines.push(`    linkStyle ${i} ${s}`);
  });

  const urlMap = {};
  for (const n of nodes) {
    if (!n.url) continue;
    lines.push(`    click ${n.id} "${n.url}" _blank`);
    urlMap[n.id] = n.url;
  }

  let out = fence(lines.join("\n"));
  const comment = linksComment(urlMap);
  if (comment) out += "\n\n" + comment;
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/tests/mermaid-flowchart.test.js`
Expected: PASS (6 subtests).

- [ ] **Step 5: Commit**

```bash
git add skills/mermaid-render/scripts/renderers/flowchart.mjs scripts/tests/mermaid-flowchart.test.js
git commit -m "Add mermaid-render flowchart renderer"
```

---

## Task 4: Class renderer

**Files:**
- Create: `skills/mermaid-render/scripts/renderers/class.mjs`
- Test: `scripts/tests/mermaid-class.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scripts/tests/mermaid-class.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODEL = {
  type: 'class',
  nodes: [{
    id: 'AuthProvider', category: 'modified', url: 'http://x/auth',
    members: [
      { kind: 'field', name: 'token', type: 'string', visibility: '-' },
      { kind: 'method', name: 'login', type: 'Promise', visibility: '+' },
    ],
  }, { id: 'HttpClient', category: 'neutral', members: [] }],
  links: [{ from: 'AuthProvider', to: 'HttpClient', type: 'composition', label: 'uses' }],
};

test('mermaid-class', async (t) => {
  const { renderClass } = await import('../../skills/mermaid-render/scripts/renderers/class.mjs');
  const out = renderClass(MODEL);

  await t.test('classDiagram header + class block with members', () => {
    assert.match(out, /classDiagram/);
    assert.match(out, /class AuthProvider\{/);
    assert.match(out, /-token string/);
    assert.match(out, /\+login\(\) Promise/);
  });
  await t.test('composition relation with label', () => {
    assert.match(out, /AuthProvider \*-- HttpClient : uses/);
  });
  await t.test('category via classDef + cssClass', () => {
    assert.match(out, /classDef modified fill:#60a5fa/);
    assert.match(out, /cssClass "AuthProvider" modified/);
  });
  await t.test('click href + LINKS comment for url', () => {
    assert.match(out, /click AuthProvider href "http:\/\/x\/auth"/);
    assert.match(out, /<!-- LINKS: \{"AuthProvider":"http:\/\/x\/auth"\} -->/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/mermaid-class.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/mermaid-render/scripts/renderers/class.mjs
import { classDefLines, escapeLabel, fence, linksComment } from "../lib/style.mjs";
import { classLink } from "../lib/links.mjs";

export function renderClass(model) {
  const nodes = model.nodes || [];
  const links = model.links || [];
  const lines = ["classDiagram"];

  for (const n of nodes) {
    const members = n.members || [];
    if (members.length === 0) {
      lines.push(`    class ${n.id}`);
      continue;
    }
    lines.push(`    class ${n.id}{`);
    for (const m of members) {
      const vis = m.visibility || "+";
      if (m.kind === "method") {
        lines.push(`        ${vis}${m.name}()${m.type ? " " + m.type : ""}`);
      } else {
        lines.push(`        ${vis}${m.name}${m.type ? " " + m.type : ""}`);
      }
    }
    lines.push("    }");
  }

  for (const l of links) {
    const arrow = classLink(l.type || "association");
    const label = l.label ? ` : ${escapeLabel(l.label)}` : "";
    lines.push(`    ${l.from} ${arrow} ${l.to}${label}`);
  }

  for (const cd of classDefLines()) lines.push(`    ${cd}`);
  for (const n of nodes) {
    const cat = n.category || "neutral";
    if (cat === "neutral") continue;
    lines.push(`    cssClass "${n.id}" ${cat}`);
  }

  const urlMap = {};
  for (const n of nodes) {
    if (!n.url) continue;
    lines.push(`    click ${n.id} href "${n.url}" "${escapeLabel(n.id)}"`);
    urlMap[n.id] = n.url;
  }

  let out = fence(lines.join("\n"));
  const comment = linksComment(urlMap);
  if (comment) out += "\n\n" + comment;
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/tests/mermaid-class.test.js`
Expected: PASS (4 subtests).

- [ ] **Step 5: Commit**

```bash
git add skills/mermaid-render/scripts/renderers/class.mjs scripts/tests/mermaid-class.test.js
git commit -m "Add mermaid-render class renderer"
```

---

## Task 5: ER renderer

**Files:**
- Create: `skills/mermaid-render/scripts/renderers/er.mjs`
- Test: `scripts/tests/mermaid-er.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scripts/tests/mermaid-er.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODEL = {
  type: 'er',
  nodes: [
    { id: 'PERSON', category: 'new', attributes: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'companyId', type: 'uuid', key: 'FK' },
      { name: 'email', type: 'string', key: null },
    ] },
    { id: 'COMPANY', category: 'neutral', attributes: [{ name: 'id', type: 'uuid', key: 'PK' }] },
  ],
  links: [{ from: 'PERSON', to: 'COMPANY', type: 'many-to-one', label: 'works at', identifying: false }],
};

test('mermaid-er', async (t) => {
  const { renderEr } = await import('../../skills/mermaid-render/scripts/renderers/er.mjs');
  const out = renderEr(MODEL);

  await t.test('erDiagram header + entity attributes with keys', () => {
    assert.match(out, /erDiagram/);
    assert.match(out, /PERSON \{/);
    assert.match(out, /uuid id PK/);
    assert.match(out, /uuid companyId FK/);
    assert.match(out, /string email/);
  });
  await t.test('non-identifying many-to-one crow-foot with label', () => {
    assert.match(out, /PERSON \}o\.\.\|\| COMPANY : "works at"/);
  });
  await t.test('category via classDef + :::class, no click', () => {
    assert.match(out, /classDef new fill:#4ade80/);
    assert.match(out, /PERSON:::new/);
    assert.doesNotMatch(out, /click /);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/mermaid-er.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/mermaid-render/scripts/renderers/er.mjs
import { classDefLines, escapeLabel, fence } from "../lib/style.mjs";
import { erLink } from "../lib/links.mjs";

export function renderEr(model) {
  const nodes = model.nodes || [];
  const links = model.links || [];
  const lines = ["erDiagram"];

  for (const n of nodes) {
    const attrs = n.attributes || [];
    if (attrs.length === 0) {
      lines.push(`    ${n.id} {}`);
    } else {
      lines.push(`    ${n.id} {`);
      for (const a of attrs) {
        const key = a.key ? ` ${a.key}` : "";
        lines.push(`        ${a.type || "string"} ${a.name}${key}`);
      }
      lines.push("    }");
    }
  }

  for (const l of links) {
    const conn = erLink(l.type || "one-to-many", l.identifying !== false);
    const label = l.label ? `"${escapeLabel(l.label)}"` : '""';
    lines.push(`    ${l.from} ${conn} ${l.to} : ${label}`);
  }

  for (const cd of classDefLines()) lines.push(`    ${cd}`);
  for (const n of nodes) {
    const cat = n.category || "neutral";
    if (cat === "neutral") continue;
    lines.push(`    ${n.id}:::${cat}`);
  }

  return fence(lines.join("\n"));
}
```

> Note: ER emits no `click` and no LINKS comment (mermaid ER has no node interaction). `url` on er nodes/links is intentionally ignored — documented in the schema.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/tests/mermaid-er.test.js`
Expected: PASS (3 subtests).

- [ ] **Step 5: Commit**

```bash
git add skills/mermaid-render/scripts/renderers/er.mjs scripts/tests/mermaid-er.test.js
git commit -m "Add mermaid-render er renderer"
```

---

## Task 6: render.mjs dispatch entry

**Files:**
- Create: `skills/mermaid-render/scripts/render.mjs`
- Test: `scripts/tests/mermaid-render-dispatch.test.js`

- [ ] **Step 1: Write the failing test**

The entry is a CLI reading stdin. Test it by spawning it with piped JSON.

```js
// scripts/tests/mermaid-render-dispatch.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ENTRY = path.join(__dirname, '..', '..', 'skills', 'mermaid-render', 'scripts', 'render.mjs');

function run(model) {
  return execFileSync('node', [ENTRY], { input: JSON.stringify(model), encoding: 'utf8' });
}

test('mermaid-render-dispatch', async (t) => {
  await t.test('routes flowchart', () => {
    const out = run({ type: 'flowchart', nodes: [{ id: 'a', label: 'A' }], links: [] });
    assert.match(out, /flowchart TD/);
  });
  await t.test('routes class', () => {
    const out = run({ type: 'class', nodes: [{ id: 'A', members: [] }], links: [] });
    assert.match(out, /classDiagram/);
  });
  await t.test('routes er', () => {
    const out = run({ type: 'er', nodes: [{ id: 'A', attributes: [] }], links: [] });
    assert.match(out, /erDiagram/);
  });
  await t.test('unknown type exits non-zero with helpful message', () => {
    assert.throws(() => run({ type: 'pie' }), (e) => {
      assert.match(String(e.stderr), /unknown model type "pie".*flowchart, class, er/s);
      return true;
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/mermaid-render-dispatch.test.js`
Expected: FAIL — `render.mjs` not found / spawn error.

- [ ] **Step 3: Write minimal implementation**

```js
// skills/mermaid-render/scripts/render.mjs
#!/usr/bin/env node
import { renderFlowchart } from "./renderers/flowchart.mjs";
import { renderClass } from "./renderers/class.mjs";
import { renderEr } from "./renderers/er.mjs";

const RENDERERS = { flowchart: renderFlowchart, class: renderClass, er: renderEr };

function fail(msg) {
  process.stderr.write(`[mermaid-render] ${msg}\n`);
  process.exit(1);
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const raw = await readStdin();
if (!raw.trim()) fail("no input on stdin; expected a JSON model");

let model;
try {
  model = JSON.parse(raw);
} catch (e) {
  fail(`invalid JSON on stdin: ${e.message}`);
}

const render = RENDERERS[model.type];
if (!render) fail(`unknown model type "${model.type}"; supported: flowchart, class, er`);

process.stdout.write(render(model) + "\n");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/tests/mermaid-render-dispatch.test.js`
Expected: PASS (4 subtests).

- [ ] **Step 5: Make entry executable + commit**

```bash
chmod +x skills/mermaid-render/scripts/render.mjs
git add skills/mermaid-render/scripts/render.mjs scripts/tests/mermaid-render-dispatch.test.js
git commit -m "Add mermaid-render dispatch entry"
```

---

## Task 7: Schema reference + SKILL.md

**Files:**
- Create: `skills/mermaid-render/references/model-schema.md`
- Create: `skills/mermaid-render/SKILL.md`

- [ ] **Step 1: Write the schema reference**

Create `skills/mermaid-render/references/model-schema.md` with the contract copied from the spec's "The contract" section: the Generic links + Uniform URLs subsections and the three per-type JSON examples (flowchart/class/er) and their field tables. (Source of truth: `docs/superpowers/specs/2026-06-02-mermaid-render-skill-design.md` lines under "## The contract". Copy those subsections verbatim into this reference so producers don't need the spec.)

- [ ] **Step 2: Write SKILL.md**

```markdown
---
name: tb:mermaid-render
description: Render styled, GitHub-compatible mermaid diagrams from a JSON model. Use when another skill or workflow has a graph (nodes + links) and needs consistent mermaid styling — flowcharts, class diagrams, or ER diagrams. Producers (e.g. tb:change-map, architecture analysis) emit the JSON model; this skill owns all styling.
---

# Mermaid Render

Deterministic mermaid renderer. Pipe a JSON model to `scripts/render.mjs` on stdin; it prints a
fenced ```mermaid``` block (plus a trailing `<!-- LINKS: {...} -->` comment when nodes carry URLs).

## Usage

```bash
echo '<json-model>' | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs"
```

Or pipe a producer directly:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/change-map/scripts/diff-graph.mjs" \
  | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs"
```

## Supported model types

`flowchart`, `class`, `er`. All share `nodes[]` + `links[]` with uniform optional `url`.
The full JSON contract is in `references/model-schema.md` — read it before producing a model.

## Adding a new chart type

1. Add `scripts/renderers/<type>.mjs` exporting `render<Type>(model)`.
2. Register it in `scripts/render.mjs`'s `RENDERERS` map.
3. Add its connector vocab to `scripts/lib/links.mjs`.
4. Document its model shape in `references/model-schema.md` + add a renderer test.

## GitHub note

GitHub strips `click`/hyperlinks from mermaid. The renderer still emits them (for other viewers)
and always appends a `<!-- LINKS: {id → url} -->` comment so a consumer can post links out-of-band.
ER diagrams have no node interaction — they carry no clicks.
```

- [ ] **Step 3: Validate the skill loads (frontmatter + structure)**

Run: `bash scripts/checks/skills-valid.sh .`
Expected: output includes the new skill in the validated count and `PASS skills-valid`.

- [ ] **Step 4: Commit**

```bash
git add skills/mermaid-render/SKILL.md skills/mermaid-render/references/model-schema.md
git commit -m "Add mermaid-render SKILL.md and model-schema reference"
```

---

## Task 8: Refactor change-map analysis into diff-graph.mjs (emit model)

**Files:**
- Create: `skills/change-map/scripts/diff-graph.mjs` (analysis ported from `file-deps.mjs`, emits JSON)
- Delete: `skills/change-map/scripts/file-deps.mjs`
- Test: `scripts/tests/change-map-diff-graph.test.js`

The new `diff-graph.mjs` keeps ALL analysis helpers from `file-deps.mjs` (`run`, `findBase`,
`detectPR`, `buildGithubPrefix`, `buildFileUrl`, `gatherChangedFiles`, `makeNodeId`, `scanExports`,
`getSymbols`, `extractBlock`, `getImportsToChangedFiles`, `resolveImport`, `groupByDir`) UNCHANGED.
Only the final output stage changes: instead of `generateMermaid(...)`, build and print the
flowchart JSON model. Status maps to category: `A`→`new`, `D`→`deleted`, else `modified`. Import
edges become links with `type` `deleted` (target deleted), `happy` (added endpoint), else `neutral`.

- [ ] **Step 1: Write the failing test** (run against a synthetic git repo in a temp dir)

```js
// scripts/tests/change-map-diff-graph.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', '..', 'skills', 'change-map', 'scripts', 'diff-graph.mjs');

function git(cwd, args) { execFileSync('git', args, { cwd, encoding: 'utf8' }); }

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cm-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 't@t']);
  git(dir, ['config', 'user.name', 't']);
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  git(dir, ['add', '.']); git(dir, ['commit', '-qm', 'base']);
  git(dir, ['branch', '-q', 'origin/main']); // local stand-in base ref
  writeFileSync(path.join(dir, 'src', 'b.ts'), "import { a } from './a';\nexport const b = a + 1;\n");
  git(dir, ['add', '.']); git(dir, ['commit', '-qm', 'add b']);
  return dir;
}

test('change-map-diff-graph', async (t) => {
  const dir = makeRepo();
  const out = execFileSync('node', [SCRIPT, 'origin/main'], { cwd: dir, encoding: 'utf8' });
  const model = JSON.parse(out);

  await t.test('emits a flowchart model with nodes', () => {
    assert.equal(model.type, 'flowchart');
    assert.ok(model.nodes.some((n) => /b\.ts/.test(n.label)));
  });
  await t.test('new file node has category new', () => {
    const bNode = model.nodes.find((n) => /b\.ts/.test(n.label));
    assert.equal(bNode.category, 'new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/change-map-diff-graph.test.js`
Expected: FAIL — `diff-graph.mjs` not found.

- [ ] **Step 3: Create diff-graph.mjs**

Copy `skills/change-map/scripts/file-deps.mjs` to `skills/change-map/scripts/diff-graph.mjs`, then
replace its output stage. Specifically:

Replace the final lines:
```js
const dirGroups = groupByDir(allFiles);
const output = generateMermaid(dirGroups, fileData, githubPrefix);
process.stdout.write(output);
```
with:
```js
const dirGroups = groupByDir(allFiles);
process.stdout.write(JSON.stringify(buildModel(dirGroups, fileData), null, 2) + "\n");
```

Delete the entire `generateMermaid(...)` function and add this `buildModel(...)`:
```js
function statusToCategory(status) {
  if (status === "A") return "new";
  if (status === "D") return "deleted";
  return "modified";
}

function buildModel(dirGroups, fileData) {
  const groups = [];
  const nodes = [];
  for (const [dirLabel, files] of dirGroups) {
    const nodeIds = [];
    for (const filepath of files) {
      const d = fileData.get(filepath);
      const tag = d.status === "A" ? "[+]" : d.status === "D" ? "[-]" : "[M]";
      let label = `${tag} ${filepath.split("/").pop()}`;
      for (const sym of d.symbols) {
        label += `\\n${sym.prefix} ${sym.name}()${sym.line ? ` :${sym.line}` : ""}`;
      }
      const firstSym = d.symbols.find((s) => s.prefix === "⊕" || s.prefix === "⊙");
      const url = d.status === "D" ? null : buildFileUrl(filepath, firstSym?.line || 1, d.status);
      nodes.push({ id: d.nodeId, label, shape: "action", category: statusToCategory(d.status), url });
      nodeIds.push(d.nodeId);
    }
    groups.push({ id: makeNodeId("g/" + dirLabel), label: dirLabel, nodeIds });
  }

  const links = [];
  for (const [, d] of fileData) {
    for (const target of d.imports) {
      const td = fileData.get(target);
      if (!td) continue;
      const type = td.status === "D" ? "deleted" : (d.status === "A" || td.status === "A") ? "happy" : "neutral";
      links.push({ from: d.nodeId, to: td.nodeId, type });
    }
  }

  return { type: "flowchart", direction: "TD", groups, nodes, links };
}
```

(`buildFileUrl`, `makeNodeId`, `groupByDir` already exist in the copied file — keep them.)

- [ ] **Step 4: Delete the old script and run the test**

```bash
git rm skills/change-map/scripts/file-deps.mjs
node --test scripts/tests/change-map-diff-graph.test.js
```
Expected: PASS (2 subtests).

- [ ] **Step 5: Commit**

```bash
git add skills/change-map/scripts/diff-graph.mjs scripts/tests/change-map-diff-graph.test.js
git commit -m "Refactor change-map analysis into diff-graph.mjs emitting a JSON model"
```

---

## Task 9: Update change-map SKILL.md to consume the renderer

**Files:**
- Modify: `skills/change-map/SKILL.md`

- [ ] **Step 1: Replace Phase 2 (dependency diagram) instructions**

In `skills/change-map/SKILL.md`, replace the Phase 2a block that runs `file-deps.mjs` with:

```markdown
**2a. File dependencies diagram:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/change-map/scripts/diff-graph.mjs" \
  | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs"
```
`diff-graph.mjs` emits a flowchart JSON model from the diff; `render.mjs` styles it. Its output goes
directly into the final markdown as the File Dependencies section — do not modify it.
```

(Keep the Phase 2b `symbol-map.mjs` block — its JSON still feeds Phase 4 node URLs.)

- [ ] **Step 2: Rewrite Phase 4 (logical flow) to emit a model, not hand-styled mermaid**

Replace Phase 4's "render the mermaid by hand" guidance with:

```markdown
## Phase 4: Build the Logical Flow model

Decide the nodes and paths a reviewer should follow (you choose what matters — the renderer styles
it). Build a flowchart JSON model and render it:

- `nodes`: `{ id, label: "file: fn()", shape: "action"|"decision", category: "new"|"modified"|"neutral", url? }`
  — use the Phase 2b symbol map for `url` (never guess line numbers).
- `links`: `{ from, to, label?, type: "happy"|"error"|"neutral" }` — `happy` for success paths,
  `error` for failure paths.

Write the model to a temp file and render:
```bash
echo "$LOGICAL_FLOW_JSON" | node "${CLAUDE_PLUGIN_ROOT}/skills/mermaid-render/scripts/render.mjs"
```
The styling (colors, shapes, clickable nodes, init directive) is applied by the renderer. The full
model contract is in `skills/mermaid-render/references/model-schema.md`.
```

- [ ] **Step 3: Move the styling-conventions prose**

Cut the detailed Phase 4 styling rules (node colors `#4ade80`/`#60a5fa`, `linkStyle` indices,
`<u>` clickable wrapping, init directive) from `change-map/SKILL.md` — they are now owned by
`mermaid-render`. If any prose is still useful as rationale, it already lives in
`skills/mermaid-render/references/model-schema.md`; do not duplicate it here.

- [ ] **Step 4: Verify skills still valid**

Run: `bash scripts/checks/skills-valid.sh .`
Expected: `PASS skills-valid`.

- [ ] **Step 5: Commit**

```bash
git add skills/change-map/SKILL.md
git commit -m "Point change-map at mermaid-render; move styling into the renderer"
```

---

## Task 10: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `node --test scripts/tests/*.test.js`
Expected: all tests pass, fail 0 (includes the 6 new mermaid/diff-graph files + the existing suite).

- [ ] **Step 2: Smoke-test the end-to-end pipe in a real repo**

Run (from any TS repo with a branch ahead of origin/main):
```bash
node "$(pwd)/skills/change-map/scripts/diff-graph.mjs" origin/main \
  | node "$(pwd)/skills/mermaid-render/scripts/render.mjs"
```
Expected: a fenced ```mermaid flowchart``` block + trailing `<!-- LINKS: ... -->` comment.

- [ ] **Step 3: Confirm no stale references to file-deps.mjs**

Run: `grep -rn "file-deps" skills/ scripts/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit any final fixups (if needed)**

```bash
git add -A
git commit -m "Finalize mermaid-render split and change-map refactor"
```

---

## Self-Review

**Spec coverage:**
- Standalone styling skill owning all styling → Tasks 1–7. ✓
- Deterministic JSON-model renderer → Task 6. ✓
- Registry of chart types (flowchart/class/er) → Tasks 3/4/5 + Task 6 RENDERERS map. ✓
- Generic `links` array + data-driven types + per-type registry → Task 2 + used in 3/4/5. ✓
- Uniform `nodes` + `url` + single `LINKS` comment → Tasks 1 (linksComment), 3/4 (emit), 5 (no click). ✓
- change-map becomes a pure producer; logical-flow also goes through renderer → Tasks 8/9. ✓
- Reusable by future architecture analysis (same nodes/links/url JSON) → contract in Task 7 reference. ✓
- GitHub click-stripping fallback preserved/unified → Task 1 + renderers. ✓
- Tests per renderer + dispatch + registry + diff-graph → Tasks 1–6, 8. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; Task 7 reference copies from a named spec section rather than inventing. ✓

**Type consistency:** `renderFlowchart`/`renderClass`/`renderEr` named consistently across renderers, tests, and the `RENDERERS` map in Task 6. `linksComment`, `classDefLines`, `escapeLabel`, `fence` defined in Task 1 and imported identically in Tasks 3/4/5. `flowchartLink`/`classLink`/`erLink` defined in Task 2, used in 3/4/5. `buildModel`/`statusToCategory` defined and used in Task 8. ✓
